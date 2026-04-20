/**
 * Fetch WC 2026 teams + players from api-football.com
 *
 * Strategy (efficient — minimal API calls):
 *   Step 1: GET /teams?league=1&season=2026
 *           → 1 request, returns all 48 national teams with their api_id.
 *           → Matches by name to our DB, updates teams.api_id.
 *
 *   Step 2: GET /players?league=1&season=2026&page=N  (paginated)
 *           → Fetches all players registered for WC2026.
 *           → Filters to Attackers + Midfielders (goal-scorer candidates).
 *           → Upserts into players table.
 *           → Falls back to /players/squads?team={api_id} if league data
 *             is not yet populated (tournament starts June 11 2026).
 *
 * Pre-requisites:
 *   • API_FOOTBALL_KEY in .env.local  (https://dashboard.api-football.com)
 *   • SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   • Teams seeded: npm run seed:teams
 *   • Migration 3 applied (adds position column to players)
 *
 * Usage:
 *   npm run seed:players
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ── Config ─────────────────────────────────────────────────────────────────────
const API_KEY      = process.env.API_FOOTBALL_KEY;
const API_BASE     = "https://v3.football.api-sports.io";
const WC_LEAGUE    = 1;
const WC_SEASON    = 2022; // ← 2022 for testing (free plan); change to 2026 for production
const DELAY_MS     = 400;   // stay comfortably under rate limits
const MAX_PER_TEAM = 15;    // max players stored per national team

const WANTED_POSITIONS = ["Attacker", "Midfielder"];

if (!API_KEY) {
  console.error("❌  Missing API_FOOTBALL_KEY in .env.local");
  console.error("    Get it from: https://dashboard.api-football.com → My Account → API Key");
  process.exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(path: string) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": API_KEY! },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API error: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

// ── Step 1: Sync WC2026 team api_ids ──────────────────────────────────────────

interface ApiTeam {
  team: { id: number; name: string; code: string; country: string; logo: string };
  venue: { id: number; name: string };
}

async function syncTeamApiIds(dbTeams: { id: number; name: string; api_id: number | null }[]) {
  console.log("\n📋  Step 1 — Fetching WC2026 teams from api-football.com…");

  const data = await apiFetch(`/teams?league=${WC_LEAGUE}&season=${WC_SEASON}`);
  const apiTeams: ApiTeam[] = data.response ?? [];

  if (!apiTeams.length) {
    console.warn("  ⚠️  No teams returned for league=1 season=2026. Check your API key / plan.");
    return;
  }

  console.log(`  Found ${apiTeams.length} teams in the API.`);

  // Build a lookup: normalised name → api team id
  function norm(s: string) {
    return s.toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/['']/g, "'")
      .trim();
  }

  const apiMap = new Map<string, number>();
  for (const t of apiTeams) {
    apiMap.set(norm(t.team.name), t.team.id);
    apiMap.set(norm(t.team.country), t.team.id);
  }

  // Manual overrides for teams whose names differ between our seed and the API
  const MANUAL_OVERRIDES: Record<string, string> = {
    "Ivory Coast":            "Cote d'Ivoire",
    "DR Congo":               "Congo DR",
    "Bosnia and Herzegovina": "Bosnia",
    "Turkiye":                "Turkey",
    "Czech Republic":         "Czechia",
  };

  let matched = 0;
  let skipped = 0;

  for (const dbTeam of dbTeams) {
    if (dbTeam.api_id) {
      matched++;
      continue; // already have it
    }

    const lookupName = MANUAL_OVERRIDES[dbTeam.name] ?? dbTeam.name;
    const foundId    = apiMap.get(norm(lookupName)) ?? apiMap.get(norm(dbTeam.name));

    if (!foundId) {
      console.warn(`  ⚠️  No API match for: "${dbTeam.name}"`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("teams")
      .update({ api_id: foundId })
      .eq("id", dbTeam.id);

    if (error) {
      console.warn(`  ❌  Could not update api_id for ${dbTeam.name}: ${error.message}`);
    } else {
      dbTeam.api_id = foundId; // update in-memory too
      console.log(`  ✅  ${dbTeam.name.padEnd(30)} → api_id ${foundId}`);
      matched++;
    }
  }

  console.log(`  Done. Matched: ${matched}  Skipped: ${skipped}`);
}

// ── Step 2a: Fetch players via league endpoint (preferred) ────────────────────

interface ApiPlayer {
  player: { id: number; name: string; age: number; photo: string };
  statistics: Array<{
    team:   { id: number; name: string };
    games:  { position: string };
    goals:  { total: number | null; assists: number | null };
  }>;
}

async function fetchPlayersViaLeague(
  dbTeamByApiId: Map<number, number>  // api_id → our internal id
): Promise<{ fetched: number }> {
  console.log("\n⚽  Step 2a — Fetching players via /players?league=1&season=2026…");

  // Discover total pages from the first request
  const first = await apiFetch(
    `/players?league=${WC_LEAGUE}&season=${WC_SEASON}&page=1`
  );

  const totalPages: number = first.paging?.total ?? 1;
  const rows: ApiPlayer[]  = first.response ?? [];

  console.log(`  Total pages: ${totalPages}`);

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    await sleep(DELAY_MS);
    const data = await apiFetch(
      `/players?league=${WC_LEAGUE}&season=${WC_SEASON}&page=${page}`
    );
    rows.push(...(data.response ?? []));
    process.stdout.write(`  Page ${page}/${totalPages} fetched…\r`);
  }

  console.log(`\n  Total players fetched: ${rows.length}`);

  if (!rows.length) return { fetched: 0 };

  // Group by api team id, filter wanted positions, cap per team
  const byTeam = new Map<number, typeof rows>();
  for (const row of rows) {
    const stat     = row.statistics[0];
    const pos      = stat?.games?.position ?? "";
    const apiTeamId = stat?.team?.id;
    if (!apiTeamId) continue;
    if (!byTeam.has(apiTeamId)) byTeam.set(apiTeamId, []);
    byTeam.get(apiTeamId)!.push(row);
  }

  const upsertRows: {
    id: number; name: string; position: string | null;
    team_id: number; goals: number; assists: number;
  }[] = [];

  for (const [apiTeamId, players] of byTeam) {
    const dbTeamId = dbTeamByApiId.get(apiTeamId);
    if (!dbTeamId) continue;

    const candidates = players.filter((p) =>
      WANTED_POSITIONS.some((pos) =>
        (p.statistics[0]?.games?.position ?? "").includes(pos)
      )
    );
    const pool = candidates.length >= 3 ? candidates : players;

    for (const p of pool.slice(0, MAX_PER_TEAM)) {
      const stat = p.statistics[0];
      upsertRows.push({
        id:       p.player.id,
        name:     p.player.name,
        position: stat?.games?.position ?? null,
        team_id:  dbTeamId,
        goals:    stat?.goals?.total   ?? 0,
        assists:  stat?.goals?.assists ?? 0,
      });
    }
  }

  if (upsertRows.length) {
    const { error } = await supabase
      .from("players")
      .upsert(upsertRows, { onConflict: "id" });
    if (error) throw new Error(`DB upsert failed: ${error.message}`);
  }

  console.log(`  ✅  Upserted ${upsertRows.length} players from league endpoint.`);
  return { fetched: upsertRows.length };
}

// ── Step 2b: Fallback — fetch squads per team ─────────────────────────────────

interface ApiSquadPlayer {
  id:       number;
  name:     string;
  age:      number;
  number:   number;
  position: string;
  photo:    string;
}

async function fetchPlayersViaSquads(
  dbTeams: { id: number; name: string; api_id: number | null }[]
): Promise<{ fetched: number }> {
  console.log("\n⚽  Step 2b — Fallback: fetching squads per team…");
  console.log("    (League-level player data not yet available — tournament starts June 11)");

  let total = 0;

  for (const team of dbTeams) {
    if (!team.api_id) {
      console.log(`  ⚠️  ${team.name.padEnd(30)} skipped (no api_id)`);
      continue;
    }

    process.stdout.write(`  ▸ ${team.name.padEnd(32)}`);

    let squad: ApiSquadPlayer[] = [];
    try {
      const data = await apiFetch(`/players/squads?team=${team.api_id}`);
      squad = data.response?.[0]?.players ?? [];
      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`❌  ${e}`);
      continue;
    }

    if (!squad.length) {
      console.log("⚠️  empty");
      continue;
    }

    const candidates = squad.filter((p) =>
      WANTED_POSITIONS.some((pos) => p.position?.includes(pos))
    );
    const pool = candidates.length >= 3 ? candidates : squad;
    const toInsert = pool.slice(0, MAX_PER_TEAM);

    const rows = toInsert.map((p) => ({
      id:       p.id,
      name:     p.name,
      position: p.position ?? null,
      team_id:  team.id,
      goals:    0,
      assists:  0,
    }));

    const { error } = await supabase
      .from("players")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.log(`❌  DB: ${error.message}`);
    } else {
      console.log(`✅  ${rows.length} players`);
      total += rows.length;
    }
  }

  return { fetched: total };
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  WC 2026 — Player Seeder (api-football.com)  ");
  console.log("═══════════════════════════════════════════════");

  // Load DB teams
  const { data: dbTeams, error: dbErr } = await supabase
    .from("teams")
    .select("id, name, api_id")
    .order("name");

  if (dbErr || !dbTeams) {
    console.error("❌  Cannot load teams:", dbErr?.message);
    process.exit(1);
  }

  // ── Step 1: Sync api_ids ─────────────────────────────────────────────────
  await syncTeamApiIds(dbTeams);

  // Build lookup map for Step 2a
  const dbTeamByApiId = new Map<number, number>();
  for (const t of dbTeams) {
    if (t.api_id) dbTeamByApiId.set(t.api_id, t.id);
  }

  // ── Step 2: Fetch players (prefer league endpoint, fall back to squads) ──
  let result = await fetchPlayersViaLeague(dbTeamByApiId);

  if (result.fetched === 0) {
    // League data not yet available (tournament hasn't started)
    result = await fetchPlayersViaSquads(dbTeams);
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════");
  console.log(`✅  Done! Total players in DB: ${result.fetched}`);
  console.log("═══════════════════════════════════════════════\n");

  if (result.fetched === 0) {
    console.log("ℹ️  No players were fetched. Possible reasons:");
    console.log("   • WC2026 squad data not yet available in the API");
    console.log("   • Your API plan doesn't include player data");
    console.log("   • Check your API_FOOTBALL_KEY is correct");
    console.log("\n   The onboarding form will show a text input as fallback.");
  } else {
    console.log("ℹ️  Restart the Next.js dev server to see the player picker in onboarding.");
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

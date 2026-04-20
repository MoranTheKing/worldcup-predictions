/**
 * Fetch top players (attackers + midfielders) for all 48 WC 2026 teams.
 *
 * Pre-requisites:
 *   • API_FOOTBALL_KEY in .env.local  (https://dashboard.api-football.com)
 *   • SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   • Teams must already be seeded (npm run seed:teams)
 *   • Migration 3 must be applied (adds position column to players)
 *
 * Usage:
 *   npm run seed:players
 *
 * Rate limits (api-football.com):
 *   Free  tier → 100 req/day  → covers ~48 teams (1 squad call each)
 *   Pro   tier → unlimited
 *
 * The script:
 *   1. Loads teams from Supabase (id, name, api_id)
 *   2. For each team without api_id → searches api-football by name
 *   3. Saves the found api_id back to the teams table
 *   4. Fetches the current squad via /players/squads?team={api_id}
 *   5. Upserts attackers & midfielders (up to MAX_PER_TEAM each) into players table
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY  = process.env.API_FOOTBALL_KEY;
const API_BASE = "https://v3.football.api-sports.io";
const MAX_PER_TEAM = 15; // max players to store per team
const DELAY_MS     = 350; // ms between API calls (stay within rate limit)

// Positions we care about (goalscorer candidates)
const WANTED_POSITIONS = ["Attacker", "Midfielder"];

if (!API_KEY) {
  console.error("❌  Missing API_FOOTBALL_KEY in .env.local");
  console.error("    Get it from: https://dashboard.api-football.com → My Account → API Key");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  // api-football wraps errors inside the response body too
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json;
}

/** Search api-football for a national team by name. Returns api_id or null. */
async function findApiTeamId(teamName: string): Promise<number | null> {
  // Try the exact name first, then a simplified variant
  const attempts = [
    teamName,
    teamName.replace(" and ", " & "),
    teamName.split(" ")[0], // first word only as last resort
  ];

  for (const name of attempts) {
    try {
      const data = await apiFetch(
        `/teams?name=${encodeURIComponent(name)}&type=National`
      );
      if (data.results > 0) {
        return (data.response[0]?.team?.id as number) ?? null;
      }
    } catch {
      // ignore individual attempt errors
    }
    await sleep(DELAY_MS);
  }
  return null;
}

interface ApiPlayer {
  id: number;
  name: string;
  age: number;
  number: number;
  position: string;
  photo: string;
}

/** Fetch current squad from api-football. Returns array of players. */
async function fetchSquad(apiTeamId: number): Promise<ApiPlayer[]> {
  const data = await apiFetch(`/players/squads?team=${apiTeamId}`);
  if (!data.response?.length) return [];
  return (data.response[0]?.players ?? []) as ApiPlayer[];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Load all teams from DB
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name, api_id")
    .order("name");

  if (teamsErr || !teams) {
    console.error("❌  Could not load teams:", teamsErr?.message);
    process.exit(1);
  }
  console.log(`\n🌍  Loaded ${teams.length} teams from Supabase\n`);

  let totalUpserted = 0;
  let skipped = 0;

  for (const team of teams) {
    process.stdout.write(`▸ ${team.name.padEnd(30)}`);

    // ── Step 1: Resolve api_id ───────────────────────────────────────────────
    let apiId: number | null = team.api_id ?? null;

    if (!apiId) {
      process.stdout.write("  [searching API id] ");
      apiId = await findApiTeamId(team.name);

      if (!apiId) {
        console.log("⚠️  not found in API, skipping");
        skipped++;
        continue;
      }

      // Save api_id to DB
      const { error: upErr } = await supabase
        .from("teams")
        .update({ api_id: apiId })
        .eq("id", team.id);

      if (upErr) console.warn(`    (could not save api_id: ${upErr.message})`);
    }

    // ── Step 2: Fetch squad ──────────────────────────────────────────────────
    let squad: ApiPlayer[] = [];
    try {
      squad = await fetchSquad(apiId);
      await sleep(DELAY_MS);
    } catch (e) {
      console.log(`❌  squad fetch failed: ${e}`);
      skipped++;
      continue;
    }

    if (!squad.length) {
      console.log("⚠️  empty squad returned");
      skipped++;
      continue;
    }

    // ── Step 3: Filter + slice ───────────────────────────────────────────────
    const candidates = squad.filter((p) =>
      WANTED_POSITIONS.some((pos) => p.position?.includes(pos))
    );
    // If the API returned no position data, fall back to the full squad
    const pool = candidates.length >= 3 ? candidates : squad;
    const toInsert = pool.slice(0, MAX_PER_TEAM);

    // ── Step 4: Upsert into players ──────────────────────────────────────────
    const rows = toInsert.map((p) => ({
      id:       p.id,
      name:     p.name,
      position: p.position ?? null,
      team_id:  team.id,          // our internal BIGINT id
      goals:    0,
      assists:  0,
    }));

    const { error: upsErr } = await supabase
      .from("players")
      .upsert(rows, { onConflict: "id" });

    if (upsErr) {
      console.log(`❌  DB upsert failed: ${upsErr.message}`);
    } else {
      console.log(`✅  ${rows.length} players (squad size: ${squad.length})`);
      totalUpserted += rows.length;
    }
  }

  console.log("\n────────────────────────────────────────");
  console.log(`✅  Done!  Upserted: ${totalUpserted} players`);
  if (skipped) console.log(`⚠️   Skipped: ${skipped} teams (no API data)`);
  console.log("────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

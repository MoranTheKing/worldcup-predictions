/**
 * Seed mock players for UI/logic testing.
 *
 * No API key required — all player data is hardcoded.
 * Team IDs are resolved dynamically from the teams table,
 * so this works regardless of which BIGINT IDs Supabase assigned.
 *
 * Usage:  npm run seed:players:mock
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ── Hardcoded mock players ────────────────────────────────────────────────────
// teamName must match exactly the `name` column in the teams table.

const MOCK_PLAYERS: { id: number; name: string; teamName: string; position: string }[] = [
  // Argentina
  { id: 1,  name: "Lionel Messi",         teamName: "Argentina",     position: "Attacker"  },
  { id: 2,  name: "Julián Álvarez",        teamName: "Argentina",     position: "Attacker"  },
  { id: 3,  name: "Ángel Di María",        teamName: "Argentina",     position: "Attacker"  },
  { id: 4,  name: "Rodrigo De Paul",       teamName: "Argentina",     position: "Midfielder"},

  // France
  { id: 5,  name: "Kylian Mbappé",         teamName: "France",        position: "Attacker"  },
  { id: 6,  name: "Antoine Griezmann",     teamName: "France",        position: "Attacker"  },
  { id: 7,  name: "Ousmane Dembélé",       teamName: "France",        position: "Attacker"  },
  { id: 8,  name: "Aurélien Tchouaméni",   teamName: "France",        position: "Midfielder"},

  // Brazil
  { id: 9,  name: "Vinicius Junior",       teamName: "Brazil",        position: "Attacker"  },
  { id: 10, name: "Rodrygo",               teamName: "Brazil",        position: "Attacker"  },
  { id: 11, name: "Raphinha",              teamName: "Brazil",        position: "Attacker"  },
  { id: 12, name: "Lucas Paquetá",         teamName: "Brazil",        position: "Midfielder"},

  // England
  { id: 13, name: "Harry Kane",            teamName: "England",       position: "Attacker"  },
  { id: 14, name: "Jude Bellingham",       teamName: "England",       position: "Midfielder"},
  { id: 15, name: "Phil Foden",            teamName: "England",       position: "Attacker"  },
  { id: 16, name: "Bukayo Saka",           teamName: "England",       position: "Attacker"  },

  // Portugal
  { id: 17, name: "Cristiano Ronaldo",     teamName: "Portugal",      position: "Attacker"  },
  { id: 18, name: "Bruno Fernandes",       teamName: "Portugal",      position: "Midfielder"},
  { id: 19, name: "Rafael Leão",           teamName: "Portugal",      position: "Attacker"  },
  { id: 20, name: "Bernardo Silva",        teamName: "Portugal",      position: "Midfielder"},

  // Spain
  { id: 21, name: "Álvaro Morata",         teamName: "Spain",         position: "Attacker"  },
  { id: 22, name: "Pedri",                 teamName: "Spain",         position: "Midfielder"},
  { id: 23, name: "Gavi",                  teamName: "Spain",         position: "Midfielder"},
  { id: 24, name: "Lamine Yamal",          teamName: "Spain",         position: "Attacker"  },

  // Germany
  { id: 25, name: "Kai Havertz",           teamName: "Germany",       position: "Attacker"  },
  { id: 26, name: "Jamal Musiala",         teamName: "Germany",       position: "Midfielder"},
  { id: 27, name: "Leroy Sané",            teamName: "Germany",       position: "Attacker"  },
  { id: 28, name: "Florian Wirtz",         teamName: "Germany",       position: "Midfielder"},

  // Netherlands
  { id: 29, name: "Memphis Depay",         teamName: "Netherlands",   position: "Attacker"  },
  { id: 30, name: "Cody Gakpo",            teamName: "Netherlands",   position: "Attacker"  },
  { id: 31, name: "Virgil van Dijk",       teamName: "Netherlands",   position: "Defender"  },

  // Morocco
  { id: 32, name: "Hakim Ziyech",          teamName: "Morocco",       position: "Attacker"  },
  { id: 33, name: "Youssef En-Nesyri",     teamName: "Morocco",       position: "Attacker"  },
  { id: 34, name: "Achraf Hakimi",         teamName: "Morocco",       position: "Defender"  },

  // Belgium
  { id: 35, name: "Romelu Lukaku",         teamName: "Belgium",       position: "Attacker"  },
  { id: 36, name: "Kevin De Bruyne",       teamName: "Belgium",       position: "Midfielder"},

  // Colombia
  { id: 37, name: "Luis Díaz",             teamName: "Colombia",      position: "Attacker"  },
  { id: 38, name: "James Rodríguez",       teamName: "Colombia",      position: "Midfielder"},

  // Uruguay
  { id: 39, name: "Darwin Núñez",          teamName: "Uruguay",       position: "Attacker"  },
  { id: 40, name: "Federico Valverde",     teamName: "Uruguay",       position: "Midfielder"},

  // United States
  { id: 41, name: "Christian Pulisic",     teamName: "United States", position: "Attacker"  },
  { id: 42, name: "Gio Reyna",             teamName: "United States", position: "Midfielder"},

  // Japan
  { id: 43, name: "Takumi Minamino",       teamName: "Japan",         position: "Attacker"  },
  { id: 44, name: "Junya Ito",             teamName: "Japan",         position: "Attacker"  },

  // Senegal
  { id: 45, name: "Sadio Mané",            teamName: "Senegal",       position: "Attacker"  },

  // Croatia
  { id: 46, name: "Luka Modrić",           teamName: "Croatia",       position: "Midfielder"},
  { id: 47, name: "Ivan Perišić",          teamName: "Croatia",       position: "Attacker"  },

  // Mexico
  { id: 48, name: "Hirving Lozano",        teamName: "Mexico",        position: "Attacker"  },
  { id: 49, name: "Raúl Jiménez",          teamName: "Mexico",        position: "Attacker"  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  Mock Player Seeder (no API key needed)  ");
  console.log("═══════════════════════════════════════════\n");

  // 1. Fetch all teams from DB → build name → id lookup
  console.log("📋  Fetching teams from Supabase…");
  const { data: teams, error: teamsErr } = await supabase
    .from("teams")
    .select("id, name");

  if (teamsErr || !teams) {
    console.error("❌  Could not load teams:", teamsErr?.message);
    process.exit(1);
  }

  const teamIdByName = new Map<string, number>(
    teams.map((t) => [t.name, t.id])
  );
  console.log(`    Loaded ${teams.length} teams.\n`);

  // 2. Resolve team_id for each mock player
  const rows: { id: number; name: string; team_id: number; position: string; goals: number; assists: number }[] = [];
  const missing: string[] = [];

  for (const p of MOCK_PLAYERS) {
    const teamId = teamIdByName.get(p.teamName);
    if (!teamId) {
      missing.push(`${p.name} (team: "${p.teamName}")`);
      continue;
    }
    rows.push({ id: p.id, name: p.name, team_id: teamId, position: p.position, goals: 0, assists: 0 });
  }

  if (missing.length) {
    console.warn("⚠️  Could not resolve team_id for:");
    missing.forEach((m) => console.warn(`    • ${m}`));
    console.warn('   (Make sure the team name matches exactly what\'s in the DB)\n');
  }

  // 3. Delete existing players
  console.log("🗑️   Clearing existing players…");
  const { error: delErr } = await supabase
    .from("players")
    .delete()
    .not("id", "is", null);

  if (delErr) {
    console.error("❌  Delete failed:", delErr.message);
    process.exit(1);
  }

  // 4. Insert mock players
  console.log(`⚽  Inserting ${rows.length} mock players…`);
  const { error: insErr } = await supabase
    .from("players")
    .insert(rows);

  if (insErr) {
    console.error("❌  Insert failed:", insErr.message);
    process.exit(1);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`✅  Done! Seeded ${rows.length} players.`);
  console.log("═══════════════════════════════════════════");
  console.log("\nPlayers by team:");

  const byTeam: Record<string, string[]> = {};
  for (const r of rows) {
    const teamName = teams.find((t) => t.id === r.team_id)?.name ?? "Unknown";
    byTeam[teamName] = [...(byTeam[teamName] ?? []), r.name];
  }
  Object.entries(byTeam)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([team, players]) =>
      console.log(`  ${team.padEnd(20)} ${players.join(", ")}`)
    );

  console.log("\nℹ️  Restart the Next.js dev server and go to /onboarding to see the player picker.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

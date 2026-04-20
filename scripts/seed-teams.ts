/**
 * Seed all 48 FIFA World Cup 2026 teams into the `teams` table.
 * Groups are based on the December 5, 2024 draw in Miami — verify against
 * the official FIFA site if any group letter needs correcting.
 *
 * Usage:  npm run seed:teams
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  console.error("Get it from: Supabase Dashboard → Settings → API → service_role");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceKey,
  { auth: { persistSession: false } }
);

const teams = [
  // ── Group A ──────────────────────────────────────────────
  { name: "Mexico",                   group_letter: "A" },
  { name: "South Africa",             group_letter: "A" },
  { name: "South Korea",              group_letter: "A" },
  { name: "Czech Republic",           group_letter: "A" },
  // ── Group B ──────────────────────────────────────────────
  { name: "Canada",                   group_letter: "B" },
  { name: "Bosnia and Herzegovina",   group_letter: "B" },
  { name: "Qatar",                    group_letter: "B" },
  { name: "Switzerland",              group_letter: "B" },
  // ── Group C ──────────────────────────────────────────────
  { name: "United States",            group_letter: "C" },
  { name: "Paraguay",                 group_letter: "C" },
  { name: "Australia",                group_letter: "C" },
  { name: "Turkiye",                  group_letter: "C" },
  // ── Group D ──────────────────────────────────────────────
  { name: "Brazil",                   group_letter: "D" },
  { name: "Morocco",                  group_letter: "D" },
  { name: "Haiti",                    group_letter: "D" },
  { name: "Scotland",                 group_letter: "D" },
  // ── Group E ──────────────────────────────────────────────
  { name: "Germany",                  group_letter: "E" },
  { name: "Curaçao",                  group_letter: "E" },
  { name: "Ivory Coast",              group_letter: "E" },
  { name: "Ecuador",                  group_letter: "E" },
  // ── Group F ──────────────────────────────────────────────
  { name: "Netherlands",              group_letter: "F" },
  { name: "Japan",                    group_letter: "F" },
  { name: "Sweden",                   group_letter: "F" },
  { name: "Tunisia",                  group_letter: "F" },
  // ── Group G ──────────────────────────────────────────────
  { name: "Spain",                    group_letter: "G" },
  { name: "Cape Verde",               group_letter: "G" },
  { name: "Saudi Arabia",             group_letter: "G" },
  { name: "Uruguay",                  group_letter: "G" },
  // ── Group H ──────────────────────────────────────────────
  { name: "Belgium",                  group_letter: "H" },
  { name: "Egypt",                    group_letter: "H" },
  { name: "Iran",                     group_letter: "H" },
  { name: "New Zealand",              group_letter: "H" },
  // ── Group I ──────────────────────────────────────────────
  { name: "France",                   group_letter: "I" },
  { name: "Senegal",                  group_letter: "I" },
  { name: "Iraq",                     group_letter: "I" },
  { name: "Norway",                   group_letter: "I" },
  // ── Group J ──────────────────────────────────────────────
  { name: "Argentina",                group_letter: "J" },
  { name: "Algeria",                  group_letter: "J" },
  { name: "Austria",                  group_letter: "J" },
  { name: "Jordan",                   group_letter: "J" },
  // ── Group K ──────────────────────────────────────────────
  { name: "Portugal",                 group_letter: "K" },
  { name: "DR Congo",                 group_letter: "K" },
  { name: "Ghana",                    group_letter: "K" },
  { name: "Panama",                   group_letter: "K" },
  // ── Group L ──────────────────────────────────────────────
  { name: "England",                  group_letter: "L" },
  { name: "Croatia",                  group_letter: "L" },
  { name: "Uzbekistan",               group_letter: "L" },
  { name: "Colombia",                 group_letter: "L" },
];

async function main() {
  console.log(`Seeding ${teams.length} teams...`);

  const { data, error } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "name" })
    .select("id, name, group_letter");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${data?.length} teams successfully.`);

  // Print a summary grouped by letter
  const byGroup: Record<string, string[]> = {};
  data?.forEach((t) => {
    byGroup[t.group_letter] = [...(byGroup[t.group_letter] ?? []), t.name];
  });
  Object.entries(byGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([g, names]) => console.log(`  Group ${g}: ${names.join(", ")}`));
}

main();

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const teams = [
  // ── Group A ──────────────────────────────────────────────
  { name: "United States",   group_letter: "A" },
  { name: "Morocco",         group_letter: "A" },
  { name: "Germany",         group_letter: "A" },
  { name: "Japan",           group_letter: "A" },
  // ── Group B ──────────────────────────────────────────────
  { name: "Mexico",          group_letter: "B" },
  { name: "Senegal",         group_letter: "B" },
  { name: "France",          group_letter: "B" },
  { name: "South Korea",     group_letter: "B" },
  // ── Group C ──────────────────────────────────────────────
  { name: "Canada",          group_letter: "C" },
  { name: "Nigeria",         group_letter: "C" },
  { name: "Spain",           group_letter: "C" },
  { name: "Australia",       group_letter: "C" },
  // ── Group D ──────────────────────────────────────────────
  { name: "Argentina",       group_letter: "D" },
  { name: "Egypt",           group_letter: "D" },
  { name: "Croatia",         group_letter: "D" },
  { name: "Iran",            group_letter: "D" },
  // ── Group E ──────────────────────────────────────────────
  { name: "Brazil",          group_letter: "E" },
  { name: "Ivory Coast",     group_letter: "E" },
  { name: "Serbia",          group_letter: "E" },
  { name: "Saudi Arabia",    group_letter: "E" },
  // ── Group F ──────────────────────────────────────────────
  { name: "England",         group_letter: "F" },
  { name: "Uruguay",         group_letter: "F" },
  { name: "Austria",         group_letter: "F" },
  { name: "Qatar",           group_letter: "F" },
  // ── Group G ──────────────────────────────────────────────
  { name: "Portugal",        group_letter: "G" },
  { name: "Colombia",        group_letter: "G" },
  { name: "Denmark",         group_letter: "G" },
  { name: "Uzbekistan",      group_letter: "G" },
  // ── Group H ──────────────────────────────────────────────
  { name: "Netherlands",     group_letter: "H" },
  { name: "Ecuador",         group_letter: "H" },
  { name: "Switzerland",     group_letter: "H" },
  { name: "Jordan",          group_letter: "H" },
  // ── Group I ──────────────────────────────────────────────
  { name: "Belgium",         group_letter: "I" },
  { name: "Paraguay",        group_letter: "I" },
  { name: "Hungary",         group_letter: "I" },
  { name: "DR Congo",        group_letter: "I" },
  // ── Group J ──────────────────────────────────────────────
  { name: "Italy",           group_letter: "J" },
  { name: "Panama",          group_letter: "J" },
  { name: "Slovakia",        group_letter: "J" },
  { name: "South Africa",    group_letter: "J" },
  // ── Group K ──────────────────────────────────────────────
  { name: "Romania",         group_letter: "K" },
  { name: "Honduras",        group_letter: "K" },
  { name: "Algeria",         group_letter: "K" },
  { name: "New Zealand",     group_letter: "K" },
  // ── Group L ──────────────────────────────────────────────
  { name: "Chile",           group_letter: "L" },
  { name: "Costa Rica",      group_letter: "L" },
  { name: "Cameroon",        group_letter: "L" },
  { name: "Jamaica",         group_letter: "L" },
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

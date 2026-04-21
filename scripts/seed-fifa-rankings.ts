import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceKey || !supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const FIFA_RANKINGS = [
  { name: "Mexico", ranking: 15 },
  { name: "South Africa", ranking: 60 },
  { name: "South Korea", ranking: 25 },
  { name: "Czech Republic", ranking: 41 },
  { name: "Canada", ranking: 30 },
  { name: "Bosnia and Herzegovina", ranking: 65 },
  { name: "Qatar", ranking: 55 },
  { name: "Switzerland", ranking: 19 },
  { name: "United States", ranking: 16 },
  { name: "Paraguay", ranking: 40 },
  { name: "Australia", ranking: 27 },
  { name: "Turkiye", ranking: 22 },
  { name: "Brazil", ranking: 6 },
  { name: "Morocco", ranking: 8 },
  { name: "Haiti", ranking: 83 },
  { name: "Scotland", ranking: 43 },
  { name: "Germany", ranking: 10 },
  { name: "Curacao", ranking: 82 },
  { name: "Ivory Coast", ranking: 34 },
  { name: "Ecuador", ranking: 23 },
  { name: "Netherlands", ranking: 7 },
  { name: "Japan", ranking: 18 },
  { name: "Sweden", ranking: 38 },
  { name: "Tunisia", ranking: 44 },
  { name: "Spain", ranking: 2 },
  { name: "Cape Verde", ranking: 69 },
  { name: "Saudi Arabia", ranking: 61 },
  { name: "Uruguay", ranking: 17 },
  { name: "Belgium", ranking: 9 },
  { name: "Egypt", ranking: 29 },
  { name: "Iran", ranking: 21 },
  { name: "New Zealand", ranking: 85 },
  { name: "France", ranking: 1 },
  { name: "Senegal", ranking: 14 },
  { name: "Iraq", ranking: 57 },
  { name: "Norway", ranking: 31 },
  { name: "Argentina", ranking: 3 },
  { name: "Algeria", ranking: 28 },
  { name: "Austria", ranking: 24 },
  { name: "Jordan", ranking: 63 },
  { name: "Portugal", ranking: 5 },
  { name: "DR Congo", ranking: 46 },
  { name: "Ghana", ranking: 74 },
  { name: "Panama", ranking: 33 },
  { name: "England", ranking: 4 },
  { name: "Croatia", ranking: 11 },
  { name: "Uzbekistan", ranking: 50 },
  { name: "Colombia", ranking: 13 },
] as const;

function normalizeTeamName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00A7\u00E7\u00C7]/g, "c")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

async function main() {
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name");

  if (error) {
    console.error("Failed to read teams:", error.message);
    process.exit(1);
  }

  const teamsByNormalizedName = new Map(
    (teams ?? []).map((team) => [normalizeTeamName(team.name), team]),
  );

  const missing: string[] = [];

  for (const item of FIFA_RANKINGS) {
    const team = teamsByNormalizedName.get(normalizeTeamName(item.name));

    if (!team) {
      missing.push(item.name);
      continue;
    }

    const { error: updateError } = await supabase
      .from("teams")
      .update({ fifa_ranking: item.ranking })
      .eq("id", team.id);

    if (updateError) {
      console.error(`Failed updating ${item.name}:`, updateError.message);
      process.exit(1);
    }
  }

  if (missing.length > 0) {
    console.error("Could not match ranking data for these teams:");
    missing.forEach((name) => console.error(`- ${name}`));
    process.exit(1);
  }

  console.log(`Updated FIFA rankings for ${FIFA_RANKINGS.length} teams.`);
}

main().catch((error) => {
  console.error("Unexpected error while seeding FIFA rankings:", error);
  process.exit(1);
});

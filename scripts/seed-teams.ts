/**
 * Seed all 48 FIFA World Cup 2026 teams.
 * Clears the table first, then inserts fresh data.
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
  // Group A
  { name: "Mexico",                 name_he: "מקסיקו",              flag: "🇲🇽", group_letter: "A" },
  { name: "South Africa",           name_he: "דרום אפריקה",          flag: "🇿🇦", group_letter: "A" },
  { name: "South Korea",            name_he: "דרום קוריאה",          flag: "🇰🇷", group_letter: "A" },
  { name: "Czech Republic",         name_he: "צ'כיה",               flag: "🇨🇿", group_letter: "A" },
  // Group B
  { name: "Canada",                 name_he: "קנדה",                flag: "🇨🇦", group_letter: "B" },
  { name: "Bosnia and Herzegovina", name_he: "בוסניה והרצגובינה",    flag: "🇧🇦", group_letter: "B" },
  { name: "Qatar",                  name_he: "קטאר",                flag: "🇶🇦", group_letter: "B" },
  { name: "Switzerland",            name_he: "שווייץ",              flag: "🇨🇭", group_letter: "B" },
  // Group C
  { name: "United States",          name_he: "ארצות הברית",          flag: "🇺🇸", group_letter: "C" },
  { name: "Paraguay",               name_he: "פרגוואי",             flag: "🇵🇾", group_letter: "C" },
  { name: "Australia",              name_he: "אוסטרליה",            flag: "🇦🇺", group_letter: "C" },
  { name: "Turkiye",                name_he: "טורקיה",              flag: "🇹🇷", group_letter: "C" },
  // Group D
  { name: "Brazil",                 name_he: "ברזיל",               flag: "🇧🇷", group_letter: "D" },
  { name: "Morocco",                name_he: "מרוקו",               flag: "🇲🇦", group_letter: "D" },
  { name: "Haiti",                  name_he: "האיטי",               flag: "🇭🇹", group_letter: "D" },
  { name: "Scotland",               name_he: "סקוטלנד",             flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group_letter: "D" },
  // Group E
  { name: "Germany",                name_he: "גרמניה",              flag: "🇩🇪", group_letter: "E" },
  { name: "Curaçao",                name_he: "קוראסאו",             flag: "🇨🇼", group_letter: "E" },
  { name: "Ivory Coast",            name_he: "חוף השנהב",           flag: "🇨🇮", group_letter: "E" },
  { name: "Ecuador",                name_he: "אקוודור",             flag: "🇪🇨", group_letter: "E" },
  // Group F
  { name: "Netherlands",            name_he: "הולנד",               flag: "🇳🇱", group_letter: "F" },
  { name: "Japan",                  name_he: "יפן",                 flag: "🇯🇵", group_letter: "F" },
  { name: "Sweden",                 name_he: "שוודיה",              flag: "🇸🇪", group_letter: "F" },
  { name: "Tunisia",                name_he: "תוניסיה",             flag: "🇹🇳", group_letter: "F" },
  // Group G
  { name: "Spain",                  name_he: "ספרד",                flag: "🇪🇸", group_letter: "G" },
  { name: "Cape Verde",             name_he: "כף ורדה",             flag: "🇨🇻", group_letter: "G" },
  { name: "Saudi Arabia",           name_he: "ערב הסעודית",          flag: "🇸🇦", group_letter: "G" },
  { name: "Uruguay",                name_he: "אורוגוואי",           flag: "🇺🇾", group_letter: "G" },
  // Group H
  { name: "Belgium",                name_he: "בלגיה",               flag: "🇧🇪", group_letter: "H" },
  { name: "Egypt",                  name_he: "מצרים",               flag: "🇪🇬", group_letter: "H" },
  { name: "Iran",                   name_he: "איראן",               flag: "🇮🇷", group_letter: "H" },
  { name: "New Zealand",            name_he: "ניו זילנד",           flag: "🇳🇿", group_letter: "H" },
  // Group I
  { name: "France",                 name_he: "צרפת",                flag: "🇫🇷", group_letter: "I" },
  { name: "Senegal",                name_he: "סנגל",                flag: "🇸🇳", group_letter: "I" },
  { name: "Iraq",                   name_he: "עיראק",               flag: "🇮🇶", group_letter: "I" },
  { name: "Norway",                 name_he: "נורווגיה",            flag: "🇳🇴", group_letter: "I" },
  // Group J
  { name: "Argentina",              name_he: "ארגנטינה",            flag: "🇦🇷", group_letter: "J" },
  { name: "Algeria",                name_he: "אלג'יריה",            flag: "🇩🇿", group_letter: "J" },
  { name: "Austria",                name_he: "אוסטריה",             flag: "🇦🇹", group_letter: "J" },
  { name: "Jordan",                 name_he: "ירדן",                flag: "🇯🇴", group_letter: "J" },
  // Group K
  { name: "Portugal",               name_he: "פורטוגל",             flag: "🇵🇹", group_letter: "K" },
  { name: "DR Congo",               name_he: "קונגו",               flag: "🇨🇩", group_letter: "K" },
  { name: "Ghana",                  name_he: "גאנה",                flag: "🇬🇭", group_letter: "K" },
  { name: "Panama",                 name_he: "פנמה",                flag: "🇵🇦", group_letter: "K" },
  // Group L
  { name: "England",                name_he: "אנגליה",              flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group_letter: "L" },
  { name: "Croatia",                name_he: "קרואטיה",             flag: "🇭🇷", group_letter: "L" },
  { name: "Uzbekistan",             name_he: "אוזבקיסטן",           flag: "🇺🇿", group_letter: "L" },
  { name: "Colombia",               name_he: "קולומביה",            flag: "🇨🇴", group_letter: "L" },
];

async function main() {
  console.log("Clearing existing teams...");
  const { error: delError } = await supabase
    .from("teams")
    .delete()
    .not("id", "is", null);

  if (delError) {
    console.error("Delete failed:", delError.message);
    process.exit(1);
  }

  console.log(`Seeding ${teams.length} teams...`);
  const { data, error } = await supabase
    .from("teams")
    .insert(teams)
    .select("name_he, flag, group_letter");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${data?.length} teams successfully.`);
  const byGroup: Record<string, string[]> = {};
  data?.forEach((t) => {
    byGroup[t.group_letter] = [...(byGroup[t.group_letter] ?? []), `${t.flag} ${t.name_he}`];
  });
  Object.entries(byGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([g, names]) => console.log(`  בית ${g}: ${names.join("  ")}`));
}

main();

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

// ISO 3166-1 alpha-2 codes for flagcdn.com
// Subdivision codes for nations without their own ISO country code
const FLAG_CODES: Record<string, string> = {
  "Mexico":                 "mx",  "South Africa":           "za",
  "South Korea":            "kr",  "Czech Republic":         "cz",
  "Canada":                 "ca",  "Bosnia and Herzegovina": "ba",
  "Qatar":                  "qa",  "Switzerland":            "ch",
  "United States":          "us",  "Paraguay":               "py",
  "Australia":              "au",  "Turkiye":                "tr",
  "Brazil":                 "br",  "Morocco":                "ma",
  "Haiti":                  "ht",  "Scotland":               "gb-sct",
  "Germany":                "de",  "Curaçao":                "cw",
  "Ivory Coast":            "ci",  "Ecuador":                "ec",
  "Netherlands":            "nl",  "Japan":                  "jp",
  "Sweden":                 "se",  "Tunisia":                "tn",
  "Spain":                  "es",  "Cape Verde":             "cv",
  "Saudi Arabia":           "sa",  "Uruguay":                "uy",
  "Belgium":                "be",  "Egypt":                  "eg",
  "Iran":                   "ir",  "New Zealand":            "nz",
  "France":                 "fr",  "Senegal":                "sn",
  "Iraq":                   "iq",  "Norway":                 "no",
  "Argentina":              "ar",  "Algeria":                "dz",
  "Austria":                "at",  "Jordan":                 "jo",
  "Portugal":               "pt",  "DR Congo":               "cd",
  "Ghana":                  "gh",  "Panama":                 "pa",
  "England":                "gb-eng", "Croatia":             "hr",
  "Uzbekistan":             "uz",  "Colombia":               "co",
};

function logoUrl(name: string): string {
  const code = FLAG_CODES[name];
  return code ? `https://flagcdn.com/w80/${code}.png` : "";
}

const teams = [
  // Group A
  { name: "Mexico",                 name_he: "מקסיקו",            flag: "🇲🇽", group_letter: "A", logo_url: logoUrl("Mexico") },
  { name: "South Africa",           name_he: "דרום אפריקה",        flag: "🇿🇦", group_letter: "A", logo_url: logoUrl("South Africa") },
  { name: "South Korea",            name_he: "דרום קוריאה",        flag: "🇰🇷", group_letter: "A", logo_url: logoUrl("South Korea") },
  { name: "Czech Republic",         name_he: "צ'כיה",             flag: "🇨🇿", group_letter: "A", logo_url: logoUrl("Czech Republic") },
  // Group B
  { name: "Canada",                 name_he: "קנדה",              flag: "🇨🇦", group_letter: "B", logo_url: logoUrl("Canada") },
  { name: "Bosnia and Herzegovina", name_he: "בוסניה והרצגובינה",  flag: "🇧🇦", group_letter: "B", logo_url: logoUrl("Bosnia and Herzegovina") },
  { name: "Qatar",                  name_he: "קטאר",              flag: "🇶🇦", group_letter: "B", logo_url: logoUrl("Qatar") },
  { name: "Switzerland",            name_he: "שווייץ",            flag: "🇨🇭", group_letter: "B", logo_url: logoUrl("Switzerland") },
  // Group C
  { name: "Brazil",                 name_he: "ברזיל",             flag: "🇧🇷", group_letter: "C", logo_url: logoUrl("Brazil") },
  { name: "Morocco",                name_he: "מרוקו",             flag: "🇲🇦", group_letter: "C", logo_url: logoUrl("Morocco") },
  { name: "Scotland",               name_he: "סקוטלנד",           flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group_letter: "C", logo_url: logoUrl("Scotland") },
  { name: "Haiti",                  name_he: "האיטי",             flag: "🇭🇹", group_letter: "C", logo_url: logoUrl("Haiti") },
  // Group D
  { name: "United States",          name_he: "ארצות הברית",        flag: "🇺🇸", group_letter: "D", logo_url: logoUrl("United States") },
  { name: "Australia",              name_he: "אוסטרליה",          flag: "🇦🇺", group_letter: "D", logo_url: logoUrl("Australia") },
  { name: "Paraguay",               name_he: "פרגוואי",           flag: "🇵🇾", group_letter: "D", logo_url: logoUrl("Paraguay") },
  { name: "Turkiye",                name_he: "טורקיה",            flag: "🇹🇷", group_letter: "D", logo_url: logoUrl("Turkiye") },
  // Group E
  { name: "Germany",                name_he: "גרמניה",            flag: "🇩🇪", group_letter: "E", logo_url: logoUrl("Germany") },
  { name: "Curaçao",                name_he: "קוראסאו",           flag: "🇨🇼", group_letter: "E", logo_url: logoUrl("Curaçao") },
  { name: "Ivory Coast",            name_he: "חוף השנהב",         flag: "🇨🇮", group_letter: "E", logo_url: logoUrl("Ivory Coast") },
  { name: "Ecuador",                name_he: "אקוודור",           flag: "🇪🇨", group_letter: "E", logo_url: logoUrl("Ecuador") },
  // Group F
  { name: "Netherlands",            name_he: "הולנד",             flag: "🇳🇱", group_letter: "F", logo_url: logoUrl("Netherlands") },
  { name: "Japan",                  name_he: "יפן",               flag: "🇯🇵", group_letter: "F", logo_url: logoUrl("Japan") },
  { name: "Sweden",                 name_he: "שוודיה",            flag: "🇸🇪", group_letter: "F", logo_url: logoUrl("Sweden") },
  { name: "Tunisia",                name_he: "תוניסיה",           flag: "🇹🇳", group_letter: "F", logo_url: logoUrl("Tunisia") },
  // Group G
  { name: "Belgium",                name_he: "בלגיה",             flag: "🇧🇪", group_letter: "G", logo_url: logoUrl("Belgium") },
  { name: "Iran",                   name_he: "איראן",             flag: "🇮🇷", group_letter: "G", logo_url: logoUrl("Iran") },
  { name: "Egypt",                  name_he: "מצרים",             flag: "🇪🇬", group_letter: "G", logo_url: logoUrl("Egypt") },
  { name: "New Zealand",            name_he: "ניו זילנד",         flag: "🇳🇿", group_letter: "G", logo_url: logoUrl("New Zealand") },
  // Group H
  { name: "Spain",                  name_he: "ספרד",              flag: "🇪🇸", group_letter: "H", logo_url: logoUrl("Spain") },
  { name: "Uruguay",                name_he: "אורוגוואי",         flag: "🇺🇾", group_letter: "H", logo_url: logoUrl("Uruguay") },
  { name: "Saudi Arabia",           name_he: "ערב הסעודית",        flag: "🇸🇦", group_letter: "H", logo_url: logoUrl("Saudi Arabia") },
  { name: "Cape Verde",             name_he: "כף ורדה",           flag: "🇨🇻", group_letter: "H", logo_url: logoUrl("Cape Verde") },
  // Group I
  { name: "France",                 name_he: "צרפת",              flag: "🇫🇷", group_letter: "I", logo_url: logoUrl("France") },
  { name: "Senegal",                name_he: "סנגל",              flag: "🇸🇳", group_letter: "I", logo_url: logoUrl("Senegal") },
  { name: "Iraq",                   name_he: "עיראק",             flag: "🇮🇶", group_letter: "I", logo_url: logoUrl("Iraq") },
  { name: "Norway",                 name_he: "נורווגיה",          flag: "🇳🇴", group_letter: "I", logo_url: logoUrl("Norway") },
  // Group J
  { name: "Argentina",              name_he: "ארגנטינה",          flag: "🇦🇷", group_letter: "J", logo_url: logoUrl("Argentina") },
  { name: "Algeria",                name_he: "אלג'יריה",          flag: "🇩🇿", group_letter: "J", logo_url: logoUrl("Algeria") },
  { name: "Austria",                name_he: "אוסטריה",           flag: "🇦🇹", group_letter: "J", logo_url: logoUrl("Austria") },
  { name: "Jordan",                 name_he: "ירדן",              flag: "🇯🇴", group_letter: "J", logo_url: logoUrl("Jordan") },
  // Group K
  { name: "Portugal",               name_he: "פורטוגל",           flag: "🇵🇹", group_letter: "K", logo_url: logoUrl("Portugal") },
  { name: "Colombia",               name_he: "קולומביה",          flag: "🇨🇴", group_letter: "K", logo_url: logoUrl("Colombia") },
  { name: "Uzbekistan",             name_he: "אוזבקיסטן",         flag: "🇺🇿", group_letter: "K", logo_url: logoUrl("Uzbekistan") },
  { name: "DR Congo",               name_he: "קונגו",             flag: "🇨🇩", group_letter: "K", logo_url: logoUrl("DR Congo") },
  // Group L
  { name: "England",                name_he: "אנגליה",            flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group_letter: "L", logo_url: logoUrl("England") },
  { name: "Croatia",                name_he: "קרואטיה",           flag: "🇭🇷", group_letter: "L", logo_url: logoUrl("Croatia") },
  { name: "Panama",                 name_he: "פנמה",              flag: "🇵🇦", group_letter: "L", logo_url: logoUrl("Panama") },
  { name: "Ghana",                  name_he: "גאנה",              flag: "🇬🇭", group_letter: "L", logo_url: logoUrl("Ghana") },
];

async function main() {
  // Try update-in-place first (preserves FKs from outright_bets/players)
  console.log(`Upserting ${teams.length} teams (update if exists, insert if new)…`);

  // First check if any teams exist
  const { data: existing } = await supabase.from("teams").select("id").limit(1);
  const hasExisting = (existing?.length ?? 0) > 0;

  let data: typeof teams | null = null;
  let error: { message: string } | null = null;

  if (hasExisting) {
    // Update each team by name match
    const results = await Promise.all(
      teams.map((t) =>
        supabase
          .from("teams")
          .update({ name_he: t.name_he, flag: t.flag, group_letter: t.group_letter, logo_url: t.logo_url })
          .eq("name", t.name)
          .select("name_he, flag, group_letter, logo_url")
      )
    );
    const allData = results.flatMap((r) => r.data ?? []);
    const firstErr = results.find((r) => r.error)?.error ?? null;
    data = allData as typeof teams;
    error = firstErr;
  } else {
    // Fresh insert
    const res = await supabase
      .from("teams")
      .insert(teams)
      .select("name_he, flag, group_letter, logo_url");
    data = res.data as typeof teams;
    error = res.error;
  }

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`✓ Seeded ${data?.length} teams successfully.\n`);
  const byGroup: Record<string, string[]> = {};
  data?.forEach((t) => {
    byGroup[t.group_letter] = [
      ...(byGroup[t.group_letter] ?? []),
      `${t.flag} ${t.name_he}`,
    ];
  });
  Object.entries(byGroup)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([g, names]) => console.log(`  בית ${g}: ${names.join("  ")}`));

  console.log("\n✓ logo_url set to flagcdn.com/w80/{code}.png for all teams.");
}

main();

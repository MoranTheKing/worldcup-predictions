import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

type KnockoutPlaceholderRow = {
  match_number: number;
  home: string;
  away: string;
};

const OFFICIAL_KNOCKOUT_PLACEHOLDERS: KnockoutPlaceholderRow[] = [
  { match_number: 73, home: "2A", away: "2B" },
  { match_number: 74, home: "1E", away: "3A/B/C/D/F" },
  { match_number: 75, home: "1F", away: "2C" },
  { match_number: 76, home: "1C", away: "2F" },
  { match_number: 77, home: "1I", away: "3C/D/F/G/H" },
  { match_number: 78, home: "2E", away: "2I" },
  { match_number: 79, home: "1A", away: "3C/E/F/H/I" },
  { match_number: 80, home: "1L", away: "3E/H/I/J/K" },
  { match_number: 81, home: "1D", away: "3B/E/F/I/J" },
  { match_number: 82, home: "1G", away: "3A/E/H/I/J" },
  { match_number: 83, home: "2K", away: "2L" },
  { match_number: 84, home: "1H", away: "2J" },
  { match_number: 85, home: "1B", away: "3E/F/G/I/J" },
  { match_number: 86, home: "1J", away: "2H" },
  { match_number: 87, home: "1K", away: "3D/E/I/J/L" },
  { match_number: 88, home: "2D", away: "2G" },
  { match_number: 89, home: "Winner Match 74", away: "Winner Match 77" },
  { match_number: 90, home: "Winner Match 73", away: "Winner Match 75" },
  { match_number: 91, home: "Winner Match 76", away: "Winner Match 78" },
  { match_number: 92, home: "Winner Match 79", away: "Winner Match 80" },
  { match_number: 93, home: "Winner Match 83", away: "Winner Match 84" },
  { match_number: 94, home: "Winner Match 81", away: "Winner Match 82" },
  { match_number: 95, home: "Winner Match 86", away: "Winner Match 88" },
  { match_number: 96, home: "Winner Match 85", away: "Winner Match 87" },
  { match_number: 97, home: "Winner Match 89", away: "Winner Match 90" },
  { match_number: 98, home: "Winner Match 93", away: "Winner Match 94" },
  { match_number: 99, home: "Winner Match 91", away: "Winner Match 92" },
  { match_number: 100, home: "Winner Match 95", away: "Winner Match 96" },
  { match_number: 101, home: "Winner Match 97", away: "Winner Match 98" },
  { match_number: 102, home: "Winner Match 99", away: "Winner Match 100" },
  { match_number: 103, home: "Loser Match 101", away: "Loser Match 102" },
  { match_number: 104, home: "Winner Match 101", away: "Winner Match 102" },
];

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!serviceKey || !supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const progressionModule = (await import("../lib/tournament/knockout-progression")) as {
    default?: unknown;
    "module.exports"?: unknown;
  };
  const progressionExports = (
    progressionModule.default ??
    progressionModule["module.exports"] ??
    progressionModule
  ) as {
    syncTournamentState: (client: typeof supabase) => Promise<{
      updatedMatches: number;
      qualifiedThirdPlaceGroups: string[];
      resolvedSlots: number;
    }>;
  };
  const { syncTournamentState } = progressionExports;

  const { data: existingMatches, error: fetchError } = await supabase
    .from("matches")
    .select("match_number")
    .gte("match_number", 73)
    .lte("match_number", 104)
    .order("match_number", { ascending: true });

  if (fetchError) {
    throw new Error(`Failed reading knockout matches: ${fetchError.message}`);
  }

  if ((existingMatches ?? []).length !== OFFICIAL_KNOCKOUT_PLACEHOLDERS.length) {
    throw new Error(
      `Expected ${OFFICIAL_KNOCKOUT_PLACEHOLDERS.length} knockout matches in DB, found ${existingMatches?.length ?? 0}.`,
    );
  }

  for (const row of OFFICIAL_KNOCKOUT_PLACEHOLDERS) {
    const { error } = await supabase
      .from("matches")
      .update({
        home_placeholder: row.home,
        away_placeholder: row.away,
      })
      .eq("match_number", row.match_number);

    if (error) {
      throw new Error(`Failed updating match ${row.match_number}: ${error.message}`);
    }
  }

  const sync = await syncTournamentState(supabase);

  const { data: verified, error: verifyError } = await supabase
    .from("matches")
    .select("match_number, home_placeholder, away_placeholder")
    .gte("match_number", 73)
    .lte("match_number", 104)
    .order("match_number", { ascending: true });

  if (verifyError) {
    throw new Error(`Failed verifying knockout placeholders: ${verifyError.message}`);
  }

  console.log(`Updated ${OFFICIAL_KNOCKOUT_PLACEHOLDERS.length} knockout placeholder rows.`);
  console.log(JSON.stringify({ sync, verified }, null, 2));
}

main().catch((error) => {
  console.error("Knockout placeholder update failed:", error);
  process.exit(1);
});

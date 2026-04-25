import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();

  // Explicitly wipe resolved team slots from all knockout matches so they
  // revert to placeholder display before the sync rebuilds them.
  const { error: knockoutError } = await supabase
    .from("matches")
    .update({ home_team_id: null, away_team_id: null })
    .gte("match_number", 73);

  if (knockoutError) {
    return NextResponse.json({ error: knockoutError.message }, { status: 500 });
  }

  const { error, count } = await supabase
    .from("matches")
    .update(
      {
        status: "scheduled",
        match_phase: null,
        home_score: 0,
        away_score: 0,
        minute: null,
        is_extra_time: false,
        home_penalty_score: null,
        away_penalty_score: null,
      },
      { count: "exact" },
    )
    .gte("match_number", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncTournamentState(supabase);

  return NextResponse.json({ reset: count ?? 0 });
}

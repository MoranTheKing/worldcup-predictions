import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

export async function POST() {
  const blocked = devOnly();
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("matches")
    .update(
      {
        status: "scheduled",
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

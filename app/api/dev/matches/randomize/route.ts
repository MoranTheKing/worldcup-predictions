import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isKnockoutStage, type TournamentMatchRecord } from "@/lib/tournament/matches";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

function randomScore() {
  return Math.floor(Math.random() * 5);
}

function randomPenaltyPair() {
  const home = 3 + Math.floor(Math.random() * 4);
  let away = 3 + Math.floor(Math.random() * 4);

  if (away === home) {
    away = away === 6 ? away - 1 : away + 1;
  }

  return { home, away };
}

export async function POST() {
  const blocked = devOnly();
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select("match_number, stage")
    .order("match_number", { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const matches = (matchesData ?? []) as Pick<TournamentMatchRecord, "match_number" | "stage">[];

  for (const match of matches) {
    const homeScore = randomScore();
    const awayScore = randomScore();
    const knockout = isKnockoutStage(match.stage);
    const penalties = knockout && homeScore === awayScore ? randomPenaltyPair() : null;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "finished",
        home_score: homeScore,
        away_score: awayScore,
        minute: null,
        is_extra_time: Boolean(penalties),
        home_penalty_score: penalties?.home ?? null,
        away_penalty_score: penalties?.away ?? null,
      })
      .eq("match_number", match.match_number);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const sync = await syncTournamentState(supabase);

  return NextResponse.json({
    randomized: matches.length,
    sync,
  });
}

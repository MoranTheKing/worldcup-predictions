import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { isKnockoutStage, type TournamentMatchRecord } from "@/lib/tournament/matches";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";
import { scoreFinishedMatchPredictions } from "@/lib/game/scoring-sync";

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

export async function POST(request: Request) {
  const blocked = devOnly(request);
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
  const clearDevEventsError = await clearDevMatchPlayerEvents(supabase);
  if (clearDevEventsError) {
    return NextResponse.json({ error: clearDevEventsError }, { status: 500 });
  }

  for (const match of matches) {
    const homeScore = randomScore();
    const awayScore = randomScore();
    const knockout = isKnockoutStage(match.stage);
    const penalties = knockout && homeScore === awayScore ? randomPenaltyPair() : null;

    const { error } = await supabase
      .from("matches")
      .update({
        status: "finished",
        match_phase: null,
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
  const scoring = await scoreFinishedMatchPredictions(
    supabase,
    matches.map((match) => match.match_number),
  );

  return NextResponse.json({
    randomized: matches.length,
    sync,
    scoring,
  });
}

async function clearDevMatchPlayerEvents(supabase: ReturnType<typeof createAdminClient>) {
  const { error } = await supabase
    .from("dev_match_player_events")
    .delete()
    .gte("match_number", 1);

  if (!error) return null;
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    String(error.message ?? "").includes("dev_match_player_events")
  ) {
    return null;
  }

  return error.message;
}

import { calculatePredictionPoints } from "@/lib/game/scoring";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type LiveMatchRow = {
  match_number: number | null;
  stage: string | null;
  home_score: number | null;
  away_score: number | null;
  home_odds: number | string | null;
  draw_odds: number | string | null;
  away_odds: number | string | null;
};

type LivePredictionRow = {
  match_id: number | null;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied?: boolean | null;
};

export type UserLiveScoreProjection = {
  liveScoreDelta: number | null;
  liveMatchCount: number;
  livePredictionCount: number;
};

export async function getUserLiveScoreProjection(
  supabase: AdminClient,
  userId: string,
): Promise<UserLiveScoreProjection> {
  const { data: rawLiveMatches, error: liveMatchesError } = await supabase
    .from("matches")
    .select(
      "match_number, stage, home_score, away_score, home_odds, draw_odds, away_odds",
    )
    .eq("status", "live")
    .order("match_number", { ascending: true })
    .limit(2);

  if (liveMatchesError) {
    console.error("[getUserLiveScoreProjection] live matches error:", liveMatchesError);
    return { liveScoreDelta: null, liveMatchCount: 0, livePredictionCount: 0 };
  }

  const liveMatches = ((rawLiveMatches ?? []) as LiveMatchRow[]).filter(
    (match): match is LiveMatchRow & { match_number: number; stage: string } =>
      typeof match.match_number === "number" && typeof match.stage === "string",
  );

  if (liveMatches.length === 0) {
    return { liveScoreDelta: null, liveMatchCount: 0, livePredictionCount: 0 };
  }

  const liveMatchIds = liveMatches.map((match) => match.match_number);
  const { data: rawPredictions, error: predictionsError } = await supabase
    .from("predictions")
    .select("match_id, home_score_guess, away_score_guess, is_joker_applied")
    .eq("user_id", userId)
    .in("match_id", liveMatchIds);

  if (predictionsError) {
    console.error("[getUserLiveScoreProjection] predictions error:", predictionsError);
    return {
      liveScoreDelta: 0,
      liveMatchCount: liveMatches.length,
      livePredictionCount: 0,
    };
  }

  const predictionsByMatch = new Map(
    ((rawPredictions ?? []) as LivePredictionRow[])
      .filter((prediction): prediction is LivePredictionRow & { match_id: number } =>
        typeof prediction.match_id === "number",
      )
      .map((prediction) => [prediction.match_id, prediction]),
  );

  const liveScoreDelta = liveMatches.reduce((total, match) => {
    const prediction = predictionsByMatch.get(match.match_number);
    if (!prediction) return total;

    return total + calculatePredictionPoints(prediction, match);
  }, 0);

  return {
    liveScoreDelta,
    liveMatchCount: liveMatches.length,
    livePredictionCount: predictionsByMatch.size,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePredictionPoints, type ScoringMatch } from "@/lib/game/scoring";

type ScoringPredictionRow = {
  user_id: string | null;
  match_id: number | null;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied: boolean | null;
  points_earned: number | null;
};

type ScoringMatchRow = ScoringMatch & {
  match_number: number;
  status: string | null;
};

export type FinishedMatchScoringResult = {
  scoredMatches: number;
  scoredPredictions: number;
  updatedPredictions: number;
  updatedProfiles: number;
};

export type ClearedMatchScoringResult = {
  clearedMatches: number;
  clearedPredictions: number;
  updatedProfiles: number;
};

export async function scoreFinishedMatchPredictions(
  supabase: SupabaseClient,
  matchNumbers: number | number[],
): Promise<FinishedMatchScoringResult> {
  const normalizedMatchNumbers = normalizeMatchNumbers(matchNumbers);
  if (normalizedMatchNumbers.length === 0) {
    return emptyResult();
  }

  const { data: matchesData, error: matchesError } = await supabase
    .from("matches")
    .select(
      "match_number, stage, status, home_score, away_score, home_odds, draw_odds, away_odds",
    )
    .in("match_number", normalizedMatchNumbers);

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const finishedMatches = ((matchesData ?? []) as ScoringMatchRow[]).filter(
    (match) =>
      match.status === "finished" &&
      typeof match.match_number === "number" &&
      typeof match.stage === "string",
  );

  if (finishedMatches.length === 0) {
    return emptyResult();
  }

  const matchesByNumber = new Map(
    finishedMatches.map((match) => [match.match_number, match]),
  );
  const { data: predictionsData, error: predictionsError } = await supabase
    .from("predictions")
    .select(
      "user_id, match_id, home_score_guess, away_score_guess, is_joker_applied, points_earned",
    )
    .in("match_id", Array.from(matchesByNumber.keys()));

  if (predictionsError) {
    throw new Error(predictionsError.message);
  }

  const predictions = ((predictionsData ?? []) as ScoringPredictionRow[]).filter(
    (prediction): prediction is ScoringPredictionRow & { user_id: string; match_id: number } =>
      typeof prediction.user_id === "string" && typeof prediction.match_id === "number",
  );

  const updatedRows = predictions
    .map((prediction) => {
      const match = matchesByNumber.get(prediction.match_id);
      if (!match) return null;

      const nextPoints = calculatePredictionPoints(prediction, match);
      if (prediction.points_earned === nextPoints) return null;

      return {
        user_id: prediction.user_id,
        match_id: prediction.match_id,
        home_score_guess: prediction.home_score_guess,
        away_score_guess: prediction.away_score_guess,
        is_joker_applied: prediction.is_joker_applied === true,
        points_earned: nextPoints,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (updatedRows.length > 0) {
    const { error: updateError } = await supabase
      .from("predictions")
      .upsert(updatedRows, { onConflict: "user_id,match_id" });

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  const updatedProfiles = await refreshProfileTotals(
    supabase,
    Array.from(new Set(predictions.map((prediction) => prediction.user_id))),
  );

  return {
    scoredMatches: finishedMatches.length,
    scoredPredictions: predictions.length,
    updatedPredictions: updatedRows.length,
    updatedProfiles,
  };
}

export async function clearUnfinishedMatchScoring(
  supabase: SupabaseClient,
  matchNumbers: number | number[],
): Promise<ClearedMatchScoringResult> {
  const normalizedMatchNumbers = normalizeMatchNumbers(matchNumbers);
  if (normalizedMatchNumbers.length === 0) {
    return {
      clearedMatches: 0,
      clearedPredictions: 0,
      updatedProfiles: 0,
    };
  }

  const { data: predictionsData, error: predictionsError } = await supabase
    .from("predictions")
    .select("user_id, match_id, points_earned")
    .in("match_id", normalizedMatchNumbers);

  if (predictionsError) {
    throw new Error(predictionsError.message);
  }

  const predictionsWithFinalScore = (
    (predictionsData ?? []) as Array<{
      user_id: string | null;
      match_id: number | null;
      points_earned: number | null;
    }>
  ).filter(
    (prediction): prediction is { user_id: string; match_id: number; points_earned: number } =>
      typeof prediction.user_id === "string" &&
      typeof prediction.match_id === "number" &&
      typeof prediction.points_earned === "number" &&
      prediction.points_earned !== 0,
  );

  if (predictionsWithFinalScore.length === 0) {
    return {
      clearedMatches: normalizedMatchNumbers.length,
      clearedPredictions: 0,
      updatedProfiles: 0,
    };
  }

  const { error: clearError } = await supabase
    .from("predictions")
    .update({ points_earned: 0 })
    .in("match_id", normalizedMatchNumbers)
    .neq("points_earned", 0);

  if (clearError) {
    throw new Error(clearError.message);
  }

  const updatedProfiles = await refreshProfileTotals(
    supabase,
    Array.from(new Set(predictionsWithFinalScore.map((prediction) => prediction.user_id))),
  );

  return {
    clearedMatches: normalizedMatchNumbers.length,
    clearedPredictions: predictionsWithFinalScore.length,
    updatedProfiles,
  };
}

async function refreshProfileTotals(supabase: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return 0;

  const { data, error } = await supabase
    .from("predictions")
    .select("user_id, points_earned")
    .in("user_id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ user_id: string | null; points_earned: number | null }>) {
    if (typeof row.user_id !== "string") continue;
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.points_earned ?? 0));
  }

  let updatedProfiles = 0;
  for (const userId of userIds) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ total_score: totals.get(userId) ?? 0 })
      .eq("id", userId);

    if (profileError) {
      throw new Error(profileError.message);
    }

    updatedProfiles += 1;
  }

  return updatedProfiles;
}

function normalizeMatchNumbers(matchNumbers: number | number[]) {
  const values = Array.isArray(matchNumbers) ? matchNumbers : [matchNumbers];
  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
  );
}

function emptyResult(): FinishedMatchScoringResult {
  return {
    scoredMatches: 0,
    scoredPredictions: 0,
    updatedPredictions: 0,
    updatedProfiles: 0,
  };
}

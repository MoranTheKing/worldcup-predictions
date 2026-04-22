type PredictionRow = {
  match_id: number | null;
  home_score_guess: number | null;
  away_score_guess: number | null;
};

type MatchRow = {
  match_number: number;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type GameStatsClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => Promise<{ data: PredictionRow[] | null; error: SupabaseLikeError | null }>;
      in: (column: string, values: number[]) => Promise<{ data: MatchRow[] | null; error: SupabaseLikeError | null }>;
    };
  };
};

export type UserGameStats = {
  totalHits: number;
};

export async function getUserGameStats(
  supabase: unknown,
  userId: string,
): Promise<UserGameStats> {
  try {
    const client = supabase as GameStatsClient;
    const predictionsResult = await client
      .from("predictions")
      .select("match_id, home_score_guess, away_score_guess")
      .eq("user_id", userId);

    if (predictionsResult.error) {
      console.error("[getUserGameStats] predictions query error:", formatSupabaseError(predictionsResult.error));
      return { totalHits: 0 };
    }

    const predictions = (predictionsResult.data ?? []).filter(
      (row): row is PredictionRow & { match_id: number; home_score_guess: number; away_score_guess: number } =>
        typeof row.match_id === "number" &&
        typeof row.home_score_guess === "number" &&
        typeof row.away_score_guess === "number",
    );

    if (predictions.length === 0) {
      return { totalHits: 0 };
    }

    const matchIds = predictions.map((row) => row.match_id);
    const matchesResult = await client
      .from("matches")
      .select("match_number, status, home_score, away_score")
      .in("match_number", matchIds);

    if (matchesResult.error) {
      console.error("[getUserGameStats] matches query error:", formatSupabaseError(matchesResult.error));
      return { totalHits: 0 };
    }

    const finishedMatches = new Map(
      (matchesResult.data ?? [])
        .filter(
          (row): row is MatchRow & { home_score: number; away_score: number } =>
            row.status === "finished" &&
            typeof row.match_number === "number" &&
            typeof row.home_score === "number" &&
            typeof row.away_score === "number",
        )
        .map((row) => [row.match_number, row]),
    );

    const totalHits = predictions.reduce((count, prediction) => {
      const match = finishedMatches.get(prediction.match_id);
      if (!match) return count;

      return match.home_score === prediction.home_score_guess &&
        match.away_score === prediction.away_score_guess
        ? count + 1
        : count;
    }, 0);

    return { totalHits };
  } catch (error) {
    console.error("[getUserGameStats] unexpected error:", error);
    return { totalHits: 0 };
  }
}

function formatSupabaseError(error: SupabaseLikeError | null) {
  if (!error) return "unknown error";
  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}

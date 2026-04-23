import { hasTournamentStarted } from "@/lib/game/tournament-start";

type QueryBuilder = {
  select: (columns: string) => QueryBuilder;
  eq: (column: string, value: string) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error?: { message?: string } | null }>;
};

type OnboardingClient = {
  from: (table: string) => QueryBuilder;
};

export type OnboardingStatus = {
  avatarUrl: string | null;
  displayName: string | null;
  hasTournamentPrediction: boolean;
  isComplete: boolean;
  tournamentPrediction: {
    predictedTopScorerName: string | null;
    predictedWinnerTeamId: string | null;
  } | null;
  tournamentStarted: boolean;
  username: string | null;
};

export async function fetchOnboardingStatus(
  supabase: unknown,
  userId: string,
): Promise<OnboardingStatus> {
  const client = supabase as OnboardingClient;
  const [
    { data: profileRow, error: profileError },
    { data: legacyRow, error: legacyError },
    { data: tournamentPredictionRow, error: tournamentPredictionError },
    { data: kickoffRow, error: kickoffError },
  ] = await Promise.all([
    client.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle(),
    client.from("users").select("username, avatar_url").eq("id", userId).maybeSingle(),
    client
      .from("tournament_predictions")
      .select("predicted_winner_team_id, predicted_top_scorer_name")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("matches")
      .select("status, date_time")
      .order("match_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  logFetchError("profiles", profileError);
  logFetchError("users", legacyError);
  logFetchError("tournament_predictions", tournamentPredictionError);
  logFetchError("matches", kickoffError);

  const displayName =
    asNullableString(profileRow?.display_name) ?? asNullableString(legacyRow?.username);
  const avatarUrl =
    asNullableString(profileRow?.avatar_url) ?? asNullableString(legacyRow?.avatar_url);
  const tournamentPrediction = tournamentPredictionRow
    ? {
        predictedWinnerTeamId: asNullableString(tournamentPredictionRow.predicted_winner_team_id),
        predictedTopScorerName: asNullableString(tournamentPredictionRow.predicted_top_scorer_name),
      }
    : null;
  const tournamentStarted = hasTournamentStarted(
    kickoffRow as { status?: string | null; date_time?: string | null } | null,
  );
  const hasTournamentPrediction = Boolean(
    tournamentPrediction?.predictedWinnerTeamId && tournamentPrediction.predictedTopScorerName,
  );

  return {
    avatarUrl,
    displayName,
    hasTournamentPrediction,
    isComplete: Boolean(displayName) && (tournamentStarted || hasTournamentPrediction),
    tournamentPrediction,
    tournamentStarted,
    username: asNullableString(legacyRow?.username),
  };
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function logFetchError(scope: string, error: { message?: string } | null | undefined) {
  if (error?.message) {
    console.error(`[fetchOnboardingStatus] ${scope} lookup failed:`, error.message);
  }
}

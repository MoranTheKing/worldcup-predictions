import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import PredictionsClient, { type MatchPredictionRow, type TeamOption, type TournamentPredRow } from "./PredictionsClient";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Scheduled matches + teams (same pattern as /dashboard/matches)
  const [{ data: matchesData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "match_number, stage, status, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, is_extra_time, home_penalty_score, away_penalty_score"
      )
      .eq("status", "scheduled")
      .order("date_time", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter")
      .order("name_he", { ascending: true }),
  ]);

  const scheduledMatches = attachTeamsToMatches(
    (matchesData ?? []) as Parameters<typeof attachTeamsToMatches>[0],
    (teamsData ?? []) as Parameters<typeof attachTeamsToMatches>[1]
  ) as MatchWithTeams[];

  // Teams for the outright winner dropdown
  const teamOptions: TeamOption[] = (teamsData ?? []).map((t) => ({
    id: String(t.id),
    name: (t as { name_he?: string; name: string }).name_he ?? (t as { name: string }).name,
  }));

  // Existing user predictions
  let existingPredictions: MatchPredictionRow[] = [];
  let tournamentPrediction: TournamentPredRow | null = null;

  if (user) {
    const [predsResult, tpResult] = await Promise.all([
      supabase
        .from("predictions")
        .select("match_id, home_score_guess, away_score_guess")
        .eq("user_id", user.id),
      supabase
        .from("tournament_predictions")
        .select("predicted_winner_team_id, predicted_top_scorer_name")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    existingPredictions = (predsResult.data ?? []) as MatchPredictionRow[];
    tournamentPrediction = tpResult.data as TournamentPredRow | null;
  }

  return (
    <PredictionsClient
      matches={scheduledMatches}
      teams={teamOptions}
      existingPredictions={existingPredictions}
      tournamentPrediction={tournamentPrediction}
      isAuthenticated={Boolean(user)}
    />
  );
}

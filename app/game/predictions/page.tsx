import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import PredictionsClient, {
  type MatchPredictionRow,
  type TournamentPredRow,
} from "./PredictionsClient";
import type { PickerTeam, PickerPlayer } from "./OutrightForm";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch scheduled matches + teams + players in parallel
  const [{ data: matchesData }, { data: teamsData }, { data: playersData }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "match_number, stage, status, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, is_extra_time, home_penalty_score, away_penalty_score"
        )
        .eq("status", "scheduled")
        // Only matches where BOTH teams are finalized (not null)
        .not("home_team_id", "is", null)
        .not("away_team_id", "is", null)
        .order("date_time", { ascending: true }),
      supabase
        .from("teams")
        .select("id, name, name_he, logo_url, group_letter")
        .order("name_he", { ascending: true }),
      supabase
        .from("players")
        .select("id, name, team_id, position")
        .order("name", { ascending: true }),
    ]);

  // Build matches with team objects attached
  const allMatches = attachTeamsToMatches(
    (matchesData ?? []) as Parameters<typeof attachTeamsToMatches>[0],
    (teamsData ?? []) as Parameters<typeof attachTeamsToMatches>[1]
  ) as MatchWithTeams[];

  // Secondary JS filter: ensure homeTeam and awayTeam resolved from the teams table
  const scheduledMatches = allMatches.filter(
    (m) => m.homeTeam !== null && m.awayTeam !== null
  );

  // Full team data for premium picker
  const teams: PickerTeam[] = (teamsData ?? []).map((t) => ({
    id: String(t.id),
    name: (t as { name: string }).name,
    name_he: (t as { name_he?: string | null }).name_he ?? null,
    logo_url: (t as { logo_url?: string | null }).logo_url ?? null,
  }));

  // Player data for premium picker
  const players: PickerPlayer[] = (playersData ?? []).map((p) => ({
    id: (p as { id: number }).id,
    name: (p as { name: string }).name,
    team_id: (p as { team_id?: string | null }).team_id
      ? String((p as { team_id: unknown }).team_id)
      : null,
    position: (p as { position?: string | null }).position ?? null,
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
      teams={teams}
      players={players}
      existingPredictions={existingPredictions}
      tournamentPrediction={tournamentPrediction}
      isAuthenticated={Boolean(user)}
    />
  );
}

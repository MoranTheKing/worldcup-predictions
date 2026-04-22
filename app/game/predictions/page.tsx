import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import PredictionsClient, {
  type MatchPredictionRow,
  type TournamentPredRow,
} from "./PredictionsClient";
import type { PickerPlayer, PickerTeam } from "./OutrightForm";
import { getUserJokerUsage } from "@/lib/game/boosters";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: matchesData }, { data: teamsData }, { data: playersData }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "match_number, stage, status, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, is_extra_time, home_penalty_score, away_penalty_score",
        )
        .eq("status", "scheduled")
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

  const scheduledMatches = attachTeamsToMatches(
    (matchesData ?? []) as Parameters<typeof attachTeamsToMatches>[0],
    (teamsData ?? []) as Parameters<typeof attachTeamsToMatches>[1],
  ) as MatchWithTeams[];

  const readyMatches = scheduledMatches.filter(
    (match) => Boolean(match.homeTeam && match.awayTeam),
  );
  const hiddenMatchCount = scheduledMatches.length - readyMatches.length;

  const teams: PickerTeam[] = (teamsData ?? []).map((team) => ({
    id: String((team as { id: string }).id),
    name: (team as { name: string }).name,
    name_he: (team as { name_he?: string | null }).name_he ?? null,
    logo_url: (team as { logo_url?: string | null }).logo_url ?? null,
  }));

  const players: PickerPlayer[] = (playersData ?? []).map((player) => ({
    id: (player as { id: number }).id,
    name: (player as { name: string }).name,
    team_id: (player as { team_id?: string | null }).team_id
      ? String((player as { team_id: unknown }).team_id)
      : null,
    position: (player as { position?: string | null }).position ?? null,
  }));

  let existingPredictions: MatchPredictionRow[] = [];
  let tournamentPrediction: TournamentPredRow | null = null;
  let groupJokerUsed = false;
  let knockoutJokerUsed = false;

  if (user) {
    const [predictionsResult, tournamentResult, jokerUsage] = await Promise.all([
      supabase
        .from("predictions")
        .select("match_id, home_score_guess, away_score_guess, is_joker_applied")
        .eq("user_id", user.id),
      supabase
        .from("tournament_predictions")
        .select("predicted_winner_team_id, predicted_top_scorer_name")
        .eq("user_id", user.id)
        .maybeSingle(),
      getUserJokerUsage(supabase, user.id),
    ]);

    if (predictionsResult.error) {
      const fallbackPredictions = await supabase
        .from("predictions")
        .select("match_id, home_score_guess, away_score_guess")
        .eq("user_id", user.id);

      existingPredictions = ((fallbackPredictions.data ?? []) as Omit<MatchPredictionRow, "is_joker_applied">[])
        .map((row) => ({
          ...row,
          is_joker_applied: false,
        }));
    } else {
      existingPredictions = (predictionsResult.data ?? []) as MatchPredictionRow[];
    }

    if (tournamentResult.error) {
      const fallbackTournament = await supabase
        .from("outright_bets")
        .select("predicted_winner_team_id, predicted_top_scorer_name")
        .eq("user_id", user.id)
        .maybeSingle();

      tournamentPrediction = fallbackTournament.data as TournamentPredRow | null;
    } else {
      tournamentPrediction = tournamentResult.data as TournamentPredRow | null;
    }

    groupJokerUsed = jokerUsage.groupUsed;
    knockoutJokerUsed = jokerUsage.knockoutUsed;
  }

  return (
    <PredictionsClient
      matches={readyMatches}
      teams={teams}
      players={players}
      existingPredictions={existingPredictions}
      tournamentPrediction={tournamentPrediction}
      isAuthenticated={Boolean(user)}
      groupJokerUsed={groupJokerUsed}
      knockoutJokerUsed={knockoutJokerUsed}
      hiddenMatchCount={hiddenMatchCount}
    />
  );
}

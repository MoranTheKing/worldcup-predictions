import { createAdminClient } from "@/lib/supabase/admin";
import { getUserJokerUsage } from "@/lib/game/boosters";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import type { MatchPredictionRow, TournamentPredRow } from "@/app/game/predictions/PredictionsClient";
import type { PickerPlayer, PickerTeam } from "@/app/game/predictions/OutrightForm";

export type PredictionsHubData = {
  matches: MatchWithTeams[];
  teams: PickerTeam[];
  players: PickerPlayer[];
  existingPredictions: MatchPredictionRow[];
  tournamentPrediction: TournamentPredRow | null;
  groupJokerUsed: boolean;
  knockoutJokerUsed: boolean;
  hiddenMatchCount: number;
};

export async function loadPredictionsHubData(userId: string | null): Promise<PredictionsHubData> {
  const admin = createAdminClient();

  const [{ data: matchesData }, { data: teamsData }, { data: playersData }] = await Promise.all([
    admin
      .from("matches")
      .select(
        "match_number, stage, status, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, is_extra_time, home_penalty_score, away_penalty_score",
      )
      .order("date_time", { ascending: true }),
    admin
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter")
      .order("name_he", { ascending: true }),
    admin
      .from("players")
      .select("id, name, team_id, position")
      .order("name", { ascending: true }),
  ]);

  const allMatches = attachTeamsToMatches(
    (matchesData ?? []) as Parameters<typeof attachTeamsToMatches>[0],
    (teamsData ?? []) as Parameters<typeof attachTeamsToMatches>[1],
  ) as MatchWithTeams[];

  const visibleMatches = allMatches.filter(
    (match) => match.status !== "scheduled" || Boolean(match.homeTeam && match.awayTeam),
  );
  const hiddenMatchCount = allMatches.length - visibleMatches.length;

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

  if (userId) {
    const [predictionsResult, tournamentResult, jokerUsage] = await Promise.all([
      admin
        .from("predictions")
        .select("match_id, home_score_guess, away_score_guess, is_joker_applied, points_earned")
        .eq("user_id", userId),
      admin
        .from("tournament_predictions")
        .select("predicted_winner_team_id, predicted_top_scorer_name")
        .eq("user_id", userId)
        .maybeSingle(),
      getUserJokerUsage(admin, userId),
    ]);

    if (predictionsResult.error) {
      const fallbackPredictions = await admin
        .from("predictions")
        .select("match_id, home_score_guess, away_score_guess, points_earned")
        .eq("user_id", userId);

      existingPredictions = (
        (fallbackPredictions.data ?? []) as Omit<MatchPredictionRow, "is_joker_applied">[]
      ).map((row) => ({
        ...row,
        is_joker_applied: false,
      }));
    } else {
      existingPredictions = (predictionsResult.data ?? []) as MatchPredictionRow[];
    }

    if (tournamentResult.error) {
      const fallbackTournament = await admin
        .from("outright_bets")
        .select("predicted_winner_team_id, predicted_top_scorer_name")
        .eq("user_id", userId)
        .maybeSingle();

      tournamentPrediction = fallbackTournament.data as TournamentPredRow | null;
    } else {
      tournamentPrediction = tournamentResult.data as TournamentPredRow | null;
    }

    groupJokerUsed = jokerUsage.groupUsed;
    knockoutJokerUsed = jokerUsage.knockoutUsed;
  }

  return {
    matches: visibleMatches,
    teams,
    players,
    existingPredictions,
    tournamentPrediction,
    groupJokerUsed,
    knockoutJokerUsed,
    hiddenMatchCount,
  };
}

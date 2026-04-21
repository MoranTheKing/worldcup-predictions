import { createClient } from "@/lib/supabase/server";
import {
  buildTournamentStandings,
  type TournamentMatch,
  type TournamentTeam,
} from "@/lib/utils/standings";
import TournamentClient from "./TournamentClient";

type LegacyTeamRow = {
  id: number;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  group_letter: string | null;
  points?: number | null;
  goals_for?: number | null;
  goals_against?: number | null;
  fair_play_score?: number | null;
  fifa_ranking?: number | null;
  played_count?: number | null;
  is_eliminated?: boolean | null;
};

function deriveGroupMetrics(matches: TournamentMatch[]) {
  const metrics = new Map<number, { playedCount: number; points: number; goalsFor: number; goalsAgainst: number }>();

  for (const match of matches) {
    if (
      match.stage !== "group" ||
      match.home_team_id === null ||
      match.away_team_id === null ||
      match.home_team_score === null ||
      match.away_team_score === null
    ) {
      continue;
    }

    const home = metrics.get(match.home_team_id) ?? { playedCount: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };
    const away = metrics.get(match.away_team_id) ?? { playedCount: 0, points: 0, goalsFor: 0, goalsAgainst: 0 };

    home.playedCount += 1;
    away.playedCount += 1;

    home.goalsFor += match.home_team_score;
    home.goalsAgainst += match.away_team_score;
    away.goalsFor += match.away_team_score;
    away.goalsAgainst += match.home_team_score;

    if (match.home_team_score > match.away_team_score) home.points += 3;
    else if (match.home_team_score < match.away_team_score) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }

    metrics.set(match.home_team_id, home);
    metrics.set(match.away_team_id, away);
  }

  return metrics;
}

export default async function TournamentPage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, stage, home_team_id, away_team_id, home_team_score, away_team_score")
    .eq("stage", "group")
    .order("date_time", { ascending: true });

  const fullTeamsQuery = await supabase
    .from("teams")
    .select(`
      id,
      name,
      name_he,
      logo_url,
      group_letter,
      points,
      goals_for,
      goals_against,
      fair_play_score,
      fifa_ranking,
      played_count,
      is_eliminated
    `)
    .order("group_letter")
    .order("name_he", { ascending: true });

  const fallbackTeamsQuery = fullTeamsQuery.error
    ? await supabase
        .from("teams")
        .select("id, name, name_he, logo_url, group_letter, played_count, is_eliminated")
        .order("group_letter")
        .order("name_he", { ascending: true })
    : null;

  const rawTeams = (fullTeamsQuery.data ?? fallbackTeamsQuery?.data ?? []) as LegacyTeamRow[];
  const groupMetrics = deriveGroupMetrics((matches ?? []) as TournamentMatch[]);

  const teams: TournamentTeam[] = rawTeams.map((team) => {
    const metrics = groupMetrics.get(team.id);

    return {
      id: team.id,
      name: team.name,
      name_he: team.name_he ?? null,
      logo_url: team.logo_url ?? null,
      group_letter: team.group_letter ?? null,
      points: team.points ?? metrics?.points ?? 0,
      goals_for: team.goals_for ?? metrics?.goalsFor ?? 0,
      goals_against: team.goals_against ?? metrics?.goalsAgainst ?? 0,
      fair_play_score: team.fair_play_score ?? 0,
      fifa_ranking: team.fifa_ranking ?? 0,
      played_count: team.played_count ?? metrics?.playedCount ?? 0,
      is_eliminated: team.is_eliminated ?? false,
    };
  });

  const tournament = buildTournamentStandings(
    teams,
    (matches ?? []) as TournamentMatch[],
  );

  return (
    <TournamentClient
      groupStandings={tournament.groupStandings}
      bestThirdStandings={tournament.bestThirdStandings}
      teamsRemaining={tournament.teamsRemaining}
      eliminatedCount={teams.filter((team) => team.is_eliminated).length}
    />
  );
}

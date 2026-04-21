import { getMatchStageKind, type TournamentTeamRecord } from "@/lib/tournament/matches";
import type { TournamentMatch, TournamentTeam } from "@/lib/utils/standings";

type TeamMetrics = {
  playedCount: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type TournamentTeamStateRow = Pick<
  TournamentTeamRecord,
  | "id"
  | "name"
  | "name_he"
  | "logo_url"
  | "group_letter"
  | "fair_play_score"
  | "fifa_ranking"
  | "is_eliminated"
>;

export function deriveGroupMetrics(matches: TournamentMatch[]) {
  const metrics = new Map<string, TeamMetrics>();

  for (const match of matches) {
    if (
      getMatchStageKind(match.stage) !== "group" ||
      match.home_team_id === null ||
      match.away_team_id === null ||
      match.home_score === null ||
      match.away_score === null ||
      (match.status !== "live" && match.status !== "finished")
    ) {
      continue;
    }

    const home = metrics.get(match.home_team_id) ?? {
      playedCount: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };
    const away = metrics.get(match.away_team_id) ?? {
      playedCount: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    if (match.status === "finished") {
      home.playedCount += 1;
      away.playedCount += 1;
    }

    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.points += 3;
    } else if (match.home_score < match.away_score) {
      away.points += 3;
    } else {
      home.points += 1;
      away.points += 1;
    }

    metrics.set(match.home_team_id, home);
    metrics.set(match.away_team_id, away);
  }

  return metrics;
}

export function buildTournamentTeams(
  rawTeams: TournamentTeamStateRow[],
  groupMatches: TournamentMatch[],
): TournamentTeam[] {
  const groupMetrics = deriveGroupMetrics(groupMatches);

  return rawTeams.map((team) => {
    const metrics = groupMetrics.get(team.id);

    return {
      id: team.id,
      name: team.name,
      name_he: team.name_he ?? null,
      logo_url: team.logo_url ?? null,
      group_letter: team.group_letter ?? null,
      points: metrics?.points ?? 0,
      goals_for: metrics?.goalsFor ?? 0,
      goals_against: metrics?.goalsAgainst ?? 0,
      fair_play_score: team.fair_play_score ?? 0,
      fifa_ranking: team.fifa_ranking ?? 0,
      played_count: metrics?.playedCount ?? 0,
      is_eliminated: team.is_eliminated ?? false,
    };
  });
}

export function getGroupMatches(matches: TournamentMatch[]) {
  return matches.filter((match) => getMatchStageKind(match.stage) === "group");
}

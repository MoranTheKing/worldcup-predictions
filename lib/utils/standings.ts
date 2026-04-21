export type TournamentTeam = {
  id: number;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  group_letter: string | null;
  points: number;
  goals_for: number;
  goals_against: number;
  fair_play_score: number;
  fifa_ranking: number;
  is_eliminated: boolean;
};

export type TournamentMatch = {
  id: number;
  stage: string;
  home_team_id: number | null;
  away_team_id: number | null;
  home_team_score: number | null;
  away_team_score: number | null;
};

export type StandingStatus =
  | "qualified"
  | "third_qualified"
  | "third_pending"
  | "third_eliminated"
  | "eliminated";

export type TeamStanding = {
  team: TournamentTeam;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  fairPlay: number;
  fifaRanking: number;
  status: StandingStatus;
};

type MiniTableMetrics = {
  points: number;
  goalDifference: number;
  goalsFor: number;
};

type MatchStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
};

const THIRD_PLACE_QUALIFIERS = 8;

function isCompletedGroupMatch(match: TournamentMatch): boolean {
  return (
    match.stage === "group" &&
    match.home_team_id !== null &&
    match.away_team_id !== null &&
    match.home_team_score !== null &&
    match.away_team_score !== null
  );
}

function compareNames(a: TeamStanding, b: TeamStanding): number {
  const aName = a.team.name_he ?? a.team.name;
  const bName = b.team.name_he ?? b.team.name;

  return aName.localeCompare(bName, "he");
}

function compareOverallCriteria(a: TeamStanding, b: TeamStanding): number {
  const goalDifferenceDiff = b.gd - a.gd;
  if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

  const goalsForDiff = b.gf - a.gf;
  if (goalsForDiff !== 0) return goalsForDiff;

  const fairPlayDiff = b.fairPlay - a.fairPlay;
  if (fairPlayDiff !== 0) return fairPlayDiff;

  const rankingDiff = a.fifaRanking - b.fifaRanking;
  if (rankingDiff !== 0) return rankingDiff;

  return compareNames(a, b);
}

function groupByComparableKey<T>(
  items: T[],
  isSameGroup: (left: T, right: T) => boolean,
): T[][] {
  if (items.length === 0) return [];

  const groups: T[][] = [[items[0]]];

  for (const item of items.slice(1)) {
    const currentGroup = groups[groups.length - 1];
    if (isSameGroup(currentGroup[0], item)) {
      currentGroup.push(item);
    } else {
      groups.push([item]);
    }
  }

  return groups;
}

function collectMatchStats(teamId: number, matches: TournamentMatch[]): MatchStats {
  return matches.reduce<MatchStats>(
    (stats, match) => {
      if (!isCompletedGroupMatch(match)) return stats;

      const isHome = match.home_team_id === teamId;
      const isAway = match.away_team_id === teamId;
      if (!isHome && !isAway) return stats;

      const goalsFor = isHome ? match.home_team_score! : match.away_team_score!;
      const goalsAgainst = isHome ? match.away_team_score! : match.home_team_score!;

      stats.played += 1;
      if (goalsFor > goalsAgainst) stats.won += 1;
      else if (goalsFor === goalsAgainst) stats.drawn += 1;
      else stats.lost += 1;

      return stats;
    },
    { played: 0, won: 0, drawn: 0, lost: 0 },
  );
}

function buildHeadToHeadMetrics(
  entries: TeamStanding[],
  matches: TournamentMatch[],
): Map<number, MiniTableMetrics> {
  const teamIds = new Set(entries.map((entry) => entry.team.id));
  const metrics = new Map<number, MiniTableMetrics>(
    entries.map((entry) => [
      entry.team.id,
      { points: 0, goalDifference: 0, goalsFor: 0 },
    ]),
  );

  for (const match of matches) {
    if (!isCompletedGroupMatch(match)) continue;
    if (!teamIds.has(match.home_team_id!) || !teamIds.has(match.away_team_id!)) continue;

    const homeMetrics = metrics.get(match.home_team_id!);
    const awayMetrics = metrics.get(match.away_team_id!);
    if (!homeMetrics || !awayMetrics) continue;

    const homeGoals = match.home_team_score!;
    const awayGoals = match.away_team_score!;

    homeMetrics.goalsFor += homeGoals;
    homeMetrics.goalDifference += homeGoals - awayGoals;
    awayMetrics.goalsFor += awayGoals;
    awayMetrics.goalDifference += awayGoals - homeGoals;

    if (homeGoals > awayGoals) {
      homeMetrics.points += 3;
    } else if (homeGoals < awayGoals) {
      awayMetrics.points += 3;
    } else {
      homeMetrics.points += 1;
      awayMetrics.points += 1;
    }
  }

  return metrics;
}

function compareHeadToHeadMetrics(
  left: TeamStanding,
  right: TeamStanding,
  metrics: Map<number, MiniTableMetrics>,
): number {
  const leftMetrics = metrics.get(left.team.id) ?? { points: 0, goalDifference: 0, goalsFor: 0 };
  const rightMetrics = metrics.get(right.team.id) ?? { points: 0, goalDifference: 0, goalsFor: 0 };

  const pointsDiff = rightMetrics.points - leftMetrics.points;
  if (pointsDiff !== 0) return pointsDiff;

  const goalDifferenceDiff = rightMetrics.goalDifference - leftMetrics.goalDifference;
  if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

  return rightMetrics.goalsFor - leftMetrics.goalsFor;
}

function resolveTieByHeadToHead(entries: TeamStanding[], matches: TournamentMatch[]): TeamStanding[] {
  if (entries.length <= 1) return entries;

  const metrics = buildHeadToHeadMetrics(entries, matches);
  const sorted = [...entries].sort((left, right) => {
    const comparison = compareHeadToHeadMetrics(left, right, metrics);
    return comparison !== 0 ? comparison : compareNames(left, right);
  });

  const tiedGroups = groupByComparableKey(
    sorted,
    (left, right) => compareHeadToHeadMetrics(left, right, metrics) === 0,
  );

  if (tiedGroups.length === 1) {
    return [...entries].sort(compareOverallCriteria);
  }

  return tiedGroups.flatMap((group) => (
    group.length === 1 ? group : resolveTieByHeadToHead(group, matches)
  ));
}

function sortEntriesByPoints(
  entries: TeamStanding[],
  matches: TournamentMatch[],
  useHeadToHead: boolean,
): TeamStanding[] {
  const sortedByPoints = [...entries].sort((left, right) => {
    const pointsDiff = right.pts - left.pts;
    return pointsDiff !== 0 ? pointsDiff : compareNames(left, right);
  });

  const pointGroups = groupByComparableKey(sortedByPoints, (left, right) => left.pts === right.pts);

  return pointGroups.flatMap((group) => {
    if (group.length === 1) return group;
    if (!useHeadToHead) return [...group].sort(compareOverallCriteria);

    return resolveTieByHeadToHead(group, matches);
  });
}

function buildStandingEntry(team: TournamentTeam, matches: TournamentMatch[]): TeamStanding {
  const stats = collectMatchStats(team.id, matches);

  return {
    team,
    rank: 0,
    played: stats.played,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    gf: team.goals_for,
    ga: team.goals_against,
    gd: team.goals_for - team.goals_against,
    pts: team.points,
    fairPlay: team.fair_play_score,
    fifaRanking: team.fifa_ranking,
    status: "third_pending",
  };
}

function withRanks(entries: TeamStanding[]): TeamStanding[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function withBaseGroupStatuses(entries: TeamStanding[]): TeamStanding[] {
  return entries.map((entry) => {
    let status: StandingStatus;

    if (entry.rank <= 2) status = "qualified";
    else if (entry.rank === 3) status = "third_pending";
    else status = "eliminated";

    return {
      ...entry,
      status,
    };
  });
}

export function buildGroupStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): TeamStanding[] {
  const groupMatches = matches.filter((match) => isCompletedGroupMatch(match));
  const baseEntries = teams.map((team) => buildStandingEntry(team, groupMatches));
  const sorted = sortEntriesByPoints(baseEntries, groupMatches, true);

  return withBaseGroupStatuses(withRanks(sorted));
}

export function buildBestThirdPlaceStandings(groupStandings: Record<string, TeamStanding[]>): TeamStanding[] {
  const thirdPlaceEntries = Object.values(groupStandings)
    .map((standings) => standings.find((entry) => entry.rank === 3))
    .filter((entry): entry is TeamStanding => Boolean(entry))
    .map((entry) => ({
      ...entry,
      status: "third_pending" as StandingStatus,
    }));

  const sorted = sortEntriesByPoints(thirdPlaceEntries, [], false);
  const ranked = withRanks(sorted);

  return ranked.map((entry) => ({
    ...entry,
    status: entry.rank <= THIRD_PLACE_QUALIFIERS ? "third_qualified" : "third_eliminated",
  }));
}

export function buildTournamentStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  teamsRemaining: number;
} {
  const teamsByGroup = teams.reduce<Record<string, TournamentTeam[]>>((groups, team) => {
    if (!team.group_letter) return groups;
    groups[team.group_letter] = [...(groups[team.group_letter] ?? []), team];
    return groups;
  }, {});

  const groupStandings = Object.fromEntries(
    Object.entries(teamsByGroup)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([letter, groupTeams]) => {
        const groupMatches = matches.filter((match) => (
          match.stage === "group" &&
          groupTeams.some((team) => team.id === match.home_team_id) &&
          groupTeams.some((team) => team.id === match.away_team_id)
        ));

        return [letter, buildGroupStandings(groupTeams, groupMatches)];
      }),
  );

  const bestThirdStandings = buildBestThirdPlaceStandings(groupStandings);
  const qualifiedThirdIds = new Set(
    bestThirdStandings
      .filter((entry) => entry.status === "third_qualified")
      .map((entry) => entry.team.id),
  );

  const groupStandingsWithThirdStatuses: Record<string, TeamStanding[]> = Object.fromEntries(
    Object.entries(groupStandings).map(([letter, standings]) => [
      letter,
      standings.map((entry) => {
        if (entry.rank !== 3) return entry;

        return {
          ...entry,
          status: qualifiedThirdIds.has(entry.team.id)
            ? ("third_qualified" as StandingStatus)
            : ("third_eliminated" as StandingStatus),
        };
      }),
    ]),
  );

  return {
    groupStandings: groupStandingsWithThirdStatuses,
    bestThirdStandings,
    teamsRemaining: teams.filter((team) => !team.is_eliminated).length,
  };
}

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
  played_count: number;
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

export type StandingStatus = "qualified" | "third_qualified" | "pending" | "eliminated";

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

type PendingGroupMatch = {
  homeTeamId: number;
  awayTeamId: number;
};

type ScenarioRank = {
  points: number;
  bestRank: number;
  worstRank: number;
};

type TeamScenarioState = {
  canReachTop2: boolean;
  canFinishThird: boolean;
  guaranteedAtLeastThird: boolean;
  guaranteedTop2: boolean;
  maxPossiblePoints: number;
  maxThirdPlacePoints: number | null;
};

type GroupScenarioSummary = {
  minThirdPlacePoints: number;
  maxThirdPlacePoints: number;
  teamStates: Map<number, TeamScenarioState>;
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

function isPendingGroupMatch(match: TournamentMatch): boolean {
  return (
    match.stage === "group" &&
    match.home_team_id !== null &&
    match.away_team_id !== null &&
    (match.home_team_score === null || match.away_team_score === null)
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
    played: stats.played || team.played_count,
    won: stats.won,
    drawn: stats.drawn,
    lost: stats.lost,
    gf: team.goals_for,
    ga: team.goals_against,
    gd: team.goals_for - team.goals_against,
    pts: team.points,
    fairPlay: team.fair_play_score,
    fifaRanking: team.fifa_ranking,
    status: "pending",
  };
}

function withRanks(entries: TeamStanding[]): TeamStanding[] {
  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}

function buildCurrentGroupStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): TeamStanding[] {
  const completedMatches = matches.filter((match) => isCompletedGroupMatch(match));
  const baseEntries = teams.map((team) => buildStandingEntry(team, completedMatches));
  const sorted = sortEntriesByPoints(baseEntries, completedMatches, true);

  return withRanks(sorted);
}

function buildPendingMatches(matches: TournamentMatch[]): PendingGroupMatch[] {
  return matches
    .filter((match) => isPendingGroupMatch(match))
    .map((match) => ({
      homeTeamId: match.home_team_id!,
      awayTeamId: match.away_team_id!,
    }));
}

function clonePoints(pointsById: Map<number, number>): Map<number, number> {
  return new Map(pointsById);
}

function enumeratePointScenarios(
  basePointsById: Map<number, number>,
  pendingMatches: PendingGroupMatch[],
): Map<number, number>[] {
  const scenarios: Map<number, number>[] = [];

  function walk(index: number, pointsById: Map<number, number>) {
    if (index >= pendingMatches.length) {
      scenarios.push(clonePoints(pointsById));
      return;
    }

    const { homeTeamId, awayTeamId } = pendingMatches[index];

    const homeWin = clonePoints(pointsById);
    homeWin.set(homeTeamId, (homeWin.get(homeTeamId) ?? 0) + 3);
    walk(index + 1, homeWin);

    const draw = clonePoints(pointsById);
    draw.set(homeTeamId, (draw.get(homeTeamId) ?? 0) + 1);
    draw.set(awayTeamId, (draw.get(awayTeamId) ?? 0) + 1);
    walk(index + 1, draw);

    const awayWin = clonePoints(pointsById);
    awayWin.set(awayTeamId, (awayWin.get(awayTeamId) ?? 0) + 3);
    walk(index + 1, awayWin);
  }

  walk(0, clonePoints(basePointsById));

  return scenarios;
}

function rankScenario(teamIds: number[], pointsById: Map<number, number>): Map<number, ScenarioRank> {
  const scenarioRanks = new Map<number, ScenarioRank>();

  for (const teamId of teamIds) {
    const points = pointsById.get(teamId) ?? 0;
    let higherCount = 0;
    let equalCount = 0;

    for (const otherTeamId of teamIds) {
      const otherPoints = pointsById.get(otherTeamId) ?? 0;

      if (otherPoints > points) {
        higherCount += 1;
      } else if (otherTeamId !== teamId && otherPoints === points) {
        equalCount += 1;
      }
    }

    scenarioRanks.set(teamId, {
      points,
      bestRank: higherCount + 1,
      worstRank: higherCount + equalCount + 1,
    });
  }

  return scenarioRanks;
}

function buildScenarioSummary(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): GroupScenarioSummary {
  const teamIds = teams.map((team) => team.id);
  const currentPointsById = new Map(teams.map((team) => [team.id, team.points]));
  const pendingMatches = buildPendingMatches(matches);
  const scenarios = enumeratePointScenarios(currentPointsById, pendingMatches);

  const teamStates = new Map<number, TeamScenarioState>(
    teamIds.map((teamId) => [
      teamId,
      {
        canReachTop2: false,
        canFinishThird: false,
        guaranteedAtLeastThird: true,
        guaranteedTop2: true,
        maxPossiblePoints: currentPointsById.get(teamId) ?? 0,
        maxThirdPlacePoints: null,
      },
    ]),
  );

  let minThirdPlacePoints = Number.POSITIVE_INFINITY;
  let maxThirdPlacePoints = Number.NEGATIVE_INFINITY;

  for (const scenario of scenarios) {
    const ranks = rankScenario(teamIds, scenario);

    for (const teamId of teamIds) {
      const state = teamStates.get(teamId);
      const rank = ranks.get(teamId);
      if (!state || !rank) continue;

      state.maxPossiblePoints = Math.max(state.maxPossiblePoints, rank.points);
      state.canReachTop2 ||= rank.bestRank <= 2;
      state.guaranteedTop2 &&= rank.worstRank <= 2;
      state.guaranteedAtLeastThird &&= rank.worstRank <= 3;

      const canBeThird = rank.bestRank <= 3 && rank.worstRank >= 3;
      state.canFinishThird ||= canBeThird;

      if (canBeThird) {
        state.maxThirdPlacePoints = Math.max(state.maxThirdPlacePoints ?? Number.NEGATIVE_INFINITY, rank.points);
        minThirdPlacePoints = Math.min(minThirdPlacePoints, rank.points);
        maxThirdPlacePoints = Math.max(maxThirdPlacePoints, rank.points);
      }
    }
  }

  return {
    minThirdPlacePoints: Number.isFinite(minThirdPlacePoints) ? minThirdPlacePoints : 0,
    maxThirdPlacePoints: Number.isFinite(maxThirdPlacePoints) ? maxThirdPlacePoints : 0,
    teamStates,
  };
}

function countOtherGroupsMatching(
  groupSummaries: Map<string, GroupScenarioSummary>,
  currentGroup: string,
  predicate: (summary: GroupScenarioSummary) => boolean,
): number {
  let count = 0;

  for (const [groupLetter, summary] of groupSummaries.entries()) {
    if (groupLetter === currentGroup) continue;
    if (predicate(summary)) count += 1;
  }

  return count;
}

function determineBestThirdStatus(
  entry: TeamStanding,
  groupSummaries: Map<string, GroupScenarioSummary>,
): StandingStatus {
  const groupLetter = entry.team.group_letter;
  if (!groupLetter) return "pending";

  const summary = groupSummaries.get(groupLetter);
  const teamState = summary?.teamStates.get(entry.team.id);
  if (!summary || !teamState) return "pending";

  const threatenedByGroups = countOtherGroupsMatching(
    groupSummaries,
    groupLetter,
    (otherGroup) => otherGroup.maxThirdPlacePoints >= entry.pts,
  );

  const guaranteedQualified =
    teamState.guaranteedAtLeastThird &&
    threatenedByGroups < THIRD_PLACE_QUALIFIERS;

  if (guaranteedQualified) {
    return "third_qualified";
  }

  if (teamState.maxThirdPlacePoints === null) {
    return "eliminated";
  }

  const guaranteedGroupsAbove = countOtherGroupsMatching(
    groupSummaries,
    groupLetter,
    (otherGroup) => otherGroup.minThirdPlacePoints > teamState.maxThirdPlacePoints!,
  );

  return guaranteedGroupsAbove >= THIRD_PLACE_QUALIFIERS ? "eliminated" : "pending";
}

function determineGroupStatus(
  entry: TeamStanding,
  groupSummaries: Map<string, GroupScenarioSummary>,
  bestThirdStatuses: Map<number, StandingStatus>,
): StandingStatus {
  const groupLetter = entry.team.group_letter;
  if (!groupLetter) return "pending";

  const summary = groupSummaries.get(groupLetter);
  const teamState = summary?.teamStates.get(entry.team.id);
  if (!summary || !teamState) return "pending";

  if (teamState.guaranteedTop2) {
    return "qualified";
  }

  if (entry.rank === 3 && bestThirdStatuses.get(entry.team.id) === "third_qualified") {
    return "third_qualified";
  }

  const canQualifyViaThird =
    teamState.canFinishThird &&
    teamState.maxThirdPlacePoints !== null &&
    countOtherGroupsMatching(
      groupSummaries,
      groupLetter,
      (otherGroup) => otherGroup.minThirdPlacePoints > teamState.maxThirdPlacePoints!,
    ) < THIRD_PLACE_QUALIFIERS;

  if (!teamState.canReachTop2 && !canQualifyViaThird) {
    return "eliminated";
  }

  return "pending";
}

export function buildGroupStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): TeamStanding[] {
  return buildCurrentGroupStandings(teams, matches);
}

export function buildBestThirdPlaceStandings(groupStandings: Record<string, TeamStanding[]>): TeamStanding[] {
  const thirdPlaceEntries = Object.values(groupStandings)
    .map((standings) => standings.find((entry) => entry.rank === 3))
    .filter((entry): entry is TeamStanding => Boolean(entry))
    .map((entry) => ({
      ...entry,
      status: "pending" as StandingStatus,
    }));

  const sorted = sortEntriesByPoints(thirdPlaceEntries, [], false);

  return withRanks(sorted);
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

  const groupSummaries = new Map<string, GroupScenarioSummary>();
  const initialGroupStandings = Object.fromEntries(
    Object.entries(teamsByGroup)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([letter, groupTeams]) => {
        const groupTeamIds = new Set(groupTeams.map((team) => team.id));
        const groupMatches = matches.filter((match) => (
          match.stage === "group" &&
          match.home_team_id !== null &&
          match.away_team_id !== null &&
          groupTeamIds.has(match.home_team_id) &&
          groupTeamIds.has(match.away_team_id)
        ));

        groupSummaries.set(letter, buildScenarioSummary(groupTeams, groupMatches));

        return [letter, buildCurrentGroupStandings(groupTeams, groupMatches)];
      }),
  ) as Record<string, TeamStanding[]>;

  const bestThirdStandings = buildBestThirdPlaceStandings(initialGroupStandings).map((entry) => ({
    ...entry,
    status: determineBestThirdStatus(entry, groupSummaries),
  }));

  const bestThirdStatuses = new Map(bestThirdStandings.map((entry) => [entry.team.id, entry.status]));

  const groupStandings = Object.fromEntries(
    Object.entries(initialGroupStandings).map(([letter, standings]) => [
      letter,
      standings.map((entry) => ({
        ...entry,
        status: determineGroupStatus(entry, groupSummaries, bestThirdStatuses),
      })),
    ]),
  );

  const eliminatedCount = teams.filter((team) => team.is_eliminated).length;

  return {
    groupStandings,
    bestThirdStandings,
    teamsRemaining: teams.length - eliminatedCount,
  };
}

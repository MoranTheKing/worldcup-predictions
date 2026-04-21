import {
  getGroupLetterFromStage,
  getMatchStageKind,
} from "@/lib/tournament/matches";

export type TournamentTeam = {
  id: string;
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
  match_number: number;
  stage: string;
  date_time: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  is_extra_time?: boolean | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
  status?: string | null;
  minute?: number | null;
};

export type StandingStatus = "qualified" | "pending" | "eliminated";

export type TeamStanding = {
  team: TournamentTeam;
  rank: number;
  lockedRank: number | null;
  isLocked: boolean;
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
  homeTeamId: string;
  awayTeamId: string;
};

type ScenarioRank = {
  points: number;
  bestRank: number;
  worstRank: number;
};

type TeamScenarioState = {
  bestPossibleRank: number;
  worstPossibleRank: number;
  canReachTop2: boolean;
  canFinishThird: boolean;
  guaranteedAtLeastThird: boolean;
  guaranteedTop2: boolean;
  minThirdPlacePoints: number | null;
  maxPossiblePoints: number;
  maxThirdPlacePoints: number | null;
};

type GroupScenarioSummary = {
  minThirdPlacePoints: number;
  maxThirdPlacePoints: number;
  teamStates: Map<string, TeamScenarioState>;
};

type GroupStandingContext = {
  summary: GroupScenarioSummary;
  isFinalized: boolean;
};

const THIRD_PLACE_QUALIFIERS = 8;

function isCompletedGroupMatch(match: TournamentMatch): boolean {
  return (
    getMatchStageKind(match.stage) === "group" &&
    match.home_team_id !== null &&
    match.away_team_id !== null &&
    (match.status === "live" || match.status === "finished") &&
    match.home_score !== null &&
    match.away_score !== null
  );
}

function isPendingGroupMatch(match: TournamentMatch): boolean {
  return (
    getMatchStageKind(match.stage) === "group" &&
    match.home_team_id !== null &&
    match.away_team_id !== null &&
    match.status === "scheduled"
  );
}

function compareNames(left: TeamStanding, right: TeamStanding): number {
  const leftName = left.team.name_he ?? left.team.name;
  const rightName = right.team.name_he ?? right.team.name;
  return leftName.localeCompare(rightName, "he");
}

function compareOverallCriteria(left: TeamStanding, right: TeamStanding): number {
  const goalDifferenceDiff = right.gd - left.gd;
  if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

  const goalsForDiff = right.gf - left.gf;
  if (goalsForDiff !== 0) return goalsForDiff;

  const fairPlayDiff = right.fairPlay - left.fairPlay;
  if (fairPlayDiff !== 0) return fairPlayDiff;

  const rankingDiff = left.fifaRanking - right.fifaRanking;
  if (rankingDiff !== 0) return rankingDiff;

  return compareNames(left, right);
}

function compareMiniMetrics(
  left: TeamStanding,
  right: TeamStanding,
  metrics: Map<string, MiniTableMetrics>,
) {
  const leftMetrics = metrics.get(left.team.id) ?? { points: 0, goalDifference: 0, goalsFor: 0 };
  const rightMetrics = metrics.get(right.team.id) ?? { points: 0, goalDifference: 0, goalsFor: 0 };

  const pointsDiff = rightMetrics.points - leftMetrics.points;
  if (pointsDiff !== 0) return pointsDiff;

  const goalDifferenceDiff = rightMetrics.goalDifference - leftMetrics.goalDifference;
  if (goalDifferenceDiff !== 0) return goalDifferenceDiff;

  return rightMetrics.goalsFor - leftMetrics.goalsFor;
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

function collectMatchStats(teamId: string, matches: TournamentMatch[]): MatchStats {
  return matches.reduce<MatchStats>(
    (stats, match) => {
      if (!isCompletedGroupMatch(match)) return stats;

      const isHome = match.home_team_id === teamId;
      const isAway = match.away_team_id === teamId;
      if (!isHome && !isAway) return stats;

      const goalsFor = isHome ? match.home_score! : match.away_score!;
      const goalsAgainst = isHome ? match.away_score! : match.home_score!;

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
): Map<string, MiniTableMetrics> {
  const teamIds = new Set(entries.map((entry) => entry.team.id));
  const metrics = new Map<string, MiniTableMetrics>(
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

    const homeGoals = match.home_score!;
    const awayGoals = match.away_score!;

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

function resolveTieByHeadToHead(entries: TeamStanding[], matches: TournamentMatch[]): TeamStanding[] {
  if (entries.length <= 1) return entries;

  const metrics = buildHeadToHeadMetrics(entries, matches);
  const sorted = [...entries].sort((left, right) => {
    const headToHeadComparison = compareMiniMetrics(left, right, metrics);
    return headToHeadComparison !== 0 ? headToHeadComparison : compareNames(left, right);
  });

  const tiedGroups = groupByComparableKey(
    sorted,
    (left, right) => compareMiniMetrics(left, right, metrics) === 0,
  );

  if (tiedGroups.length === 1) {
    return [...entries].sort(compareOverallCriteria);
  }

  return tiedGroups.flatMap((group) => {
    if (group.length === 1) return group;
    return resolveTieByHeadToHead(group, matches);
  });
}

function sortEntriesByStandings(
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
    lockedRank: null,
    isLocked: false,
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
  const sorted = sortEntriesByStandings(baseEntries, completedMatches, true);
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

function clonePoints(pointsById: Map<string, number>): Map<string, number> {
  return new Map(pointsById);
}

function enumeratePointScenarios(
  basePointsById: Map<string, number>,
  pendingMatches: PendingGroupMatch[],
): Map<string, number>[] {
  const scenarios: Map<string, number>[] = [];

  function walk(index: number, pointsById: Map<string, number>) {
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

function rankScenario(teamIds: string[], pointsById: Map<string, number>): Map<string, ScenarioRank> {
  const scenarioRanks = new Map<string, ScenarioRank>();

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

  const teamStates = new Map<string, TeamScenarioState>(
    teamIds.map((teamId) => [
      teamId,
      {
        canReachTop2: false,
        canFinishThird: false,
        bestPossibleRank: Number.POSITIVE_INFINITY,
        worstPossibleRank: Number.NEGATIVE_INFINITY,
        guaranteedAtLeastThird: true,
        guaranteedTop2: true,
        minThirdPlacePoints: null,
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

      state.bestPossibleRank = Math.min(state.bestPossibleRank, rank.bestRank);
      state.worstPossibleRank = Math.max(state.worstPossibleRank, rank.worstRank);
      state.maxPossiblePoints = Math.max(state.maxPossiblePoints, rank.points);
      state.canReachTop2 ||= rank.bestRank <= 2;
      state.guaranteedTop2 &&= rank.worstRank <= 2;
      state.guaranteedAtLeastThird &&= rank.worstRank <= 3;

      const canBeThird = rank.bestRank <= 3 && rank.worstRank >= 3;
      state.canFinishThird ||= canBeThird;

      if (canBeThird) {
        state.minThirdPlacePoints = Math.min(state.minThirdPlacePoints ?? Number.POSITIVE_INFINITY, rank.points);
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

  const guaranteedQualified =
    teamState.guaranteedAtLeastThird &&
    teamState.minThirdPlacePoints !== null &&
    countOtherGroupsMatching(
      groupSummaries,
      groupLetter,
      (otherGroup) => otherGroup.maxThirdPlacePoints >= teamState.minThirdPlacePoints!,
    ) < THIRD_PLACE_QUALIFIERS;

  if (guaranteedQualified) {
    return "qualified";
  }

  if (
    teamState.maxThirdPlacePoints === null ||
    countOtherGroupsMatching(
      groupSummaries,
      groupLetter,
      (otherGroup) => otherGroup.minThirdPlacePoints > teamState.maxThirdPlacePoints!,
    ) >= THIRD_PLACE_QUALIFIERS
  ) {
    return "eliminated";
  }

  return "pending";
}

function determineGroupStatus(
  teamId: string,
  groupLetter: string,
  groupSummaries: Map<string, GroupScenarioSummary>,
): StandingStatus {
  const summary = groupSummaries.get(groupLetter);
  const teamState = summary?.teamStates.get(teamId);
  if (!summary || !teamState) return "pending";

  if (teamState.guaranteedTop2) {
    return "qualified";
  }

  const canQualifyViaThird =
    teamState.canFinishThird &&
    teamState.maxThirdPlacePoints !== null &&
    countOtherGroupsMatching(
      groupSummaries,
      groupLetter,
      (otherGroup) => otherGroup.minThirdPlacePoints > teamState.maxThirdPlacePoints!,
    ) < THIRD_PLACE_QUALIFIERS;

  const guaranteedQualifiedViaThird =
    teamState.guaranteedAtLeastThird &&
    teamState.minThirdPlacePoints !== null &&
    countOtherGroupsMatching(
      groupSummaries,
      groupLetter,
      (otherGroup) => otherGroup.maxThirdPlacePoints >= teamState.minThirdPlacePoints!,
    ) < THIRD_PLACE_QUALIFIERS;

  if (guaranteedQualifiedViaThird) {
    return "qualified";
  }

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

  const sorted = sortEntriesByStandings(thirdPlaceEntries, [], false);
  return withRanks(sorted);
}

export function buildTournamentStandings(
  teams: TournamentTeam[],
  matches: TournamentMatch[],
): {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  eliminatedCount: number;
  teamsRemaining: number;
} {
  const teamsByGroup = teams.reduce<Record<string, TournamentTeam[]>>((groups, team) => {
    if (!team.group_letter) return groups;
    groups[team.group_letter] = [...(groups[team.group_letter] ?? []), team];
    return groups;
  }, {});

  const groupSummaries = new Map<string, GroupScenarioSummary>();
  const groupContexts = new Map<string, GroupStandingContext>();
  const initialGroupStandings = Object.fromEntries(
    Object.entries(teamsByGroup)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([letter, groupTeams]) => {
        const groupTeamIds = new Set(groupTeams.map((team) => team.id));
        const groupMatches = matches.filter((match) => (
          getGroupLetterFromStage(match.stage) === letter &&
          match.home_team_id !== null &&
          match.away_team_id !== null &&
          groupTeamIds.has(match.home_team_id) &&
          groupTeamIds.has(match.away_team_id)
        ));

        const summary = buildScenarioSummary(groupTeams, groupMatches);
        groupSummaries.set(letter, summary);
        groupContexts.set(letter, {
          summary,
          isFinalized: !groupMatches.some(
            (match) => match.status === "scheduled" || match.status === "live",
          ),
        });

        return [letter, buildCurrentGroupStandings(groupTeams, groupMatches)];
      }),
  ) as Record<string, TeamStanding[]>;

  const bestThirdStandings = buildBestThirdPlaceStandings(initialGroupStandings).map((entry) => {
    const status = determineBestThirdStatus(entry, groupSummaries);
    return {
      ...entry,
      lockedRank: null,
      isLocked: status !== "pending",
      status,
    };
  });

  const groupStandings = Object.fromEntries(
    Object.entries(initialGroupStandings).map(([letter, standings]) => [
      letter,
      standings.map((entry) => {
        const groupContext = groupContexts.get(letter);
        const teamState = groupContext?.summary.teamStates.get(entry.team.id);
        const terminalLockedRank =
          groupContext?.isFinalized && entry.played === 3 ? entry.rank : null;
        const scenarioLockedRank =
          terminalLockedRank === null &&
          entry.played === 3 &&
          teamState &&
          teamState.bestPossibleRank === teamState.worstPossibleRank
            ? teamState.bestPossibleRank
            : null;
        const lockedRank = terminalLockedRank ?? scenarioLockedRank ?? null;

        return {
          ...entry,
          lockedRank,
          isLocked: lockedRank !== null,
          status: determineGroupStatus(entry.team.id, letter, groupSummaries),
        };
      }),
    ]),
  );

  const eliminatedCount = Object.values(groupStandings)
    .flat()
    .filter((entry) => entry.status === "eliminated")
    .length;

  return {
    groupStandings,
    bestThirdStandings,
    eliminatedCount,
    teamsRemaining: teams.length - eliminatedCount,
  };
}

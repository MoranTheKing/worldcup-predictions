import {
  determineKnockoutLoserId,
  determineKnockoutWinnerId,
  buildRoundOf32Assignments,
  getRoundOf32AssignedTeamId,
  makeMatchSideKey,
  parseReferencePlaceholder,
  parseSeedPlaceholder,
} from "@/lib/tournament/knockout-utils";
import { getMatchStageKind, type TournamentMatchRecord } from "@/lib/tournament/matches";
import type { TeamStanding, TournamentMatch } from "@/lib/utils/standings";
import {
  ALL_GROUPS,
  calculateThirdPlaceMatchups,
  type GroupLetter,
} from "@/lib/utils/thirdPlaceAllocations";

type EliminationMatch = TournamentMatchRecord;

type EliminationContext = {
  matchesByNumber: Map<number, EliminationMatch>;
  roundOf32Assignments: Map<string, string>;
};

type EliminationResolverInput = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  matches: TournamentMatch[];
};

function shouldResolveSide(placeholder: string | null) {
  return Boolean(parseReferencePlaceholder(placeholder) || parseSeedPlaceholder(placeholder));
}

function resolveParticipantId(
  match: EliminationMatch,
  side: "home" | "away",
  context: EliminationContext,
): string | null {
  const placeholder = side === "home" ? match.home_placeholder : match.away_placeholder;

  const seededAssignment = getRoundOf32AssignedTeamId(
    context.roundOf32Assignments,
    match.match_number,
    side,
  );
  if (seededAssignment) return seededAssignment;

  const reference = parseReferencePlaceholder(placeholder);
  if (!reference) {
    return side === "home" ? match.home_team_id : match.away_team_id;
  }

  const upstream = context.matchesByNumber.get(reference.matchNumber);
  if (!upstream) return null;

  const upstreamHomeTeamId = resolveParticipantId(upstream, "home", context);
  const upstreamAwayTeamId = resolveParticipantId(upstream, "away", context);

  return reference.kind === "winner"
    ? determineKnockoutWinnerId(upstream, upstreamHomeTeamId, upstreamAwayTeamId)
    : determineKnockoutLoserId(upstream, upstreamHomeTeamId, upstreamAwayTeamId);
}

export function getEliminatedTeamIds({
  groupStandings,
  bestThirdStandings,
  matches,
}: EliminationResolverInput) {
  const eliminatedTeamIds = new Set<string>();

  for (const standings of Object.values(groupStandings)) {
    const allTeamsPlayedThree = standings.every((entry) => entry.played === 3);

    for (const entry of standings) {
      if (
        entry.rank === 4 &&
        (allTeamsPlayedThree || entry.lockedRank === 4 || entry.isLocked)
      ) {
        eliminatedTeamIds.add(entry.team.id);
      }
    }
  }

  for (const entry of bestThirdStandings) {
    if (entry.rank > 8 && entry.isLocked && entry.status === "eliminated") {
      eliminatedTeamIds.add(entry.team.id);
    }
  }

  const roundOf32Assignments = buildRoundOf32Assignments({
    groupStandings,
    bestThirdStandings,
    matches,
  });

  const qualifiedThirdGroups = bestThirdStandings
    .slice(0, 8)
    .filter((entry) => entry.isLocked && entry.status === "qualified")
    .map((entry) => entry.team.group_letter)
    .filter((group): group is GroupLetter => group !== null && ALL_GROUPS.includes(group as GroupLetter));

  if (qualifiedThirdGroups.length === 8) {
    const r32Matches = matches
      .filter((match) => match.match_number >= 73 && match.match_number <= 88)
      .map((match) => ({
        match_number: match.match_number,
        home_placeholder: match.home_placeholder ?? null,
        away_placeholder: match.away_placeholder ?? null,
      }));
    const annexCAssignments = calculateThirdPlaceMatchups(
      r32Matches,
      qualifiedThirdGroups,
      groupStandings,
    );

    for (const assignment of annexCAssignments) {
      roundOf32Assignments.set(
        makeMatchSideKey(assignment.matchNumber, assignment.side),
        assignment.teamId,
      );
    }
  }

  const matchesByNumber = new Map(
    matches.map((match) => [match.match_number, { ...match } as EliminationMatch]),
  );
  const context: EliminationContext = { matchesByNumber, roundOf32Assignments };

  for (const match of matchesByNumber.values()) {
    if (match.match_number < 73 || match.status !== "finished") continue;

    const stageKind = getMatchStageKind(match.stage);
    if (stageKind === "group" || stageKind === "unknown" || stageKind === "semi_final") {
      continue;
    }

    const homeTeamId = shouldResolveSide(match.home_placeholder)
      ? resolveParticipantId(match, "home", context)
      : match.home_team_id;
    const awayTeamId = shouldResolveSide(match.away_placeholder)
      ? resolveParticipantId(match, "away", context)
      : match.away_team_id;

    const loserTeamId = determineKnockoutLoserId(match, homeTeamId, awayTeamId);
    if (loserTeamId) {
      eliminatedTeamIds.add(loserTeamId);
    }
  }

  return eliminatedTeamIds;
}

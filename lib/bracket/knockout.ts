import { getMatchStageKind, type MatchStageKind } from "@/lib/tournament/matches";
import {
  buildBracketTeamsById,
  buildRoundOf32Assignments,
  determineKnockoutLoserId,
  determineKnockoutWinnerId,
  getRoundOf32AssignedTeamId,
  parseReferencePlaceholder,
} from "@/lib/tournament/knockout-utils";
import type { TeamStanding, TournamentMatch, TournamentTeam } from "@/lib/utils/standings";

type KnockoutRound = Exclude<MatchStageKind, "group" | "unknown">;

export type ResolvedSeed =
  | { kind: "team"; team: TournamentTeam }
  | { kind: "placeholder"; labelHe: string };

export type ResolvedBracketMatch = {
  matchNumber: number;
  round: KnockoutRound;
  home: ResolvedSeed;
  away: ResolvedSeed;
  liveMatch: TournamentMatch | null;
};

type KnockoutResolverInput = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  matches: TournamentMatch[];
};

function placeholderLabelHe(placeholder: string) {
  const trimmed = placeholder.trim();
  const reference = parseReferencePlaceholder(trimmed);

  if (reference?.kind === "winner") return `מנצחת משחק ${reference.matchNumber}`;
  if (reference?.kind === "loser") return `מפסידת משחק ${reference.matchNumber}`;

  return trimmed;
}

export function resolveKnockoutBracket({
  groupStandings,
  bestThirdStandings,
  matches,
}: KnockoutResolverInput): ResolvedBracketMatch[] {
  const teamsById = buildBracketTeamsById(groupStandings);
  const matchesByNumber = new Map(matches.map((match) => [match.match_number, match]));
  const roundOf32Assignments = buildRoundOf32Assignments({
    groupStandings,
    bestThirdStandings,
    matches,
  });

  function resolveTeamId(match: TournamentMatch, side: "home" | "away"): string | null {
    const explicitTeamId = side === "home" ? match.home_team_id : match.away_team_id;
    if (explicitTeamId) return explicitTeamId;

    const seededAssignment = getRoundOf32AssignedTeamId(roundOf32Assignments, match.match_number, side);
    if (seededAssignment) return seededAssignment;

    const placeholder = side === "home" ? match.home_placeholder : match.away_placeholder;
    const reference = parseReferencePlaceholder(placeholder);
    if (!reference) return null;

    const upstream = matchesByNumber.get(reference.matchNumber);
    if (!upstream) return null;

    const upstreamHomeTeamId = resolveTeamId(upstream, "home");
    const upstreamAwayTeamId = resolveTeamId(upstream, "away");

    return reference.kind === "winner"
      ? determineKnockoutWinnerId(upstream, upstreamHomeTeamId, upstreamAwayTeamId)
      : determineKnockoutLoserId(upstream, upstreamHomeTeamId, upstreamAwayTeamId);
  }

  function resolveSide(match: TournamentMatch, side: "home" | "away"): ResolvedSeed {
    const resolvedTeamId = resolveTeamId(match, side);
    if (resolvedTeamId) {
      const team = teamsById.get(resolvedTeamId);
      if (team) return { kind: "team", team };
    }

    const placeholder = side === "home" ? match.home_placeholder : match.away_placeholder;
    if (placeholder) {
      return { kind: "placeholder", labelHe: placeholderLabelHe(placeholder) };
    }

    return { kind: "placeholder", labelHe: "ייקבע בהמשך" };
  }

  return matches
    .filter((match) => {
      const stageKind = getMatchStageKind(match.stage);
      return stageKind !== "group" && stageKind !== "unknown";
    })
    .sort((left, right) => left.date_time.localeCompare(right.date_time))
    .map((match) => ({
      matchNumber: match.match_number,
      round: getMatchStageKind(match.stage) as KnockoutRound,
      home: resolveSide(match, "home"),
      away: resolveSide(match, "away"),
      liveMatch: match,
    }));
}

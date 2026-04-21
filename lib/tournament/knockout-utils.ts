import { getMatchStageKind } from "@/lib/tournament/matches";
import type { TeamStanding, TournamentMatch, TournamentTeam } from "@/lib/utils/standings";

type KnockoutSide = "home" | "away";

type SeedOption = {
  rank: 1 | 2 | 3;
  groupLetter: string;
};

type ReferencePlaceholder =
  | { kind: "winner"; matchNumber: number }
  | { kind: "loser"; matchNumber: number };

type AssignmentSlot = {
  key: string;
  candidates: string[];
};

type AssignmentContext = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  matches: TournamentMatch[];
};

export function makeMatchSideKey(matchNumber: number, side: KnockoutSide) {
  return `${matchNumber}:${side}`;
}

export function parseReferencePlaceholder(placeholder: string | null | undefined): ReferencePlaceholder | null {
  if (!placeholder) return null;

  const trimmed = placeholder.trim();
  const winnerMatch = trimmed.match(/^Winner Match (\d+)$/i);
  if (winnerMatch) {
    return { kind: "winner", matchNumber: Number(winnerMatch[1]) };
  }

  const loserMatch = trimmed.match(/^Loser Match (\d+)$/i);
  if (loserMatch) {
    return { kind: "loser", matchNumber: Number(loserMatch[1]) };
  }

  return null;
}

export function parseSeedPlaceholder(placeholder: string | null | undefined): SeedOption[] | null {
  if (!placeholder) return null;

  const trimmed = placeholder.trim().toUpperCase();
  if (parseReferencePlaceholder(trimmed)) return null;

  if (/^[123][A-L]$/.test(trimmed)) {
    return [{ rank: Number(trimmed[0]) as 1 | 2 | 3, groupLetter: trimmed[1] }];
  }

  if (/^[123][A-L](?:\/[A-L])+$/i.test(trimmed)) {
    const rank = Number(trimmed[0]) as 1 | 2 | 3;
    const groups = trimmed.slice(1).split("/");
    return groups.map((groupLetter) => ({ rank, groupLetter }));
  }

  if (/^[123][A-L](?:\/[123][A-L])+$/i.test(trimmed)) {
    return trimmed.split("/").map((segment) => ({
      rank: Number(segment[0]) as 1 | 2 | 3,
      groupLetter: segment[1],
    }));
  }

  return null;
}

export function determineKnockoutWinnerSide(
  match: Pick<TournamentMatch, "stage" | "status" | "home_score" | "away_score"> & {
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
  },
): KnockoutSide | null {
  if (match.status !== "finished") return null;
  if (getMatchStageKind(match.stage) === "group") return null;
  if (match.home_score === null || match.away_score === null) return null;

  if (match.home_score > match.away_score) return "home";
  if (match.away_score > match.home_score) return "away";

  if (match.home_penalty_score === null || match.home_penalty_score === undefined) return null;
  if (match.away_penalty_score === null || match.away_penalty_score === undefined) return null;
  if (match.home_penalty_score > match.away_penalty_score) return "home";
  if (match.away_penalty_score > match.home_penalty_score) return "away";

  return null;
}

export function determineKnockoutWinnerId(
  match: Pick<TournamentMatch, "stage" | "status" | "home_score" | "away_score"> & {
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
  },
  homeTeamId: string | null,
  awayTeamId: string | null,
) {
  const winnerSide = determineKnockoutWinnerSide(match);
  if (winnerSide === "home") return homeTeamId;
  if (winnerSide === "away") return awayTeamId;
  return null;
}

export function determineKnockoutLoserId(
  match: Pick<TournamentMatch, "stage" | "status" | "home_score" | "away_score"> & {
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
  },
  homeTeamId: string | null,
  awayTeamId: string | null,
) {
  const winnerSide = determineKnockoutWinnerSide(match);
  if (winnerSide === "home") return awayTeamId;
  if (winnerSide === "away") return homeTeamId;
  return null;
}

function getLockedSeedTeam(
  groupStandings: Record<string, TeamStanding[]>,
  groupLetter: string,
  rank: number,
) {
  return groupStandings[groupLetter]?.find((entry) => entry.lockedRank === rank)?.team ?? null;
}

function solveAmbiguousSlots(slots: AssignmentSlot[], usedTeamIds: Set<string>) {
  const solutions: Map<string, string>[] = [];

  function walk(remaining: AssignmentSlot[], assigned: Map<string, string>, used: Set<string>) {
    if (solutions.length >= 2) return;
    if (remaining.length === 0) {
      solutions.push(new Map(assigned));
      return;
    }

    const next = [...remaining]
      .map((slot) => ({
        ...slot,
        candidates: slot.candidates.filter((candidate) => !used.has(candidate)),
      }))
      .sort((left, right) => left.candidates.length - right.candidates.length)[0];

    if (!next || next.candidates.length === 0) return;

    const rest = remaining.filter((slot) => slot.key !== next.key);

    for (const candidate of next.candidates) {
      const nextAssigned = new Map(assigned);
      nextAssigned.set(next.key, candidate);

      const nextUsed = new Set(used);
      nextUsed.add(candidate);

      walk(rest, nextAssigned, nextUsed);
    }
  }

  walk(slots, new Map(), new Set(usedTeamIds));
  return solutions;
}

export function buildRoundOf32Assignments({
  groupStandings,
  bestThirdStandings,
  matches,
}: AssignmentContext) {
  const assignments = new Map<string, string>();
  const usedTeamIds = new Set<string>();
  const qualifiedThirdIds = new Set(
    bestThirdStandings
      .filter((entry) => entry.status === "qualified")
      .map((entry) => entry.team.id),
  );

  const candidateSlots: AssignmentSlot[] = [];

  for (const match of matches) {
    if (getMatchStageKind(match.stage) !== "round_of_32") continue;

    for (const side of ["home", "away"] as const) {
      const placeholder = side === "home" ? match.home_placeholder : match.away_placeholder;
      const seedOptions = parseSeedPlaceholder(placeholder);
      if (!seedOptions) {
        const teamId = side === "home" ? match.home_team_id : match.away_team_id;
        if (!teamId) continue;

        assignments.set(makeMatchSideKey(match.match_number, side), teamId);
        usedTeamIds.add(teamId);
        continue;
      }

      const candidates = seedOptions
        .map((seed) => {
          const team = getLockedSeedTeam(groupStandings, seed.groupLetter, seed.rank);
          if (!team) return null;
          if (seed.rank === 3 && !qualifiedThirdIds.has(team.id)) return null;
          return team.id;
        })
        .filter((candidate): candidate is string => Boolean(candidate));

      if (candidates.length === 0) continue;

      candidateSlots.push({
        key: makeMatchSideKey(match.match_number, side),
        candidates: Array.from(new Set(candidates)),
      });
    }
  }

  const unresolved = [...candidateSlots];
  let changed = true;

  while (changed) {
    changed = false;

    for (let index = unresolved.length - 1; index >= 0; index -= 1) {
      const slot = unresolved[index];
      slot.candidates = slot.candidates.filter((candidate) => !usedTeamIds.has(candidate));

      if (slot.candidates.length !== 1) continue;

      const [candidate] = slot.candidates;
      assignments.set(slot.key, candidate);
      usedTeamIds.add(candidate);
      unresolved.splice(index, 1);
      changed = true;
    }
  }

  if (unresolved.length === 0) return assignments;

  const solutions = solveAmbiguousSlots(unresolved, usedTeamIds);
  if (solutions.length !== 1) return assignments;

  for (const [key, teamId] of solutions[0].entries()) {
    assignments.set(key, teamId);
  }

  return assignments;
}

export function getRoundOf32AssignedTeamId(
  assignments: Map<string, string>,
  matchNumber: number,
  side: KnockoutSide,
) {
  return assignments.get(makeMatchSideKey(matchNumber, side)) ?? null;
}

export function buildBracketTeamsById(groupStandings: Record<string, TeamStanding[]>) {
  const teamsById = new Map<string, TournamentTeam>();

  for (const standings of Object.values(groupStandings)) {
    for (const entry of standings) {
      teamsById.set(entry.team.id, entry.team);
    }
  }

  return teamsById;
}

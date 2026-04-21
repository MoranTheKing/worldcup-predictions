import type { SupabaseClient } from "@supabase/supabase-js";
import { type TournamentMatchRecord } from "@/lib/tournament/matches";
import { buildTournamentTeams, getGroupMatches, type TournamentTeamStateRow } from "@/lib/tournament/tournament-state";
import {
  buildRoundOf32Assignments,
  determineKnockoutLoserId,
  determineKnockoutWinnerId,
  getRoundOf32AssignedTeamId,
  makeMatchSideKey,
  parseReferencePlaceholder,
  parseSeedPlaceholder,
} from "@/lib/tournament/knockout-utils";
import { buildTournamentStandings, type TournamentMatch } from "@/lib/utils/standings";
import {
  calculateThirdPlaceMatchups,
  type GroupLetter,
  ALL_GROUPS,
} from "@/lib/utils/thirdPlaceAllocations";

type ProgressionMatchRow = TournamentMatchRecord;

type ResolutionContext = {
  matchesByNumber: Map<number, ProgressionMatchRow>;
  roundOf32Assignments: Map<string, string>;
};

function shouldResolveSide(placeholder: string | null) {
  return Boolean(parseReferencePlaceholder(placeholder) || parseSeedPlaceholder(placeholder));
}

function resolveParticipantId(
  match: ProgressionMatchRow,
  side: "home" | "away",
  context: ResolutionContext,
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
    const explicitTeamId = side === "home" ? match.home_team_id : match.away_team_id;
    return explicitTeamId;
  }

  const upstream = context.matchesByNumber.get(reference.matchNumber);
  if (!upstream) return null;

  const upstreamHomeTeamId = resolveParticipantId(upstream, "home", context);
  const upstreamAwayTeamId = resolveParticipantId(upstream, "away", context);

  return reference.kind === "winner"
    ? determineKnockoutWinnerId(upstream, upstreamHomeTeamId, upstreamAwayTeamId)
    : determineKnockoutLoserId(upstream, upstreamHomeTeamId, upstreamAwayTeamId);
}

export async function syncTournamentState(supabase: SupabaseClient) {
  const [{ data: matchesData, error: matchesError }, { data: teamsData, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(`
          match_number,
          stage,
          status,
          date_time,
          minute,
          home_team_id,
          away_team_id,
          home_placeholder,
          away_placeholder,
          home_score,
          away_score,
          is_extra_time,
          home_penalty_score,
          away_penalty_score
        `)
        .order("match_number", { ascending: true }),
      supabase
        .from("teams")
        .select(`
          id,
          name,
          name_he,
          logo_url,
          group_letter,
          fair_play_score,
          fifa_ranking,
          is_eliminated
        `)
        .order("group_letter")
        .order("name_he", { ascending: true }),
    ]);

  if (matchesError) throw new Error(matchesError.message);
  if (teamsError) throw new Error(teamsError.message);

  const matches = (matchesData ?? []) as ProgressionMatchRow[];
  const groupMatches = getGroupMatches(matches);
  const teams = buildTournamentTeams((teamsData ?? []) as TournamentTeamStateRow[], groupMatches);
  const tournament = buildTournamentStandings(teams, groupMatches);
  const roundOf32Assignments = buildRoundOf32Assignments({
    groupStandings: tournament.groupStandings,
    bestThirdStandings: tournament.bestThirdStandings,
    matches: matches as TournamentMatch[],
  });

  // Annex C: once all 8 best-3rd-place teams are mathematically determined,
  // use the official FIFA slot assignment table to place each team precisely.
  const qualifiedThirdGroups = tournament.bestThirdStandings
    .slice(0, 8)
    .filter((e) => e.isLocked && e.status === "qualified")
    .map((e) => e.team.group_letter)
    .filter((g): g is GroupLetter => g !== null && ALL_GROUPS.includes(g as GroupLetter));

  if (qualifiedThirdGroups.length === 8) {
    const r32Matches = matches.filter((m) => m.match_number >= 73 && m.match_number <= 88);
    const annexCAssignments = calculateThirdPlaceMatchups(
      r32Matches,
      qualifiedThirdGroups,
      tournament.groupStandings,
    );
    for (const assignment of annexCAssignments) {
      roundOf32Assignments.set(
        makeMatchSideKey(assignment.matchNumber, assignment.side),
        assignment.teamId,
      );
    }
  }

  const matchesByNumber = new Map(matches.map((match) => [match.match_number, { ...match }]));
  const context: ResolutionContext = { matchesByNumber, roundOf32Assignments };
  const pendingUpdates: Array<{ match_number: number; update: Record<string, string | null> }> = [];

  for (const match of matches) {
    if (match.match_number < 73) continue;

    const current = matchesByNumber.get(match.match_number);
    if (!current) continue;

    const update: Record<string, string | null> = {};

    if (shouldResolveSide(current.home_placeholder)) {
      const nextHomeTeamId = resolveParticipantId(current, "home", context);
      if (current.home_team_id !== nextHomeTeamId) {
        current.home_team_id = nextHomeTeamId;
        update.home_team_id = nextHomeTeamId;
      }
    }

    if (shouldResolveSide(current.away_placeholder)) {
      const nextAwayTeamId = resolveParticipantId(current, "away", context);
      if (current.away_team_id !== nextAwayTeamId) {
        current.away_team_id = nextAwayTeamId;
        update.away_team_id = nextAwayTeamId;
      }
    }

    if (Object.keys(update).length === 0) continue;
    pendingUpdates.push({ match_number: current.match_number, update });
  }

  for (const item of pendingUpdates) {
    const { error } = await supabase
      .from("matches")
      .update(item.update)
      .eq("match_number", item.match_number);

    if (error) throw new Error(error.message);
  }

  return {
    updatedMatches: pendingUpdates.length,
    qualifiedThirdPlaceGroups: tournament.bestThirdStandings
      .filter((entry) => entry.status === "qualified")
      .map((entry) => entry.team.group_letter)
      .filter((letter): letter is string => Boolean(letter)),
    resolvedSlots: roundOf32Assignments.size,
  };
}

export const syncKnockoutProgression = syncTournamentState;

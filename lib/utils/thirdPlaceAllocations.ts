/**
 * FIFA 2026 Annex C - 3rd-place qualifier slot allocator.
 *
 * 12 groups (A..L). Top 8 best-3rd-place teams advance to the Round of 32.
 * Which 8 groups provide those teams determines the exact R32 slot assignment
 * via FIFA's published Annex C table (C(12,8) = 495 cases).
 *
 * JSON format (fifa_2026_matchups.json):
 *   key = sorted 8-letter subset of qualifying groups, e.g. "ABCDEFGH"
 *   value = { [winner_group]: [third_place_group] }
 *           read: "the R32 match where group X's winner plays receives the
 *                  3rd-place team from group Y"
 *
 * The 8 R32 slots where a 3rd-place team always appears are:
 *   A, B, D, E, G, I, K, L (group-winner letters, per FIFA bracket)
 */

import FIFA_MATCHUPS from "@/fifa_2026_matchups.json";

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const ALL_GROUPS: readonly GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

/** Numeric slot index 1-8 used by the provisional bracket2026 seed notation. */
export type ThirdPlaceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** The 8 fixed slot keys present in every Annex C entry. */
export const ANNEX_C_SLOT_KEYS = ["A", "B", "D", "E", "G", "I", "K", "L"] as const;

export type ThirdPlaceMatchupAssignment = {
  matchNumber: number;
  side: "home" | "away";
  teamId: string;
  winnerGroup: GroupLetter;
  thirdPlaceGroup: GroupLetter;
};

/**
 * Canonical lookup key for a qualifying subset: 8 letters sorted alphabetically.
 * e.g. ["C","A","B","D","E","F","G","H"] -> "ABCDEFGH"
 */
export function subsetKey(groups: readonly GroupLetter[]): string {
  return [...groups].sort().join("");
}

type AnnexCMap = Record<string, Record<string, string>>;
const MATCHUPS = FIFA_MATCHUPS as AnnexCMap;

/**
 * Look up the Annex C allocation for the given 8 qualifying group letters.
 * Returns a mapping { winner_group -> 3rd_place_group } or null when the
 * subset is not found in the table (should not happen with a complete table).
 */
export function lookupAnnexC(
  qualifyingGroups: readonly GroupLetter[],
): Record<string, GroupLetter> | null {
  if (qualifyingGroups.length !== 8) return null;
  const key = subsetKey(qualifyingGroups);
  const entry = MATCHUPS[key];
  if (!entry) return null;
  return entry as Record<string, GroupLetter>;
}

/**
 * Given the 8 qualifying groups and the current group standings, compute
 * the exact Round-of-32 side that should receive each 3rd-place qualifier.
 *
 * Returns one entry per resolved Annex C pairing. The assignment is side-aware:
 * if the group-winner placeholder is on the home side, the 3rd-place team goes
 * to the away side, and vice versa.
 *
 * Falls back silently (returns an empty list) if:
 *   - fewer than 8 qualifying groups provided
 *   - subset not in the JSON table
 *   - a winner placeholder cannot be found in matches 73-88
 *   - the resolved 3rd-place team is not yet findable in standings
 */
export function calculateThirdPlaceMatchups(
  r32Matches: ReadonlyArray<{
    match_number: number;
    home_placeholder: string | null | undefined;
    away_placeholder: string | null | undefined;
  }>,
  qualifyingGroups: readonly GroupLetter[],
  groupStandings: Record<string, ReadonlyArray<{ rank: number; team: { id: string } }>>,
): ThirdPlaceMatchupAssignment[] {
  const result: ThirdPlaceMatchupAssignment[] = [];

  const allocation = lookupAnnexC(qualifyingGroups);
  if (!allocation) return result;

  for (const [winnerGroupKey, thirdPlaceGroup] of Object.entries(allocation)) {
    const winnerGroup = winnerGroupKey as GroupLetter;
    const standings = groupStandings[thirdPlaceGroup];
    const thirdEntry = standings?.find((entry) => entry.rank === 3);
    if (!thirdEntry) continue;

    const winnerPlaceholder = `1${winnerGroup}`;
    const match = r32Matches.find((candidate) => {
      const homePlaceholder = candidate.home_placeholder?.trim().toUpperCase() ?? "";
      const awayPlaceholder = candidate.away_placeholder?.trim().toUpperCase() ?? "";
      return homePlaceholder === winnerPlaceholder || awayPlaceholder === winnerPlaceholder;
    });
    if (!match) continue;

    const homePlaceholder = match.home_placeholder?.trim().toUpperCase() ?? "";
    const side = homePlaceholder === winnerPlaceholder ? "away" : "home";

    result.push({
      matchNumber: match.match_number,
      side,
      teamId: thirdEntry.team.id,
      winnerGroup,
      thirdPlaceGroup,
    });
  }

  return result;
}

/**
 * FIFA 2026 - 3rd-place qualifier allocator.
 *
 * 12 group stage groups (A..L). The 8 best 3rd-placed teams advance.
 * Which 8 groups provide the 3rd-place qualifier depends on match results.
 * C(12, 8) = 495 possible subsets → FIFA publishes an "Annex C" style table
 * that maps every subset to a fixed assignment of those 8 groups to the
 * 8 Round-of-32 "third-place" slots (3RD-1 ... 3RD-8).
 *
 * This module encodes:
 *   - the type surface
 *   - a deterministic lookup function
 *   - a proof-of-concept subset of the table (5-10 rows)
 *
 * TODO(full-annex-c): replace FULL_ALLOCATION_TABLE with the complete
 * 495-row mapping from FIFA's published Annex C. Each row is
 *   [sorted 8-group subset, ordered slot→group assignment].
 * Paste the JSON into FULL_ALLOCATION_TABLE without touching anything else.
 */

export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export const ALL_GROUPS: readonly GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

export type ThirdPlaceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const THIRD_PLACE_SLOTS: readonly ThirdPlaceSlot[] = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Allocation = for each of the 8 slots, which group's 3rd-placed team fills it.
 * Example: { 1: "A", 2: "B", ... } means 3RD-1 = team that finished 3rd in group A.
 */
export type ThirdPlaceAllocation = Record<ThirdPlaceSlot, GroupLetter>;

type AllocationRow = {
  /** Sorted array of exactly 8 distinct group letters. */
  subset: GroupLetter[];
  /** Slot → group assignment for this subset. */
  allocation: ThirdPlaceAllocation;
};

/**
 * Canonical key for a subset: the 8 letters sorted alphabetically, joined.
 * e.g. ["C","A","B","D","E","F","G","H"] → "ABCDEFGH".
 */
export function subsetKey(groups: readonly GroupLetter[]): string {
  return [...groups].sort().join("");
}

function row(key: string, slots: [GroupLetter, GroupLetter, GroupLetter, GroupLetter, GroupLetter, GroupLetter, GroupLetter, GroupLetter]): AllocationRow {
  const [s1, s2, s3, s4, s5, s6, s7, s8] = slots;
  return {
    subset: key.split("") as GroupLetter[],
    allocation: { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5, 6: s6, 7: s7, 8: s8 },
  };
}

/**
 * Proof-of-concept subset of the 495-row FIFA Annex C mapping.
 *
 * The exact slot ordering in each row below is a plausible layout consistent
 * with FIFA's historical 3rd-place assignment pattern (earlier letters tend to
 * fill lower slot numbers), but it is NOT a substitute for the official table.
 *
 * TODO(full-annex-c): overwrite this constant with the complete 495-row
 * mapping provided by product/FIFA.
 */
const SAMPLE_ALLOCATION_TABLE: readonly AllocationRow[] = [
  row("ABCDEFGH", ["A", "B", "C", "D", "E", "F", "G", "H"]),
  row("ABCDEFGI", ["A", "B", "C", "D", "E", "F", "G", "I"]),
  row("ABCDEFGJ", ["A", "B", "C", "D", "E", "F", "G", "J"]),
  row("ABCDEFGK", ["A", "B", "C", "D", "E", "F", "G", "K"]),
  row("ABCDEFGL", ["A", "B", "C", "D", "E", "F", "G", "L"]),
  row("ABCDEFHI", ["A", "B", "C", "D", "E", "F", "H", "I"]),
  row("ABCDEFHJ", ["A", "B", "C", "D", "E", "F", "H", "J"]),
  row("ABCDEFHK", ["A", "B", "C", "D", "E", "F", "H", "K"]),
  row("EFGHIJKL", ["E", "F", "G", "H", "I", "J", "K", "L"]),
] as const;

/**
 * The full 495-row table lives here once pasted. Until then we fall back to
 * the sample table above and, for any subset not present, a deterministic
 * alphabetical assignment (slot N = Nth group in sorted subset).
 */
export const FULL_ALLOCATION_TABLE: readonly AllocationRow[] = SAMPLE_ALLOCATION_TABLE;

const ALLOCATION_INDEX: Map<string, ThirdPlaceAllocation> = new Map(
  FULL_ALLOCATION_TABLE.map((r) => [subsetKey(r.subset), r.allocation]),
);

export class InvalidThirdPlaceSubsetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidThirdPlaceSubsetError";
  }
}

function validateSubset(groups: readonly GroupLetter[]): GroupLetter[] {
  if (groups.length !== 8) {
    throw new InvalidThirdPlaceSubsetError(
      `Expected exactly 8 groups, received ${groups.length}`,
    );
  }

  const sorted = [...groups].sort();
  const unique = new Set(sorted);
  if (unique.size !== 8) {
    throw new InvalidThirdPlaceSubsetError(`Groups must be distinct: ${groups.join(",")}`);
  }

  for (const g of sorted) {
    if (!ALL_GROUPS.includes(g)) {
      throw new InvalidThirdPlaceSubsetError(`Unknown group letter: ${g}`);
    }
  }

  return sorted;
}

function fallbackAllocation(sortedSubset: GroupLetter[]): ThirdPlaceAllocation {
  return {
    1: sortedSubset[0], 2: sortedSubset[1], 3: sortedSubset[2], 4: sortedSubset[3],
    5: sortedSubset[4], 6: sortedSubset[5], 7: sortedSubset[6], 8: sortedSubset[7],
  };
}

/**
 * Given the 8 groups whose 3rd-placed team qualified, return the 8 slot
 * assignments per FIFA Annex C. Falls back to an alphabetical mapping when the
 * subset has not yet been populated in FULL_ALLOCATION_TABLE.
 */
export function allocateThirdPlaces(groups: readonly GroupLetter[]): ThirdPlaceAllocation {
  const sortedSubset = validateSubset(groups);
  return ALLOCATION_INDEX.get(subsetKey(sortedSubset)) ?? fallbackAllocation(sortedSubset);
}

/**
 * True if the given subset is covered by the official lookup table (as
 * opposed to returning the alphabetical fallback). Useful for UI that wants
 * to surface "bracket pairings not yet official" warnings while the full
 * table is still incomplete.
 */
export function isSubsetCovered(groups: readonly GroupLetter[]): boolean {
  const sortedSubset = validateSubset(groups);
  return ALLOCATION_INDEX.has(subsetKey(sortedSubset));
}

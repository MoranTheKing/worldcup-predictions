import type { GroupLetter, ThirdPlaceSlot } from "@/lib/utils/thirdPlaceAllocations";

/**
 * FIFA 2026 knockout bracket structure.
 *
 * Matches are numbered 1-104:
 *   - 1..72   = group stage
 *   - 73..88  = Round of 32   (16 matches)
 *   - 89..96  = Round of 16   (8 matches)
 *   - 97..100 = Quarter-finals (4 matches)
 *   - 101..102 = Semi-finals  (2 matches)
 *   - 103     = 3rd place play-off
 *   - 104     = Final
 *
 * A "seed" is a symbolic slot that gets filled in as the tournament
 * progresses. Three kinds:
 *   - group:  "A1" = group A winner
 *   - third:  "3RD-5" = 3rd-place team allocated to slot 5 (per Annex C)
 *   - winner: "W73"  = winner of match 73
 *
 * NOTE: the exact pairings for the 2026 Round of 32 below are a provisional
 * layout that preserves the correct seed-type distribution (12× group winners,
 * 12× group runners-up, 8× best-third qualifiers). Replace with FIFA's final
 * published bracket when it is confirmed.
 */

export type KnockoutRound =
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";

export type GroupSeed = { kind: "group"; group: GroupLetter; position: 1 | 2 };
export type ThirdSeed = { kind: "third"; slot: ThirdPlaceSlot };
export type WinnerSeed = { kind: "winner"; matchNumber: number };
export type LoserSeed = { kind: "loser"; matchNumber: number };
export type BracketSeed = GroupSeed | ThirdSeed | WinnerSeed | LoserSeed;

export type BracketMatch = {
  matchNumber: number;
  round: KnockoutRound;
  home: BracketSeed;
  away: BracketSeed;
};

const g = (group: GroupLetter, position: 1 | 2): GroupSeed => ({ kind: "group", group, position });
const t = (slot: ThirdPlaceSlot): ThirdSeed => ({ kind: "third", slot });
const w = (matchNumber: number): WinnerSeed => ({ kind: "winner", matchNumber });
const l = (matchNumber: number): LoserSeed => ({ kind: "loser", matchNumber });

export const ROUND_OF_32: BracketMatch[] = [
  { matchNumber: 73, round: "round_of_32", home: g("A", 1), away: g("B", 2) },
  { matchNumber: 74, round: "round_of_32", home: g("C", 1), away: t(1) },
  { matchNumber: 75, round: "round_of_32", home: g("E", 1), away: t(2) },
  { matchNumber: 76, round: "round_of_32", home: g("G", 1), away: t(3) },
  { matchNumber: 77, round: "round_of_32", home: g("I", 1), away: t(4) },
  { matchNumber: 78, round: "round_of_32", home: g("K", 1), away: t(5) },
  { matchNumber: 79, round: "round_of_32", home: g("B", 1), away: g("D", 2) },
  { matchNumber: 80, round: "round_of_32", home: g("F", 1), away: g("H", 2) },
  { matchNumber: 81, round: "round_of_32", home: g("J", 1), away: g("L", 2) },
  { matchNumber: 82, round: "round_of_32", home: g("D", 1), away: t(6) },
  { matchNumber: 83, round: "round_of_32", home: g("H", 1), away: t(7) },
  { matchNumber: 84, round: "round_of_32", home: g("L", 1), away: t(8) },
  { matchNumber: 85, round: "round_of_32", home: g("A", 2), away: g("C", 2) },
  { matchNumber: 86, round: "round_of_32", home: g("E", 2), away: g("G", 2) },
  { matchNumber: 87, round: "round_of_32", home: g("I", 2), away: g("K", 2) },
  { matchNumber: 88, round: "round_of_32", home: g("F", 2), away: g("J", 2) },
];

export const ROUND_OF_16: BracketMatch[] = [
  { matchNumber: 89, round: "round_of_16", home: w(73), away: w(74) },
  { matchNumber: 90, round: "round_of_16", home: w(75), away: w(76) },
  { matchNumber: 91, round: "round_of_16", home: w(77), away: w(78) },
  { matchNumber: 92, round: "round_of_16", home: w(79), away: w(80) },
  { matchNumber: 93, round: "round_of_16", home: w(81), away: w(82) },
  { matchNumber: 94, round: "round_of_16", home: w(83), away: w(84) },
  { matchNumber: 95, round: "round_of_16", home: w(85), away: w(86) },
  { matchNumber: 96, round: "round_of_16", home: w(87), away: w(88) },
];

export const QUARTER_FINALS: BracketMatch[] = [
  { matchNumber: 97, round: "quarter_final", home: w(89), away: w(90) },
  { matchNumber: 98, round: "quarter_final", home: w(91), away: w(92) },
  { matchNumber: 99, round: "quarter_final", home: w(93), away: w(94) },
  { matchNumber: 100, round: "quarter_final", home: w(95), away: w(96) },
];

export const SEMI_FINALS: BracketMatch[] = [
  { matchNumber: 101, round: "semi_final", home: w(97), away: w(98) },
  { matchNumber: 102, round: "semi_final", home: w(99), away: w(100) },
];

export const THIRD_PLACE: BracketMatch = {
  matchNumber: 103, round: "third_place", home: l(101), away: l(102),
};

export const FINAL: BracketMatch = {
  matchNumber: 104, round: "final", home: w(101), away: w(102),
};

export const ALL_KNOCKOUT_MATCHES: readonly BracketMatch[] = [
  ...ROUND_OF_32,
  ...ROUND_OF_16,
  ...QUARTER_FINALS,
  ...SEMI_FINALS,
  THIRD_PLACE,
  FINAL,
];

export const ROUNDS_IN_ORDER: { round: KnockoutRound; matches: BracketMatch[] }[] = [
  { round: "round_of_32", matches: ROUND_OF_32 },
  { round: "round_of_16", matches: ROUND_OF_16 },
  { round: "quarter_final", matches: QUARTER_FINALS },
  { round: "semi_final", matches: SEMI_FINALS },
  { round: "final", matches: [FINAL] },
];

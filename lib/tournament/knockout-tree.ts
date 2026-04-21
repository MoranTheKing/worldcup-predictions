import { getMatchStageKind } from "@/lib/tournament/matches";
import { parseReferencePlaceholder } from "@/lib/tournament/knockout-utils";

export type WinnerTreeRound =
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "final";

export const WINNER_TREE_ROUNDS: WinnerTreeRound[] = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "final",
];

type KnockoutTreeMatch = {
  match_number: number;
  stage: string;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
};

export type KnockoutTreeNode = {
  matchNumber: number;
  round: WinnerTreeRound;
  childMatchNumbers: number[];
  parentMatchNumber: number | null;
  leafStart: number;
  leafEnd: number;
  center: number;
  order: number;
};

export type KnockoutWinnerTree = {
  rounds: Record<WinnerTreeRound, KnockoutTreeNode[]>;
  nodes: KnockoutTreeNode[];
  nodesByMatchNumber: Map<number, KnockoutTreeNode>;
  finalMatchNumber: number | null;
  thirdPlaceMatchNumber: number | null;
  leafCount: number;
};

function emptyRounds(): Record<WinnerTreeRound, KnockoutTreeNode[]> {
  return {
    round_of_32: [],
    round_of_16: [],
    quarter_final: [],
    semi_final: [],
    final: [],
  };
}

function getWinnerChildMatchNumbers(match: KnockoutTreeMatch) {
  return [match.home_placeholder, match.away_placeholder]
    .map((placeholder) => parseReferencePlaceholder(placeholder))
    .filter(
      (
        reference,
      ): reference is { kind: "winner"; matchNumber: number } => reference?.kind === "winner",
    )
    .map((reference) => reference.matchNumber);
}

export function buildKnockoutWinnerTree(matches: ReadonlyArray<KnockoutTreeMatch>): KnockoutWinnerTree {
  const matchesByNumber = new Map(
    matches
      .filter((match) => {
        const stageKind = getMatchStageKind(match.stage);
        return stageKind !== "group" && stageKind !== "unknown";
      })
      .map((match) => [match.match_number, match]),
  );

  const finalMatch = matches.find((match) => getMatchStageKind(match.stage) === "final") ?? null;
  const thirdPlaceMatch =
    matches.find((match) => getMatchStageKind(match.stage) === "third_place") ?? null;

  if (!finalMatch) {
    return {
      rounds: emptyRounds(),
      nodes: [],
      nodesByMatchNumber: new Map(),
      finalMatchNumber: null,
      thirdPlaceMatchNumber: thirdPlaceMatch?.match_number ?? null,
      leafCount: 0,
    };
  }

  const leafMatchNumbers = collectLeafMatchNumbers(finalMatch.match_number, matchesByNumber);
  const leafIndexByMatchNumber = new Map(
    leafMatchNumbers.map((matchNumber, index) => [matchNumber, index]),
  );
  const nodesByMatchNumber = new Map<number, KnockoutTreeNode>();

  function visit(matchNumber: number, parentMatchNumber: number | null): KnockoutTreeNode {
    const existing = nodesByMatchNumber.get(matchNumber);
    if (existing) {
      if (existing.parentMatchNumber === null && parentMatchNumber !== null) {
        existing.parentMatchNumber = parentMatchNumber;
      }
      return existing;
    }

    const match = matchesByNumber.get(matchNumber);
    if (!match) {
      throw new Error(`Missing knockout match ${matchNumber} while building the bracket tree.`);
    }

    const round = getMatchStageKind(match.stage);
    if (!WINNER_TREE_ROUNDS.includes(round as WinnerTreeRound)) {
      throw new Error(`Match ${matchNumber} is not part of the winner tree.`);
    }

    const childMatchNumbers = getWinnerChildMatchNumbers(match);
    let leafStart: number;
    let leafEnd: number;

    if (childMatchNumbers.length === 0) {
      const leafIndex = leafIndexByMatchNumber.get(matchNumber);
      if (leafIndex === undefined) {
        throw new Error(`Leaf index missing for match ${matchNumber}.`);
      }
      leafStart = leafIndex;
      leafEnd = leafIndex;
    } else {
      const childNodes = childMatchNumbers.map((childMatchNumber) =>
        visit(childMatchNumber, matchNumber),
      );
      leafStart = Math.min(...childNodes.map((childNode) => childNode.leafStart));
      leafEnd = Math.max(...childNodes.map((childNode) => childNode.leafEnd));
    }

    const node: KnockoutTreeNode = {
      matchNumber,
      round: round as WinnerTreeRound,
      childMatchNumbers,
      parentMatchNumber,
      leafStart,
      leafEnd,
      center: (leafStart + leafEnd) / 2,
      order: 0,
    };

    nodesByMatchNumber.set(matchNumber, node);
    return node;
  }

  visit(finalMatch.match_number, null);

  const rounds = emptyRounds();
  for (const node of nodesByMatchNumber.values()) {
    rounds[node.round].push(node);
  }

  for (const round of WINNER_TREE_ROUNDS) {
    rounds[round].sort((left, right) => left.center - right.center);
    rounds[round].forEach((node, index) => {
      node.order = index;
    });
  }

  const nodes = WINNER_TREE_ROUNDS.flatMap((round) => rounds[round]);

  return {
    rounds,
    nodes,
    nodesByMatchNumber,
    finalMatchNumber: finalMatch.match_number,
    thirdPlaceMatchNumber: thirdPlaceMatch?.match_number ?? null,
    leafCount: leafMatchNumbers.length,
  };
}

function collectLeafMatchNumbers(
  matchNumber: number,
  matchesByNumber: Map<number, KnockoutTreeMatch>,
): number[] {
  const match = matchesByNumber.get(matchNumber);
  if (!match) return [];

  const childMatchNumbers = getWinnerChildMatchNumbers(match);
  if (childMatchNumbers.length === 0) return [matchNumber];

  return childMatchNumbers.flatMap((childMatchNumber) =>
    collectLeafMatchNumbers(childMatchNumber, matchesByNumber),
  );
}

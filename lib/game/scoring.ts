import { getMatchStageKind } from "@/lib/tournament/matches";

export type PredictionDirection = "home" | "draw" | "away";
export type PredictionHitKind = "miss" | "direction" | "exact";

export type ScoringPrediction = {
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker?: boolean | null;
  is_joker_applied?: boolean | null;
};

export type ScoringMatch = {
  stage: string;
  home_score: number | null;
  away_score: number | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
};

type StageBonus = {
  direction: number;
  exact: number;
};

const STAGE_BONUS_BY_KIND: Record<string, StageBonus> = {
  group: { direction: 0, exact: 2 },
  round_of_32: { direction: 1, exact: 2 },
  round_of_16: { direction: 2, exact: 3 },
  quarter_final: { direction: 3, exact: 4 },
  semi_final: { direction: 4, exact: 5 },
  third_place: { direction: 4, exact: 5 },
  final: { direction: 5, exact: 7 },
  unknown: { direction: 0, exact: 2 },
};

export function calculatePredictionPoints(
  prediction: ScoringPrediction,
  match: ScoringMatch,
) {
  const predictedHome = normalizeScore(prediction.home_score_guess);
  const predictedAway = normalizeScore(prediction.away_score_guess);
  const actualHome = normalizeScore(match.home_score);
  const actualAway = normalizeScore(match.away_score);

  if (
    predictedHome === null ||
    predictedAway === null ||
    actualHome === null ||
    actualAway === null
  ) {
    return 0;
  }

  const predictedDirection = getScoreDirection(predictedHome, predictedAway);
  const actualDirection = getScoreDirection(actualHome, actualAway);

  if (predictedDirection !== actualDirection) {
    return 0;
  }

  const hitKind: Exclude<PredictionHitKind, "miss"> =
    predictedHome === actualHome && predictedAway === actualAway ? "exact" : "direction";
  const basePoints = getBasePointsForOdds(getOddsForDirection(match, predictedDirection));
  const stageBonus = getStageBonus(match.stage, hitKind);
  const multiplier = prediction.is_joker === true || prediction.is_joker_applied === true ? 2 : 1;

  return (basePoints + stageBonus) * multiplier;
}

export function getBasePointsForOdds(odds: number | string | null | undefined) {
  const value = normalizeOdds(odds);
  if (value === null) return 0;

  if (value >= 1 && value <= 1.3) return 1;
  if (value <= 1.8) return 2;
  if (value <= 2.5) return 3;
  if (value <= 3.5) return 4;
  if (value <= 5) return 5;
  if (value <= 10) return 7;
  return 10;
}

function getStageBonus(stage: string, hitKind: Exclude<PredictionHitKind, "miss">) {
  const kind = getMatchStageKind(stage);
  const bonus = STAGE_BONUS_BY_KIND[kind] ?? STAGE_BONUS_BY_KIND.unknown;
  return bonus[hitKind];
}

function getOddsForDirection(match: ScoringMatch, direction: PredictionDirection) {
  if (direction === "home") return match.home_odds;
  if (direction === "away") return match.away_odds;
  return match.draw_odds;
}

function getScoreDirection(homeScore: number, awayScore: number): PredictionDirection {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

function normalizeScore(value: number | null | undefined) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function normalizeOdds(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

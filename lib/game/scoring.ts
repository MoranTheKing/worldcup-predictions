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

const STAGE_POINTS_BY_KIND: Record<string, number> = {
  group: 0,
  round_of_32: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 4,
  final: 5,
  unknown: 0,
};

const HIT_POINTS_BY_KIND: Record<Exclude<PredictionHitKind, "miss">, number> = {
  direction: 0,
  exact: 1,
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
  const stagePoints = getStagePoints(match.stage);
  const hitPoints = HIT_POINTS_BY_KIND[hitKind];
  const multiplier = prediction.is_joker === true || prediction.is_joker_applied === true ? 2 : 1;

  return (basePoints + stagePoints + hitPoints) * multiplier;
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

function getStagePoints(stage: string) {
  const kind = getMatchStageKind(stage);
  return STAGE_POINTS_BY_KIND[kind] ?? STAGE_POINTS_BY_KIND.unknown;
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

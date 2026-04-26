import {
  isKnockoutStage,
  type MatchPhase,
  type MatchStatus,
  type TournamentMatchRecord,
} from "@/lib/tournament/matches";

export type EditableMatchState = Pick<
  TournamentMatchRecord,
  | "match_number"
  | "stage"
  | "status"
  | "match_phase"
  | "home_score"
  | "away_score"
  | "home_odds"
  | "draw_odds"
  | "away_odds"
  | "minute"
  | "is_extra_time"
  | "home_penalty_score"
  | "away_penalty_score"
>;

export type DevMatchPatchInput = {
  status?: MatchStatus;
  match_phase?: MatchPhase | null;
  home_score?: number | null;
  away_score?: number | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
  minute?: number | null;
  is_extra_time?: boolean | null;
  home_penalty_score?: number | null;
  away_penalty_score?: number | null;
};

const ALLOWED_STATUS = new Set<MatchStatus>(["scheduled", "live", "finished"]);
const ALLOWED_MATCH_PHASE = new Set<MatchPhase>([
  "first_half",
  "halftime",
  "second_half",
  "extra_time",
  "penalties",
]);

const FIRST_HALF_END_MINUTE = 45;
const SECOND_HALF_END_MINUTE = 90;
const EXTRA_TIME_START_MINUTE = 91;
const EXTRA_TIME_AUTO_START_MINUTE = 106;
const EXTRA_TIME_END_MINUTE = 120;
const STOPPAGE_TIME_LIMIT_MINUTES = 15;
const FIRST_HALF_MAX_MINUTE = FIRST_HALF_END_MINUTE + STOPPAGE_TIME_LIMIT_MINUTES;
const SECOND_HALF_MAX_MINUTE = SECOND_HALF_END_MINUTE + STOPPAGE_TIME_LIMIT_MINUTES;
const EXTRA_TIME_MAX_MINUTE = EXTRA_TIME_END_MINUTE + STOPPAGE_TIME_LIMIT_MINUTES;

function isMinuteLockedPhase(phase: MatchPhase | null) {
  return phase === "halftime" || phase === "penalties";
}

function isExtraTimePhase(phase: MatchPhase | null) {
  return phase === "extra_time" || phase === "penalties";
}

function getMinuteBounds(phase: MatchPhase | null, knockout: boolean) {
  if (phase === "first_half") {
    return { min: 0, max: FIRST_HALF_MAX_MINUTE };
  }

  if (phase === "second_half") {
    return { min: FIRST_HALF_END_MINUTE + 1, max: SECOND_HALF_MAX_MINUTE };
  }

  if (phase === "extra_time") {
    return { min: EXTRA_TIME_START_MINUTE, max: EXTRA_TIME_MAX_MINUTE };
  }

  return { min: 0, max: knockout ? EXTRA_TIME_MAX_MINUTE : SECOND_HALF_MAX_MINUTE };
}

function isMinuteAllowedForPhase(phase: MatchPhase | null, knockout: boolean, minute: number | null) {
  if (minute === null) {
    return true;
  }

  if (isMinuteLockedPhase(phase)) {
    return false;
  }

  const bounds = getMinuteBounds(phase, knockout);
  return minute >= bounds.min && minute <= bounds.max;
}

function hasPenaltyScore(match: Pick<EditableMatchState, "home_penalty_score" | "away_penalty_score">) {
  return match.home_penalty_score !== null || match.away_penalty_score !== null;
}

function getPhaseFromMinute(
  knockout: boolean,
  minute: number | null,
  currentPhase: MatchPhase | null,
) {
  if (minute === null) {
    return currentPhase;
  }

  if (currentPhase !== null && isMinuteAllowedForPhase(currentPhase, knockout, minute)) {
    return currentPhase;
  }

  if (knockout && minute >= EXTRA_TIME_AUTO_START_MINUTE) {
    return "extra_time";
  }

  return minute <= FIRST_HALF_END_MINUTE ? "first_half" : "second_half";
}

function normalizeInt(value: unknown, min: number, max: number) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) return undefined;
  return Math.trunc(numeric);
}

function normalizeOdds(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const numeric = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 9999.99) return undefined;
  return Math.round(numeric * 100) / 100;
}

export function buildDevMatchUpdate(existing: EditableMatchState, patch: DevMatchPatchInput) {
  const update: Record<string, unknown> = {};
  const next: EditableMatchState = { ...existing };
  const startsAsKnockout = isKnockoutStage(existing.stage);

  if (patch.status !== undefined) {
    if (!ALLOWED_STATUS.has(patch.status)) {
      return { error: "invalid status" as const };
    }

    next.status = patch.status;
    update.status = patch.status;
  }

  if (patch.match_phase !== undefined) {
    if (patch.match_phase !== null && !ALLOWED_MATCH_PHASE.has(patch.match_phase)) {
      return { error: "invalid match_phase" as const };
    }

    if (!startsAsKnockout && isExtraTimePhase(patch.match_phase)) {
      return { error: "extra time is only allowed for knockout matches" as const };
    }

    next.match_phase = patch.match_phase;
    update.match_phase = patch.match_phase;
  }

  const homeScore = normalizeInt(patch.home_score, 0, 99);
  if (patch.home_score !== undefined && homeScore === undefined) {
    return { error: "invalid home_score" as const };
  }
  if (homeScore !== undefined) {
    next.home_score = homeScore;
    update.home_score = homeScore;
  }

  const awayScore = normalizeInt(patch.away_score, 0, 99);
  if (patch.away_score !== undefined && awayScore === undefined) {
    return { error: "invalid away_score" as const };
  }
  if (awayScore !== undefined) {
    next.away_score = awayScore;
    update.away_score = awayScore;
  }

  const homeOdds = normalizeOdds(patch.home_odds);
  if (patch.home_odds !== undefined && homeOdds === undefined) {
    return { error: "invalid home_odds" as const };
  }
  if (homeOdds !== undefined) {
    next.home_odds = homeOdds;
    update.home_odds = homeOdds;
  }

  const drawOdds = normalizeOdds(patch.draw_odds);
  if (patch.draw_odds !== undefined && drawOdds === undefined) {
    return { error: "invalid draw_odds" as const };
  }
  if (drawOdds !== undefined) {
    next.draw_odds = drawOdds;
    update.draw_odds = drawOdds;
  }

  const awayOdds = normalizeOdds(patch.away_odds);
  if (patch.away_odds !== undefined && awayOdds === undefined) {
    return { error: "invalid away_odds" as const };
  }
  if (awayOdds !== undefined) {
    next.away_odds = awayOdds;
    update.away_odds = awayOdds;
  }

  const minute = normalizeInt(patch.minute, 0, EXTRA_TIME_MAX_MINUTE);
  if (patch.minute !== undefined && minute === undefined) {
    return { error: "invalid minute" as const };
  }
  if (minute !== undefined) {
    next.minute = minute;
    update.minute = minute;
  }

  if (patch.is_extra_time !== undefined) {
    next.is_extra_time = Boolean(patch.is_extra_time);
    update.is_extra_time = Boolean(patch.is_extra_time);
  }

  const homePenaltyScore = normalizeInt(patch.home_penalty_score, 0, 30);
  if (patch.home_penalty_score !== undefined && homePenaltyScore === undefined) {
    return { error: "invalid home_penalty_score" as const };
  }
  if (homePenaltyScore !== undefined) {
    next.home_penalty_score = homePenaltyScore;
    update.home_penalty_score = homePenaltyScore;
  }

  const awayPenaltyScore = normalizeInt(patch.away_penalty_score, 0, 30);
  if (patch.away_penalty_score !== undefined && awayPenaltyScore === undefined) {
    return { error: "invalid away_penalty_score" as const };
  }
  if (awayPenaltyScore !== undefined) {
    next.away_penalty_score = awayPenaltyScore;
    update.away_penalty_score = awayPenaltyScore;
  }

  const regularDraw = next.home_score === next.away_score;
  const knockout = isKnockoutStage(next.stage);
  const hasPenalties = hasPenaltyScore(next);
  const explicitlySetPhase = patch.match_phase !== undefined;

  if (next.status === "live" && explicitlySetPhase && next.match_phase !== null) {
    if (isMinuteLockedPhase(next.match_phase)) {
      next.minute = null;
      update.minute = null;
    } else if (next.match_phase === "extra_time" && !isMinuteAllowedForPhase(next.match_phase, knockout, next.minute)) {
      next.minute = 91;
      update.minute = 91;
    } else if (!isMinuteAllowedForPhase(next.match_phase, knockout, next.minute)) {
      next.minute = null;
      update.minute = null;
    }
  }

  if (next.status === "scheduled") {
    next.home_score = 0;
    next.away_score = 0;
    next.minute = null;
    next.match_phase = null;
    next.is_extra_time = false;
    next.home_penalty_score = null;
    next.away_penalty_score = null;
    update.home_score = 0;
    update.away_score = 0;
    update.minute = null;
    update.match_phase = null;
    update.is_extra_time = false;
    update.home_penalty_score = null;
    update.away_penalty_score = null;
  } else if (!regularDraw || !knockout) {
    next.home_penalty_score = null;
    next.away_penalty_score = null;
    update.home_penalty_score = null;
    update.away_penalty_score = null;

    if (next.match_phase === "penalties") {
      next.match_phase = null;
      update.match_phase = null;
      next.is_extra_time = false;
      update.is_extra_time = false;
    }
  }

  if (next.status === "finished") {
    next.match_phase = null;
    next.minute = null;
    update.match_phase = null;
    update.minute = null;
  } else if (next.status === "live") {
    if (knockout && regularDraw && hasPenalties) {
      next.match_phase = "penalties";
      update.match_phase = next.match_phase;
      next.minute = null;
      update.minute = null;
      next.is_extra_time = true;
      update.is_extra_time = true;
    } else {
      const phaseFromMinute = getPhaseFromMinute(knockout, next.minute, next.match_phase);

      if (phaseFromMinute !== next.match_phase) {
        next.match_phase = phaseFromMinute;
        update.match_phase = next.match_phase;
      }
    }

    if (!isMinuteAllowedForPhase(next.match_phase, knockout, next.minute)) {
      return { error: "invalid minute for match_phase" as const };
    }

    if (isMinuteLockedPhase(next.match_phase)) {
      next.minute = null;
      update.minute = null;
    }

    if (next.match_phase !== null) {
      next.is_extra_time = isExtraTimePhase(next.match_phase);
      update.is_extra_time = next.is_extra_time;
    }
  } else if (next.status !== "live") {
    next.match_phase = null;
    update.match_phase = null;
  }

  if (next.status === "finished" && knockout && regularDraw) {
    if (next.home_penalty_score === null || next.away_penalty_score === null) {
      return { error: "finished knockout draws must include penalties" as const };
    }

    if (next.home_penalty_score === next.away_penalty_score) {
      return { error: "penalty shootout cannot finish level" as const };
    }
  }

  return { update, next };
}

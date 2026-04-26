import { calculatePredictionPoints } from "@/lib/game/scoring";

type RankingLiveMatch = {
  match_number: number;
  stage: string;
  home_score: number | null;
  away_score: number | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
};

type RankingLivePrediction = {
  match_number: number;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied: boolean;
};

type RankingMember = {
  user_id: string;
  display_name: string;
  total_score: number;
  registered_at: string | null;
  joined_at?: string | null;
  live_predictions: RankingLivePrediction[];
};

export function getProjectedLeaderboardScore(
  member: Pick<RankingMember, "total_score" | "live_predictions">,
  liveMatches: RankingLiveMatch[],
) {
  return member.total_score + getMemberLiveProjectedPoints(member, liveMatches);
}

export function getMemberLiveProjectedPoints(
  member: Pick<RankingMember, "live_predictions">,
  liveMatches: RankingLiveMatch[],
) {
  return liveMatches.reduce((sum, match) => {
    const prediction =
      member.live_predictions.find((item) => item.match_number === match.match_number) ?? null;

    if (
      !prediction ||
      typeof prediction.home_score_guess !== "number" ||
      typeof prediction.away_score_guess !== "number" ||
      match.home_score === null ||
      match.away_score === null
    ) {
      return sum;
    }

    return (
      sum +
      calculatePredictionPoints(
        {
          home_score_guess: prediction.home_score_guess,
          away_score_guess: prediction.away_score_guess,
          is_joker_applied: prediction.is_joker_applied,
        },
        match,
      )
    );
  }, 0);
}

export function sortLeaderboardMembersByProjectedScore<TMember extends RankingMember>(
  members: TMember[],
  liveMatches: RankingLiveMatch[],
) {
  return [...members].sort((left, right) => {
    const rightProjectedScore = getProjectedLeaderboardScore(right, liveMatches);
    const leftProjectedScore = getProjectedLeaderboardScore(left, liveMatches);

    if (rightProjectedScore !== leftProjectedScore) {
      return rightProjectedScore - leftProjectedScore;
    }

    const registrationDiff =
      getRegistrationTimestamp(left) - getRegistrationTimestamp(right);
    if (registrationDiff !== 0) {
      return registrationDiff;
    }

    const nameDiff = left.display_name.localeCompare(right.display_name, "he");
    if (nameDiff !== 0) {
      return nameDiff;
    }

    return left.user_id.localeCompare(right.user_id);
  });
}

function getRegistrationTimestamp(member: Pick<RankingMember, "registered_at" | "joined_at">) {
  return parseTimestamp(member.registered_at) ?? parseTimestamp(member.joined_at) ?? Number.MAX_SAFE_INTEGER;
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

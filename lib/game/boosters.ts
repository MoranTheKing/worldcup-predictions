import { getMatchStageKind } from "@/lib/tournament/matches";

export type JokerUsage = {
  groupUsed: boolean;
  knockoutUsed: boolean;
  groupUsedCount: number;
  groupRemaining: number;
};

export const GROUP_JOKER_LIMIT = 2;

type PredictionUsageRow = {
  match_id: number | null;
};

type MatchStageRow = {
  match_number: number;
  stage: string;
};

type MatchStatusRow = {
  match_number: number | null;
  status: string | null;
};

type QueryResult<T> = {
  data: T[] | null;
  error: SupabaseLikeError | null;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type BoosterClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => Promise<QueryResult<PredictionUsageRow>>;
      };
      in: (column: string, values: number[]) => Promise<QueryResult<MatchStageRow>>;
    };
  };
};

type GroupJokerAvailabilityClient = {
  from: (table: string) => {
    select: (columns: string) => {
      lte: (column: string, value: number) => {
        eq: (column: string, value: string) => {
          limit: (count: number) => Promise<QueryResult<MatchStatusRow>>;
        };
      };
      gte: (column: string, value: number) => {
        in: (column: string, values: string[]) => {
          limit: (count: number) => Promise<QueryResult<MatchStatusRow>>;
        };
      };
    };
  };
};

export async function getUserJokerUsage(
  supabase: unknown,
  userId: string,
): Promise<JokerUsage> {
  try {
    const client = supabase as BoosterClient;
    const predictionResult = await client
      .from("predictions")
      .select("match_id")
      .eq("user_id", userId)
      .eq("is_joker_applied", true);

    if (predictionResult.error) {
      if (!isMissingColumnError(predictionResult.error)) {
        console.error(
          "[getUserJokerUsage] predictions query error:",
          formatSupabaseError(predictionResult.error),
        );
      }
      return buildJokerUsage(0, false);
    }

    const matchIds = (predictionResult.data ?? [])
      .map((row) => row.match_id)
      .filter((matchId): matchId is number => typeof matchId === "number");

    if (matchIds.length === 0) {
      return buildJokerUsage(0, false);
    }

    const matchesResult = await client
      .from("matches")
      .select("match_number, stage")
      .in("match_number", matchIds);

    if (matchesResult.error) {
      console.error(
        "[getUserJokerUsage] matches query error:",
        formatSupabaseError(matchesResult.error),
      );
      return buildJokerUsage(0, false);
    }

    let groupUsedCount = 0;
    let knockoutUsed = false;

    for (const match of matchesResult.data ?? []) {
      const bucket = getJokerBucket(match.stage, match.match_number);

      if (bucket === "group") {
        groupUsedCount += 1;
      } else {
        knockoutUsed = true;
      }
    }

    return buildJokerUsage(groupUsedCount, knockoutUsed);
  } catch (error) {
    console.error("[getUserJokerUsage] unexpected error:", formatUnknownError(error));
    return buildJokerUsage(0, false);
  }
}

export function getJokerBucket(
  stage: string,
  matchNumber?: number | null,
): "group" | "knockout" {
  const stageKind = getMatchStageKind(stage);

  if (stageKind === "group") {
    return "group";
  }

  if (stageKind !== "unknown") {
    return "knockout";
  }

  if (typeof matchNumber === "number" && matchNumber >= 1 && matchNumber <= 72) {
    return "group";
  }

  return "knockout";
}

export function canUseJokerOnMatch(stage: string, matchNumber?: number | null) {
  return getJokerBucket(stage, matchNumber) === "group";
}

export async function areGroupJokersAvailable(supabase: unknown) {
  try {
    const client = supabase as GroupJokerAvailabilityClient;
    const [scheduledGroupResult, startedKnockoutResult] = await Promise.all([
      client
        .from("matches")
        .select("match_number, status")
        .lte("match_number", 72)
        .eq("status", "scheduled")
        .limit(1),
      client
        .from("matches")
        .select("match_number, status")
        .gte("match_number", 73)
        .in("status", ["live", "finished"])
        .limit(1),
    ]);

    if (scheduledGroupResult.error) {
      console.error(
        "[areGroupJokersAvailable] group matches query error:",
        formatSupabaseError(scheduledGroupResult.error),
      );
      return false;
    }

    if (startedKnockoutResult.error) {
      console.error(
        "[areGroupJokersAvailable] knockout matches query error:",
        formatSupabaseError(startedKnockoutResult.error),
      );
      return false;
    }

    return (
      (scheduledGroupResult.data?.length ?? 0) > 0 &&
      (startedKnockoutResult.data?.length ?? 0) === 0
    );
  } catch (error) {
    console.error("[areGroupJokersAvailable] unexpected error:", formatUnknownError(error));
    return false;
  }
}

function buildJokerUsage(groupUsedCount: number, knockoutUsed: boolean): JokerUsage {
  return {
    groupUsed: groupUsedCount > 0,
    knockoutUsed,
    groupUsedCount,
    groupRemaining: Math.max(0, GROUP_JOKER_LIMIT - groupUsedCount),
  };
}

function isMissingColumnError(error: SupabaseLikeError | null) {
  return error?.code === "42703";
}

function formatSupabaseError(error: SupabaseLikeError | null) {
  if (!error) {
    return "unknown error";
  }

  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}

function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

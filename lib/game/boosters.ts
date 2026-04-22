import { getMatchStageKind } from "@/lib/tournament/matches";

export type JokerUsage = {
  groupUsed: boolean;
  knockoutUsed: boolean;
};

type PredictionUsageRow = {
  match_id: number | null;
};

type MatchStageRow = {
  match_number: number;
  stage: string;
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
      return { groupUsed: false, knockoutUsed: false };
    }

    const matchIds = (predictionResult.data ?? [])
      .map((row) => row.match_id)
      .filter((matchId): matchId is number => typeof matchId === "number");

    if (matchIds.length === 0) {
      return { groupUsed: false, knockoutUsed: false };
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
      return { groupUsed: false, knockoutUsed: false };
    }

    let groupUsed = false;
    let knockoutUsed = false;

    for (const match of matchesResult.data ?? []) {
      const bucket = getJokerBucket(match.stage, match.match_number);

      if (bucket === "group") {
        groupUsed = true;
      } else {
        knockoutUsed = true;
      }

      if (groupUsed && knockoutUsed) {
        break;
      }
    }

    return { groupUsed, knockoutUsed };
  } catch (error) {
    console.error("[getUserJokerUsage] unexpected error:", formatUnknownError(error));
    return { groupUsed: false, knockoutUsed: false };
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

  if (typeof matchNumber === "number" && matchNumber >= 1 && matchNumber <= 48) {
    return "group";
  }

  return "knockout";
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

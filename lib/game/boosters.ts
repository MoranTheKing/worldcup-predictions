export type JokerUsage = {
  groupUsed: boolean;
  knockoutUsed: boolean;
};

type JokerPredictionRow = {
  match_id: number | null;
};

type MatchStageRow = {
  match_number: number;
  stage: string;
};

type BoosterClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => Promise<{
          data: JokerPredictionRow[] | null;
          error?: unknown;
        }>;
      };
      in: (column: string, values: number[]) => Promise<{
        data: MatchStageRow[] | null;
        error?: unknown;
      }>;
    };
  };
};

export async function getUserJokerUsage(
  supabase: unknown,
  userId: string,
): Promise<JokerUsage> {
  const client = supabase as BoosterClient;
  const { data: predictionRows, error: predictionError } = await client
    .from("predictions")
    .select("match_id")
    .eq("user_id", userId)
    .eq("is_joker_applied", true);

  if (predictionError) {
    console.error("[getUserJokerUsage] predictions query error:", predictionError);
    return { groupUsed: false, knockoutUsed: false };
  }

  const matchIds = (predictionRows ?? [])
    .map((row: JokerPredictionRow) => row.match_id)
    .filter((matchId: number | null): matchId is number => typeof matchId === "number");

  if (matchIds.length === 0) {
    return { groupUsed: false, knockoutUsed: false };
  }

  const { data: matches, error: matchesError } = await client
    .from("matches")
    .select("match_number, stage")
    .in("match_number", matchIds);

  if (matchesError) {
    console.error("[getUserJokerUsage] matches query error:", matchesError);
    return { groupUsed: false, knockoutUsed: false };
  }

  let groupUsed = false;
  let knockoutUsed = false;

  for (const match of (matches ?? []) as MatchStageRow[]) {
    if (match.stage === "group") {
      groupUsed = true;
    } else {
      knockoutUsed = true;
    }

    if (groupUsed && knockoutUsed) {
      break;
    }
  }

  return { groupUsed, knockoutUsed };
}

export function getJokerBucket(stage: string): "group" | "knockout" {
  return stage === "group" ? "group" : "knockout";
}

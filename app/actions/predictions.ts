"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJokerBucket, getUserJokerUsage } from "@/lib/game/boosters";

export type PredictionActionState = {
  error?: string;
  success?: boolean;
  savedAt?: string;
} | null;

type ExistingPredictionLookup =
  | { data: { is_joker_applied: boolean } | null; error: null }
  | { data: null; error: SupabaseLikeError };

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export async function upsertMatchPrediction(
  matchId: number,
  stage: string,
  _prev: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[upsertMatchPrediction] auth error:", formatSupabaseError(authError));
    return { error: "שגיאת אימות. נסה שוב." };
  }

  if (!user) {
    return { error: "צריך להתחבר כדי לשמור ניחוש." };
  }

  const { data: matchRow, error: matchError } = await admin
    .from("matches")
    .select("status, home_team_id, away_team_id")
    .eq("match_number", matchId)
    .maybeSingle();

  if (matchError) {
    console.error("[upsertMatchPrediction] match lookup error:", formatSupabaseError(matchError));
    return { error: "לא הצלחנו לאמת את המשחק הזה כרגע." };
  }

  const matchStatus = (matchRow as { status?: string } | null)?.status ?? null;
  const homeTeamId = (matchRow as { home_team_id?: string | null } | null)?.home_team_id ?? null;
  const awayTeamId = (matchRow as { away_team_id?: string | null } | null)?.away_team_id ?? null;

  if (matchStatus !== "scheduled") {
    return { error: "אפשר לנחש רק משחקים שעדיין לא התחילו." };
  }

  if (!homeTeamId || !awayTeamId) {
    return { error: "המשחק הזה עדיין לא נקבע סופית ולכן אינו פתוח לניחוש." };
  }

  const homeScore = parseScore(formData.get("home_score"));
  const awayScore = parseScore(formData.get("away_score"));

  if (homeScore === null || awayScore === null) {
    return { error: "יש להזין תוצאה חוקית עם מספרים אי-שליליים." };
  }

  const wantsJoker = parseBooleanField(formData.get("is_joker_applied"));
  const existingPrediction = await getExistingPrediction(admin, user.id, matchId);

  if (existingPrediction.error) {
    console.error(
      "[upsertMatchPrediction] existing prediction error:",
      formatSupabaseError(existingPrediction.error),
    );
    return { error: "לא הצלחנו לבדוק את מצב הניחוש הקיים." };
  }

  const existingIsJoker = existingPrediction.data?.is_joker_applied ?? false;

  if (wantsJoker && !existingIsJoker) {
    const usage = await getUserJokerUsage(admin, user.id);
    const bucket = getJokerBucket(stage, matchId);
    const isAlreadyUsed = bucket === "group" ? usage.groupUsed : usage.knockoutUsed;

    if (isAlreadyUsed) {
      return {
        error:
          bucket === "group"
            ? "ג'וקר שלב הבתים כבר נוצל."
            : "ג'וקר הנוקאאוט כבר נוצל.",
      };
    }
  }

  const payload = {
    user_id: user.id,
    match_id: matchId,
    home_score_guess: homeScore,
    away_score_guess: awayScore,
    is_joker_applied: wantsJoker,
  };

  const { error: upsertError } = await admin
    .from("predictions")
    .upsert(payload, { onConflict: "user_id,match_id" });

  if (upsertError) {
    if (!wantsJoker && upsertError.code === "42703") {
      const { error: fallbackError } = await admin
        .from("predictions")
        .upsert(
          {
            user_id: user.id,
            match_id: matchId,
            home_score_guess: homeScore,
            away_score_guess: awayScore,
          },
          { onConflict: "user_id,match_id" },
        );

      if (!fallbackError) {
        revalidatePredictionPaths();
        return {
          success: true,
          savedAt: new Date().toISOString(),
        };
      }
    }

    console.error("[upsertMatchPrediction] upsert error:", formatSupabaseError(upsertError));
    return {
      error:
        wantsJoker && upsertError.code === "42703"
          ? "כדי להשתמש בג'וקר צריך להריץ קודם את מיגרציית Phase 2."
          : "שמירת הניחוש נכשלה. נסה שוב.",
    };
  }

  revalidatePredictionPaths();

  return {
    success: true,
    savedAt: new Date().toISOString(),
  };
}

export async function upsertTournamentPrediction(
  _prev: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[upsertTournamentPrediction] auth error:", formatSupabaseError(authError));
    return { error: "שגיאת אימות. נסה שוב." };
  }

  if (!user) {
    return { error: "צריך להתחבר כדי לשמור ניחושי טורניר." };
  }

  const winnerTeamId = parseUuidField(formData.get("winner_team_id"));
  const topScorerName = normalizeText(formData.get("top_scorer"));

  if (winnerTeamId === false) {
    return { error: "נבחרה קבוצה לא תקינה לזכייה בטורניר." };
  }

  const payload = {
    user_id: user.id,
    predicted_winner_team_id: winnerTeamId,
    predicted_top_scorer_name: topScorerName,
  };

  const { error: tournamentError } = await admin
    .from("tournament_predictions")
    .upsert(payload, { onConflict: "user_id" });

  const { error: outrightMirrorError } = await admin
    .from("outright_bets")
    .upsert(payload, { onConflict: "user_id" });

  if (tournamentError && outrightMirrorError) {
    console.error(
      "[upsertTournamentPrediction] save error:",
      formatSupabaseError(tournamentError),
      formatSupabaseError(outrightMirrorError),
    );
    return { error: "שמירת ניחושי הטורניר נכשלה." };
  }

  if (tournamentError) {
    console.error(
      "[upsertTournamentPrediction] tournament_predictions error:",
      formatSupabaseError(tournamentError),
    );
  }

  if (outrightMirrorError) {
    console.error(
      "[upsertTournamentPrediction] outright_bets mirror error:",
      formatSupabaseError(outrightMirrorError),
    );
  }

  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");

  return {
    success: true,
    savedAt: new Date().toISOString(),
  };
}

async function getExistingPrediction(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  matchId: number,
): Promise<ExistingPredictionLookup> {
  const primary = await supabase
    .from("predictions")
    .select("is_joker_applied")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (!primary.error) {
    return {
      data: {
        is_joker_applied:
          (primary.data as { is_joker_applied?: boolean } | null)?.is_joker_applied ?? false,
      },
      error: null,
    };
  }

  if (primary.error.code !== "42703") {
    return { data: null, error: primary.error };
  }

  const fallback = await supabase
    .from("predictions")
    .select("match_id")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (fallback.error) {
    return { data: null, error: fallback.error };
  }

  return {
    data: {
      is_joker_applied: false,
    },
    error: null,
  };
}

function revalidatePredictionPaths() {
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");
}

function parseScore(value: FormDataEntryValue | null): number | null {
  if (value === null) {
    return 0;
  }

  const normalized = value.toString().trim();
  const parsed = normalized === "" ? 0 : Number.parseInt(normalized, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseBooleanField(value: FormDataEntryValue | null): boolean {
  const normalized = value?.toString().trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

function normalizeText(value: FormDataEntryValue | null): string | null {
  const normalized = value?.toString().trim();
  return normalized ? normalized : null;
}

function parseUuidField(value: FormDataEntryValue | null): string | null | false {
  const normalized = value?.toString().trim();

  if (!normalized) {
    return null;
  }

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : false;
}

function formatSupabaseError(error: SupabaseLikeError | null) {
  if (!error) {
    return "unknown error";
  }

  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}

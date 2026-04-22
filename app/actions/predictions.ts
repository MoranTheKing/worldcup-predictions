"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getJokerBucket, getUserJokerUsage } from "@/lib/game/boosters";

export type PredictionActionState = {
  error?: string;
  success?: boolean;
  savedAt?: string;
} | null;

export async function upsertMatchPrediction(
  matchId: number,
  stage: string,
  _prev: PredictionActionState,
  formData: FormData,
): Promise<PredictionActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[upsertMatchPrediction] auth error:", authError);
    return { error: "שגיאת אימות. נסה שוב." };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי לשמור ניחוש." };
  }

  const { data: matchRow, error: matchError } = await supabase
    .from("matches")
    .select("status, home_team_id, away_team_id")
    .eq("match_number", matchId)
    .maybeSingle();

  if (matchError) {
    console.error("[upsertMatchPrediction] match lookup error:", matchError);
    return { error: "לא הצלחנו לאמת את המשחק הזה כרגע." };
  }

  const matchStatus = (matchRow as { status?: string } | null)?.status ?? null;
  const homeTeamId = (matchRow as { home_team_id?: string | null } | null)?.home_team_id ?? null;
  const awayTeamId = (matchRow as { away_team_id?: string | null } | null)?.away_team_id ?? null;

  if (matchStatus !== "scheduled") {
    return { error: "אפשר לנחש רק משחקים שעוד לא התחילו." };
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

  const { data: existingPrediction, error: existingError } = await supabase
    .from("predictions")
    .select("is_joker_applied")
    .eq("user_id", user.id)
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingError) {
    console.error("[upsertMatchPrediction] existing prediction error:", existingError);
    return { error: "לא הצלחנו לבדוק את מצב הניחוש הקיים." };
  }

  const existingIsJoker =
    (existingPrediction as { is_joker_applied?: boolean } | null)?.is_joker_applied ?? false;

  if (wantsJoker && !existingIsJoker) {
    const usage = await getUserJokerUsage(supabase, user.id);
    const bucket = getJokerBucket(stage);
    const isAlreadyUsed =
      bucket === "group" ? usage.groupUsed : usage.knockoutUsed;

    if (isAlreadyUsed) {
      return {
        error:
          bucket === "group"
            ? "ג'וקר שלב הבתים כבר נוצל."
            : "ג'וקר הנוקאאוט כבר נוצל.",
      };
    }
  }

  const { error: upsertError } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_score_guess: homeScore,
      away_score_guess: awayScore,
      is_joker_applied: wantsJoker,
    },
    { onConflict: "user_id,match_id" },
  );

  if (upsertError) {
    if (!wantsJoker && upsertError.code === "42703") {
      const { error: fallbackError } = await supabase.from("predictions").upsert(
        {
          user_id: user.id,
          match_id: matchId,
          home_score_guess: homeScore,
          away_score_guess: awayScore,
        },
        { onConflict: "user_id,match_id" },
      );

      if (!fallbackError) {
        revalidatePath("/game", "layout");
        revalidatePath("/game/predictions");
        revalidatePath("/game/leagues");

        return {
          success: true,
          savedAt: new Date().toISOString(),
        };
      }
    }

    console.error("[upsertMatchPrediction] upsert error:", upsertError);
    return {
      error:
        wantsJoker && upsertError.code === "42703"
          ? "כדי להשתמש בג'וקר צריך להריץ קודם את מיגרציית Phase 2."
          : "שמירת הניחוש נכשלה. נסה שוב.",
    };
  }

  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");

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
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("[upsertTournamentPrediction] auth error:", authError);
    return { error: "שגיאת אימות. נסה שוב." };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי לשמור ניחושי טורניר." };
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

  const { error: tournamentError } = await supabase
    .from("tournament_predictions")
    .upsert(payload, { onConflict: "user_id" });

  const { error: outrightMirrorError } = await supabase
    .from("outright_bets")
    .upsert(payload, { onConflict: "user_id" });

  if (tournamentError) {
    console.error("[upsertTournamentPrediction] tournament_predictions error:", tournamentError);
    if (outrightMirrorError) {
      return { error: "שמירת ניחושי הטורניר נכשלה." };
    }
  }

  if (outrightMirrorError) {
    console.error("[upsertTournamentPrediction] outright_bets mirror error:", outrightMirrorError);
    return { error: "שמירת ניחושי הטורניר נכשלה." };
  }

  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");

  return {
    success: true,
    savedAt: new Date().toISOString(),
  };
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

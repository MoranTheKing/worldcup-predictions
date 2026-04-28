"use server";

import { revalidatePath } from "next/cache";
import { requireServerMfa } from "@/lib/auth/mfa-server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GROUP_JOKER_LIMIT,
  canUseJokerOnMatch,
  getUserJokerUsage,
} from "@/lib/game/boosters";
import { hasKickoffStarted, hasTournamentStarted } from "@/lib/game/tournament-start";

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

  await requireServerMfa(supabase, "/game/predictions");

  const admin = createAdminClient();

  const { data: matchRow, error: matchError } = await admin
    .from("matches")
    .select("status, date_time, home_team_id, away_team_id")
    .eq("match_number", matchId)
    .maybeSingle();

  if (matchError) {
    console.error("[upsertMatchPrediction] match lookup error:", formatSupabaseError(matchError));
    return { error: "לא הצלחנו לאמת את המשחק הזה כרגע." };
  }

  const homeTeamId = (matchRow as { home_team_id?: string | null } | null)?.home_team_id ?? null;
  const awayTeamId = (matchRow as { away_team_id?: string | null } | null)?.away_team_id ?? null;

  if (hasKickoffStarted(matchRow as { status?: string | null; date_time?: string | null } | null)) {
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

  if (wantsJoker && !canUseJokerOnMatch(stage, matchId)) {
    return { error: "ניתן להפעיל ג'וקר רק במשחקי שלב הבתים." };
  }

  if (wantsJoker && !existingIsJoker) {
    const usage = await getUserJokerUsage(admin, user.id);

    if (usage.groupUsedCount >= GROUP_JOKER_LIMIT) {
      return { error: "שני הג'וקרים של שלב הבתים כבר נוצלו." };
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

  await requireServerMfa(supabase, "/game/predictions");

  const admin = createAdminClient();

  const { data: kickoffMatch, error: kickoffError } = await admin
    .from("matches")
    .select("status, date_time")
    .order("match_number", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (kickoffError) {
    console.error(
      "[upsertTournamentPrediction] kickoff lookup error:",
      formatSupabaseError(kickoffError),
    );
    return { error: "לא הצלחנו לאמת אם ניחושי הטורניר כבר ננעלו." };
  }

  if (hasTournamentStarted(kickoffMatch)) {
    return { error: "ניחושי הטורניר ננעלו עם פתיחת הטורניר." };
  }

  const winnerTeamId = parseUuidField(formData.get("winner_team_id"));
  const topScorerName = normalizeText(formData.get("top_scorer"));
  const topScorerPlayerId = parseIntegerField(formData.get("top_scorer_player_id"));

  if (winnerTeamId === false) {
    return { error: "נבחרה קבוצה לא תקינה לזכייה בטורניר." };
  }

  if (topScorerPlayerId === false) {
    return { error: "נבחר מלך שערים לא תקין." };
  }

  const [winnerOdds, scorerSelection] = await Promise.all([
    getTeamOutrightOdds(admin, winnerTeamId),
    resolveTopScorerSelection(admin, topScorerPlayerId, topScorerName),
  ]);

  if (scorerSelection.error) {
    return { error: scorerSelection.error };
  }

  const basePayload = {
    user_id: user.id,
    predicted_winner_team_id: winnerTeamId,
    predicted_top_scorer_name: scorerSelection.name,
  };

  const payload = {
    ...basePayload,
    predicted_winner_odds: winnerOdds,
    predicted_scorer_odds: scorerSelection.odds,
    winner_points_earned: 0,
    scorer_points_earned: 0,
  };

  let { error: tournamentError } = await admin
    .from("tournament_predictions")
    .upsert(payload, { onConflict: "user_id" });

  if (tournamentError?.code === "42703") {
    const fallbackResult = await admin
      .from("tournament_predictions")
      .upsert(basePayload, { onConflict: "user_id" });

    tournamentError = fallbackResult.error;
  }

  const { error: outrightMirrorError } = await admin
    .from("outright_bets")
    .upsert(basePayload, { onConflict: "user_id" });

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

function parseIntegerField(value: FormDataEntryValue | null): number | null | false {
  const normalized = value?.toString().trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isInteger(parsed) ? parsed : false;
}

async function getTeamOutrightOdds(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string | null,
) {
  if (!teamId) return null;

  const { data, error } = await supabase
    .from("teams")
    .select("outright_odds")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    console.error(
      "[upsertTournamentPrediction] winner odds lookup error:",
      formatSupabaseError(error),
    );
    return null;
  }

  return normalizeOddsValue((data as { outright_odds?: number | string | null } | null)?.outright_odds);
}

async function resolveTopScorerSelection(
  supabase: ReturnType<typeof createAdminClient>,
  playerId: number | null,
  playerName: string | null,
) {
  if (playerId === null && playerName === null) {
    return { name: null, odds: null, error: null };
  }

  if (playerId !== null) {
    const { data, error } = await supabase
      .from("players")
      .select("name")
      .eq("id", playerId)
      .maybeSingle();

    if (error) {
      console.error(
        "[upsertTournamentPrediction] scorer lookup by id error:",
        formatSupabaseError(error),
      );
    } else if (!data) {
      return { name: null, odds: null, error: "נבחר מלך שערים לא תקין." };
    } else {
      const canonicalName = normalizeText((data as { name?: string | null }).name ?? null);

      if (
        playerName &&
        canonicalName &&
        normalizeIdentity(playerName) !== normalizeIdentity(canonicalName)
      ) {
        return { name: null, odds: null, error: "בחירת מלך השערים אינה עקבית." };
      }

      return {
        name: canonicalName ?? playerName,
        odds: await getTopScorerOddsById(supabase, playerId),
        error: null,
      };
    }
  }

  return {
    name: playerName,
    odds: await getTopScorerOddsByName(supabase, playerName),
    error: null,
  };
}

async function getTopScorerOddsById(
  supabase: ReturnType<typeof createAdminClient>,
  playerId: number,
) {
  const { data, error } = await supabase
    .from("players")
    .select("top_scorer_odds")
    .eq("id", playerId)
    .maybeSingle();

  if (error) {
    console.error(
      "[upsertTournamentPrediction] scorer odds by id error:",
      formatSupabaseError(error),
    );
    return null;
  }

  return normalizeOddsValue((data as { top_scorer_odds?: number | string | null } | null)?.top_scorer_odds);
}

async function getTopScorerOddsByName(
  supabase: ReturnType<typeof createAdminClient>,
  playerName: string | null,
) {
  if (!playerName) return null;

  const { data, error } = await supabase
    .from("players")
    .select("top_scorer_odds")
    .eq("name", playerName)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "[upsertTournamentPrediction] scorer odds lookup error:",
      formatSupabaseError(error),
    );
    return null;
  }

  return normalizeOddsValue((data as { top_scorer_odds?: number | string | null } | null)?.top_scorer_odds);
}

function normalizeIdentity(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeOddsValue(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1
    ? Math.round(parsed * 100) / 100
    : null;
}

function formatSupabaseError(error: SupabaseLikeError | null) {
  if (!error) {
    return "unknown error";
  }

  return error.message ?? error.details ?? error.hint ?? error.code ?? "unknown error";
}

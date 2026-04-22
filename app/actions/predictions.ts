"use server";

import { createClient } from "@/lib/supabase/server";

export type PredictionActionState = {
  error?: string;
  success?: boolean;
} | null;

// ── Match Prediction ────────────────────────────────────────────────────────

export async function upsertMatchPrediction(
  matchId: number,
  _prev: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const supabase = await createClient();

  let user;
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  } catch (err) {
    console.error("[upsertMatchPrediction] auth error:", err);
    return { error: "שגיאת אימות — נסה שוב" };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי לשמור ניחוש" };
  }

  const homeRaw = formData.get("home_score");
  const awayRaw = formData.get("away_score");
  const homeScore = homeRaw !== null ? parseInt(homeRaw.toString(), 10) : NaN;
  const awayScore = awayRaw !== null ? parseInt(awayRaw.toString(), 10) : NaN;

  if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    return { error: "יש להזין תוצאה חוקית (מספרים אי-שליליים)" };
  }

  try {
    const { error } = await supabase.from("predictions").upsert(
      {
        user_id: user.id,
        match_id: matchId,
        home_score_guess: homeScore,
        away_score_guess: awayScore,
      },
      { onConflict: "user_id,match_id" }
    );

    if (error) {
      console.error("[upsertMatchPrediction] upsert error:", error);
      return { error: `שגיאה בשמירה: ${error.message}` };
    }

    return { success: true };
  } catch (err) {
    console.error("[upsertMatchPrediction] unexpected error:", err);
    return { error: "שגיאה בלתי צפויה — נסה שוב" };
  }
}

// ── Tournament Outrights ────────────────────────────────────────────────────

export async function upsertTournamentPrediction(
  _prev: PredictionActionState,
  formData: FormData
): Promise<PredictionActionState> {
  const supabase = await createClient();

  let user;
  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    user = data.user;
  } catch (err) {
    console.error("[upsertTournamentPrediction] auth error:", err);
    return { error: "שגיאת אימות — נסה שוב" };
  }

  if (!user) {
    return { error: "עליך להתחבר כדי לשמור ניחושי טורניר" };
  }

  const winnerRaw = formData.get("winner_team_id")?.toString().trim() || null;
  const topScorer = formData.get("top_scorer")?.toString().trim() || null;

  // winner_team_id is BIGINT in tournament_predictions; coerce from string.
  const winnerId = winnerRaw ? parseInt(winnerRaw, 10) : null;

  try {
    // Write to tournament_predictions (new table, used by scoring system).
    const { error: tpError } = await supabase
      .from("tournament_predictions")
      .upsert(
        {
          user_id: user.id,
          predicted_winner_team_id: winnerId ?? null,
          predicted_top_scorer_name: topScorer,
        },
        { onConflict: "user_id" }
      );

    if (tpError) {
      console.error("[upsertTournamentPrediction] tournament_predictions error:", tpError);
      return { error: `שגיאה בשמירה: ${tpError.message}` };
    }

    // Also mirror to outright_bets so ProfileClient stays in sync.
    const { error: obError } = await supabase
      .from("outright_bets")
      .upsert(
        {
          user_id: user.id,
          predicted_winner_team_id: winnerId ?? null,
          predicted_top_scorer_name: topScorer,
        },
        { onConflict: "user_id" }
      );

    if (obError) {
      // Non-fatal: main write succeeded; just log.
      console.error("[upsertTournamentPrediction] outright_bets mirror error:", obError);
    }

    return { success: true };
  } catch (err) {
    console.error("[upsertTournamentPrediction] unexpected error:", err);
    return { error: "שגיאה בלתי צפויה — נסה שוב" };
  }
}

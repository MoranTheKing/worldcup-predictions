import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { isSameOriginRequest } from "@/lib/security/local-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

type ResetResult = { count: number } | { error: string };

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  const admin = createAdminClient();

  const [
    predictionsReset,
    tournamentPredictionsReset,
    outrightBetsReset,
    legacyBetsReset,
    profilesReset,
    teamOddsReset,
    playerOddsReset,
    devEventsReset,
  ] = await Promise.all([
    deleteRows("predictions", "user_id"),
    deleteRows("tournament_predictions", "user_id"),
    deleteRows("outright_bets", "user_id"),
    deleteRows("bets", "user_id"),
    resetProfileScores(),
    resetTeamOutrightOdds(),
    resetPlayerTopScorerOdds(),
    resetDevMatchPlayerEvents(),
  ]);

  if (isResetError(predictionsReset)) return errorResponse(predictionsReset.error);
  if (isResetError(tournamentPredictionsReset)) return errorResponse(tournamentPredictionsReset.error);
  if (isResetError(outrightBetsReset)) return errorResponse(outrightBetsReset.error);
  if (isResetError(legacyBetsReset)) return errorResponse(legacyBetsReset.error);
  if (isResetError(profilesReset)) return errorResponse(profilesReset.error);
  if (isResetError(teamOddsReset)) return errorResponse(teamOddsReset.error);
  if (isResetError(playerOddsReset)) return errorResponse(playerOddsReset.error);
  if (isResetError(devEventsReset)) return errorResponse(devEventsReset.error);

  // Explicitly wipe resolved team slots from all knockout matches so they
  // revert to placeholder display before the sync rebuilds them.
  const { error: knockoutError } = await admin
    .from("matches")
    .update({ home_team_id: null, away_team_id: null })
    .gte("match_number", 73);

  if (knockoutError) {
    return NextResponse.json({ error: knockoutError.message }, { status: 500 });
  }

  const { error, count } = await admin
    .from("matches")
    .update(
      {
        status: "scheduled",
        match_phase: null,
        home_score: 0,
        away_score: 0,
        home_odds: null,
        draw_odds: null,
        away_odds: null,
        minute: null,
        is_extra_time: false,
        home_penalty_score: null,
        away_penalty_score: null,
      },
      { count: "exact" },
    )
    .gte("match_number", 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncTournamentState(admin);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");
  revalidatePath("/game/leaderboard");
  revalidatePath("/onboarding");
  revalidatePath("/dev-tools");

  return NextResponse.json({
    reset: count ?? 0,
    predictionsReset: predictionsReset.count,
    tournamentPredictionsReset: tournamentPredictionsReset.count,
    outrightBetsReset: outrightBetsReset.count,
    legacyBetsReset: legacyBetsReset.count,
    profilesReset: profilesReset.count,
    teamOddsReset: teamOddsReset.count,
    playerOddsReset: playerOddsReset.count,
    devEventsReset: devEventsReset.count,
  });

  async function deleteRows(table: string, nonNullColumn: string): Promise<ResetResult> {
    const { error, count: deletedCount } = await admin
      .from(table)
      .delete({ count: "exact" })
      .not(nonNullColumn, "is", null);

    if (error) return { error: error.message };
    return { count: deletedCount ?? 0 };
  }

  async function resetProfileScores(): Promise<ResetResult> {
    const { error, count: updatedCount } = await admin
      .from("profiles")
      .update({ total_score: 0 }, { count: "exact" })
      .not("id", "is", null);

    if (error) return { error: error.message };
    return { count: updatedCount ?? 0 };
  }

  async function resetTeamOutrightOdds(): Promise<ResetResult> {
    const { error, count: updatedCount } = await admin
      .from("teams")
      .update({ outright_odds: null, outright_odds_updated_at: null }, { count: "exact" })
      .not("id", "is", null);

    if (error) return { error: error.message };
    return { count: updatedCount ?? 0 };
  }

  async function resetPlayerTopScorerOdds(): Promise<ResetResult> {
    const { error, count: updatedCount } = await admin
      .from("players")
      .update({ top_scorer_odds: null, top_scorer_odds_updated_at: null }, { count: "exact" })
      .not("id", "is", null);

    if (error) return { error: error.message };
    return { count: updatedCount ?? 0 };
  }

  async function resetDevMatchPlayerEvents(): Promise<ResetResult> {
    const { error, count: deletedCount } = await admin
      .from("dev_match_player_events")
      .delete({ count: "exact" })
      .gte("match_number", 1);

    if (isMissingOptionalTableError(error)) {
      return { count: 0 };
    }

    if (error) return { error: error.message };
    return { count: deletedCount ?? 0 };
  }
}

function isResetError(result: ResetResult): result is { error: string } {
  return "error" in result;
}

function errorResponse(error: string) {
  return NextResponse.json({ error }, { status: 500 });
}

function isMissingOptionalTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        String(error.message ?? "").includes("dev_match_player_events")),
  );
}

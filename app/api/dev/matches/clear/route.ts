import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

type ResetResult = { count: number } | { error: string };

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();

  const [
    predictionsReset,
    tournamentPredictionsReset,
    outrightBetsReset,
    legacyBetsReset,
    profilesReset,
  ] = await Promise.all([
    deleteRows("predictions", "user_id"),
    deleteRows("tournament_predictions", "user_id"),
    deleteRows("outright_bets", "user_id"),
    deleteRows("bets", "user_id"),
    resetProfileScores(),
  ]);

  if (isResetError(predictionsReset)) return errorResponse(predictionsReset.error);
  if (isResetError(tournamentPredictionsReset)) return errorResponse(tournamentPredictionsReset.error);
  if (isResetError(outrightBetsReset)) return errorResponse(outrightBetsReset.error);
  if (isResetError(legacyBetsReset)) return errorResponse(legacyBetsReset.error);
  if (isResetError(profilesReset)) return errorResponse(profilesReset.error);

  // Explicitly wipe resolved team slots from all knockout matches so they
  // revert to placeholder display before the sync rebuilds them.
  const { error: knockoutError } = await supabase
    .from("matches")
    .update({ home_team_id: null, away_team_id: null })
    .gte("match_number", 73);

  if (knockoutError) {
    return NextResponse.json({ error: knockoutError.message }, { status: 500 });
  }

  const { error, count } = await supabase
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

  await syncTournamentState(supabase);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");
  revalidatePath("/game/leaderboard");

  return NextResponse.json({
    reset: count ?? 0,
    predictionsReset: predictionsReset.count,
    tournamentPredictionsReset: tournamentPredictionsReset.count,
    outrightBetsReset: outrightBetsReset.count,
    legacyBetsReset: legacyBetsReset.count,
    profilesReset: profilesReset.count,
  });

  async function deleteRows(table: string, nonNullColumn: string): Promise<ResetResult> {
    const { error, count: deletedCount } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .not(nonNullColumn, "is", null);

    if (error) return { error: error.message };
    return { count: deletedCount ?? 0 };
  }

  async function resetProfileScores(): Promise<ResetResult> {
    const { error, count: updatedCount } = await supabase
      .from("profiles")
      .update({ total_score: 0 }, { count: "exact" })
      .not("id", "is", null);

    if (error) return { error: error.message };
    return { count: updatedCount ?? 0 };
  }
}

function isResetError(result: ResetResult): result is { error: string } {
  return "error" in result;
}

function errorResponse(error: string) {
  return NextResponse.json({ error }, { status: 500 });
}

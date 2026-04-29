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

  const [matchReset, knockoutSlotsReset, predictionPointsReset, outrightPointsReset, profileReset, teamReset, playerReset, devEventsReset] =
    await Promise.all([
      resetMatches(),
      resetKnockoutSlots(),
      resetPredictionPoints(),
      resetOutrightPoints(),
      resetProfileScores(),
      resetTeamTournamentStats(),
      resetPlayerTournamentStats(),
      resetDevMatchPlayerEvents(),
    ]);

  for (const result of [
    matchReset,
    knockoutSlotsReset,
    predictionPointsReset,
    outrightPointsReset,
    profileReset,
    teamReset,
    playerReset,
    devEventsReset,
  ]) {
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  }

  await syncTournamentState(supabase);
  revalidateTournamentPaths();

  return NextResponse.json({
    matchesReset: getResetCount(matchReset),
    knockoutSlotsReset: getResetCount(knockoutSlotsReset),
    predictionPointsReset: getResetCount(predictionPointsReset),
    outrightPointsReset: getResetCount(outrightPointsReset),
    profilesReset: getResetCount(profileReset),
    teamsReset: getResetCount(teamReset),
    playersReset: getResetCount(playerReset),
    devEventsReset: getResetCount(devEventsReset),
  });

  async function resetMatches(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("matches")
      .update(
        {
          status: "scheduled",
          match_phase: null,
          home_score: 0,
          away_score: 0,
          minute: null,
          is_extra_time: false,
          home_penalty_score: null,
          away_penalty_score: null,
        },
        { count: "exact" },
      )
      .gte("match_number", 1);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetKnockoutSlots(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("matches")
      .update({ home_team_id: null, away_team_id: null }, { count: "exact" })
      .gte("match_number", 73);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetPredictionPoints(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("predictions")
      .update({ points_earned: 0 }, { count: "exact" })
      .not("user_id", "is", null);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetOutrightPoints(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("tournament_predictions")
      .update({ winner_points_earned: 0, scorer_points_earned: 0 }, { count: "exact" })
      .not("user_id", "is", null);

    if (error?.code === "42703") {
      return { count: 0 };
    }

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetProfileScores(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("profiles")
      .update({ total_score: 0 }, { count: "exact" })
      .not("id", "is", null);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetTeamTournamentStats(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("teams")
      .update(
        {
          points: 0,
          goals_for: 0,
          goals_against: 0,
          fair_play_score: 0,
          played_count: 0,
          is_eliminated: false,
        },
        { count: "exact" },
      )
      .not("id", "is", null);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetPlayerTournamentStats(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("players")
      .update(
        {
          goals: 0,
          assists: 0,
          appearances: 0,
          minutes_played: 0,
          yellow_cards: 0,
          red_cards: 0,
        },
        { count: "exact" },
      )
      .not("id", "is", null);

    return error ? { error: error.message } : { count: count ?? 0 };
  }

  async function resetDevMatchPlayerEvents(): Promise<ResetResult> {
    const { count, error } = await supabase
      .from("dev_match_player_events")
      .delete({ count: "exact" })
      .gte("match_number", 1);

    if (isMissingOptionalTableError(error)) {
      return { count: 0 };
    }

    return error ? { error: error.message } : { count: count ?? 0 };
  }
}

function revalidateTournamentPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/tournament");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/dashboard/stats");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");
  revalidatePath("/game/leaderboard");
  revalidatePath("/dev-tools");
}

function getResetCount(result: ResetResult) {
  return "count" in result ? result.count : 0;
}

function isMissingOptionalTableError(error: { code?: string; message?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        String(error.message ?? "").includes("dev_match_player_events")),
  );
}

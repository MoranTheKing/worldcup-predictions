import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { calculateOutrightPoints } from "@/lib/game/scoring";
import { refreshProfileTotals } from "@/lib/game/scoring-sync";
import { isAuthorizedAdminRequest } from "@/lib/security/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type FinalizePayload = {
  actual_winner_team_id?: unknown;
  actual_top_scorer_name?: unknown;
};

type TournamentPredictionRow = {
  user_id: string | null;
  predicted_winner_team_id: string | null;
  predicted_top_scorer_name: string | null;
  predicted_winner_odds: number | string | null;
  predicted_scorer_odds: number | string | null;
};

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: FinalizePayload;
  try {
    payload = (await request.json()) as FinalizePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const actualWinnerTeamId =
    typeof payload.actual_winner_team_id === "string" && payload.actual_winner_team_id.trim()
      ? payload.actual_winner_team_id.trim()
      : null;
  const actualTopScorerName = normalizePlayerName(payload.actual_top_scorer_name);

  if (!actualWinnerTeamId || !actualTopScorerName) {
    return NextResponse.json(
      { error: "actual_winner_team_id and actual_top_scorer_name are required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tournament_predictions")
    .select(
      "user_id, predicted_winner_team_id, predicted_top_scorer_name, predicted_winner_odds, predicted_scorer_odds",
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const predictions = ((data ?? []) as TournamentPredictionRow[]).filter(
    (prediction): prediction is TournamentPredictionRow & { user_id: string } =>
      typeof prediction.user_id === "string",
  );

  let winnerHits = 0;
  let scorerHits = 0;
  let missingWinnerOdds = 0;
  let missingScorerOdds = 0;

  for (const prediction of predictions) {
    const winnerOdds = normalizeOdds(prediction.predicted_winner_odds);
    const scorerOdds = normalizeOdds(prediction.predicted_scorer_odds);
    const winnerHit = prediction.predicted_winner_team_id === actualWinnerTeamId;
    const scorerHit =
      normalizePlayerName(prediction.predicted_top_scorer_name) === actualTopScorerName;
    const winnerPoints =
      winnerHit && winnerOdds !== null ? calculateOutrightPoints("winner", winnerOdds) : 0;
    const scorerPoints =
      scorerHit && scorerOdds !== null ? calculateOutrightPoints("scorer", scorerOdds) : 0;

    if (winnerHit) {
      winnerHits += 1;
      if (winnerOdds === null) missingWinnerOdds += 1;
    }

    if (scorerHit) {
      scorerHits += 1;
      if (scorerOdds === null) missingScorerOdds += 1;
    }

    const { error: updateError } = await supabase
      .from("tournament_predictions")
      .update({
        winner_points_earned: winnerPoints,
        scorer_points_earned: scorerPoints,
      })
      .eq("user_id", prediction.user_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const updatedProfiles = await refreshProfileTotals(
    supabase,
    predictions.map((prediction) => prediction.user_id),
  );

  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/leagues");
  revalidatePath("/game/leaderboard");
  revalidatePath("/game/predictions");

  return NextResponse.json({
    finalized: true,
    predictionsChecked: predictions.length,
    winnerHits,
    scorerHits,
    missingWinnerOdds,
    missingScorerOdds,
    updatedProfiles,
  });
}

function normalizeOdds(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

function normalizePlayerName(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

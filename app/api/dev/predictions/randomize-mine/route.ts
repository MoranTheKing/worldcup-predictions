import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { canUseJokerOnMatch } from "@/lib/game/boosters";
import { hasKickoffStarted } from "@/lib/game/tournament-start";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type MatchRow = {
  match_number: number | null;
  stage: string | null;
  status: string | null;
  date_time: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type ExistingPredictionRow = {
  match_id: number | null;
  is_joker_applied: boolean | null;
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

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
  const { data: matchesData, error: matchesError } = await admin
    .from("matches")
    .select("match_number, stage, status, date_time, home_team_id, away_team_id")
    .order("date_time", { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const eligibleMatches = ((matchesData ?? []) as MatchRow[]).filter(
    (match): match is MatchRow & { match_number: number } =>
      typeof match.match_number === "number" &&
      Boolean(match.home_team_id && match.away_team_id) &&
      !hasKickoffStarted(match),
  );

  if (eligibleMatches.length === 0) {
    return NextResponse.json({ randomized: 0 });
  }

  const matchIds = eligibleMatches.map((match) => match.match_number);
  const { data: existingData, error: existingError } = await admin
    .from("predictions")
    .select("match_id, is_joker_applied")
    .eq("user_id", user.id)
    .in("match_id", matchIds);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingJokerByMatch = new Map(
    ((existingData ?? []) as ExistingPredictionRow[])
      .filter((row): row is ExistingPredictionRow & { match_id: number } => typeof row.match_id === "number")
      .map((row) => [row.match_id, row.is_joker_applied === true]),
  );

  const rows = eligibleMatches.map((match) => {
    const { homeScore, awayScore } = randomPredictionScore();

    return {
      user_id: user.id,
      match_id: match.match_number,
      home_score_guess: homeScore,
      away_score_guess: awayScore,
      is_joker_applied:
        existingJokerByMatch.get(match.match_number) === true &&
        canUseJokerOnMatch(match.stage ?? "", match.match_number),
    };
  });

  const { error: upsertError } = await admin
    .from("predictions")
    .upsert(rows, { onConflict: "user_id,match_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");

  return NextResponse.json({ randomized: rows.length });
}

function randomPredictionScore() {
  return {
    homeScore: weightedGoalCount(),
    awayScore: weightedGoalCount(),
  };
}

function weightedGoalCount() {
  const roll = Math.random();

  if (roll < 0.24) return 0;
  if (roll < 0.52) return 1;
  if (roll < 0.76) return 2;
  if (roll < 0.91) return 3;
  if (roll < 0.98) return 4;
  return 5;
}

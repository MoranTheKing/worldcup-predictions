import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

type TeamOddsSeed = {
  id: string;
  fifa_ranking?: number | null;
};

type PlayerOddsSeed = {
  id: number | string;
  position?: string | null;
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const [{ data: teams, error: teamsError }, playersResult] =
    await Promise.all([
      supabase.from("teams").select("id, fifa_ranking"),
      fetchAllPlayersForOdds(supabase),
    ]);

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  if (playersResult.error) {
    return NextResponse.json({ error: playersResult.error }, { status: 500 });
  }

  const updatedAt = new Date().toISOString();
  const teamRows = ((teams ?? []) as TeamOddsSeed[]).map((team) => ({
    id: team.id,
    outright_odds: randomTeamOutrightOdds(team.fifa_ranking),
    outright_odds_updated_at: updatedAt,
  }));
  const playerRows = playersResult.players.map((player) => ({
    id: player.id,
    top_scorer_odds: randomTopScorerOdds(player.position),
    top_scorer_odds_updated_at: updatedAt,
  }));

  if (teamRows.length > 0) {
    for (const row of teamRows) {
      const { error } = await supabase
        .from("teams")
        .update({
          outright_odds: row.outright_odds,
          outright_odds_updated_at: row.outright_odds_updated_at,
        })
        .eq("id", row.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (playerRows.length > 0) {
    for (const row of playerRows) {
      const { error } = await supabase
        .from("players")
        .update({
          top_scorer_odds: row.top_scorer_odds,
          top_scorer_odds_updated_at: row.top_scorer_odds_updated_at,
        })
        .eq("id", row.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dev-tools");

  return NextResponse.json({
    teamsUpdated: teamRows.length,
    playersUpdated: playerRows.length,
  });
}

async function fetchAllPlayersForOdds(supabase: ReturnType<typeof createAdminClient>) {
  const players: PlayerOddsSeed[] = [];
  const batchSize = 1000;

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("players")
      .select("id, position")
      .range(from, from + batchSize - 1);

    if (error) {
      return { players, error: error.message };
    }

    players.push(...((data ?? []) as PlayerOddsSeed[]));

    if (!data || data.length < batchSize) {
      return { players, error: null };
    }
  }
}

function randomTeamOutrightOdds(fifaRanking: number | null | undefined) {
  const rank = Number.isFinite(Number(fifaRanking)) ? Math.max(1, Number(fifaRanking)) : 80;
  const base = 3.2 + Math.pow(rank, 1.16) * 0.32;
  const jitter = 0.78 + Math.random() * 0.56;
  const longshotBoost = Math.random() < 0.12 ? 1.4 + Math.random() * 1.2 : 1;
  return roundOdds(Math.min(350, Math.max(2.5, base * jitter * longshotBoost)));
}

function randomTopScorerOdds(position: string | null | undefined) {
  const key = (position ?? "").toLowerCase();
  let min = 18;
  let max = 90;

  if (key.includes("att") || key.includes("for") || key.includes("wing") || key.includes("striker")) {
    min = 6;
    max = 55;
  } else if (key.includes("mid")) {
    min = 25;
    max = 140;
  } else if (key.includes("def")) {
    min = 90;
    max = 320;
  } else if (key.includes("goal")) {
    min = 250;
    max = 700;
  }

  const value = min + Math.pow(Math.random(), 1.8) * (max - min);
  return roundOdds(value);
}

function roundOdds(value: number) {
  return Math.round(value * 100) / 100;
}

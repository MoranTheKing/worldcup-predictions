import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

type PlayerOddsSeed = {
  id: number | string;
  position?: string | null;
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  let players: PlayerOddsSeed[];
  try {
    players = await fetchAllPlayersForOdds(supabase);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load players" },
      { status: 500 },
    );
  }

  const updatedAt = new Date().toISOString();
  let updated = 0;

  for (const player of (players ?? []) as PlayerOddsSeed[]) {
    const { data, error: updateError } = await supabase
      .from("players")
      .update({
        top_scorer_odds: randomTopScorerOdds(player.position),
        top_scorer_odds_updated_at: updatedAt,
      })
      .eq("id", player.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (data) updated += 1;
  }

  revalidateScorerOddsPaths();
  return NextResponse.json({ updated });
}

async function fetchAllPlayersForOdds(supabase: ReturnType<typeof createAdminClient>) {
  const rows: PlayerOddsSeed[] = [];
  const batchSize = 1000;

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("players")
      .select("id, position")
      .range(from, from + batchSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...(((data ?? []) as PlayerOddsSeed[])));

    if (!data || data.length < batchSize) {
      return rows;
    }
  }
}

export async function DELETE(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("players")
    .update({ top_scorer_odds: null, top_scorer_odds_updated_at: null })
    .not("id", "is", null)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateScorerOddsPaths();
  return NextResponse.json({ reset: data?.length ?? 0 });
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
  return Math.round(value * 100) / 100;
}

function revalidateScorerOddsPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/dev-tools");
}

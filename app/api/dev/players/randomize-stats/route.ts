import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

type PlayerSeed = {
  id: number | string;
  position?: string | null;
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data: players, error } = await supabase.from("players").select("id, position");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  for (const player of (players ?? []) as PlayerSeed[]) {
    const stats = randomPlayerStats(player.position);
    const { data, error: updateError } = await supabase
      .from("players")
      .update(stats)
      .eq("id", player.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (data) updated += 1;
  }

  revalidatePlayerStatPaths();
  return NextResponse.json({ updated });
}

function randomPlayerStats(position: string | null | undefined) {
  const key = (position ?? "").toLowerCase();
  const isGoalkeeper = key.includes("goal") || key === "g";
  const isDefender = key.includes("def") || key === "d";
  const isMidfielder = key.includes("mid") || key === "m";
  const isForward =
    key.includes("att") || key.includes("for") || key.includes("wing") || key === "f";
  const appearances = weightedInt(0, 7, 1.4);

  if (appearances === 0) {
    return {
      appearances: 0,
      minutes_played: 0,
      goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
    };
  }

  return {
    appearances,
    minutes_played: weightedInt(25, appearances * 105, 0.85),
    goals: isGoalkeeper ? 0 : weightedInt(0, isForward ? 8 : isMidfielder ? 5 : 3, isForward ? 1.7 : 2.6),
    assists: isGoalkeeper ? 0 : weightedInt(0, isForward ? 5 : isMidfielder ? 7 : 4, isMidfielder ? 1.9 : 2.4),
    yellow_cards: weightedInt(0, isDefender ? 4 : 3, 2.8),
    red_cards: Math.random() < 0.035 ? 1 : 0,
  };
}

function weightedInt(min: number, max: number, power: number) {
  const value = min + Math.pow(Math.random(), power) * (max - min);
  return Math.max(min, Math.round(value));
}

function revalidatePlayerStatPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/dashboard/players", "layout");
  revalidatePath("/dev-tools");
}

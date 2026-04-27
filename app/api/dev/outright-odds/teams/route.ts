import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

type TeamOddsPayload = {
  teams?: Array<{
    id?: unknown;
    outright_odds?: unknown;
  }>;
};

export async function PATCH(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  let payload: TeamOddsPayload;
  try {
    payload = (await request.json()) as TeamOddsPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const teams = payload.teams ?? [];
  if (!Array.isArray(teams)) {
    return NextResponse.json({ error: "teams must be an array" }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  const rows: Array<{
    id: string;
    outright_odds: number | null;
    outright_odds_updated_at: string | null;
  }> = [];

  for (const team of teams) {
    if (typeof team.id !== "string" || team.id.length === 0) {
      return NextResponse.json({ error: "Every team must include a valid id" }, { status: 400 });
    }

    if (team.outright_odds === null || team.outright_odds === undefined || team.outright_odds === "") {
      rows.push({
        id: team.id,
        outright_odds: null,
        outright_odds_updated_at: null,
      });
      continue;
    }

    const odds = Number(team.outright_odds);
    if (!Number.isFinite(odds) || odds < 1 || odds > 9999.99) {
      return NextResponse.json({ error: `Invalid outright odds for team ${team.id}` }, { status: 400 });
    }

    rows.push({
      id: team.id,
      outright_odds: Math.round(odds * 100) / 100,
      outright_odds_updated_at: updatedAt,
    });
  }

  const supabase = createAdminClient();
  let updated = 0;

  for (const row of rows) {
    const { data, error } = await supabase
      .from("teams")
      .update({
        outright_odds: row.outright_odds,
        outright_odds_updated_at: row.outright_odds_updated_at,
      })
      .eq("id", row.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      updated += 1;
    }
  }

  revalidateTeamOddsPaths();

  return NextResponse.json({ updated });
}

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, fifa_ranking");

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const updatedAt = new Date().toISOString();
  let updated = 0;

  for (const team of (teams ?? []) as Array<{ id: string; fifa_ranking?: number | null }>) {
    const { data, error } = await supabase
      .from("teams")
      .update({
        outright_odds: randomTeamOutrightOdds(team.fifa_ranking),
        outright_odds_updated_at: updatedAt,
      })
      .eq("id", team.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      updated += 1;
    }
  }

  revalidateTeamOddsPaths();

  return NextResponse.json({ updated });
}

export async function DELETE(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("teams")
    .update({ outright_odds: null, outright_odds_updated_at: null })
    .not("id", "is", null)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidateTeamOddsPaths();

  return NextResponse.json({ reset: data?.length ?? 0 });
}

function revalidateTeamOddsPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dev-tools");
}

function randomTeamOutrightOdds(fifaRanking: number | null | undefined) {
  const rank = Number.isFinite(Number(fifaRanking)) ? Math.max(1, Number(fifaRanking)) : 80;
  const base = 3.2 + Math.pow(rank, 1.16) * 0.32;
  const jitter = 0.78 + Math.random() * 0.56;
  const longshotBoost = Math.random() < 0.12 ? 1.4 + Math.random() * 1.2 : 1;
  return Math.round(Math.min(350, Math.max(2.5, base * jitter * longshotBoost)) * 100) / 100;
}

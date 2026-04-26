import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDevMatchUpdate,
  type DevMatchPatchInput,
  type EditableMatchState,
} from "@/lib/tournament/dev-match-updates";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";
import { scoreFinishedMatchPredictions } from "@/lib/game/scoring-sync";

type BulkBody = {
  matches?: Array<DevMatchPatchInput & { match_number: number }>;
};

export async function PATCH(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const body = (await request.json().catch(() => null)) as BulkBody | null;
  if (!body?.matches || body.matches.length === 0) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const matchNumbers = body.matches.map((item) => item.match_number);
  const { data: existingMatches, error: matchesError } = await supabase
    .from("matches")
    .select(`
      match_number,
      stage,
      status,
      match_phase,
      home_score,
      away_score,
      home_odds,
      draw_odds,
      away_odds,
      minute,
      is_extra_time,
      home_penalty_score,
      away_penalty_score
    `)
    .in("match_number", matchNumbers);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const existingByNumber = new Map(
    ((existingMatches ?? []) as EditableMatchState[]).map((match) => [match.match_number, match]),
  );
  const finishedMatchNumbers = new Set<number>();

  for (const item of body.matches) {
    const existing = existingByNumber.get(item.match_number);
    if (!existing) {
      return NextResponse.json({ error: `match ${item.match_number} not found` }, { status: 404 });
    }

    const validation = buildDevMatchUpdate(existing, item);
    if ("error" in validation) {
      return NextResponse.json(
        { error: `match ${item.match_number}: ${validation.error}` },
        { status: 400 },
      );
    }

    if (validation.next.status === "finished") {
      finishedMatchNumbers.add(item.match_number);
    }
  }

  for (const item of body.matches) {
    const existing = existingByNumber.get(item.match_number)!;
    const validation = buildDevMatchUpdate(existing, item);
    if ("error" in validation) continue;

    const { error } = await supabase
      .from("matches")
      .update(validation.update)
      .eq("match_number", item.match_number);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const sync = await syncTournamentState(supabase);
  const scoring =
    finishedMatchNumbers.size > 0
      ? await scoreFinishedMatchPredictions(supabase, Array.from(finishedMatchNumbers))
      : null;

  return NextResponse.json({ updated: body.matches.length, sync, scoring });
}

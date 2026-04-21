import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDevMatchUpdate,
  type DevMatchPatchInput,
  type EditableMatchState,
} from "@/lib/tournament/dev-match-updates";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as DevMatchPatchInput | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: existingMatch, error: existingError } = await supabase
    .from("matches")
    .select(`
      match_number,
      stage,
      status,
      home_score,
      away_score,
      minute,
      is_extra_time,
      home_penalty_score,
      away_penalty_score
    `)
    .eq("match_number", matchId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingMatch) {
    return NextResponse.json({ error: "match not found" }, { status: 404 });
  }

  const validation = buildDevMatchUpdate(existingMatch as EditableMatchState, body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("matches")
    .update(validation.update)
    .eq("match_number", matchId)
    .select("match_number, status, home_score, away_score, minute, is_extra_time, home_penalty_score, away_penalty_score")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncTournamentState(supabase);

  return NextResponse.json({ match: data });
}

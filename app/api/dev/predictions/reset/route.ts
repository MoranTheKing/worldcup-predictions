import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const blocked = devOnly();
  if (blocked) return blocked;

  const supabase = createAdminClient();

  const [{ error: predictionsError, count: predictionsDeleted }, { error: tournamentError, count: tournamentDeleted }] =
    await Promise.all([
      supabase.from("predictions").delete({ count: "exact" }).not("match_id", "is", null),
      supabase.from("tournament_predictions").delete({ count: "exact" }).not("user_id", "is", null),
    ]);

  if (predictionsError) {
    return NextResponse.json({ error: predictionsError.message }, { status: 500 });
  }

  if (tournamentError) {
    return NextResponse.json({ error: tournamentError.message }, { status: 500 });
  }

  return NextResponse.json({
    predictionsReset: predictionsDeleted ?? 0,
    outrightsReset: tournamentDeleted ?? 0,
  });
}

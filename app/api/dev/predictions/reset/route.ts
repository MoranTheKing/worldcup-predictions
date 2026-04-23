import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return LOCAL_HOSTS.has(hostname);
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: "dev reset is only available from localhost" }, { status: 403 });
  }

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

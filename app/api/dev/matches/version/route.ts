import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("match_number, updated_at")
    .order("updated_at", { ascending: false })
    .order("match_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      version: data ? `${data.updated_at ?? "unknown"}:${data.match_number}` : "empty",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

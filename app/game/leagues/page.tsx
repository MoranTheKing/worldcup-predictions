import { createClient } from "@/lib/supabase/server";
import LeaguesClient, { type LeagueRow } from "./LeaguesClient";

export const dynamic = "force-dynamic";

export default async function MyLeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let leagues: LeagueRow[] = [];

  if (user) {
    // Two-step query: avoid embedded-relation RLS complexity that can produce {}
    // Step 1 — get league IDs this user belongs to
    const { data: memberRows, error: memberErr } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", user.id);

    if (memberErr) {
      console.error(
        "[MyLeaguesPage] league_members error:",
        memberErr.message,
        memberErr.code,
        memberErr.details
      );
    }

    const ids = (memberRows ?? []).map((r) => r.league_id as string).filter(Boolean);

    // Step 2 — fetch league details (RLS on leagues allows members to read their own leagues)
    if (ids.length > 0) {
      const { data: leagueRows, error: leagueErr } = await supabase
        .from("leagues")
        .select("id, name, invite_code, owner_id, created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });

      if (leagueErr) {
        console.error(
          "[MyLeaguesPage] leagues fetch error:",
          leagueErr.message,
          leagueErr.code,
          leagueErr.details
        );
      }

      leagues = (leagueRows ?? []) as LeagueRow[];
    }
  }

  return <LeaguesClient leagues={leagues} isAuthenticated={Boolean(user)} />;
}

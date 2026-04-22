import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeaguesClient, { type LeagueRow } from "./LeaguesClient";

export const dynamic = "force-dynamic";

export default async function MyLeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let leagues: LeagueRow[] = [];

  if (user) {
    const admin = createAdminClient();

    const { data: memberRows, error: memberError } = await admin
      .from("league_members")
      .select("league_id")
      .eq("user_id", user.id);

    if (memberError) {
      console.error("[MyLeaguesPage] league_members error:", memberError);
    }

    const leagueIds = (memberRows ?? [])
      .map((row) => row.league_id as string)
      .filter(Boolean);

    if (leagueIds.length > 0) {
      const { data: leagueRows, error: leagueError } = await admin
        .from("leagues")
        .select("id, name, invite_code, owner_id, created_at")
        .in("id", leagueIds)
        .order("created_at", { ascending: false });

      if (leagueError) {
        console.error("[MyLeaguesPage] leagues fetch error:", leagueError);
      }

      leagues = (leagueRows ?? []) as LeagueRow[];
    }
  }

  return <LeaguesClient leagues={leagues} isAuthenticated={Boolean(user)} />;
}

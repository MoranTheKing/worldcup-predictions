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
    const { data, error } = await supabase
      .from("league_members")
      .select(
        "league_id, leagues(id, name, invite_code, owner_id, created_at)"
      )
      .eq("user_id", user.id)
      .order("league_id");

    if (error) {
      console.error("[MyLeaguesPage] fetch error:", error);
    }

    leagues = ((data ?? [])
      .map((row) => {
        const l = Array.isArray(row.leagues) ? row.leagues[0] : row.leagues;
        return l as LeagueRow | null;
      })
      .filter(Boolean) as LeagueRow[]);
  }

  return (
    <LeaguesClient
      leagues={leagues}
      isAuthenticated={Boolean(user)}
    />
  );
}

import { requireServerMfa } from "@/lib/auth/mfa-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LeaguesClient, { type LeagueRow } from "./LeaguesClient";

export const dynamic = "force-dynamic";

type RawLeagueMemberRow = {
  league_id: string;
  user_id: string;
  joined_at: string | null;
  profiles:
    | {
        total_score?: number | null;
      }
    | {
        total_score?: number | null;
      }[]
    | null;
};

export default async function MyLeaguesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let leagues: LeagueRow[] = [];

  if (user) {
    await requireServerMfa(supabase, "/game/leagues");

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
      const [{ data: leagueRows, error: leagueError }, { data: allMemberRows, error: statsError }] =
        await Promise.all([
          admin
            .from("leagues")
            .select("id, name, invite_code, owner_id, created_at")
            .in("id", leagueIds)
            .order("created_at", { ascending: false }),
          admin
            .from("league_members")
            .select("league_id, user_id, joined_at, profiles(total_score)")
            .in("league_id", leagueIds),
        ]);

      if (leagueError) {
        console.error("[MyLeaguesPage] leagues fetch error:", leagueError);
      }

      if (statsError) {
        console.error("[MyLeaguesPage] league stats error:", statsError);
      }

      const statsByLeague = buildLeagueStats((allMemberRows ?? []) as RawLeagueMemberRow[], user.id);

      leagues = ((leagueRows ?? []) as Array<{
        id: string;
        name: string;
        invite_code: string | null;
        owner_id: string | null;
        created_at: string | null;
      }>).map((league) => ({
        ...league,
        member_count: statsByLeague.get(league.id)?.memberCount ?? 0,
        current_rank: statsByLeague.get(league.id)?.currentRank ?? null,
      }));
    }
  }

  return <LeaguesClient leagues={leagues} isAuthenticated={Boolean(user)} />;
}

function buildLeagueStats(rows: RawLeagueMemberRow[], currentUserId: string) {
  const grouped = new Map<string, RawLeagueMemberRow[]>();

  for (const row of rows) {
    const bucket = grouped.get(row.league_id) ?? [];
    bucket.push(row);
    grouped.set(row.league_id, bucket);
  }

  const stats = new Map<string, { memberCount: number; currentRank: number | null }>();

  for (const [leagueId, members] of grouped) {
    const sorted = [...members].sort((left, right) => {
      const leftProfile = Array.isArray(left.profiles) ? left.profiles[0] ?? null : left.profiles;
      const rightProfile = Array.isArray(right.profiles) ? right.profiles[0] ?? null : right.profiles;
      const leftScore = typeof leftProfile?.total_score === "number" ? leftProfile.total_score : 0;
      const rightScore = typeof rightProfile?.total_score === "number" ? rightProfile.total_score : 0;

      if (rightScore !== leftScore) return rightScore - leftScore;

      const leftJoined = left.joined_at ?? "";
      const rightJoined = right.joined_at ?? "";
      if (leftJoined !== rightJoined) return leftJoined.localeCompare(rightJoined);

      return left.user_id.localeCompare(right.user_id);
    });

    stats.set(leagueId, {
      memberCount: sorted.length,
      currentRank: sorted.findIndex((member) => member.user_id === currentUserId) + 1 || null,
    });
  }

  return stats;
}

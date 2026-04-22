import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LeagueViewClient, { type LeagueMemberRow } from "./LeagueViewClient";

export const dynamic = "force-dynamic";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/game/leagues/${id}`);
  }

  const admin = createAdminClient();

  const { data: league, error: leagueError } = await admin
    .from("leagues")
    .select("id, name, invite_code, owner_id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (leagueError) {
    console.error("[LeaguePage] league error:", leagueError);
  }

  if (!league) {
    notFound();
  }

  const isOwner = league.owner_id === user.id;

  const { data: membership, error: membershipError } = await admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    console.error("[LeaguePage] membership error:", membershipError);
  }

  if (!isOwner && !membership) {
    redirect("/game/leagues");
  }

  const { data: rawMembers, error: membersError } = await admin
    .from("league_members")
    .select("user_id, joined_at, profiles(display_name, total_score, avatar_url)")
    .eq("league_id", id);

  if (membersError) {
    console.error("[LeaguePage] members error:", membersError);
  }

  const members: LeagueMemberRow[] = ((rawMembers ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const safeProfile = (profile ?? {}) as Record<string, unknown>;

      return {
        user_id: String(row.user_id ?? ""),
        joined_at: typeof row.joined_at === "string" ? row.joined_at : null,
        display_name:
          typeof safeProfile.display_name === "string" && safeProfile.display_name.trim()
            ? safeProfile.display_name
            : "שחקן אנונימי",
        total_score:
          typeof safeProfile.total_score === "number" && Number.isFinite(safeProfile.total_score)
            ? safeProfile.total_score
            : 0,
        avatar_url:
          typeof safeProfile.avatar_url === "string" && safeProfile.avatar_url.trim()
            ? safeProfile.avatar_url
            : null,
      };
    })
    .sort((left, right) => right.total_score - left.total_score);

  return (
    <LeagueViewClient
      league={{
        id: String(league.id),
        name: String(league.name ?? "League"),
        invite_code:
          typeof league.invite_code === "string" && league.invite_code.trim()
            ? league.invite_code
            : null,
        owner_id:
          typeof league.owner_id === "string" && league.owner_id.trim()
            ? league.owner_id
            : null,
      }}
      currentUserId={user.id}
      members={members}
    />
  );
}

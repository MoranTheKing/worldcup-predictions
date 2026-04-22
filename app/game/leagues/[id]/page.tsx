import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LeagueViewClient, { type LeagueMemberRow } from "./LeagueViewClient";

export const dynamic = "force-dynamic";

type RawMemberRow = {
  user_id: string;
  joined_at: string | null;
  profiles: {
    display_name?: string | null;
    total_score?: number | null;
    avatar_url?: string | null;
  } | {
    display_name?: string | null;
    total_score?: number | null;
    avatar_url?: string | null;
  }[] | null;
};

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

  const [{ data: rawMembers, error: membersError }, startedResult] = await Promise.all([
    admin
      .from("league_members")
      .select("user_id, joined_at, profiles(display_name, total_score, avatar_url)")
      .eq("league_id", id),
    admin
      .from("matches")
      .select("match_number", { head: true, count: "exact" })
      .neq("status", "scheduled"),
  ]);

  if (membersError) {
    console.error("[LeaguePage] members error:", membersError);
  }

  const tournamentStarted = (startedResult.count ?? 0) > 0;

  const membersBase = ((rawMembers ?? []) as RawMemberRow[]).map((row) => {
    const safeProfile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;

    return {
      user_id: String(row.user_id ?? ""),
      joined_at: typeof row.joined_at === "string" ? row.joined_at : null,
      display_name:
        typeof safeProfile?.display_name === "string" && safeProfile.display_name.trim()
          ? safeProfile.display_name
          : "שחקן אנונימי",
      total_score:
        typeof safeProfile?.total_score === "number" && Number.isFinite(safeProfile.total_score)
          ? safeProfile.total_score
          : 0,
      avatar_url:
        typeof safeProfile?.avatar_url === "string" && safeProfile.avatar_url.trim()
          ? safeProfile.avatar_url
          : null,
    };
  });

  const memberIds = membersBase.map((member) => member.user_id);
  const outrightMap = new Map<
    string,
    { winner: string | null; topScorer: string | null }
  >();

  if (tournamentStarted && memberIds.length > 0) {
    const { data: rawOutrights, error: outrightError } = await admin
      .from("tournament_predictions")
      .select("user_id, predicted_winner_team_id, predicted_top_scorer_name")
      .in("user_id", memberIds);

    if (outrightError) {
      console.error("[LeaguePage] tournament predictions error:", outrightError);
    } else {
      const winnerIds = Array.from(
        new Set(
          (rawOutrights ?? [])
            .map((row) =>
              typeof (row as { predicted_winner_team_id?: string | null }).predicted_winner_team_id === "string"
                ? (row as { predicted_winner_team_id: string }).predicted_winner_team_id
                : null,
            )
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const { data: rawTeams, error: teamsError } = winnerIds.length
        ? await admin
            .from("teams")
            .select("id, name, name_he")
            .in("id", winnerIds)
        : { data: [], error: null };

      if (teamsError) {
        console.error("[LeaguePage] winner teams error:", teamsError);
      }

      const teamsById = new Map(
        ((rawTeams ?? []) as Array<{ id: string; name: string; name_he?: string | null }>).map((team) => [
          team.id,
          team.name_he ?? team.name,
        ]),
      );

      for (const row of (rawOutrights ?? []) as Array<{
        user_id: string;
        predicted_winner_team_id?: string | null;
        predicted_top_scorer_name?: string | null;
      }>) {
        outrightMap.set(row.user_id, {
          winner:
            typeof row.predicted_winner_team_id === "string"
              ? teamsById.get(row.predicted_winner_team_id) ?? null
              : null,
          topScorer:
            typeof row.predicted_top_scorer_name === "string" && row.predicted_top_scorer_name.trim()
              ? row.predicted_top_scorer_name
              : null,
        });
      }
    }
  }

  const members: LeagueMemberRow[] = membersBase
    .map((member) => {
      const outright = outrightMap.get(member.user_id);

      return {
        ...member,
        winner_prediction: tournamentStarted ? outright?.winner ?? null : null,
        top_scorer_prediction: tournamentStarted ? outright?.topScorer ?? null : null,
        outrights_visible: tournamentStarted,
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

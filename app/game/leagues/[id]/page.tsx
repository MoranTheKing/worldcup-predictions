import { notFound, redirect } from "next/navigation";
import { requireServerMfa } from "@/lib/auth/mfa-server";
import { canUseJokerOnMatch } from "@/lib/game/boosters";
import { sortLeaderboardMembersByProjectedScore } from "@/lib/game/leaderboard-ranking";
import { hasTournamentStarted } from "@/lib/game/tournament-start";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LeagueViewClient, {
  type LeagueLiveMatchSummary,
  type LeagueMemberRow,
} from "./LeagueViewClient";

export const dynamic = "force-dynamic";

type RawMemberRow = {
  user_id: string;
  joined_at: string | null;
  profiles:
    | {
        display_name?: string | null;
        total_score?: number | null;
        avatar_url?: string | null;
        created_at?: string | null;
      }
    | {
        display_name?: string | null;
        total_score?: number | null;
        avatar_url?: string | null;
        created_at?: string | null;
      }[]
    | null;
};

type RawLiveMatchRow = {
  match_number: number | null;
  stage: string | null;
  status: string | null;
  match_phase: string | null;
  date_time: string | null;
  minute: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_score: number | null;
  away_score: number | null;
  home_odds: number | string | null;
  draw_odds: number | string | null;
  away_odds: number | string | null;
};

type RawTeamRow = {
  id: string;
  name: string;
  name_he?: string | null;
  logo_url?: string | null;
};

type RawLivePredictionRow = {
  user_id: string | null;
  match_id: number | null;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied?: boolean | null;
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

  await requireServerMfa(supabase, `/game/leagues/${encodeURIComponent(id)}`);

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

  const [
    { data: rawMembers, error: membersError },
    kickoffResult,
    { data: rawLiveMatches, error: liveMatchesError },
  ] = await Promise.all([
    admin
      .from("league_members")
      .select("user_id, joined_at, profiles(display_name, total_score, avatar_url, created_at)")
      .eq("league_id", id),
    admin
      .from("matches")
      .select("status, date_time")
      .order("match_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("matches")
      .select(
        "match_number, stage, status, match_phase, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, home_odds, draw_odds, away_odds",
      )
      .eq("status", "live")
      .order("match_number", { ascending: true })
      .limit(2),
  ]);

  if (membersError) {
    console.error("[LeaguePage] members error:", membersError);
  }

  if (liveMatchesError) {
    console.error("[LeaguePage] live matches error:", liveMatchesError);
  }

  const tournamentStarted = hasTournamentStarted(kickoffResult.data);

  const membersBase = ((rawMembers ?? []) as RawMemberRow[]).map((row) => {
    const safeProfile = Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;

    return {
      user_id: String(row.user_id ?? ""),
      joined_at: typeof row.joined_at === "string" ? row.joined_at : null,
      registered_at:
        typeof safeProfile?.created_at === "string" ? safeProfile.created_at : null,
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
  const liveMatchRows = ((rawLiveMatches ?? []) as RawLiveMatchRow[])
    .filter((match) => typeof match.match_number === "number" && match.status === "live")
    .slice(0, 2);
  const liveMatchIds = liveMatchRows.map((match) => match.match_number as number);
  const liveTeamIds = Array.from(
    new Set(
      liveMatchRows
        .flatMap((match) => [match.home_team_id, match.away_team_id])
        .filter((value): value is string => typeof value === "string" && Boolean(value)),
    ),
  );
  const liveTeamsById = new Map<string, { name: string; logoUrl: string | null }>();

  if (liveTeamIds.length > 0) {
    const { data: rawLiveTeams, error: liveTeamsError } = await admin
      .from("teams")
      .select("id, name, name_he, logo_url")
      .in("id", liveTeamIds);

    if (liveTeamsError) {
      console.error("[LeaguePage] live teams error:", liveTeamsError);
    }

    for (const team of (rawLiveTeams ?? []) as RawTeamRow[]) {
      liveTeamsById.set(team.id, {
        name: team.name_he ?? team.name,
        logoUrl: team.logo_url ?? null,
      });
    }
  }

  const liveMatches: LeagueLiveMatchSummary[] = liveMatchRows.map((match) => {
    const homeTeam = match.home_team_id ? liveTeamsById.get(match.home_team_id) ?? null : null;
    const awayTeam = match.away_team_id ? liveTeamsById.get(match.away_team_id) ?? null : null;

    return {
      match_number: match.match_number as number,
      stage: match.stage ?? "",
      date_time: match.date_time ?? "",
      minute: typeof match.minute === "number" ? match.minute : null,
      match_phase: normalizeMatchPhase(match.match_phase),
      home_team_id: match.home_team_id ?? null,
      away_team_id: match.away_team_id ?? null,
      home_name: homeTeam?.name ?? match.home_placeholder ?? "בית",
      away_name: awayTeam?.name ?? match.away_placeholder ?? "חוץ",
      home_logo_url: homeTeam?.logoUrl ?? null,
      away_logo_url: awayTeam?.logoUrl ?? null,
      home_score: typeof match.home_score === "number" ? match.home_score : null,
      away_score: typeof match.away_score === "number" ? match.away_score : null,
      home_odds: normalizeOddsValue(match.home_odds),
      draw_odds: normalizeOddsValue(match.draw_odds),
      away_odds: normalizeOddsValue(match.away_odds),
    };
  });
  const livePredictionMap = new Map<string, RawLivePredictionRow>();

  if (memberIds.length > 0 && liveMatchIds.length > 0) {
    const { data: rawLivePredictions, error: livePredictionsError } = await admin
      .from("predictions")
      .select("user_id, match_id, home_score_guess, away_score_guess, is_joker_applied")
      .in("user_id", memberIds)
      .in("match_id", liveMatchIds);

    if (livePredictionsError) {
      console.error("[LeaguePage] live predictions error:", livePredictionsError);
    }

    for (const prediction of (rawLivePredictions ?? []) as RawLivePredictionRow[]) {
      if (typeof prediction.user_id !== "string" || typeof prediction.match_id !== "number") {
        continue;
      }

      livePredictionMap.set(`${prediction.user_id}:${prediction.match_id}`, prediction);
    }
  }

  const outrightMap = new Map<
    string,
    { winner: string | null; winnerTeamId: string | null; winnerLogoUrl: string | null; topScorer: string | null }
  >();
  const canLoadAllOutrights = tournamentStarted;
  const outrightUserIds = canLoadAllOutrights
    ? memberIds
    : memberIds.filter((memberId) => memberId === user.id);

  if (outrightUserIds.length > 0) {
    const { data: rawOutrights, error: outrightError } = await admin
      .from("tournament_predictions")
      .select("user_id, predicted_winner_team_id, predicted_top_scorer_name")
      .in("user_id", outrightUserIds);

    if (outrightError) {
      console.error("[LeaguePage] tournament predictions error:", outrightError);
    } else {
      const winnerIds = Array.from(
        new Set(
          (rawOutrights ?? [])
            .map((row) =>
              typeof (row as { predicted_winner_team_id?: string | null }).predicted_winner_team_id ===
              "string"
                ? (row as { predicted_winner_team_id: string }).predicted_winner_team_id
                : null,
            )
            .filter((value): value is string => Boolean(value)),
        ),
      );

      const { data: rawTeams, error: teamsError } = winnerIds.length
        ? await admin.from("teams").select("id, name, name_he, logo_url").in("id", winnerIds)
        : { data: [], error: null };

      if (teamsError) {
        console.error("[LeaguePage] winner teams error:", teamsError);
      }

      const teamsById = new Map(
        (
          (rawTeams ?? []) as Array<{
            id: string;
            name: string;
            name_he?: string | null;
            logo_url?: string | null;
          }>
        ).map((team) => [
          team.id,
          { id: team.id, name: team.name_he ?? team.name, logoUrl: team.logo_url ?? null },
        ]),
      );

      for (const row of (rawOutrights ?? []) as Array<{
        user_id: string;
        predicted_winner_team_id?: string | null;
        predicted_top_scorer_name?: string | null;
      }>) {
        const winner =
          typeof row.predicted_winner_team_id === "string"
            ? teamsById.get(row.predicted_winner_team_id) ?? null
            : null;

        outrightMap.set(row.user_id, {
          winner: winner?.name ?? null,
          winnerTeamId: winner?.id ?? null,
          winnerLogoUrl: winner?.logoUrl ?? null,
          topScorer:
            typeof row.predicted_top_scorer_name === "string" && row.predicted_top_scorer_name.trim()
              ? row.predicted_top_scorer_name
              : null,
        });
      }
    }
  }

  const members: LeagueMemberRow[] = sortLeaderboardMembersByProjectedScore(
    membersBase.map((member) => {
      const outright = outrightMap.get(member.user_id);
      const outrightsVisible = tournamentStarted || member.user_id === user.id;

      return {
        ...member,
        winner_prediction: outright?.winner ?? null,
        winner_team_id: outright?.winnerTeamId ?? null,
        winner_logo_url: outright?.winnerLogoUrl ?? null,
        top_scorer_prediction: outright?.topScorer ?? null,
        outrights_visible: outrightsVisible,
        live_predictions: liveMatches.map((match) => {
          const prediction = livePredictionMap.get(`${member.user_id}:${match.match_number}`);

          return {
            match_number: match.match_number,
            home_score_guess:
              typeof prediction?.home_score_guess === "number" ? prediction.home_score_guess : null,
            away_score_guess:
              typeof prediction?.away_score_guess === "number" ? prediction.away_score_guess : null,
            is_joker_applied:
              prediction?.is_joker_applied === true &&
              canUseJokerOnMatch(match.stage, match.match_number),
          };
        }),
      };
    }),
    liveMatches,
  );

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
      liveMatches={liveMatches}
    />
  );
}

function normalizeMatchPhase(value: string | null): LeagueLiveMatchSummary["match_phase"] {
  if (
    value === "first_half" ||
    value === "halftime" ||
    value === "second_half" ||
    value === "extra_time" ||
    value === "penalties"
  ) {
    return value;
  }

  return null;
}

function normalizeOddsValue(value: number | string | null) {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
}

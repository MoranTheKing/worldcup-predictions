import { redirect } from "next/navigation";
import { requireServerMfa } from "@/lib/auth/mfa-server";
import { canUseJokerOnMatch } from "@/lib/game/boosters";
import { sortLeaderboardMembersByProjectedScore } from "@/lib/game/leaderboard-ranking";
import { hasTournamentStarted } from "@/lib/game/tournament-start";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import LeagueViewClient, {
  type LeagueLiveMatchSummary,
  type LeagueMemberRow,
} from "@/app/game/leagues/[id]/LeagueViewClient";

export const dynamic = "force-dynamic";

const GLOBAL_LEADERBOARD_MEMBER_LIMIT = 500;

type RawProfileRow = {
  id: string;
  display_name?: string | null;
  total_score?: number | null;
  avatar_url?: string | null;
  created_at?: string | null;
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

export default async function GlobalLeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/game/leaderboard");
  }

  await requireServerMfa(supabase, "/game/leaderboard");

  const admin = createAdminClient();
  const [
    { data: rawProfiles, error: profilesError },
    kickoffResult,
    { data: rawLiveMatches, error: liveMatchesError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, total_score, avatar_url, created_at")
      .order("total_score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(GLOBAL_LEADERBOARD_MEMBER_LIMIT),
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

  if (profilesError) {
    console.error("[GlobalLeaderboardPage] profiles error:", profilesError);
  }

  if (liveMatchesError) {
    console.error("[GlobalLeaderboardPage] live matches error:", liveMatchesError);
  }

  const visibleProfiles = await includeCurrentUserProfile(
    admin,
    (rawProfiles ?? []) as RawProfileRow[],
    user.id,
  );
  const tournamentStarted = hasTournamentStarted(kickoffResult.data);
  const membersBase = visibleProfiles
    .map((profile) => ({
      user_id: profile.id,
      joined_at: null,
      registered_at: typeof profile.created_at === "string" ? profile.created_at : null,
      display_name:
        typeof profile.display_name === "string" && profile.display_name.trim()
          ? profile.display_name
          : "שחקן אנונימי",
      total_score:
        typeof profile.total_score === "number" && Number.isFinite(profile.total_score)
          ? profile.total_score
          : 0,
      avatar_url:
        typeof profile.avatar_url === "string" && profile.avatar_url.trim()
          ? profile.avatar_url
          : null,
    }));

  const memberIds = membersBase.map((member) => member.user_id);
  const liveMatchRows = ((rawLiveMatches ?? []) as RawLiveMatchRow[]).filter(
    (match) => typeof match.match_number === "number" && match.status === "live",
  );
  const liveMatchIds = liveMatchRows.map((match) => match.match_number as number);
  const liveTeamsById = await loadLiveTeams(admin, liveMatchRows);
  const liveMatches = buildLiveMatches(liveMatchRows, liveTeamsById);
  const livePredictionMap = await loadLivePredictions(admin, memberIds, liveMatchIds);
  const outrightMap = await loadOutrights(
    admin,
    tournamentStarted ? memberIds : memberIds.filter((memberId) => memberId === user.id),
  );

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
        id: "global",
        name: "הליגה הכללית",
        invite_code: null,
        owner_id: null,
      }}
      currentUserId={user.id}
      members={members}
      liveMatches={liveMatches}
      variant="global"
    />
  );
}

async function includeCurrentUserProfile(
  admin: ReturnType<typeof createAdminClient>,
  profiles: RawProfileRow[],
  currentUserId: string,
) {
  if (profiles.some((profile) => profile.id === currentUserId)) {
    return profiles;
  }

  const { data: currentProfile, error } = await admin
    .from("profiles")
    .select("id, display_name, total_score, avatar_url, created_at")
    .eq("id", currentUserId)
    .maybeSingle();

  if (error) {
    console.error("[GlobalLeaderboardPage] current profile error:", error);
    return profiles;
  }

  return currentProfile ? [...profiles, currentProfile as RawProfileRow] : profiles;
}

async function loadLiveTeams(
  admin: ReturnType<typeof createAdminClient>,
  liveMatchRows: RawLiveMatchRow[],
) {
  const liveTeamIds = Array.from(
    new Set(
      liveMatchRows
        .flatMap((match) => [match.home_team_id, match.away_team_id])
        .filter((value): value is string => typeof value === "string" && Boolean(value)),
    ),
  );
  const liveTeamsById = new Map<string, { name: string; logoUrl: string | null }>();

  if (liveTeamIds.length === 0) {
    return liveTeamsById;
  }

  const { data: rawLiveTeams, error: liveTeamsError } = await admin
    .from("teams")
    .select("id, name, name_he, logo_url")
    .in("id", liveTeamIds);

  if (liveTeamsError) {
    console.error("[GlobalLeaderboardPage] live teams error:", liveTeamsError);
  }

  for (const team of (rawLiveTeams ?? []) as RawTeamRow[]) {
    liveTeamsById.set(team.id, {
      name: team.name_he ?? team.name,
      logoUrl: team.logo_url ?? null,
    });
  }

  return liveTeamsById;
}

function buildLiveMatches(
  liveMatchRows: RawLiveMatchRow[],
  liveTeamsById: Map<string, { name: string; logoUrl: string | null }>,
): LeagueLiveMatchSummary[] {
  return liveMatchRows.map((match) => {
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
}

async function loadLivePredictions(
  admin: ReturnType<typeof createAdminClient>,
  memberIds: string[],
  liveMatchIds: number[],
) {
  const livePredictionMap = new Map<string, RawLivePredictionRow>();

  if (memberIds.length === 0 || liveMatchIds.length === 0) {
    return livePredictionMap;
  }

  const { data: rawLivePredictions, error: livePredictionsError } = await admin
    .from("predictions")
    .select("user_id, match_id, home_score_guess, away_score_guess, is_joker_applied")
    .in("user_id", memberIds)
    .in("match_id", liveMatchIds);

  if (livePredictionsError) {
    console.error("[GlobalLeaderboardPage] live predictions error:", livePredictionsError);
    return livePredictionMap;
  }

  for (const prediction of (rawLivePredictions ?? []) as RawLivePredictionRow[]) {
    if (typeof prediction.user_id !== "string" || typeof prediction.match_id !== "number") {
      continue;
    }

    livePredictionMap.set(`${prediction.user_id}:${prediction.match_id}`, prediction);
  }

  return livePredictionMap;
}

async function loadOutrights(admin: ReturnType<typeof createAdminClient>, userIds: string[]) {
  const outrightMap = new Map<
    string,
    { winner: string | null; winnerTeamId: string | null; winnerLogoUrl: string | null; topScorer: string | null }
  >();

  if (userIds.length === 0) {
    return outrightMap;
  }

  const { data: rawOutrights, error: outrightError } = await admin
    .from("tournament_predictions")
    .select("user_id, predicted_winner_team_id, predicted_top_scorer_name")
    .in("user_id", userIds);

  if (outrightError) {
    console.error("[GlobalLeaderboardPage] tournament predictions error:", outrightError);
    return outrightMap;
  }

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
    console.error("[GlobalLeaderboardPage] winner teams error:", teamsError);
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
        typeof row.predicted_top_scorer_name === "string" &&
        row.predicted_top_scorer_name.trim()
          ? row.predicted_top_scorer_name
          : null,
    });
  }

  return outrightMap;
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

import Link from "next/link";
import { redirect } from "next/navigation";
import MatchPredictionCard from "@/app/game/predictions/MatchPredictionCard";
import UserAvatar from "@/components/UserAvatar";
import PredictionsClient from "@/app/game/predictions/PredictionsClient";
import OutrightChoiceBadge from "@/components/game/OutrightChoiceBadge";
import { canUseJokerOnMatch } from "@/lib/game/boosters";
import { loadPredictionsHubData } from "@/lib/game/predictions-hub";
import { getUserGameStats } from "@/lib/game/stats";
import { hasTournamentStarted } from "@/lib/game/tournament-start";
import { requireServerMfa } from "@/lib/auth/mfa-server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAuthProfile, resolveDisplayName } from "@/lib/supabase/auth-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OpponentPredictionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ league?: string }>;
}) {
  const { id: targetUserId } = await params;
  const { league: requestedLeagueId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/game/users/${targetUserId}`);
  }

  await requireServerMfa(supabase, `/game/users/${encodeURIComponent(targetUserId)}`);

  const admin = createAdminClient();

  const [{ data: currentMemberships }, { data: targetMemberships }, profile, gameStats] =
    await Promise.all([
      admin.from("league_members").select("league_id").eq("user_id", user.id),
      admin.from("league_members").select("league_id").eq("user_id", targetUserId),
      fetchAuthProfile(admin, targetUserId),
      getUserGameStats(admin, targetUserId),
    ]);

  const currentLeagueIds = new Set(
    ((currentMemberships ?? []) as Array<{ league_id?: string | null }>)
      .map((row) => row.league_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  );
  const sharedLeagueIds = ((targetMemberships ?? []) as Array<{ league_id?: string | null }>)
    .map((row) => row.league_id)
    .filter((value): value is string => typeof value === "string" && currentLeagueIds.has(value));

  if (user.id !== targetUserId && sharedLeagueIds.length === 0) {
    redirect("/game/leagues");
  }

  const backLeagueId =
    requestedLeagueId && sharedLeagueIds.includes(requestedLeagueId)
      ? requestedLeagueId
      : sharedLeagueIds[0] ?? null;
  const backHref = backLeagueId ? `/game/leagues/${backLeagueId}` : "/game/leagues";

  if (user.id === targetUserId) {
    const selfData = await loadPredictionsHubData(user.id);

    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="text-xs font-semibold text-wc-fg3 transition-colors hover:text-wc-neon"
          >
            ← חזרה לליגה
          </Link>
          <span className="text-xs text-wc-fg3">תצוגת עריכה מלאה של הניחושים שלך</span>
        </div>

        <PredictionsClient
          currentUserId={user.id}
          matches={selfData.matches}
          teams={selfData.teams}
          players={selfData.players}
          existingPredictions={selfData.existingPredictions}
          tournamentPrediction={selfData.tournamentPrediction}
          isAuthenticated
          groupJokerUsedCount={selfData.groupJokerUsedCount}
          groupJokerLimit={selfData.groupJokerLimit}
          tournamentStarted={selfData.tournamentStarted}
        />
      </div>
    );
  }

  const [
    { data: matchesData },
    { data: teamsData },
    predictionsResult,
    tournamentResult,
    { data: leagueRows },
    kickoffResult,
  ] = await Promise.all([
    admin
      .from("matches")
      .select(
        "match_number, stage, status, match_phase, date_time, minute, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, home_odds, draw_odds, away_odds, is_extra_time, home_penalty_score, away_penalty_score",
      )
      .order("date_time", { ascending: true }),
    admin
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter")
      .order("name_he", { ascending: true }),
    admin
      .from("predictions")
      .select("match_id, home_score_guess, away_score_guess, is_joker_applied, points_earned")
      .eq("user_id", targetUserId),
    admin
      .from("tournament_predictions")
      .select("predicted_winner_team_id, predicted_top_scorer_name")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    sharedLeagueIds.length > 0
      ? admin.from("leagues").select("id, name").in("id", sharedLeagueIds)
      : Promise.resolve({ data: [], error: null }),
    admin
      .from("matches")
      .select("status, date_time")
      .order("match_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const allMatches = attachTeamsToMatches(
    (matchesData ?? []) as Parameters<typeof attachTeamsToMatches>[0],
    (teamsData ?? []) as Parameters<typeof attachTeamsToMatches>[1],
  ) as MatchWithTeams[];
  const visibleOpponentMatches = allMatches.filter(
    (match) => Boolean(match.homeTeam && match.awayTeam) && (match.status === "live" || match.status === "finished"),
  );

  const predictionMap = new Map(
    ((predictionsResult.data ?? []) as Array<{
      match_id: number;
      home_score_guess: number | null;
      away_score_guess: number | null;
      is_joker_applied?: boolean | null;
      points_earned?: number | null;
    }>).map((prediction) => [prediction.match_id, prediction]),
  );

  const displayName = resolveDisplayName(profile, null);
  const avatarUrl = profile?.avatarUrl ?? null;
  const totalScore = profile?.totalScore ?? 0;
  const totalHits = gameStats.totalHits;
  const sharedLeagueNames = new Map(
    ((leagueRows ?? []) as Array<{ id: string; name?: string | null }>).map((league) => [
      league.id,
      league.name ?? "League",
    ]),
  );
  const tournamentStarted = hasTournamentStarted(kickoffResult.data);

  const teamsById = new Map(
    (
      (teamsData ?? []) as Array<{
        id: string;
        name: string;
        name_he?: string | null;
        logo_url?: string | null;
      }>
    ).map((team) => [
      team.id,
      { name: team.name_he ?? team.name, logoUrl: team.logo_url ?? null },
    ]),
  );

  const winnerTeam =
    typeof tournamentResult.data?.predicted_winner_team_id === "string"
      ? teamsById.get(tournamentResult.data.predicted_winner_team_id) ?? null
      : null;
  const visibleWinnerName = tournamentStarted ? winnerTeam?.name ?? null : null;
  const visibleWinnerLogoUrl = tournamentStarted ? winnerTeam?.logoUrl ?? null : null;
  const visibleTopScorer = tournamentStarted
    ? tournamentResult.data?.predicted_top_scorer_name ?? null
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-xs font-semibold text-wc-fg3 transition-colors hover:text-wc-neon"
        >
          ← חזרה לליגה
        </Link>
        {backLeagueId ? (
          <span className="text-xs text-wc-fg3">
            שיתוף ליגה: {sharedLeagueNames.get(backLeagueId) ?? "League"}
          </span>
        ) : null}
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-[rgba(13,27,46,0.82)] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={displayName}
              src={avatarUrl}
              size={68}
              className="aspect-square h-[68px] w-[68px]"
            />

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
                Opponent View
              </p>
              <h1 className="mt-2 text-3xl font-black text-wc-fg1">{displayName}</h1>
              <p className="mt-1 text-sm text-wc-fg2">
                משחקים עתידיים נשארים נעולים. רק משחקים חיים או גמורים חושפים את
                הניחוש בפועל.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
            <OpponentStatCard
              label="Total Score"
              value={String(totalScore)}
              accentClassName="text-wc-neon"
            />
            <OpponentStatCard
              label="Total Hits"
              value={String(totalHits)}
              accentClassName="text-[#C9B2FF]"
            />
            <OutrightChoiceBadge
              kind="winner"
              label="זוכת הטורניר"
              value={visibleWinnerName}
              logoUrl={visibleWinnerLogoUrl}
              hidden={!tournamentStarted}
              locked
              size="hero"
            />
            <OutrightChoiceBadge
              kind="topScorer"
              label="מלך השערים"
              value={visibleTopScorer}
              hidden={!tournamentStarted}
              locked
              size="hero"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        {visibleOpponentMatches.length > 0 ? (
          visibleOpponentMatches.map((match) => {
            const prediction = predictionMap.get(match.match_number);
            const effectiveIsJoker =
              prediction?.is_joker_applied === true &&
              canUseJokerOnMatch(match.stage, match.match_number);
            return (
              <MatchPredictionCard
                key={`${match.match_number}-${prediction?.home_score_guess ?? "x"}-${prediction?.away_score_guess ?? "x"}-${effectiveIsJoker ? "joker" : "plain"}-${match.status}`}
                match={match}
                existingHome={prediction?.home_score_guess ?? null}
                existingAway={prediction?.away_score_guess ?? null}
                existingIsJoker={effectiveIsJoker}
                pointsEarned={prediction?.points_earned ?? null}
                isJokerSelected={Boolean(prediction?.is_joker_applied)}
                showJokerToggle={false}
                predictionOwnerLabel="הניחוש שלו/ה"
                isReadOnly
                hideScheduledPrediction
              />
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[rgba(13,27,46,0.82)] p-10 text-center text-sm text-wc-fg3">
            עדיין אין משחקים זמינים להצגה.
          </div>
        )}
      </section>
    </div>
  );
}

function OpponentStatCard({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: string;
  accentClassName: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-[rgba(6,13,26,0.46)] px-4 py-3 text-start">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      <p className={`wc-display mt-2 text-4xl ${accentClassName}`}>{value}</p>
    </div>
  );
}

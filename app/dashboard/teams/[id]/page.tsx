import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import CoachLink from "@/components/CoachLink";
import PlayerLink from "@/components/PlayerLink";
import TeamLink from "@/components/TeamLink";
import { translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  formatMatchDateLabel,
  formatMatchTimeLabel,
  getLiveMatchStatusLabel,
  getMatchStageKind,
  getMatchScoreSummary,
  getStageLabelHe,
  getTeamDisplayLogo,
  getTeamDisplayName,
  isMatchScoreVisible,
  type MatchWithTeams,
  type TournamentMatchRecord,
  type TournamentTeamRecord,
} from "@/lib/tournament/matches";
import {
  buildTournamentTeams,
  getGroupMatches,
  type TournamentTeamStateRow,
} from "@/lib/tournament/tournament-state";
import {
  buildTournamentStandings,
  type TeamStanding,
} from "@/lib/utils/standings";

export const dynamic = "force-dynamic";

type TeamMatch = MatchWithTeams;

type TeamPlayer = {
  id: number | string;
  name: string;
  position: string | null;
  top_scorer_odds?: number | string | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
};

type TeamRecentMatch = {
  id: string;
  team_id: string;
  opponent_name: string;
  opponent_logo_url: string | null;
  played_at: string;
  competition: string | null;
  team_score: number;
  opponent_score: number;
  result: "win" | "draw" | "loss";
};

type TeamOutcome = {
  label: string;
  short: "W" | "D" | "L" | "-";
  result: "win" | "draw" | "loss" | null;
  className: string;
  chipClassName: string;
};

type TeamStats = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  liveCount: number;
  scheduledCount: number;
};

type TeamScores = {
  teamScore: number;
  opponentScore: number;
  teamPenaltyScore?: number | null;
  opponentPenaltyScore?: number | null;
};

type FormItem = {
  key: string;
  stageLabel: string;
  opponentName: string;
  opponentLogo: string | null;
  dateLabel: string;
  score: TeamScores;
  outcome: TeamOutcome;
  href?: string;
};

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: teamData },
    { data: teamsData },
    { data: matchesData },
    { data: playersData, error: playersError },
    { data: recentMatchesData, error: recentMatchesError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at, coach_name, coach_bzzoiro_id, coach_photo_url, coach_updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at, coach_name, coach_bzzoiro_id, coach_photo_url, coach_updated_at")
      .order("group_letter")
      .order("name_he", { ascending: true }),
    supabase
      .from("matches")
      .select(`
        match_number,
        stage,
        status,
        match_phase,
        date_time,
        minute,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        home_score,
        away_score,
        is_extra_time,
        home_penalty_score,
        away_penalty_score
      `)
      .order("date_time", { ascending: true }),
    supabase
      .from("players")
      .select("id, name, position, top_scorer_odds, goals, assists, appearances, minutes_played, yellow_cards, red_cards")
      .eq("team_id", id)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("team_recent_matches")
      .select("id, team_id, opponent_name, opponent_logo_url, played_at, competition, team_score, opponent_score, result")
      .eq("team_id", id)
      .order("played_at", { ascending: false })
      .limit(5),
  ]);

  if (!teamData) notFound();

  if (playersError) {
    console.error("[TeamPage] players error:", playersError);
  }

  if (recentMatchesError) {
    console.error("[TeamPage] recent matches error:", recentMatchesError);
  }

  const team = teamData as TournamentTeamRecord;
  const teams = (teamsData ?? []) as TournamentTeamRecord[];
  const players = ((playersData ?? []) as TeamPlayer[]).filter((player) => player.name);
  const recentMatches = ((recentMatchesData ?? []) as TeamRecentMatch[]).filter(
    (match) => match.opponent_name,
  );
  const allMatches = attachTeamsToMatches(
    (matchesData ?? []) as TournamentMatchRecord[],
    teams,
  ) as TeamMatch[];
  const teamMatches = allMatches
    .filter((match) => match.home_team_id === id || match.away_team_id === id)
    .sort((left, right) => left.date_time.localeCompare(right.date_time));
  const groupMatches = getGroupMatches(allMatches);
  const tournamentTeams = buildTournamentTeams(
    teams as TournamentTeamStateRow[],
    groupMatches,
  );
  const tournament = buildTournamentStandings(tournamentTeams, groupMatches);
  const groupStandings = team.group_letter
    ? tournament.groupStandings[team.group_letter] ?? []
    : [];
  const standing = groupStandings.find((entry) => entry.team.id === id) ?? null;
  const stats = buildTeamStats(teamMatches, id);
  const teamEliminated = isTeamEliminated(team, standing);
  const status = getTeamStatus(team, standing, teamMatches);
  const nextMatch =
    teamMatches.find((match) => match.status === "live") ??
    (teamEliminated ? null : teamMatches.find((match) => match.status === "scheduled") ?? null);
  const finishedMatches = teamMatches.filter(
    (match) => match.status === "finished" && isMatchScoreVisible(match),
  );
  const formItems = buildFormItems(finishedMatches, recentMatches, id).slice(0, 5);
  const displayName = team.name_he ?? team.name;
  const previewPlayers = getSquadPreviewPlayers(players).slice(0, 8);
  const topPlayers = getTopPlayers(players).slice(0, 6);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/tournament"
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לטורניר
        </Link>
        <Link
          href="/dashboard/teams"
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          כל הנבחרות
        </Link>
        <Link
          href="/dashboard/stats"
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          טבלאות וסטט׳
        </Link>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(111,60,255,0.26),rgba(255,47,166,0.12)_48%,rgba(8,14,29,0.94))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_20rem] lg:items-center">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <TeamFlag team={team} size="hero" />
            <div className="min-w-0">
              <p className="wc-kicker">פרופיל נבחרת</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
                משחקים, סטטוס העפלה, סגל, כושר אחרון וסטטיסטיקות במקום אחד.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {team.group_letter ? <span className="wc-badge">בית {team.group_letter}</span> : null}
                {standing ? <span className="wc-badge">מקום {standing.rank} בבית</span> : null}
                <span className={`rounded-full px-3 py-1 ${status.className}`}>{status.label}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">
                יחס זכייה
              </p>
              <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-neon">
                {formatOdds(team.outright_odds)}
              </p>
              <p className="mt-1 text-xs leading-5 text-wc-fg3">
                {team.outright_odds_updated_at
                  ? `עודכן ${formatShortDateTime(team.outright_odds_updated_at)}`
                  : "יתעדכן מסנכרון ה-API"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/dashboard/teams/${encodeURIComponent(id)}/squad`}
                className="rounded-[1.05rem] border border-white/10 bg-white/8 px-3 py-3 text-center text-sm font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                סגל ומאמן
              </Link>
              <Link
                href={`/dashboard/teams/${encodeURIComponent(id)}/stats`}
                className="rounded-[1.05rem] border border-white/10 bg-white/8 px-3 py-3 text-center text-sm font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                סטט׳ שחקנים
              </Link>
              <Link
                href={`/dashboard/teams/${encodeURIComponent(id)}/team-stats`}
                className="rounded-[1.05rem] border border-white/10 bg-white/8 px-3 py-3 text-center text-sm font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                סטט׳ קבוצתית
              </Link>
              <Link
                href="/dashboard/stats"
                className="rounded-[1.05rem] border border-white/10 bg-white/8 px-3 py-3 text-center text-sm font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                טבלאות
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/10 px-5 py-3 md:px-7">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-bold text-wc-fg1">{status.description}</p>
              <p className="mt-1 text-xs leading-6 text-wc-fg3">
                הטבלה, הסטטוס והמסלול מתעדכנים לפי מצב המשחקים בטורניר.
              </p>
            </div>
            <FormDots items={formItems} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoStat label="משחקים ששוחקו" value={String(stats.played)} sub={`${stats.scheduledCount} משחקים עתידיים`} />
        <InfoStat
          label="מאזן שערים"
          valueNode={<GoalBalance goalsFor={stats.goalsFor} goalsAgainst={stats.goalsAgainst} />}
          sub="כבשה, ספגה והפרש שערים"
        />
        <InfoStat label="רשת נקייה" value={String(stats.cleanSheets)} sub="במשחקים שהסתיימו" />
        <InfoStat label="דירוג פיפ״א" value={String(team.fifa_ranking ?? "-")} sub="דירוג עולמי נוכחי" />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader
            title="משחקי הנבחרת"
            eyebrow={`${teamMatches.length} משחקים ידועים`}
            actionHref="/dashboard/matches"
            actionLabel="כל המשחקים"
          />

          <div className="mt-4 grid gap-3">
            {teamMatches.map((match) => (
              <TeamMatchCard key={match.match_number} match={match} teamId={id} />
            ))}
          </div>
        </section>

        <div className="grid content-start gap-5">
          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
            <SectionHeader title="המשחק הבא" eyebrow={nextMatch ? `Match #${nextMatch.match_number}` : "מסלול נבחרת"} />
            {nextMatch ? (
              <NextMatchCard match={nextMatch} teamId={id} />
            ) : (
              <EmptyPanel
                title={teamEliminated ? "המסע בטורניר הסתיים" : "אין משחק עתידי ידוע"}
                description={
                  teamEliminated
                    ? "אין כרגע משחק הבא במסלול של הנבחרת הזו."
                    : "אם הנבחרת תתקדם לשלב הבא, המשחק הבא יופיע כאן אחרי סנכרון."
                }
              />
            )}
          </section>

          {groupStandings.length > 0 ? (
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
              <SectionHeader title={`בית ${team.group_letter}`} eyebrow="טבלת שלב הבתים" />
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.025] text-wc-fg3">
                      <th className="px-3 py-2 text-start">#</th>
                      <th className="px-3 py-2 text-start">נבחרת</th>
                      <th className="px-3 py-2 text-center">מאזן</th>
                      <th className="px-3 py-2 text-center">שערים</th>
                      <th className="px-3 py-2 text-center">נק׳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStandings.map((entry) => (
                      <GroupMiniRow key={entry.team.id} entry={entry} activeTeamId={id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
            <SectionHeader
              title="סגל ומאמן"
              eyebrow={team.coach_name ? "מעודכן מה-API" : "בהכנה לסנכרון API"}
              actionHref={`/dashboard/teams/${encodeURIComponent(id)}/squad`}
              actionLabel="לעמוד הסגל"
            />
            <CoachCard team={team} />
            <SquadPreview players={previewPlayers} total={players.length} />
          </section>
        </div>
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader
          title="מובילי הנבחרת"
          eyebrow="שערים, בישולים וכרטיסים"
          actionHref={`/dashboard/teams/${encodeURIComponent(id)}/stats`}
          actionLabel="כל הסטטיסטיקות"
        />
        {topPlayers.length > 0 ? (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/[0.025] text-wc-fg3">
                  <th className="px-3 py-2 text-start">שחקן</th>
                  <th className="px-3 py-2 text-center">שערים</th>
                  <th className="px-3 py-2 text-center">בישולים</th>
                  <th className="px-3 py-2 text-center">יחס</th>
                  <th className="px-3 py-2 text-center">צהובים</th>
                  <th className="px-3 py-2 text-center">אדומים</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((player) => (
                  <PlayerStatsRow key={player.id} player={player} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel
            title="אין עדיין סטטיסטיקות שחקנים"
            description="כאשר נתוני השחקנים יסתנכרנו מה-API, המובילים יופיעו כאן."
          />
        )}
      </section>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="חמשת המשחקים האחרונים" eyebrow="כושר אחרון לפני ובמהלך הטורניר" />
        {formItems.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {formItems.map((item) => (
              <RecentMatchCard key={item.key} item={item} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="אין עדיין משחקים אחרונים"
            description="משחקי ההכנה שלפני הטורניר יופיעו כאן אחרי סנכרון ה-API."
          />
        )}
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  eyebrow,
  actionHref,
  actionLabel,
}: {
  title: string;
  eyebrow?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="wc-kicker text-[0.68rem]">{eyebrow}</p> : null}
        <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function TeamFlag({
  team,
  size = "default",
}: {
  team: Pick<TournamentTeamRecord, "name" | "name_he" | "logo_url">;
  size?: "default" | "hero";
}) {
  const displayName = team.name_he ?? team.name;
  const className =
    size === "hero"
      ? "grid h-24 w-28 place-items-center rounded-[1.4rem] border border-white/15 bg-black/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      : "grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/8";
  const imageSize = size === "hero" ? { width: 82, height: 56 } : { width: 30, height: 20 };

  return (
    <div className={className}>
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={imageSize.width}
          height={imageSize.height}
          style={{ width: imageSize.width, height: imageSize.height }}
          className="rounded-md object-cover"
          unoptimized
        />
      ) : (
        <span className="text-xl font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
    </div>
  );
}

function InfoStat({
  label,
  value,
  valueNode,
  sub,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
  sub: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-fg1">{valueNode ?? value}</p>
      <p className="mt-1 text-xs text-wc-fg3">{sub}</p>
    </div>
  );
}

function GoalBalance({ goalsFor, goalsAgainst }: { goalsFor: number; goalsAgainst: number }) {
  const difference = goalsFor - goalsAgainst;

  return (
    <span className="grid gap-2">
      <span className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] text-center text-xs">
        <span className="border-e border-white/10 px-2 py-1.5">
          <b className="block font-sans text-lg font-black tracking-normal text-wc-neon" dir="ltr">{goalsFor}</b>
          <span className="block truncate font-bold text-wc-fg3">כבשה</span>
        </span>
        <span className="border-e border-white/10 px-2 py-1.5">
          <b className="block font-sans text-lg font-black tracking-normal text-wc-danger" dir="ltr">{goalsAgainst}</b>
          <span className="block truncate font-bold text-wc-fg3">ספגה</span>
        </span>
        <span className="px-2 py-1.5">
          <b className={`block font-sans text-lg font-black tracking-normal ${difference >= 0 ? "text-wc-neon" : "text-wc-danger"}`} dir="ltr">
            {difference > 0 ? `+${difference}` : difference}
          </b>
          <span className="block truncate font-bold text-wc-fg3">הפרש</span>
        </span>
      </span>
    </span>
  );
}

function CompactGoalBalance({ goalsFor, goalsAgainst }: { goalsFor: number; goalsAgainst: number }) {
  return (
    <span className="inline-flex items-center justify-center gap-1.5 text-[11px]">
      <span className="rounded-full bg-[rgba(95,255,123,0.1)] px-2 py-1 font-bold text-wc-neon">
        כבשה <b className="tabular-nums" dir="ltr">{goalsFor}</b>
      </span>
      <span className="rounded-full bg-[rgba(255,92,130,0.1)] px-2 py-1 font-bold text-wc-danger">
        ספגה <b className="tabular-nums" dir="ltr">{goalsAgainst}</b>
      </span>
    </span>
  );
}

function TeamMatchCard({ match, teamId }: { match: TeamMatch; teamId: string }) {
  const isHome = match.home_team_id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentName = getTeamDisplayName(
    opponent,
    isHome ? match.away_placeholder : match.home_placeholder,
  );
  const opponentLogo = getTeamDisplayLogo(opponent);
  const outcome = getTeamOutcome(match, teamId);
  const scores = getTeamScores(match, teamId);

  return (
    <article className="group relative overflow-hidden rounded-[1.3rem] border border-white/10 bg-black/15 p-4 transition hover:border-wc-neon/30 hover:bg-white/[0.055]">
      <Link
        href={`/dashboard/matches/${match.match_number}`}
        className="absolute inset-0 z-0"
        aria-label={`פתח משחק ${match.match_number}`}
      />
      <div className="pointer-events-none relative z-10">
        <div className="flex items-center justify-between gap-3 text-xs text-wc-fg3">
          <span className="font-semibold">{getStageLabelHe(match.stage)}</span>
          <span className="font-mono text-[10px]">Match #{match.match_number}</span>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-wc-fg3">{isHome ? "בית" : "חוץ"}</p>
            {opponent ? (
              <TeamLink
                team={opponent}
                className="pointer-events-auto mt-1 inline-flex min-w-0 items-center gap-2 text-sm font-black text-wc-fg1 transition hover:text-wc-neon"
              >
                <SmallFlag logoUrl={opponentLogo} name={opponentName} />
                <span className="truncate">{opponentName}</span>
              </TeamLink>
            ) : (
              <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-black text-wc-fg1">
                <SmallFlag logoUrl={null} name={opponentName} />
                <span className="truncate">{opponentName}</span>
              </div>
            )}
          </div>

          <div className="text-end">
            {scores ? (
              <TeamScoreLine scores={scores} className="font-sans text-2xl font-black tracking-normal text-wc-fg1" />
            ) : (
              <p className="font-sans text-2xl font-black tracking-normal text-wc-fg3">VS</p>
            )}
            <p className={`mt-1 text-xs font-bold ${outcome.className}`}>{outcome.label}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-wc-fg3">
          <span>{formatMatchDateLabel(match.date_time)} · {formatMatchTimeLabel(match.date_time)} IDT</span>
          <span className="text-wc-fg2 transition group-hover:text-wc-neon">לעמוד המשחק</span>
        </div>
      </div>
    </article>
  );
}

function NextMatchCard({ match, teamId }: { match: TeamMatch; teamId: string }) {
  const isHome = match.home_team_id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentName = getTeamDisplayName(
    opponent,
    isHome ? match.away_placeholder : match.home_placeholder,
  );
  const opponentLogo = getTeamDisplayLogo(opponent);
  const isLive = match.status === "live";

  return (
    <article className="group relative mt-4 overflow-hidden rounded-[1.35rem] border border-[rgba(95,255,123,0.18)] bg-[linear-gradient(135deg,rgba(95,255,123,0.08),rgba(255,255,255,0.035))] p-4">
      <Link
        href={`/dashboard/matches/${match.match_number}`}
        className="absolute inset-0 z-0"
        aria-label={`פתח משחק ${match.match_number}`}
      />
      <div className="pointer-events-none relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-wc-neon">{getStageLabelHe(match.stage)}</p>
            <div className="mt-3 flex min-w-0 items-center gap-2">
              <span className="text-sm font-semibold text-wc-fg3">נגד</span>
              {opponent ? (
                <TeamLink
                  team={opponent}
                  className="pointer-events-auto inline-flex min-w-0 items-center gap-2 text-lg font-black text-wc-fg1 transition hover:text-wc-neon"
                >
                  <SmallFlag logoUrl={opponentLogo} name={opponentName} />
                  <span className="truncate">{opponentName}</span>
                </TeamLink>
              ) : (
                <span className="truncate text-lg font-black text-wc-fg1">{opponentName}</span>
              )}
            </div>
            <p className="mt-2 text-xs text-wc-fg3">
              {formatMatchDateLabel(match.date_time)} · {formatMatchTimeLabel(match.date_time)} IDT
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isLive ? "bg-cyan-400/14 text-cyan-300" : "bg-white/8 text-wc-fg2"}`}>
            {isLive ? getLiveMatchStatusLabel(match.minute, match.match_phase) : `משחק #${match.match_number}`}
          </span>
        </div>
      </div>
    </article>
  );
}

function GroupMiniRow({ entry, activeTeamId }: { entry: TeamStanding; activeTeamId: string }) {
  const isActive = entry.team.id === activeTeamId;
  const standingDisplay = getStandingDisplay(entry);

  return (
    <tr className={`border-b border-white/6 last:border-0 ${isActive ? "bg-[rgba(95,255,123,0.08)]" : ""}`}>
      <td className="px-3 py-2 font-bold text-wc-fg2">{entry.rank}</td>
      <td className="px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLink team={entry.team} className="flex min-w-0 items-center gap-2 font-bold text-wc-fg1 transition hover:text-wc-neon">
            <SmallFlag logoUrl={entry.team.logo_url} name={entry.team.name_he ?? entry.team.name} />
            <span className="truncate">{entry.team.name_he ?? entry.team.name}</span>
          </TeamLink>
          {standingDisplay ? (
            <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-black sm:inline-flex ${standingDisplay.className}`}>
              {standingDisplay.label}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2 text-center text-wc-fg2" dir="ltr">
        {entry.won}-{entry.drawn}-{entry.lost}
      </td>
      <td className="px-3 py-2 text-center text-wc-fg2">
        <CompactGoalBalance goalsFor={entry.gf} goalsAgainst={entry.ga} />
      </td>
      <td className="px-3 py-2 text-center font-black text-wc-fg1">{entry.pts}</td>
    </tr>
  );
}

function CoachCard({ team }: { team: Pick<TournamentTeamRecord, "id" | "name" | "name_he" | "coach_name" | "coach_photo_url"> }) {
  const coachName = team.coach_name ?? "טרם סונכרן";

  return (
    <CoachLink
      team={team}
      className="mt-4 block rounded-2xl border border-white/10 bg-black/14 p-4 transition hover:border-wc-neon/35 hover:bg-white/[0.055]"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">מאמן ראשי</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="truncate text-lg font-black text-wc-fg1">{coachName}</p>
        {team.coach_photo_url ? (
          <Image
            src={team.coach_photo_url}
            alt={coachName}
            width={42}
            height={42}
            style={{ width: 42, height: 42 }}
            className="h-10 w-10 shrink-0 rounded-xl object-cover"
            unoptimized
          />
        ) : null}
      </div>
      <p className="mt-1 text-xs leading-6 text-wc-fg3">
        לחיצה פותחת פרופיל מאמן עם מערך, סגנון וסטטיסטיקות BSD.
      </p>
    </CoachLink>
  );
}

function SquadPreview({ players, total }: { players: TeamPlayer[]; total: number }) {
  if (players.length === 0) {
    return (
      <EmptyPanel
        title="הסגל עדיין לא סונכרן"
        description="כאשר ה-API יחזיר את רשימת השחקנים, הם יוצגו כאן ובעמוד הסגל המלא."
      />
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {players.map((player) => (
        <PlayerLink
          key={player.id}
          player={player}
          className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 transition hover:bg-white/[0.085] hover:text-wc-neon"
        >
          <span className="truncate text-sm font-bold text-wc-fg1">{player.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <span className="rounded-full bg-[rgba(95,255,123,0.1)] px-2 py-0.5 text-[10px] font-black text-wc-neon" dir="ltr">
              {formatOdds(player.top_scorer_odds)}
            </span>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-wc-fg3">
              {getPositionLabel(player.position)}
            </span>
          </span>
        </PlayerLink>
      ))}
      {total > players.length ? (
        <p className="pt-1 text-xs text-wc-fg3">ועוד {total - players.length} שחקנים בעמוד הסגל.</p>
      ) : null}
    </div>
  );
}

function PlayerStatsRow({ player }: { player: TeamPlayer }) {
  return (
    <tr className="border-b border-white/6 last:border-0">
      <td className="px-3 py-2">
        <PlayerLink player={player} className="font-bold text-wc-fg1 transition hover:text-wc-neon">
          {player.name}
        </PlayerLink>
        <p className="text-[11px] text-wc-fg3">{getPositionLabel(player.position)}</p>
      </td>
      <td className="px-3 py-2 text-center font-black text-wc-fg1">{player.goals ?? 0}</td>
      <td className="px-3 py-2 text-center text-wc-fg2">{player.assists ?? 0}</td>
      <td className="px-3 py-2 text-center font-black text-wc-neon" dir="ltr">{formatOdds(player.top_scorer_odds)}</td>
      <td className="px-3 py-2 text-center text-wc-amber">{player.yellow_cards ?? 0}</td>
      <td className="px-3 py-2 text-center text-wc-danger">{player.red_cards ?? 0}</td>
    </tr>
  );
}

function RecentMatchCard({ item }: { item: FormItem }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-black ${item.outcome.chipClassName}`}>{item.outcome.short}</span>
        <span className="text-[10px] font-bold text-wc-fg3">{item.stageLabel}</span>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <SmallFlag logoUrl={item.opponentLogo} name={item.opponentName} />
        <span className="truncate text-sm font-black text-wc-fg1">{item.opponentName}</span>
      </div>
      <TeamScoreLine scores={item.score} className="mt-3 font-sans text-2xl font-black tracking-normal text-wc-fg1" />
      <p className={`mt-1 text-xs font-bold ${item.outcome.className}`}>{item.outcome.label}</p>
      <p className="mt-2 text-[11px] text-wc-fg3">{item.dateLabel}</p>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="rounded-[1.2rem] border border-white/10 bg-black/15 p-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055]">
        {content}
      </Link>
    );
  }

  return <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-3">{content}</div>;
}

function FormDots({ items }: { items: FormItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-start gap-2 md:justify-end">
        <span className="text-xs font-semibold text-wc-fg3">אין משחקים אחרונים</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-start gap-2 md:justify-end">
      <span className="text-xs font-semibold text-wc-fg3">כושר אחרון</span>
      {items.map((item) => (
        <span
          key={item.key}
          className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${item.outcome.chipClassName}`}
          title={item.opponentName}
        >
          {item.outcome.short}
        </span>
      ))}
    </div>
  );
}

function TeamScoreLine({ scores, className }: { scores: TeamScores; className?: string }) {
  return (
    <span dir="rtl" className={`inline-flex flex-row items-center justify-end gap-1 ${className ?? ""}`}>
      <span>{scores.teamScore}</span>
      <span className="text-wc-fg3">-</span>
      <span>{scores.opponentScore}</span>
      {scores.teamPenaltyScore !== null &&
      scores.teamPenaltyScore !== undefined &&
      scores.opponentPenaltyScore !== null &&
      scores.opponentPenaltyScore !== undefined ? (
        <span className="ms-1 text-xs text-wc-fg3" dir="rtl">
          ({scores.teamPenaltyScore}-{scores.opponentPenaltyScore})
        </span>
      ) : null}
    </span>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm font-black text-wc-fg1">{title}</p>
      <p className="mt-1 text-xs leading-6 text-wc-fg3">{description}</p>
    </div>
  );
}

function SmallFlag({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  return (
    <span className="grid h-5 w-7 shrink-0 place-items-center overflow-hidden rounded bg-white/10">
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={name}
          width={28}
          height={20}
          style={{ width: 28, height: 20 }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-black text-wc-fg2">{name.slice(0, 1)}</span>
      )}
    </span>
  );
}

function buildTeamStats(matches: TeamMatch[], teamId: string): TeamStats {
  const initial: TeamStats = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    cleanSheets: 0,
    liveCount: matches.filter((match) => match.status === "live").length,
    scheduledCount: matches.filter((match) => match.status === "scheduled").length,
  };

  const stats = matches.reduce((current, match) => {
    if (match.status !== "finished" || !isMatchScoreVisible(match)) {
      return current;
    }

    const scores = getTeamScores(match, teamId);
    const outcome = getTeamOutcome(match, teamId);
    if (!scores || !outcome.result) return current;

    current.played += 1;
    current.goalsFor += scores.teamScore;
    current.goalsAgainst += scores.opponentScore;
    current.goalDifference = current.goalsFor - current.goalsAgainst;
    if (scores.opponentScore === 0) current.cleanSheets += 1;
    if (outcome.result === "win") current.wins += 1;
    if (outcome.result === "draw") current.draws += 1;
    if (outcome.result === "loss") current.losses += 1;

    return current;
  }, initial);

  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  return stats;
}

function buildFormItems(
  finishedMatches: TeamMatch[],
  recentMatches: TeamRecentMatch[],
  teamId: string,
): FormItem[] {
  const tournamentItems: FormItem[] = finishedMatches
    .slice()
    .reverse()
    .map((match) => {
      const isHome = match.home_team_id === teamId;
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      const opponentName = getTeamDisplayName(
        opponent,
        isHome ? match.away_placeholder : match.home_placeholder,
      );

      return {
        key: `match-${match.match_number}`,
        stageLabel: getStageLabelHe(match.stage),
        opponentName,
        opponentLogo: getTeamDisplayLogo(opponent),
        dateLabel: `${formatMatchDateLabel(match.date_time)} · ${formatMatchTimeLabel(match.date_time)}`,
        score: getTeamScores(match, teamId) ?? { teamScore: 0, opponentScore: 0 },
        outcome: getTeamOutcome(match, teamId),
        href: `/dashboard/matches/${match.match_number}`,
      };
    });

  const preTournamentItems: FormItem[] = recentMatches.map((match) => {
    const outcome = getRecentOutcome(match.result);

    return {
      key: `recent-${match.id}`,
      stageLabel: translateCompetitionLabel(match.competition),
      opponentName: translateTeamNameToHebrew(match.opponent_name),
      opponentLogo: match.opponent_logo_url,
      dateLabel: formatShortDateTime(match.played_at),
      score: {
        teamScore: match.team_score,
        opponentScore: match.opponent_score,
      },
      outcome,
    };
  });

  return [...tournamentItems, ...preTournamentItems];
}

function getTeamScores(match: TeamMatch, teamId: string): TeamScores | null {
  if (!isMatchScoreVisible(match)) return null;

  const summary = getMatchScoreSummary(match);
  if (!summary) return null;

  const isHome = match.home_team_id === teamId;

  return {
    teamScore: isHome ? summary.homeScore : summary.awayScore,
    opponentScore: isHome ? summary.awayScore : summary.homeScore,
    teamPenaltyScore: isHome ? match.home_penalty_score : match.away_penalty_score,
    opponentPenaltyScore: isHome ? match.away_penalty_score : match.home_penalty_score,
  };
}

function getTeamOutcome(match: TeamMatch, teamId: string): TeamOutcome {
  const scores = getTeamScores(match, teamId);

  if (match.status === "scheduled" || !scores) {
    return {
      label: "טרם התחיל",
      short: "-",
      result: null,
      className: "text-wc-fg3",
      chipClassName: "bg-white/8 text-wc-fg3",
    };
  }

  if (match.status === "live") {
    if (scores.teamScore > scores.opponentScore) {
      return liveOutcome("מובילה בלייב", "win", "text-wc-neon", "bg-[rgba(95,255,123,0.14)] text-wc-neon");
    }
    if (scores.teamScore < scores.opponentScore) {
      return liveOutcome("בפיגור בלייב", "loss", "text-wc-danger", "bg-[rgba(255,92,130,0.14)] text-wc-danger");
    }
    return liveOutcome("שוויון בלייב", "draw", "text-wc-amber", "bg-[rgba(255,182,73,0.14)] text-wc-amber");
  }

  if (
    scores.teamScore === scores.opponentScore &&
    scores.teamPenaltyScore !== null &&
    scores.teamPenaltyScore !== undefined &&
    scores.opponentPenaltyScore !== null &&
    scores.opponentPenaltyScore !== undefined &&
    scores.teamPenaltyScore !== scores.opponentPenaltyScore
  ) {
    if (scores.teamPenaltyScore > scores.opponentPenaltyScore) {
      return resultOutcome("ניצחון בפנדלים", "W", "win", "text-wc-neon", "bg-[rgba(95,255,123,0.14)] text-wc-neon");
    }
    return resultOutcome("הפסד בפנדלים", "L", "loss", "text-wc-danger", "bg-[rgba(255,92,130,0.14)] text-wc-danger");
  }

  if (scores.teamScore > scores.opponentScore) {
    return resultOutcome("ניצחון", "W", "win", "text-wc-neon", "bg-[rgba(95,255,123,0.14)] text-wc-neon");
  }
  if (scores.teamScore < scores.opponentScore) {
    return resultOutcome("הפסד", "L", "loss", "text-wc-danger", "bg-[rgba(255,92,130,0.14)] text-wc-danger");
  }
  return resultOutcome("תיקו", "D", "draw", "text-wc-amber", "bg-[rgba(255,182,73,0.14)] text-wc-amber");
}

function getRecentOutcome(result: "win" | "draw" | "loss") {
  if (result === "win") {
    return resultOutcome("ניצחון", "W", "win", "text-wc-neon", "bg-[rgba(95,255,123,0.14)] text-wc-neon");
  }
  if (result === "loss") {
    return resultOutcome("הפסד", "L", "loss", "text-wc-danger", "bg-[rgba(255,92,130,0.14)] text-wc-danger");
  }
  return resultOutcome("תיקו", "D", "draw", "text-wc-amber", "bg-[rgba(255,182,73,0.14)] text-wc-amber");
}

function translateCompetitionLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized.includes("friendly") || normalized.includes("friendlies")) {
    return "משחק הכנה";
  }
  if (normalized.includes("world cup") && normalized.includes("qual")) {
    return "מוקדמות המונדיאל";
  }
  if (normalized.includes("world cup")) {
    return "מונדיאל";
  }
  if (normalized.includes("nations league")) {
    return "ליגת האומות";
  }
  if (normalized.includes("euro")) {
    return "יורו";
  }
  if (normalized.includes("africa cup")) {
    return "אליפות אפריקה";
  }
  return value ?? "משחק הכנה";
}

function liveOutcome(
  label: string,
  result: "win" | "draw" | "loss",
  className: string,
  chipClassName: string,
): TeamOutcome {
  return {
    label,
    short: result === "win" ? "W" : result === "loss" ? "L" : "D",
    result,
    className,
    chipClassName,
  };
}

function resultOutcome(
  label: string,
  short: "W" | "D" | "L",
  result: "win" | "draw" | "loss",
  className: string,
  chipClassName: string,
): TeamOutcome {
  return { label, short, result, className, chipClassName };
}

function isTeamEliminated(team: TournamentTeamRecord, standing: TeamStanding | null) {
  return team.is_eliminated === true || standing?.status === "eliminated";
}

function getTeamStatus(team: TournamentTeamRecord, standing: TeamStanding | null, matches: TeamMatch[]) {
  const finalStatus = getFinalTournamentStatus(matches, team, standing);
  if (finalStatus) return finalStatus;

  if (standing?.status === "qualified") {
    return {
      label: "הבטיחה העפלה",
      description: "הנבחרת כבר הבטיחה מקום בשלב הבא, גם אם המיקום הסופי עדיין יכול להשתנות.",
      className: "bg-[rgba(95,255,123,0.14)] text-wc-neon",
    };
  }

  return {
    label: "עדיין פתוח",
    description: "הנבחרת עדיין בתמונת ההעפלה והמסלול שלה פתוח.",
    className: "bg-white/8 text-wc-fg3",
  };
}

function getFinalTournamentStatus(matches: TeamMatch[], team: TournamentTeamRecord, standing: TeamStanding | null) {
  const teamId = team.id;
  const finished = matches
    .filter((match) => match.status === "finished" && isMatchScoreVisible(match))
    .slice()
    .sort((left, right) => new Date(right.date_time).getTime() - new Date(left.date_time).getTime());
  const lastMatch = finished[0] ?? null;

  if (!lastMatch || !isTeamEliminated(team, standing)) {
    return null;
  }

  const outcome = getTeamOutcome(lastMatch, teamId);
  const stageKind = getMatchStageKind(lastMatch.stage);
  const stageLabel = getStageLabelHe(lastMatch.stage);
  const groupFinish = standing ? ` בבית ${standing.team.group_letter ?? ""} סיימה מקום ${standing.rank}.` : "";

  if (stageKind === "final") {
    return {
      label: outcome.result === "win" ? "אלופה" : "סגנית",
      description: outcome.result === "win" ? "הנבחרת זכתה בטורניר." : "הנבחרת סיימה את הטורניר במקום השני.",
      className: outcome.result === "win" ? "bg-[rgba(95,255,123,0.14)] text-wc-neon" : "bg-[rgba(125,211,252,0.16)] text-cyan-300",
    };
  }

  if (stageKind === "third_place") {
    return {
      label: outcome.result === "win" ? "מקום 3" : "מקום 4",
      description: outcome.result === "win" ? "הנבחרת סיימה במקום השלישי." : "הנבחרת סיימה במקום הרביעי.",
      className: outcome.result === "win" ? "bg-[rgba(255,182,73,0.16)] text-wc-amber" : "bg-white/8 text-wc-fg2",
    };
  }

  return {
    label: stageKind === "group" ? "סיימה בבתים" : `סיימה ב${stageLabel}`,
    description: stageKind === "group"
      ? `הנבחרת סיימה את דרכה בשלב הבתים.${groupFinish}`
      : `הנבחרת סיימה את דרכה ב${stageLabel}.${groupFinish}`,
    className: "bg-[rgba(255,92,130,0.14)] text-wc-danger",
  };
}

function getStandingDisplay(entry: TeamStanding) {
  if (entry.lockedRank !== null) {
    return {
      label: `מקום ${entry.lockedRank}`,
      className:
        entry.lockedRank <= 2
          ? "bg-[rgba(95,255,123,0.14)] text-wc-neon"
          : entry.lockedRank >= 4
            ? "bg-[rgba(255,92,130,0.14)] text-wc-danger"
            : "bg-white/8 text-wc-fg3",
    };
  }

  if (entry.status === "qualified") {
    return { label: "העפילה", className: "bg-[rgba(95,255,123,0.14)] text-wc-neon" };
  }

  if (entry.status === "eliminated") {
    return { label: "הודחה", className: "bg-[rgba(255,92,130,0.14)] text-wc-danger" };
  }

  return null;
}

function getTopPlayers(players: TeamPlayer[]) {
  return players
    .slice()
    .sort((left, right) => {
      const leftContribution = getGoalContribution(left);
      const rightContribution = getGoalContribution(right);
      if (leftContribution > 0 || rightContribution > 0) {
        const contributionScore =
          rightContribution - leftContribution ||
          (right.goals ?? 0) - (left.goals ?? 0) ||
          (right.assists ?? 0) - (left.assists ?? 0) ||
          comparePlayerOdds(left, right);
        if (contributionScore !== 0) return contributionScore;
      }

      const score =
        comparePlayerOdds(left, right) ||
        (right.yellow_cards ?? 0) - (left.yellow_cards ?? 0) ||
        (right.red_cards ?? 0) - (left.red_cards ?? 0);
      if (score !== 0) return score;
      return left.name.localeCompare(right.name, "he");
    });
}

function getGoalContribution(player: TeamPlayer) {
  return (player.goals ?? 0) + (player.assists ?? 0);
}

function getSquadPreviewPlayers(players: TeamPlayer[]) {
  return players.slice().sort((left, right) => {
    return (
      comparePlayerOdds(left, right) ||
      (right.goals ?? 0) - (left.goals ?? 0) ||
      (right.assists ?? 0) - (left.assists ?? 0) ||
      (right.appearances ?? 0) - (left.appearances ?? 0) ||
      left.name.localeCompare(right.name, "he")
    );
  });
}

function comparePlayerOdds(left: TeamPlayer, right: TeamPlayer) {
  const leftOdds = Number(left.top_scorer_odds);
  const rightOdds = Number(right.top_scorer_odds);
  if (Number.isFinite(leftOdds) && Number.isFinite(rightOdds)) return leftOdds - rightOdds;
  if (Number.isFinite(leftOdds)) return -1;
  if (Number.isFinite(rightOdds)) return 1;
  return 0;
}

function getPositionLabel(position: string | null) {
  if (!position) return "שחקן";
  const normalized = position.trim().toLowerCase();
  if (normalized === "g") return "שוער";
  if (normalized === "d") return "הגנה";
  if (normalized === "m") return "קישור";
  if (normalized === "f") return "התקפה";
  if (normalized.includes("goal")) return "שוער";
  if (normalized.includes("def")) return "הגנה";
  if (normalized.includes("mid")) return "קישור";
  if (normalized.includes("att") || normalized.includes("for")) return "התקפה";
  return position;
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(2);
}

function formatShortDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

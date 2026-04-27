import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GoalsForAgainst, SignedNumber } from "@/components/StatNumbers";
import CompactLeaderTable, {
  type CompactLeaderRow,
  type CompactLeaderTeam,
} from "@/components/stats/CompactLeaderTable";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  getMatchScoreSummary,
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
import { buildTournamentStandings } from "@/lib/utils/standings";

export const dynamic = "force-dynamic";

type TeamMatch = MatchWithTeams;

type TeamPlayer = {
  id: number | string;
  name: string;
  team_id?: string | null;
  position: string | null;
  photo_url?: string | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  top_scorer_odds?: number | string | null;
  top_scorer_odds_updated_at?: string | null;
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
  failedToScore: number;
  liveCount: number;
  scheduledCount: number;
};

void _StatsTable;

export default async function TeamStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: teamData },
    { data: teamsData },
    { data: matchesData },
    { data: playersData, error: playersError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at, coach_name")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated")
      .order("group_letter"),
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
      .select("id, name, team_id, position, photo_url, goals, assists, appearances, minutes_played, yellow_cards, red_cards, top_scorer_odds, top_scorer_odds_updated_at")
      .eq("team_id", id)
      .order("goals", { ascending: false })
      .order("assists", { ascending: false }),
  ]);

  if (!teamData) notFound();

  if (playersError) {
    console.error("[TeamStatsPage] players error:", playersError);
  }

  const team = teamData as TournamentTeamRecord;
  const teams = (teamsData ?? []) as TournamentTeamRecord[];
  const players = ((playersData ?? []) as TeamPlayer[]).filter((player) => player.name);
  const allMatches = attachTeamsToMatches(
    (matchesData ?? []) as TournamentMatchRecord[],
    teams,
  ) as TeamMatch[];
  const teamMatches = allMatches.filter((match) => match.home_team_id === id || match.away_team_id === id);
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
  const displayName = team.name_he ?? team.name;
  const totals = buildPlayerTotals(players);
  const leaders = players.slice().sort(compareAttackers).slice(0, 12);
  const discipline = players.slice().sort(compareCards).slice(0, 12);
  const attackRows = buildTeamPlayerRows(leaders, team, "attack");
  const disciplineRows = buildTeamPlayerRows(discipline, team, "discipline");

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לנבחרת
        </Link>
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}/squad`}
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          סגל ומאמן
        </Link>
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}/team-stats`}
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          סטט׳ קבוצתית
        </Link>
        <Link
          href="/dashboard/stats"
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          טבלאות כלליות
        </Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,47,166,0.14),rgba(111,60,255,0.22)_46%,rgba(8,14,29,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <TeamFlag team={team} />
          <div className="min-w-0">
            <p className="wc-kicker">סטטיסטיקות</p>
            <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
              {displayName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-wc-fg2">
              נתונים קבוצתיים ואישיים במקום אחד, מוכנים להרחבה לפי ה-API.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoStat label="מאזן" value={`${stats.wins}-${stats.draws}-${stats.losses}`} sub={`${stats.played} משחקים ששוחקו`} />
        <InfoStat
          label="שערי זכות / חובה"
          valueNode={<GoalsForAgainst goalsFor={stats.goalsFor} goalsAgainst={stats.goalsAgainst} />}
          sub="מוצג לפי הנבחרת הזו"
        />
        <InfoStat label="רשת נקייה" value={String(stats.cleanSheets)} sub={`${stats.failedToScore} משחקים ללא שער זכות`} />
        <InfoStat label="יחס זכייה" value={formatOdds(team.outright_odds)} sub={standing ? `מקום ${standing.rank} בבית` : "טרם דורגה בבית"} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="סטטיסטיקה קבוצתית" eyebrow="טורניר נוכחי" />
          <div className="mt-4 grid gap-3">
            <MetricRow label="נקודות בבית" value={String(standing?.pts ?? 0)} />
            <MetricRow label="הפרש שערים" valueNode={<SignedNumber value={stats.goalDifference} />} />
            <MetricRow label="משחקים בלייב" value={String(stats.liveCount)} />
            <MetricRow label="משחקים עתידיים" value={String(stats.scheduledCount)} />
            <MetricRow label="מאמן" value={team.coach_name ?? "טרם סונכרן"} />
            <MetricRow label="דירוג פיפ״א" value={String(team.fifa_ranking ?? "-")} />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="סיכום שחקנים" eyebrow="שערים, בישולים וכרטיסים" />
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <InfoStat label="שערים" value={String(totals.goals)} sub="כל השחקנים" />
            <InfoStat label="בישולים" value={String(totals.assists)} sub="כל השחקנים" />
            <InfoStat label="צהובים" value={String(totals.yellowCards)} sub="כרטיסים צהובים" />
            <InfoStat label="אדומים" value={String(totals.redCards)} sub="כרטיסים אדומים" />
          </div>
        </section>
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <CompactLeaderTable
          title="מלכי שערים ובישולים"
          eyebrow="שחקן / נבחרת / תרומה התקפית"
          rows={attackRows}
          emptyTitle="אין עדיין נתוני שחקנים"
          emptyDescription="הטבלה תתמלא אחרי סנכרון נתוני השחקנים."
        />
        <CompactLeaderTable
          title="כרטיסים ומשמעת"
          eyebrow="שחקן / נבחרת / כרטיסים"
          rows={disciplineRows}
          emptyTitle="אין עדיין נתוני משמעת"
          emptyDescription="הטבלה תתמלא אחרי סנכרון נתוני הכרטיסים."
        />
      </section>
    </div>
  );
}

function TeamFlag({ team }: { team: Pick<TournamentTeamRecord, "name" | "name_he" | "logo_url"> }) {
  const displayName = team.name_he ?? team.name;

  return (
    <div className="grid h-24 w-28 place-items-center rounded-[1.4rem] border border-white/15 bg-black/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={82}
          height={56}
          style={{ width: 82, height: 56 }}
          className="rounded-md object-cover"
          unoptimized
        />
      ) : (
        <span className="text-xl font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
    </div>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? <p className="wc-kicker text-[0.68rem]">{eyebrow}</p> : null}
      <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
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

function MetricRow({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <span className="text-sm font-bold text-wc-fg2">{label}</span>
      <span className="text-lg font-black text-wc-fg1">{valueNode ?? value}</span>
    </div>
  );
}

function buildTeamPlayerRows(
  players: TeamPlayer[],
  team: TournamentTeamRecord,
  mode: "attack" | "discipline",
): CompactLeaderRow[] {
  return players.slice(0, 10).map((player) => ({
    id: String(player.id),
    title: player.name,
    subtitle: getPositionLabel(player.position),
    imageUrl: player.photo_url ?? null,
    imageAlt: player.name,
    team: toCompactTeam(team),
    metricLabel: mode === "attack" ? "תרומה" : "כרטיסים",
    metricValue:
      mode === "attack"
        ? `${(player.goals ?? 0) + (player.assists ?? 0)}`
        : `${(player.yellow_cards ?? 0) + (player.red_cards ?? 0)}`,
    metricTone: mode === "attack" ? "green" : "amber",
  }));
}

function toCompactTeam(team: TournamentTeamRecord): CompactLeaderTeam {
  return {
    id: team.id,
    name: team.name,
    name_he: team.name_he,
    logo_url: team.logo_url,
  };
}

function _StatsTable({
  title,
  players,
  mode,
}: {
  title: string;
  players: TeamPlayer[];
  mode: "attack" | "discipline";
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
      <div className="border-b border-white/8 bg-white/[0.025] px-4 py-3">
        <SectionHeader title={title} eyebrow="סטטיסטיקה אישית" />
      </div>
      {players.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-wc-fg3">
                <th className="px-3 py-2 text-start">שחקן</th>
                <th className="px-3 py-2 text-center">עמדה</th>
                <th className="px-3 py-2 text-center">שערים</th>
                <th className="px-3 py-2 text-center">בישולים</th>
                <th className="px-3 py-2 text-center">{mode === "attack" ? "הופעות" : "צהובים"}</th>
                <th className="px-3 py-2 text-center">{mode === "attack" ? "דקות" : "אדומים"}</th>
                <th className="px-3 py-2 text-center">יחס מלך שערים</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id} className="border-b border-white/6 last:border-0">
                  <td className="px-3 py-2 font-bold text-wc-fg1">{player.name}</td>
                  <td className="px-3 py-2 text-center text-wc-fg3">{getPositionLabel(player.position)}</td>
                  <td className="px-3 py-2 text-center font-black text-wc-fg1">{player.goals ?? 0}</td>
                  <td className="px-3 py-2 text-center text-wc-fg2">{player.assists ?? 0}</td>
                  <td className={`px-3 py-2 text-center ${mode === "discipline" ? "text-wc-amber" : "text-wc-fg2"}`}>
                    {mode === "attack" ? player.appearances ?? 0 : player.yellow_cards ?? 0}
                  </td>
                  <td className={`px-3 py-2 text-center ${mode === "discipline" ? "text-wc-danger" : "text-wc-fg2"}`}>
                    {mode === "attack" ? player.minutes_played ?? 0 : player.red_cards ?? 0}
                  </td>
                  <td className="px-3 py-2 text-center font-black text-wc-neon">{formatOdds(player.top_scorer_odds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-sm font-black text-wc-fg1">אין עדיין נתוני שחקנים</p>
          <p className="mt-1 text-xs leading-6 text-wc-fg3">
            הנתונים יופיעו כאן אחרי סנכרון ה-API.
          </p>
        </div>
      )}
    </section>
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
    failedToScore: 0,
    liveCount: matches.filter((match) => match.status === "live").length,
    scheduledCount: matches.filter((match) => match.status === "scheduled").length,
  };

  const stats = matches.reduce((current, match) => {
    if (match.status !== "finished" || !isMatchScoreVisible(match)) {
      return current;
    }

    const summary = getMatchScoreSummary(match);
    if (!summary) return current;

    const isHome = match.home_team_id === teamId;
    const goalsFor = isHome ? summary.homeScore : summary.awayScore;
    const goalsAgainst = isHome ? summary.awayScore : summary.homeScore;

    current.played += 1;
    current.goalsFor += goalsFor;
    current.goalsAgainst += goalsAgainst;
    if (goalsAgainst === 0) current.cleanSheets += 1;
    if (goalsFor === 0) current.failedToScore += 1;
    if (goalsFor > goalsAgainst) current.wins += 1;
    if (goalsFor === goalsAgainst) current.draws += 1;
    if (goalsFor < goalsAgainst) current.losses += 1;

    return current;
  }, initial);

  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  return stats;
}

function buildPlayerTotals(players: TeamPlayer[]) {
  return players.reduce(
    (totals, player) => ({
      goals: totals.goals + (player.goals ?? 0),
      assists: totals.assists + (player.assists ?? 0),
      yellowCards: totals.yellowCards + (player.yellow_cards ?? 0),
      redCards: totals.redCards + (player.red_cards ?? 0),
    }),
    { goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  );
}

function compareAttackers(left: TeamPlayer, right: TeamPlayer) {
  return (
    (right.goals ?? 0) - (left.goals ?? 0) ||
    (right.assists ?? 0) - (left.assists ?? 0) ||
    (right.appearances ?? 0) - (left.appearances ?? 0) ||
    left.name.localeCompare(right.name, "he")
  );
}

function compareCards(left: TeamPlayer, right: TeamPlayer) {
  return (
    (right.red_cards ?? 0) - (left.red_cards ?? 0) ||
    (right.yellow_cards ?? 0) - (left.yellow_cards ?? 0) ||
    (right.goals ?? 0) - (left.goals ?? 0) ||
    left.name.localeCompare(right.name, "he")
  );
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

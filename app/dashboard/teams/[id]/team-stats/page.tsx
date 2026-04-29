import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { GoalsForAgainst, RecordBreakdown, SignedNumber } from "@/components/StatNumbers";
import TeamLink from "@/components/TeamLink";
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
import { buildTournamentStandings, type TeamStanding } from "@/lib/utils/standings";

export const dynamic = "force-dynamic";

type TeamMatch = MatchWithTeams;

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
  homePlayed: number;
  awayPlayed: number;
};

export default async function TeamGroupStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: teamData }, { data: teamsData }, { data: matchesData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at, coach_name")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds")
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
  ]);

  if (!teamData) notFound();

  const team = teamData as TournamentTeamRecord;
  const teams = (teamsData ?? []) as TournamentTeamRecord[];
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
  const groupStandings = team.group_letter ? tournament.groupStandings[team.group_letter] ?? [] : [];
  const standing = groupStandings.find((entry) => entry.team.id === id) ?? null;
  const stats = buildTeamStats(teamMatches, id);
  const stageRows = buildStageRows(teamMatches, id);
  const displayName = team.name_he ?? team.name;

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/dashboard/teams/${encodeURIComponent(id)}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לנבחרת
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/teams/${encodeURIComponent(id)}/stats`}
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            סטט׳ שחקנים
          </Link>
          <Link
            href="/dashboard/stats"
            className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
          >
            טבלאות כלליות
          </Link>
        </div>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_46%,rgba(8,14,29,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <TeamFlag team={team} />
          <div className="min-w-0">
            <p className="wc-kicker">סטטיסטיקה קבוצתית</p>
            <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
              {displayName}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-wc-fg2">
              תמונת הקבוצה: מאזן, שערים, בית, שלבים ומדדים שיהיו מוכנים להרחבת API.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoStat
          label="מאזן"
          valueNode={<RecordBreakdown wins={stats.wins} draws={stats.draws} losses={stats.losses} />}
          sub={`${stats.played} משחקים ששוחקו`}
        />
        <InfoStat
          label="שערי זכות / חובה"
          valueNode={<GoalsForAgainst goalsFor={stats.goalsFor} goalsAgainst={stats.goalsAgainst} />}
          sub={`ממוצע ${formatAverage(stats.goalsFor, stats.played)} שערי זכות למשחק`}
        />
        <InfoStat label="הפרש שערים" valueNode={<SignedNumber value={stats.goalDifference} />} sub="מוצג בכיוון מספרי תקין" />
        <InfoStat label="יחס זכייה" value={formatOdds(team.outright_odds)} sub={team.outright_odds_updated_at ? "עודכן מה-API" : "טרם עודכן"} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="מדדים קבוצתיים" eyebrow="API-ready" />
          <div className="mt-4 grid gap-3">
            <MetricRow label="נקודות בבית" value={String(standing?.pts ?? 0)} />
            <MetricRow label="מיקום בבית" value={standing ? getStandingPlaceLabel(standing) : "טרם דורגה"} />
            <MetricRow label="רשת נקייה" value={String(stats.cleanSheets)} />
            <MetricRow label="משחקים ללא שער זכות" value={String(stats.failedToScore)} />
            <MetricRow label="משחקי בית בטורניר" value={String(stats.homePlayed)} />
            <MetricRow label="משחקי חוץ בטורניר" value={String(stats.awayPlayed)} />
            <MetricRow label="משחקים בלייב" value={String(stats.liveCount)} />
            <MetricRow label="משחקים עתידיים" value={String(stats.scheduledCount)} />
          </div>
        </section>

        {groupStandings.length > 0 ? (
          <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
            <div className="border-b border-white/8 bg-white/[0.025] px-4 py-3">
              <SectionHeader title={`בית ${team.group_letter}`} eyebrow="מסונכרן מטבלת הטורניר" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[38rem] text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-wc-fg3">
                    <th className="px-3 py-2 text-start">#</th>
                    <th className="px-3 py-2 text-start">נבחרת</th>
                    <th className="px-3 py-2 text-center">סטטוס</th>
                    <th className="px-3 py-2 text-center">מאזן</th>
                    <th className="px-3 py-2 text-center">זכות / חובה</th>
                    <th className="px-3 py-2 text-center">הפרש</th>
                    <th className="px-3 py-2 text-center">נק׳</th>
                  </tr>
                </thead>
                <tbody>
                  {groupStandings.map((entry) => (
                    <tr key={entry.team.id} className={`border-b border-white/6 last:border-0 ${entry.team.id === id ? "bg-[rgba(95,255,123,0.08)]" : ""}`}>
                      <td className="px-3 py-2 font-bold text-wc-fg2">{entry.rank}</td>
                      <td className="px-3 py-2">
                        <TeamLink team={entry.team} className="inline-flex items-center gap-2 font-black text-wc-fg1 transition hover:text-wc-neon">
                          <SmallFlag team={entry.team} />
                          <span>{entry.team.name_he ?? entry.team.name}</span>
                        </TeamLink>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${getStandingBadgeClass(entry)}`}>
                          {getStandingPlaceLabel(entry)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-wc-fg2" dir="ltr">{entry.won}-{entry.drawn}-{entry.lost}</td>
                      <td className="px-3 py-2 text-center text-wc-fg2">
                        <GoalsForAgainst goalsFor={entry.gf} goalsAgainst={entry.ga} />
                      </td>
                      <td className="px-3 py-2 text-center text-wc-fg2"><SignedNumber value={entry.gd} /></td>
                      <td className="px-3 py-2 text-center font-black text-wc-fg1">{entry.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <section className="mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
        <div className="border-b border-white/8 bg-white/[0.025] px-4 py-3">
          <SectionHeader title="חתך לפי שלבים" eyebrow="משחקי הנבחרת" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-wc-fg3">
                <th className="px-3 py-2 text-start">שלב</th>
                <th className="px-3 py-2 text-center">משחקים</th>
                <th className="px-3 py-2 text-center">מאזן</th>
                <th className="px-3 py-2 text-center">זכות / חובה</th>
                <th className="px-3 py-2 text-center">הפרש</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.map((row) => (
                <tr key={row.stage} className="border-b border-white/6 last:border-0">
                  <td className="px-3 py-2 font-black text-wc-fg1">{row.stage}</td>
                  <td className="px-3 py-2 text-center text-wc-fg2">{row.played}</td>
                  <td className="px-3 py-2 text-center text-wc-fg2">
                    <RecordBreakdown wins={row.wins} draws={row.draws} losses={row.losses} compact />
                  </td>
                  <td className="px-3 py-2 text-center text-wc-fg2">
                    <GoalsForAgainst goalsFor={row.goalsFor} goalsAgainst={row.goalsAgainst} />
                  </td>
                  <td className="px-3 py-2 text-center text-wc-fg2"><SignedNumber value={row.goalsFor - row.goalsAgainst} /></td>
                </tr>
              ))}
              {stageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-wc-fg3">
                    אין עדיין משחקים שהסתיימו.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/14 px-4 py-3">
      <span className="text-sm font-bold text-wc-fg2">{label}</span>
      <span className="text-lg font-black text-wc-fg1">{value}</span>
    </div>
  );
}

function SmallFlag({ team }: { team: Pick<TournamentTeamRecord, "name" | "name_he" | "logo_url"> }) {
  const displayName = team.name_he ?? team.name;

  return (
    <span className="grid h-5 w-7 shrink-0 place-items-center overflow-hidden rounded bg-white/10">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={28}
          height={20}
          style={{ width: 28, height: 20 }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
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
    failedToScore: 0,
    liveCount: matches.filter((match) => match.status === "live").length,
    scheduledCount: matches.filter((match) => match.status === "scheduled").length,
    homePlayed: matches.filter((match) => match.home_team_id === teamId).length,
    awayPlayed: matches.filter((match) => match.away_team_id === teamId).length,
  };

  const stats = matches.reduce((current, match) => {
    if (match.status !== "finished" || !isMatchScoreVisible(match)) return current;

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

function buildStageRows(matches: TeamMatch[], teamId: string) {
  const rows = new Map<string, TeamStats>();

  for (const match of matches) {
    if (match.status !== "finished" || !isMatchScoreVisible(match)) continue;
    const summary = getMatchScoreSummary(match);
    if (!summary) continue;

    const row = rows.get(match.stage) ?? {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      cleanSheets: 0,
      failedToScore: 0,
      liveCount: 0,
      scheduledCount: 0,
      homePlayed: 0,
      awayPlayed: 0,
    };
    const isHome = match.home_team_id === teamId;
    const goalsFor = isHome ? summary.homeScore : summary.awayScore;
    const goalsAgainst = isHome ? summary.awayScore : summary.homeScore;

    row.played += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) row.wins += 1;
    if (goalsFor === goalsAgainst) row.draws += 1;
    if (goalsFor < goalsAgainst) row.losses += 1;
    rows.set(match.stage, row);
  }

  return [...rows.entries()].map(([stage, row]) => ({ stage, ...row }));
}

function getStandingPlaceLabel(entry: TeamStanding) {
  if (entry.lockedRank !== null) return `מקום ${entry.lockedRank}`;
  if (entry.status === "qualified") return "הבטיחה העפלה";
  if (entry.status === "eliminated") return "הודחה";
  return "פתוח";
}

function getStandingBadgeClass(entry: TeamStanding) {
  if (entry.lockedRank !== null && entry.lockedRank <= 2) return "bg-[rgba(95,255,123,0.14)] text-wc-neon";
  if (entry.lockedRank !== null && entry.lockedRank >= 4) return "bg-[rgba(255,92,130,0.14)] text-wc-danger";
  if (entry.status === "qualified") return "bg-[rgba(95,255,123,0.14)] text-wc-neon";
  if (entry.status === "eliminated") return "bg-[rgba(255,92,130,0.14)] text-wc-danger";
  return "bg-white/8 text-wc-fg3";
}

function formatAverage(total: number, played: number) {
  if (played === 0) return "0.0";
  return (total / played).toFixed(1);
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם עודכן";
  return numeric.toFixed(2);
}

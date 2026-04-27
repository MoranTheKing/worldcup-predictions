import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamLink from "@/components/TeamLink";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  formatMatchDateLabel,
  formatMatchTimeLabel,
  getLiveMatchStatusLabel,
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
  goals?: number | null;
  assists?: number | null;
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

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
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
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated")
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
      .select("id, name, position, goals, assists")
      .eq("team_id", id)
      .order("position", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (!teamData) notFound();

  if (playersError) {
    console.error("[TeamPage] players error:", playersError);
  }

  const teams = (teamsData ?? []) as TournamentTeamRecord[];
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
  const team = teamData as TournamentTeamRecord;
  const players = ((playersData ?? []) as TeamPlayer[]).filter((player) => player.name);
  const groupStandings = team.group_letter
    ? tournament.groupStandings[team.group_letter] ?? []
    : [];
  const standing = groupStandings.find((entry) => entry.team.id === id) ?? null;
  const teamEliminated = isTeamEliminated(team, standing);
  const status = getTeamStatus(team, standing);
  const nextMatch =
    teamMatches.find((match) => match.status === "live") ??
    teamMatches.find((match) => match.status === "scheduled") ??
    null;
  const finishedMatches = teamMatches.filter(
    (match) => match.status === "finished" && isMatchScoreVisible(match),
  );
  const lastFiveMatches = finishedMatches.slice(-5).reverse();
  const stats = buildTeamStats(teamMatches, id);
  const displayName = team.name_he ?? team.name;
  const previewPlayers = players.slice(0, 8);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <Link
        href="/dashboard/tournament"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
      >
        חזרה לטורניר
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(111,60,255,0.26),rgba(255,47,166,0.12)_48%,rgba(8,14,29,0.94))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-4 md:gap-5">
            <TeamFlag team={team} size="hero" />
            <div className="min-w-0">
              <p className="wc-kicker">פרופיל נבחרת</p>
              <h1 className="mt-2 truncate font-sans text-4xl font-black leading-tight tracking-normal text-wc-fg1 md:text-6xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-wc-fg2">
                כל המשחקים, הסטטוס, הכושר האחרון והסגל של הנבחרת במקום אחד.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                {team.group_letter ? <span className="wc-badge">בית {team.group_letter}</span> : null}
                {standing ? <span className="wc-badge">מקום {standing.rank}</span> : null}
                <span className={`rounded-full px-3 py-1 ${status.className}`}>{status.label}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:min-w-[24rem]">
            <HeroStat label="נקודות" value={String(standing?.pts ?? 0)} accent="text-wc-neon" />
            <HeroStat label="מאזן" value={`${stats.wins}-${stats.draws}-${stats.losses}`} />
            <HeroStat label="הפרש" value={formatSignedNumber(stats.goalDifference)} />
          </div>
        </div>

        <div className="border-t border-white/10 bg-black/10 px-5 py-3 md:px-7">
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-sm font-bold text-wc-fg1">{status.description}</p>
              <p className="mt-1 text-xs leading-6 text-wc-fg3">
                {teamEliminated
                  ? "המשך המסלול נסגר לנבחרת הזו, אבל כל הנתונים ההיסטוריים והמשחקים שכבר שוחקו נשארים זמינים."
                  : "המסלול מתעדכן לפי המשחקים שכבר שוחקו ולפי ההתקדמות בבתים ובנוקאאוט."}
              </p>
            </div>
            <FormDots matches={lastFiveMatches} teamId={id} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoStat label="משחקים ששוחקו" value={String(stats.played)} sub={`${stats.scheduledCount} עתידיים`} />
        <InfoStat label="שערים" value={`${stats.goalsFor}:${stats.goalsAgainst}`} sub={`ממוצע ${formatAverage(stats.goalsFor, stats.played)} למשחק`} />
        <InfoStat label="רשת נקייה" value={String(stats.cleanSheets)} sub="במשחקים שהסתיימו" />
        <InfoStat label="דירוג פיפ״א" value={String(team.fifa_ranking ?? "-")} sub={`פייר פליי ${team.fair_play_score ?? 0}`} />
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
                title={teamEliminated ? "הנבחרת הודחה מהטורניר" : "אין משחק עתידי ידוע"}
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
              <SectionHeader title={`בית ${team.group_letter}`} eyebrow="טבלת הבית" />
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.025] text-wc-fg3">
                      <th className="px-3 py-2 text-start">#</th>
                      <th className="px-3 py-2 text-start">נבחרת</th>
                      <th className="px-3 py-2 text-center">נק׳</th>
                      <th className="px-3 py-2 text-center">הפרש</th>
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
              eyebrow="בהכנה לסנכרון API"
              actionHref={`/dashboard/teams/${encodeURIComponent(id)}/squad`}
              actionLabel="לעמוד הסגל"
            />
            <CoachCard />
            <SquadPreview players={previewPlayers} total={players.length} />
          </section>
        </div>
      </div>

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="חמשת המשחקים האחרונים" eyebrow="כושר אחרון" />
        {lastFiveMatches.length > 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {lastFiveMatches.map((match) => (
              <RecentMatchCard key={match.match_number} match={match} teamId={id} />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="עדיין אין חמישה משחקים שהסתיימו"
            description="כשהנבחרת תתחיל לשחק, רצף הכושר האחרון יופיע כאן."
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

function HeroStat({
  label,
  value,
  accent = "text-wc-fg1",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className={`mt-2 font-sans text-3xl font-black tracking-normal ${accent}`}>{value}</p>
    </div>
  );
}

function InfoStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 font-sans text-3xl font-black tracking-normal text-wc-fg1">{value}</p>
      <p className="mt-1 text-xs text-wc-fg3">{sub}</p>
    </div>
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
              <p dir="ltr" className="font-sans text-2xl font-black tracking-normal text-wc-fg1">
                {scores.teamScore} - {scores.opponentScore}
              </p>
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

  return (
    <tr className={`border-b border-white/6 last:border-0 ${isActive ? "bg-[rgba(95,255,123,0.08)]" : ""}`}>
      <td className="px-3 py-2 font-bold text-wc-fg2">{entry.rank}</td>
      <td className="px-3 py-2">
        <TeamLink team={entry.team} className="flex min-w-0 items-center gap-2 font-bold text-wc-fg1 transition hover:text-wc-neon">
          <SmallFlag logoUrl={entry.team.logo_url} name={entry.team.name_he ?? entry.team.name} />
          <span className="truncate">{entry.team.name_he ?? entry.team.name}</span>
        </TeamLink>
      </td>
      <td className="px-3 py-2 text-center font-black text-wc-fg1">{entry.pts}</td>
      <td className="px-3 py-2 text-center text-wc-fg2">{formatSignedNumber(entry.gd)}</td>
    </tr>
  );
}

function CoachCard() {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/14 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">מאמן ראשי</p>
      <p className="mt-2 text-lg font-black text-wc-fg1">טרם סונכרן</p>
      <p className="mt-1 text-xs leading-6 text-wc-fg3">
        שם המאמן ייכנס לכאן בסנכרון ה-API הבא.
      </p>
    </div>
  );
}

function SquadPreview({ players, total }: { players: TeamPlayer[]; total: number }) {
  if (players.length === 0) {
    return (
      <EmptyPanel
        title="הסגל עדיין לא סונכרן"
        description="כשה-API יחזיר את רשימת השחקנים, הם יוצגו כאן ובעמוד הסגל המלא."
      />
    );
  }

  return (
    <div className="mt-3 grid gap-2">
      {players.map((player) => (
        <div key={player.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
          <span className="truncate text-sm font-bold text-wc-fg1">{player.name}</span>
          <span className="shrink-0 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-wc-fg3">
            {getPositionLabel(player.position)}
          </span>
        </div>
      ))}
      {total > players.length ? (
        <p className="pt-1 text-xs text-wc-fg3">ועוד {total - players.length} שחקנים בעמוד הסגל.</p>
      ) : null}
    </div>
  );
}

function RecentMatchCard({ match, teamId }: { match: TeamMatch; teamId: string }) {
  const isHome = match.home_team_id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentName = getTeamDisplayName(
    opponent,
    isHome ? match.away_placeholder : match.home_placeholder,
  );
  const opponentLogo = getTeamDisplayLogo(opponent);
  const scores = getTeamScores(match, teamId);
  const outcome = getTeamOutcome(match, teamId);

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-black/15 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-1 text-xs font-black ${outcome.chipClassName}`}>{outcome.short}</span>
        <span className="text-[10px] font-bold text-wc-fg3">{getStageLabelHe(match.stage)}</span>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <SmallFlag logoUrl={opponentLogo} name={opponentName} />
        <span className="truncate text-sm font-black text-wc-fg1">{opponentName}</span>
      </div>
      <p dir="ltr" className="mt-3 font-sans text-2xl font-black tracking-normal text-wc-fg1">
        {scores ? `${scores.teamScore} - ${scores.opponentScore}` : "-"}
      </p>
      <p className={`mt-1 text-xs font-bold ${outcome.className}`}>{outcome.label}</p>
    </div>
  );
}

function FormDots({ matches, teamId }: { matches: TeamMatch[]; teamId: string }) {
  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-start gap-2 md:justify-end">
        <span className="text-xs font-semibold text-wc-fg3">אין משחקים אחרונים</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-start gap-2 md:justify-end">
      <span className="text-xs font-semibold text-wc-fg3">כושר אחרון</span>
      {matches.map((match) => {
        const outcome = getTeamOutcome(match, teamId);
        return (
          <span
            key={match.match_number}
            className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${outcome.chipClassName}`}
            title={`Match #${match.match_number}`}
          >
            {outcome.short}
          </span>
        );
      })}
    </div>
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

function getTeamScores(match: TeamMatch, teamId: string) {
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

function getTeamStatus(team: TournamentTeamRecord, standing: TeamStanding | null) {
  if (isTeamEliminated(team, standing)) {
    return {
      label: "הודחה",
      description: "הנבחרת הודחה מהטורניר.",
      className: "bg-[rgba(255,92,130,0.14)] text-wc-danger",
    };
  }

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

function getPositionLabel(position: string | null) {
  if (!position) return "שחקן";
  const normalized = position.toLowerCase();
  if (normalized.includes("goal")) return "שוער";
  if (normalized.includes("def")) return "הגנה";
  if (normalized.includes("mid")) return "קישור";
  if (normalized.includes("att") || normalized.includes("for")) return "התקפה";
  return position;
}

function formatAverage(total: number, played: number) {
  if (played === 0) return "0.0";
  return (total / played).toFixed(1);
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

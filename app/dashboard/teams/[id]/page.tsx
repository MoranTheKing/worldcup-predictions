import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
  formatMatchDateLabel,
  formatMatchTimeLabel,
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
import TeamLink from "@/components/TeamLink";

export const dynamic = "force-dynamic";

type TeamMatch = MatchWithTeams;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: teamData }, { data: teamsData }, { data: matchesData }] = await Promise.all([
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
  ]);

  if (!teamData) notFound();

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
  const groupStandings = team.group_letter
    ? tournament.groupStandings[team.group_letter] ?? []
    : [];
  const standing = groupStandings.find((entry) => entry.team.id === id) ?? null;
  const nextMatch =
    teamMatches.find((match) => match.status === "live") ??
    teamMatches.find((match) => match.status === "scheduled") ??
    null;
  const completedMatches = teamMatches.filter((match) => isMatchScoreVisible(match));
  const displayName = team.name_he ?? team.name;

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <Link
        href="/dashboard/tournament"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 hover:text-wc-fg1"
      >
        ← חזרה לטורניר
      </Link>

      <section className="wc-card overflow-hidden p-0">
        <div className="bg-[radial-gradient(circle_at_20%_0%,rgba(95,255,123,0.18),transparent_34%),linear-gradient(135deg,rgba(111,60,255,0.25),rgba(255,47,166,0.12))] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <TeamFlag team={team} size="hero" />
              <div className="min-w-0">
                <p className="wc-kicker">Team Hub</p>
                <h1 className="wc-display mt-2 truncate text-5xl text-wc-fg1">{displayName}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {team.group_letter ? <span className="wc-badge">בית {team.group_letter}</span> : null}
                  {standing ? <span className="wc-badge">מקום {standing.rank}</span> : null}
                  <TeamStatusBadge standing={standing} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:min-w-[22rem]">
              <StatCard label="נקודות" value={String(standing?.pts ?? 0)} accent="text-wc-neon" />
              <StatCard label="מאזן" value={standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : "-"} />
              <StatCard label="הפרש" value={formatSignedNumber(standing?.gd ?? 0)} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-wc-fg1">משחקי הנבחרת</p>
                <p className="mt-1 text-xs text-wc-fg3">
                  {teamMatches.length} משחקים במסלול הטורניר, כולל בית ונוקאאוט אם הנבחרת תתקדם.
                </p>
              </div>
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-wc-fg2">
                {completedMatches.length}/{teamMatches.length}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {teamMatches.map((match) => (
                <TeamMatchCard key={match.match_number} match={match} teamId={id} />
              ))}
            </div>
          </section>

          <div className="grid content-start gap-4">
            <section className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-black text-wc-fg1">המשחק הבא</p>
              {nextMatch ? (
                <NextMatchCard match={nextMatch} teamId={id} />
              ) : (
                <p className="mt-3 rounded-xl bg-white/5 p-4 text-sm text-wc-fg3">
                  אין כרגע משחק עתידי לנבחרת במסלול הידוע.
                </p>
              )}
            </section>

            {groupStandings.length > 0 ? (
              <section className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
                <p className="text-sm font-black text-wc-fg1">בית {team.group_letter}</p>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-wc-fg3">
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

            <section className="rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-black text-wc-fg1">תקציר מהיר</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat label="שערי זכות" value={String(standing?.gf ?? 0)} />
                <MiniStat label="שערי חובה" value={String(standing?.ga ?? 0)} />
                <MiniStat label="שוחקו" value={String(standing?.played ?? 0)} />
                <MiniStat label="דירוג פיפ״א" value={String(team.fifa_ranking ?? "-")} />
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function TeamStatusBadge({ standing }: { standing: TeamStanding | null }) {
  if (!standing) return null;

  if (standing.status === "qualified") {
    return <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-3 py-1 text-wc-neon">הבטיחה העפלה</span>;
  }

  if (standing.status === "eliminated") {
    return <span className="rounded-full bg-[rgba(255,92,130,0.14)] px-3 py-1 text-wc-danger">הודחה</span>;
  }

  return <span className="rounded-full bg-white/8 px-3 py-1 text-wc-fg3">עדיין פתוח</span>;
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
      ? "grid h-20 w-24 place-items-center rounded-2xl border border-white/15 bg-black/20"
      : "grid h-8 w-10 place-items-center rounded-lg border border-white/10 bg-white/8";
  const imageSize = size === "hero" ? { width: 72, height: 48 } : { width: 30, height: 20 };

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

function StatCard({ label, value, accent = "text-wc-fg1" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/15 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className={`wc-display mt-2 text-3xl ${accent}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-semibold text-wc-fg3">{label}</p>
      <p className="mt-1 text-lg font-black text-wc-fg1">{value}</p>
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
  const scoreSummary = isMatchScoreVisible(match) ? getMatchScoreSummary(match) : null;
  const teamScore = scoreSummary ? (isHome ? scoreSummary.homeScore : scoreSummary.awayScore) : null;
  const opponentScore = scoreSummary ? (isHome ? scoreSummary.awayScore : scoreSummary.homeScore) : null;
  const outcome = getTeamOutcome(teamScore, opponentScore, match.status);

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/15 p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-wc-fg3">
        <span className="font-semibold">{getStageLabelHe(match.stage)}</span>
        <Link
          href={`/dashboard/matches/${match.match_number}`}
          className="font-mono text-[10px] text-wc-fg3 hover:text-wc-fg1"
        >
          Match #{match.match_number}
        </Link>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-wc-fg3">{isHome ? "בית" : "חוץ"}</p>
          {opponent ? (
            <TeamLink
              team={opponent}
              className="mt-1 flex min-w-0 items-center gap-2 text-sm font-bold text-wc-fg1 hover:text-wc-neon"
            >
              <SmallFlag logoUrl={opponentLogo} name={opponentName} />
              <span className="truncate">{opponentName}</span>
            </TeamLink>
          ) : (
            <div className="mt-1 flex min-w-0 items-center gap-2 text-sm font-bold text-wc-fg1">
              <SmallFlag logoUrl={null} name={opponentName} />
              <span className="truncate">{opponentName}</span>
            </div>
          )}
        </div>

        <div className="text-end">
          {scoreSummary ? (
            <p dir="ltr" className="wc-display text-2xl text-wc-fg1">
              {teamScore} - {opponentScore}
            </p>
          ) : (
            <p className="wc-display text-2xl text-wc-fg3">VS</p>
          )}
          <p className={`mt-1 text-xs font-bold ${outcome.className}`}>{outcome.label}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-wc-fg3">
        {formatMatchDateLabel(match.date_time)} · {formatMatchTimeLabel(match.date_time)} IDT
      </p>
    </div>
  );
}

function NextMatchCard({ match, teamId }: { match: TeamMatch; teamId: string }) {
  const isHome = match.home_team_id === teamId;
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentName = getTeamDisplayName(
    opponent,
    isHome ? match.away_placeholder : match.home_placeholder,
  );

  return (
    <div className="mt-3 rounded-xl border border-[rgba(95,255,123,0.18)] bg-[rgba(95,255,123,0.06)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-wc-neon">{getStageLabelHe(match.stage)}</p>
          <p className="mt-2 truncate text-lg font-black text-wc-fg1">
            נגד {opponentName}
          </p>
          <p className="mt-1 text-xs text-wc-fg3">
            {formatMatchDateLabel(match.date_time)} · {formatMatchTimeLabel(match.date_time)} IDT
          </p>
        </div>
        <Link
          href={`/dashboard/matches/${match.match_number}`}
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-wc-fg2 hover:text-wc-fg1"
        >
          משחק #{match.match_number}
        </Link>
      </div>
    </div>
  );
}

function GroupMiniRow({ entry, activeTeamId }: { entry: TeamStanding; activeTeamId: string }) {
  const isActive = entry.team.id === activeTeamId;

  return (
    <tr className={`border-b border-white/6 last:border-0 ${isActive ? "bg-[rgba(95,255,123,0.08)]" : ""}`}>
      <td className="px-3 py-2 font-bold text-wc-fg2">{entry.rank}</td>
      <td className="px-3 py-2">
        <TeamLink team={entry.team} className="flex min-w-0 items-center gap-2 font-bold text-wc-fg1 hover:text-wc-neon">
          <SmallFlag logoUrl={entry.team.logo_url} name={entry.team.name_he ?? entry.team.name} />
          <span className="truncate">{entry.team.name_he ?? entry.team.name}</span>
        </TeamLink>
      </td>
      <td className="px-3 py-2 text-center font-black text-wc-fg1">{entry.pts}</td>
      <td className="px-3 py-2 text-center text-wc-fg2">{formatSignedNumber(entry.gd)}</td>
    </tr>
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

function getTeamOutcome(
  teamScore: number | null,
  opponentScore: number | null,
  status: string,
) {
  if (status === "scheduled" || teamScore === null || opponentScore === null) {
    return { label: "טרם התחיל", className: "text-wc-fg3" };
  }

  if (status === "live") {
    if (teamScore > opponentScore) return { label: "מובילה בלייב", className: "text-wc-neon" };
    if (teamScore < opponentScore) return { label: "בפיגור בלייב", className: "text-wc-danger" };
    return { label: "שוויון בלייב", className: "text-wc-amber" };
  }

  if (teamScore > opponentScore) return { label: "ניצחון", className: "text-wc-neon" };
  if (teamScore < opponentScore) return { label: "הפסד", className: "text-wc-danger" };
  return { label: "תיקו", className: "text-wc-amber" };
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

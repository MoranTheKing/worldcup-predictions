import Image from "next/image";
import Link from "next/link";
import TeamLink from "@/components/TeamLink";
import { createClient } from "@/lib/supabase/server";
import {
  attachTeamsToMatches,
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

export default async function TeamsIndexPage() {
  const supabase = await createClient();

  const [{ data: teamsData }, { data: matchesData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at")
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

  const teams = (teamsData ?? []) as TournamentTeamRecord[];
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const matches = attachTeamsToMatches((matchesData ?? []) as TournamentMatchRecord[], teams);
  const groupMatches = getGroupMatches(matches);
  const tournamentTeams = buildTournamentTeams(teams as TournamentTeamStateRow[], groupMatches);
  const tournament = buildTournamentStandings(tournamentTeams, groupMatches);
  const standingsByTeamId = new Map<string, TeamStanding>();

  for (const standings of Object.values(tournament.groupStandings)) {
    for (const entry of standings) {
      standingsByTeamId.set(entry.team.id, entry);
    }
  }

  const groupLetters = [...new Set(teams.map((team) => team.group_letter).filter(Boolean))] as string[];
  const oddsReadyCount = teams.filter((team) => Number.isFinite(Number(team.outright_odds))).length;
  const liveMatches = matches.filter((match) => match.status === "live").length;
  const oddsLeaders = teams
    .filter((team) => Number.isFinite(Number(team.outright_odds)))
    .sort((left, right) => Number(left.outright_odds) - Number(right.outright_odds))
    .slice(0, 6);

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
          href="/dashboard/stats"
          className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-bold text-wc-fg2 transition hover:border-wc-neon/40 hover:text-wc-neon"
        >
          טבלאות וסטטיסטיקות
        </Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(111,60,255,0.2)_46%,rgba(8,14,29,0.95))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="wc-kicker">Team Hub</p>
            <h1 className="mt-2 font-sans text-4xl font-black tracking-normal text-wc-fg1 md:text-6xl">
              כל הנבחרות
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-wc-fg2">
              אינדקס נבחרות מהיר ונגיש. הטבלאות המלאות נשארות בעמוד הטורניר, וכאן מקבלים כניסה מהירה לפרופיל, סגל, סטטיסטיקות ויחסי זכייה.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/dashboard/tournament"
                className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                טבלאות הטורניר המלאות
              </Link>
              <Link
                href="/dashboard/stats#odds"
                className="rounded-full border border-wc-neon/30 bg-[rgba(95,255,123,0.11)] px-4 py-2 text-xs font-black text-wc-neon transition hover:border-wc-neon/55 hover:bg-[rgba(95,255,123,0.17)]"
              >
                טבלת יחסי זכייה
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <SummaryStat label="נבחרות" value={String(teams.length)} />
            <SummaryStat label="יחסים מוכנים" value={String(oddsReadyCount)} accent="text-wc-neon" />
            <SummaryStat label="משחקי לייב" value={String(liveMatches)} accent="text-cyan-300" />
          </div>
        </div>
      </section>

      {oddsLeaders.length > 0 ? (
        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="מועמדות מובילות" eyebrow="יחסי זכייה" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {oddsLeaders.map((team, index) => (
              <TeamOddsCard
                key={team.id}
                team={team}
                standing={standingsByTeamId.get(team.id) ?? null}
                rank={index + 1}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        {groupLetters.map((groupLetter) => {
          const groupTeams = teams
            .filter((team) => team.group_letter === groupLetter)
            .sort((left, right) => {
              const leftStanding = standingsByTeamId.get(left.id);
              const rightStanding = standingsByTeamId.get(right.id);
              return (leftStanding?.rank ?? 99) - (rightStanding?.rank ?? 99);
            });

          return (
            <div key={groupLetter} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-3">
                <SectionHeader title={`בית ${groupLetter}`} eyebrow="נבחרות" />
                <Link
                  href="/dashboard/tournament"
                  className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-bold text-wc-fg3 transition hover:text-wc-neon"
                >
                  טבלה מלאה
                </Link>
              </div>

              <div className="grid gap-2 p-3">
                {groupTeams.map((team) => (
                  <TeamDirectoryCard
                    key={team.id}
                    team={teamsById.get(team.id) ?? team}
                    standing={standingsByTeamId.get(team.id) ?? null}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function TeamDirectoryCard({
  team,
  standing,
}: {
  team: TournamentTeamRecord;
  standing: TeamStanding | null;
}) {
  const displayName = team.name_he ?? team.name;
  const status = getStatus(team, standing);

  return (
    <TeamLink
      team={team}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.15rem] border border-white/10 bg-black/14 px-3 py-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055]"
    >
      <TeamLogo team={team} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-wc-fg1">{displayName}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-wc-fg3">
          <span className={`rounded-full px-2 py-0.5 font-black ${status.className}`}>{status.label}</span>
          {standing ? <span>מקום {standing.rank}</span> : null}
          {team.group_letter ? <span>בית {team.group_letter}</span> : null}
        </span>
      </span>
      <span className="text-left">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-wc-fg3">יחס</span>
        <span className="block font-sans text-xl font-black text-wc-neon">{formatOdds(team.outright_odds)}</span>
      </span>
    </TeamLink>
  );
}

function TeamOddsCard({
  team,
  standing,
  rank,
}: {
  team: TournamentTeamRecord;
  standing: TeamStanding | null;
  rank: number;
}) {
  return (
    <TeamLink
      team={team}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.1rem] border border-white/10 bg-black/14 px-3 py-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055]"
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-black text-wc-fg2">
        {rank}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <TeamLogo team={team} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-wc-fg1">{team.name_he ?? team.name}</span>
          <span className="block text-[11px] text-wc-fg3">
            {team.group_letter ? `בית ${team.group_letter}` : "ללא בית"}
            {standing ? ` · מקום ${standing.rank}` : ""}
          </span>
        </span>
      </span>
      <span className="font-sans text-2xl font-black text-wc-neon">{formatOdds(team.outright_odds)}</span>
    </TeamLink>
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

function SummaryStat({
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

function TeamLogo({ team }: { team: TournamentTeamRecord }) {
  const displayName = team.name_he ?? team.name;

  return (
    <span className="grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={44}
          height={30}
          style={{ width: 44, height: 30 }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
    </span>
  );
}

function getStatus(team: TournamentTeamRecord, standing: TeamStanding | null) {
  if (standing?.lockedRank !== null && standing?.lockedRank !== undefined) {
    return {
      label: `מקום ${standing.lockedRank}`,
      className:
        standing.lockedRank <= 2
          ? "bg-[rgba(95,255,123,0.14)] text-wc-neon"
          : standing.lockedRank >= 4
            ? "bg-[rgba(255,92,130,0.14)] text-wc-danger"
            : "bg-white/8 text-wc-fg3",
    };
  }

  if (team.is_eliminated === true || standing?.status === "eliminated") {
    return {
      label: "הודחה",
      className: "bg-[rgba(255,92,130,0.14)] text-wc-danger",
    };
  }
  if (standing?.status === "qualified") {
    return {
      label: "הבטיחה העפלה",
      className: "bg-[rgba(95,255,123,0.14)] text-wc-neon",
    };
  }
  return {
    label: "פתוח",
    className: "bg-white/8 text-wc-fg3",
  };
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם";
  return numeric.toFixed(2);
}

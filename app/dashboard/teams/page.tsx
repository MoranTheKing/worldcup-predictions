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
import {
  buildTournamentStandings,
  type TeamStanding,
} from "@/lib/utils/standings";

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
  const matches = attachTeamsToMatches(
    (matchesData ?? []) as TournamentMatchRecord[],
    teams,
  );
  const groupMatches = getGroupMatches(matches);
  const tournamentTeams = buildTournamentTeams(
    teams as TournamentTeamStateRow[],
    groupMatches,
  );
  const tournament = buildTournamentStandings(tournamentTeams, groupMatches);
  const standingsByTeamId = new Map<string, TeamStanding>();

  for (const standings of Object.values(tournament.groupStandings)) {
    for (const entry of standings) {
      standingsByTeamId.set(entry.team.id, entry);
    }
  }

  const groupLetters = [...new Set(teams.map((team) => team.group_letter).filter(Boolean))] as string[];
  const liveMatches = matches.filter((match) => match.status === "live").length;
  const oddsReadyCount = teams.filter((team) => team.outright_odds !== null && team.outright_odds !== undefined).length;
  const qualifiedCount = [...standingsByTeamId.values()].filter((entry) => entry.status === "qualified").length;
  const oddsLeaders = teams
    .filter((team) => Number.isFinite(Number(team.outright_odds)))
    .sort((left, right) => Number(left.outright_odds) - Number(right.outright_odds))
    .slice(0, 8);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/dashboard/tournament"
          className="inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
        >
          חזרה לטורניר
        </Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.13),rgba(111,60,255,0.18)_46%,rgba(8,14,29,0.95))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="wc-kicker">Team Hub</p>
            <h1 className="mt-2 font-sans text-4xl font-black tracking-normal text-wc-fg1 md:text-6xl">
              כל הנבחרות
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-wc-fg2">
              טבלה אחת לכל הנבחרות עם מצב הבית החי ויחס הזכייה המעודכן מה-API.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <SummaryStat label="נבחרות" value={String(teams.length)} />
            <SummaryStat label="יחסים" value={`${oddsReadyCount}/${teams.length}`} />
            <SummaryStat label="לייב" value={String(liveMatches)} accent="text-cyan-300" />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="יחסי זכייה" eyebrow="מועמדות מובילות" />
          {oddsLeaders.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {oddsLeaders.map((team, index) => (
                <TeamOddsRow key={team.id} team={team} standing={standingsByTeamId.get(team.id) ?? null} rank={index + 1} />
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="יחסי הזכייה עדיין לא סונכרנו"
              description="כאשר ה-API יעדכן יחסים, הרשימה תסתדר אוטומטית לפי היחס הנמוך ביותר."
            />
          )}
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="תמונת טורניר" eyebrow="סטטוס חי" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <SummaryStat label="הבטיחו העפלה" value={String(qualifiedCount)} accent="text-wc-neon" />
            <SummaryStat label="הודחו" value={String(tournament.eliminatedCount)} accent="text-wc-danger" />
            <SummaryStat label="בתמונה" value={String(tournament.teamsRemaining)} />
          </div>
        </section>
      </div>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        {groupLetters.map((groupLetter) => {
          const groupEntries = tournament.groupStandings[groupLetter] ?? [];
          const entries = groupEntries.length > 0
            ? groupEntries
            : teams
                .filter((team) => team.group_letter === groupLetter)
                .map((team, index) => ({ team, rank: index + 1 }) as Partial<TeamStanding> & { team: TournamentTeamRecord; rank: number });

          return (
            <div key={groupLetter} className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-white/[0.025] px-4 py-3">
                <div>
                  <p className="wc-kicker text-[0.68rem]">בית {groupLetter}</p>
                  <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">טבלה חיה</h2>
                </div>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-wc-fg3">
                  {entries.length} נבחרות
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[38rem] text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-wc-fg3">
                      <th className="px-3 py-2 text-start">#</th>
                      <th className="px-3 py-2 text-start">נבחרת</th>
                      <th className="px-3 py-2 text-center">סטטוס</th>
                      <th className="px-3 py-2 text-center">מאזן</th>
                      <th className="px-3 py-2 text-center">שערים</th>
                      <th className="px-3 py-2 text-center">נק׳</th>
                      <th className="px-3 py-2 text-center">יחס זכייה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const teamRecord = teamsById.get(entry.team.id) ?? (entry.team as TournamentTeamRecord);
                      const standing = standingsByTeamId.get(entry.team.id) ?? null;
                      return (
                        <TeamTableRow
                          key={entry.team.id}
                          team={teamRecord}
                          standing={standing}
                          fallbackRank={entry.rank}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>
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

function TeamOddsRow({
  team,
  standing,
  rank,
}: {
  team: TournamentTeamRecord;
  standing: TeamStanding | null;
  rank: number;
}) {
  const displayName = team.name_he ?? team.name;

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
          <span className="block truncate text-sm font-black text-wc-fg1">{displayName}</span>
          <span className="block text-[11px] text-wc-fg3">
            {team.group_letter ? `בית ${team.group_letter}` : "ללא בית"} · {standing ? `מקום ${standing.rank}` : "ממתינה"}
          </span>
        </span>
      </span>
      <span className="font-sans text-2xl font-black text-wc-neon">{formatOdds(team.outright_odds)}</span>
    </TeamLink>
  );
}

function TeamTableRow({
  team,
  standing,
  fallbackRank,
}: {
  team: TournamentTeamRecord;
  standing: TeamStanding | null;
  fallbackRank: number;
}) {
  const displayName = team.name_he ?? team.name;
  const status = getStatus(team, standing);

  return (
    <tr className="border-b border-white/6 last:border-0">
      <td className="px-3 py-2 font-bold text-wc-fg2">{standing?.rank ?? fallbackRank}</td>
      <td className="px-3 py-2">
        <TeamLink team={team} className="flex min-w-0 items-center gap-2 font-bold text-wc-fg1 transition hover:text-wc-neon">
          <TeamLogo team={team} />
          <span className="truncate">{displayName}</span>
        </TeamLink>
      </td>
      <td className="px-3 py-2 text-center">
        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="px-3 py-2 text-center text-wc-fg2" dir="ltr">
        {standing ? `${standing.won}-${standing.drawn}-${standing.lost}` : "0-0-0"}
      </td>
      <td className="px-3 py-2 text-center text-wc-fg2" dir="ltr">
        {standing ? `${standing.gf}:${standing.ga}` : "0:0"}
      </td>
      <td className="px-3 py-2 text-center font-black text-wc-fg1">{standing?.pts ?? 0}</td>
      <td className="px-3 py-2 text-center font-black text-wc-neon">{formatOdds(team.outright_odds)}</td>
    </tr>
  );
}

function TeamLogo({ team }: { team: TournamentTeamRecord }) {
  const displayName = team.name_he ?? team.name;

  return (
    <span className="grid h-6 w-8 shrink-0 place-items-center overflow-hidden rounded bg-white/10">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={32}
          height={22}
          style={{ width: 32, height: 22 }}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
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

function getStatus(team: TournamentTeamRecord, standing: TeamStanding | null) {
  if (team.is_eliminated === true || standing?.status === "eliminated") {
    return {
      label: "הודחה",
      className: "bg-[rgba(255,92,130,0.14)] text-wc-danger",
    };
  }
  if (standing?.status === "qualified") {
    return {
      label: "העפילה",
      className: "bg-[rgba(95,255,123,0.14)] text-wc-neon",
    };
  }
  return {
    label: "פתוח",
    className: "bg-white/8 text-wc-fg3",
  };
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toFixed(2);
}

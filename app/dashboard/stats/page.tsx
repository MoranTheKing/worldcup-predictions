import Image from "next/image";
import Link from "next/link";
import { GoalsForAgainst, SignedNumber } from "@/components/StatNumbers";
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

type PlayerRecord = {
  id: number | string;
  name: string;
  team_id: string | null;
  position: string | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  top_scorer_odds?: number | string | null;
};

type PlayerTableMode = "goals" | "assists" | "yellow" | "red" | "topScorerOdds";
type TeamTableMode = "attack" | "defense" | "points" | "odds";

export default async function DashboardStatsPage() {
  const supabase = await createClient();

  const [{ data: teamsData }, { data: matchesData }, { data: playersData, error: playersError }] =
    await Promise.all([
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
      supabase
        .from("players")
        .select("id, name, team_id, position, goals, assists, appearances, minutes_played, yellow_cards, red_cards, top_scorer_odds")
        .order("goals", { ascending: false })
        .order("assists", { ascending: false }),
    ]);

  if (playersError) {
    console.error("[DashboardStatsPage] players error:", playersError);
  }

  const teams = (teamsData ?? []) as TournamentTeamRecord[];
  const players = ((playersData ?? []) as PlayerRecord[]).filter((player) => player.name);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const matches = attachTeamsToMatches((matchesData ?? []) as TournamentMatchRecord[], teams);
  const groupMatches = getGroupMatches(matches);
  const tournamentTeams = buildTournamentTeams(teams as TournamentTeamStateRow[], groupMatches);
  const tournament = buildTournamentStandings(tournamentTeams, groupMatches);
  const standings = Object.values(tournament.groupStandings).flat();
  const liveMatches = matches.filter((match) => match.status === "live").length;

  const scorers = sortPlayers(players, "goals").slice(0, 15);
  const assisters = sortPlayers(players, "assists").slice(0, 15);
  const yellows = sortPlayers(players, "yellow").slice(0, 15);
  const reds = sortPlayers(players, "red").slice(0, 15);
  const topScorerOdds = sortPlayers(players, "topScorerOdds").slice(0, 15);
  const attackTeams = sortTeams(standings, teamsById, "attack").slice(0, 12);
  const defenseTeams = sortTeams(standings, teamsById, "defense").slice(0, 12);
  const pointsTeams = sortTeams(standings, teamsById, "points").slice(0, 12);
  const oddsTeams = sortTeams(standings, teamsById, "odds").slice(0, 12);

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
          className="rounded-full border border-wc-neon/30 bg-[rgba(95,255,123,0.11)] px-4 py-2 text-xs font-black text-wc-neon transition hover:border-wc-neon/55 hover:bg-[rgba(95,255,123,0.17)]"
        >
          כל הנבחרות
        </Link>
      </div>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.13),rgba(111,60,255,0.22)_46%,rgba(8,14,29,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] md:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="wc-kicker">Tables & Stats</p>
            <h1 className="mt-2 font-sans text-4xl font-black tracking-normal text-wc-fg1 md:text-6xl">
              טבלאות וסטטיסטיקות
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-wc-fg2">
              מרכז נקי לכל טבלאות המובילים: שחקנים, נבחרות ויחסים. שערי זכות וחובה מוצגים בנפרד כדי שלא יהיה בלבול RTL.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <SummaryStat label="שחקנים" value={String(players.length)} />
            <SummaryStat label="נבחרות" value={String(teams.length)} />
            <SummaryStat label="משחקי לייב" value={String(liveMatches)} accent="text-cyan-300" />
          </div>
        </div>
      </section>

      <nav className="mt-5 grid gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-2 sm:grid-cols-3">
        <SectionJump href="#players" title="שחקנים" subtitle="שערים, בישולים וכרטיסים" />
        <SectionJump href="#teams" title="נבחרות" subtitle="התקפה, הגנה ונקודות" />
        <SectionJump href="#odds" title="יחסים" subtitle="זכייה ומלך שערים" />
      </nav>

      <section id="players" className="mt-5 scroll-mt-24">
        <SectionBand title="טבלאות שחקנים" eyebrow="Player leaders" />
        <div className="mt-3 grid gap-5 xl:grid-cols-2">
          <PlayerLeaderTable title="מלך השערים" eyebrow="שערים אישיים" players={scorers} teamsById={teamsById} mode="goals" />
          <PlayerLeaderTable title="מלך הבישולים" eyebrow="בישולים" players={assisters} teamsById={teamsById} mode="assists" />
          <PlayerLeaderTable title="צהובים" eyebrow="משמעת" players={yellows} teamsById={teamsById} mode="yellow" />
          <PlayerLeaderTable title="אדומים" eyebrow="משמעת" players={reds} teamsById={teamsById} mode="red" />
        </div>
      </section>

      <section id="teams" className="mt-6 scroll-mt-24">
        <SectionBand title="טבלאות נבחרות" eyebrow="Team leaders" />
        <div className="mt-3 grid gap-5 xl:grid-cols-3">
          <TeamLeaderTable title="התקפה" eyebrow="ממויין לפי שערי זכות" entries={attackTeams} teamsById={teamsById} mode="attack" />
          <TeamLeaderTable title="הגנה" eyebrow="ממויין לפי שערי חובה" entries={defenseTeams} teamsById={teamsById} mode="defense" />
          <TeamLeaderTable title="נקודות" eyebrow="שלב הבתים" entries={pointsTeams} teamsById={teamsById} mode="points" />
        </div>
      </section>

      <section id="odds" className="mt-6 scroll-mt-24">
        <SectionBand title="טבלאות יחסים" eyebrow="API odds" />
        <div className="mt-3 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <PlayerLeaderTable title="יחסי מלך שערים" eyebrow="יתעדכן מה-API" players={topScorerOdds} teamsById={teamsById} mode="topScorerOdds" />
          <TeamLeaderTable title="יחסי זכייה בטורניר" eyebrow="נבחרות" entries={oddsTeams} teamsById={teamsById} mode="odds" />
        </div>
      </section>
    </div>
  );
}

function SectionJump({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a
      href={href}
      className="rounded-[1.05rem] border border-white/10 bg-white/[0.045] px-4 py-3 transition hover:border-wc-neon/35 hover:bg-white/[0.075]"
    >
      <span className="block text-sm font-black text-wc-fg1">{title}</span>
      <span className="mt-1 block text-[11px] font-semibold text-wc-fg3">{subtitle}</span>
    </a>
  );
}

function SectionBand({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(90deg,rgba(95,255,123,0.09),rgba(111,60,255,0.12),rgba(255,255,255,0.03))] px-4 py-3">
      <p className="wc-kicker text-[0.68rem]">{eyebrow}</p>
      <h2 className="mt-1 font-sans text-2xl font-black tracking-normal text-wc-fg1">{title}</h2>
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

function PlayerLeaderTable({
  title,
  eyebrow,
  players,
  teamsById,
  mode,
}: {
  title: string;
  eyebrow: string;
  players: PlayerRecord[];
  teamsById: Map<string, TournamentTeamRecord>;
  mode: PlayerTableMode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
      <TableHeader title={title} eyebrow={eyebrow} />
      {players.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-wc-fg3">
                <th className="px-3 py-2 text-start">#</th>
                <th className="px-3 py-2 text-start">שחקן</th>
                <th className="px-3 py-2 text-start">נבחרת</th>
                <th className="px-3 py-2 text-center">שערים</th>
                <th className="px-3 py-2 text-center">בישולים</th>
                <th className="px-3 py-2 text-center">צהובים</th>
                <th className="px-3 py-2 text-center">אדומים</th>
                <th className="px-3 py-2 text-center">יחס מלך שערים</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const team = player.team_id ? teamsById.get(player.team_id) ?? null : null;
                return (
                  <tr key={player.id} className="border-b border-white/6 last:border-0">
                    <td className="px-3 py-2 font-black text-wc-fg2">{index + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-black text-wc-fg1">{player.name}</p>
                      <p className="text-[11px] text-wc-fg3">{getPositionLabel(player.position)}</p>
                    </td>
                    <td className="px-3 py-2">
                      {team ? (
                        <TeamLink team={team} className="inline-flex items-center gap-2 font-bold text-wc-fg2 transition hover:text-wc-neon">
                          <TeamLogo team={team} />
                          <span>{team.name_he ?? team.name}</span>
                        </TeamLink>
                      ) : (
                        <span className="text-wc-fg3">ללא נבחרת</span>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-center font-black ${mode === "goals" ? "text-wc-neon" : "text-wc-fg1"}`}>{player.goals ?? 0}</td>
                    <td className={`px-3 py-2 text-center ${mode === "assists" ? "font-black text-wc-neon" : "text-wc-fg2"}`}>{player.assists ?? 0}</td>
                    <td className={`px-3 py-2 text-center ${mode === "yellow" ? "font-black text-wc-amber" : "text-wc-fg2"}`}>{player.yellow_cards ?? 0}</td>
                    <td className={`px-3 py-2 text-center ${mode === "red" ? "font-black text-wc-danger" : "text-wc-fg2"}`}>{player.red_cards ?? 0}</td>
                    <td className={`px-3 py-2 text-center font-black ${mode === "topScorerOdds" ? "text-wc-neon" : "text-wc-fg2"}`}>
                      {formatOdds(player.top_scorer_odds)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyPanel title="אין עדיין נתוני שחקנים" description="כאשר נתוני השחקנים יסתנכרנו מה-API, הטבלה תתמלא כאן." />
      )}
    </section>
  );
}

function TeamLeaderTable({
  title,
  eyebrow,
  entries,
  teamsById,
  mode,
}: {
  title: string;
  eyebrow: string;
  entries: TeamStanding[];
  teamsById: Map<string, TournamentTeamRecord>;
  mode: TeamTableMode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
      <TableHeader title={title} eyebrow={eyebrow} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-white/8 text-wc-fg3">
              <th className="px-3 py-2 text-start">#</th>
              <th className="px-3 py-2 text-start">נבחרת</th>
              <th className="px-3 py-2 text-center">מאזן</th>
              <th className="px-3 py-2 text-center">זכות / חובה</th>
              <th className="px-3 py-2 text-center">הפרש</th>
              <th className="px-3 py-2 text-center">נק׳</th>
              <th className="px-3 py-2 text-center">יחס זכייה</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const team = teamsById.get(entry.team.id) ?? entry.team;
              return (
                <tr key={entry.team.id} className="border-b border-white/6 last:border-0">
                  <td className="px-3 py-2 font-black text-wc-fg2">{index + 1}</td>
                  <td className="px-3 py-2">
                    <TeamLink team={team} className="inline-flex items-center gap-2 font-black text-wc-fg1 transition hover:text-wc-neon">
                      <TeamLogo team={team} />
                      <span>{team.name_he ?? team.name}</span>
                    </TeamLink>
                  </td>
                  <td className="px-3 py-2 text-center text-wc-fg2" dir="ltr">{entry.won}-{entry.drawn}-{entry.lost}</td>
                  <td className="px-3 py-2 text-center">
                    <GoalsForAgainst
                      goalsFor={entry.gf}
                      goalsAgainst={entry.ga}
                      highlight={mode === "attack" ? "for" : mode === "defense" ? "against" : "none"}
                    />
                  </td>
                  <td className="px-3 py-2 text-center text-wc-fg2">
                    <SignedNumber value={entry.gd} />
                  </td>
                  <td className={`px-3 py-2 text-center ${mode === "points" ? "font-black text-wc-neon" : "font-black text-wc-fg1"}`}>{entry.pts}</td>
                  <td className={`px-3 py-2 text-center font-black ${mode === "odds" ? "text-wc-neon" : "text-wc-fg2"}`}>
                    {formatOdds((team as TournamentTeamRecord).outright_odds)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableHeader({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="border-b border-white/8 bg-white/[0.025] px-4 py-3">
      <p className="wc-kicker text-[0.68rem]">{eyebrow}</p>
      <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
    </div>
  );
}

function TeamLogo({ team }: { team: Pick<TournamentTeamRecord, "name" | "name_he" | "logo_url"> }) {
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

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="m-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.035] p-4">
      <p className="text-sm font-black text-wc-fg1">{title}</p>
      <p className="mt-1 text-xs leading-6 text-wc-fg3">{description}</p>
    </div>
  );
}

function sortPlayers(players: PlayerRecord[], mode: PlayerTableMode) {
  const withAnyOdds = players.filter((player) =>
    mode === "topScorerOdds" ? Number.isFinite(Number(player.top_scorer_odds)) : true,
  );

  return withAnyOdds.slice().sort((left, right) => {
    if (mode === "topScorerOdds") {
      return Number(left.top_scorer_odds) - Number(right.top_scorer_odds);
    }
    if (mode === "assists") {
      return (right.assists ?? 0) - (left.assists ?? 0) || (right.goals ?? 0) - (left.goals ?? 0) || comparePlayerNames(left, right);
    }
    if (mode === "yellow") {
      return (right.yellow_cards ?? 0) - (left.yellow_cards ?? 0) || (right.red_cards ?? 0) - (left.red_cards ?? 0) || comparePlayerNames(left, right);
    }
    if (mode === "red") {
      return (right.red_cards ?? 0) - (left.red_cards ?? 0) || (right.yellow_cards ?? 0) - (left.yellow_cards ?? 0) || comparePlayerNames(left, right);
    }
    return (right.goals ?? 0) - (left.goals ?? 0) || (right.assists ?? 0) - (left.assists ?? 0) || comparePlayerNames(left, right);
  });
}

function sortTeams(
  entries: TeamStanding[],
  teamsById: Map<string, TournamentTeamRecord>,
  mode: TeamTableMode,
) {
  return entries.slice().sort((left, right) => {
    if (mode === "odds") {
      const leftTeam = teamsById.get(left.team.id);
      const rightTeam = teamsById.get(right.team.id);
      const leftOdds = Number(leftTeam?.outright_odds);
      const rightOdds = Number(rightTeam?.outright_odds);
      if (Number.isFinite(leftOdds) && Number.isFinite(rightOdds)) return leftOdds - rightOdds;
      if (Number.isFinite(leftOdds)) return -1;
      if (Number.isFinite(rightOdds)) return 1;
    }
    if (mode === "defense") {
      return left.ga - right.ga || right.gd - left.gd || right.pts - left.pts || compareTeamNames(left, right);
    }
    if (mode === "points") {
      return right.pts - left.pts || right.gd - left.gd || right.gf - left.gf || compareTeamNames(left, right);
    }
    return right.gf - left.gf || right.gd - left.gd || right.pts - left.pts || compareTeamNames(left, right);
  });
}

function comparePlayerNames(left: PlayerRecord, right: PlayerRecord) {
  return left.name.localeCompare(right.name, "he");
}

function compareTeamNames(left: TeamStanding, right: TeamStanding) {
  const leftName = left.team.name_he ?? left.team.name;
  const rightName = right.team.name_he ?? right.team.name;
  return leftName.localeCompare(rightName, "he");
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

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם עודכן";
  return numeric.toFixed(2);
}

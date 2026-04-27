import Link from "next/link";
import CompactLeaderTable, {
  type CompactLeaderRow,
  type CompactLeaderTeam,
} from "@/components/stats/CompactLeaderTable";
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
  photo_url?: string | null;
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
        .select("id, name, team_id, position, photo_url, goals, assists, appearances, minutes_played, yellow_cards, red_cards, top_scorer_odds")
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

  const playerTables = [
    {
      id: "goals",
      title: "מלך השערים",
      eyebrow: "שחקן / נבחרת / שערים",
      rows: buildPlayerRows(sortPlayers(players, "goals"), teamsById, "goals"),
    },
    {
      id: "assists",
      title: "מלך הבישולים",
      eyebrow: "שחקן / נבחרת / בישולים",
      rows: buildPlayerRows(sortPlayers(players, "assists"), teamsById, "assists"),
    },
    {
      id: "yellow",
      title: "צהובים",
      eyebrow: "שחקן / נבחרת / כרטיסים",
      rows: buildPlayerRows(sortPlayers(players, "yellow"), teamsById, "yellow"),
    },
    {
      id: "red",
      title: "אדומים",
      eyebrow: "שחקן / נבחרת / כרטיסים",
      rows: buildPlayerRows(sortPlayers(players, "red"), teamsById, "red"),
    },
  ];

  const teamTables = [
    {
      id: "attack",
      title: "התקפה",
      eyebrow: "נבחרת / שערי זכות",
      rows: buildTeamRows(sortTeams(standings, teamsById, "attack"), teamsById, "attack"),
    },
    {
      id: "defense",
      title: "הגנה",
      eyebrow: "נבחרת / שערי חובה",
      rows: buildTeamRows(sortTeams(standings, teamsById, "defense"), teamsById, "defense"),
    },
    {
      id: "points",
      title: "נקודות",
      eyebrow: "נבחרת / נקודות בבית",
      rows: buildTeamRows(sortTeams(standings, teamsById, "points"), teamsById, "points"),
    },
  ];

  const oddsTables = [
    {
      id: "topScorerOdds",
      title: "יחסי מלך שערים",
      eyebrow: "שחקן / נבחרת / יחס",
      rows: buildPlayerRows(sortPlayers(players, "topScorerOdds"), teamsById, "topScorerOdds"),
    },
    {
      id: "outrightOdds",
      title: "יחסי זכייה בטורניר",
      eyebrow: "נבחרת / יחס זכייה",
      rows: buildTeamRows(sortTeams(standings, teamsById, "odds"), teamsById, "odds"),
    },
  ];

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
              כל טבלה מציגה רק את מה שצריך: השחקן או הנבחרת, השיוך, והמדד הרלוונטי.
              כברירת מחדל מוצגים שלושת המובילים, וניתן לפתוח Top 10 לכל פרמטר.
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
          {playerTables.map((table) => (
            <CompactLeaderTable
              key={table.id}
              title={table.title}
              eyebrow={table.eyebrow}
              rows={table.rows}
              emptyTitle="אין עדיין נתוני שחקנים"
              emptyDescription="הטבלה תתמלא אחרי סנכרון נתוני השחקנים."
            />
          ))}
        </div>
      </section>

      <section id="teams" className="mt-6 scroll-mt-24">
        <SectionBand title="טבלאות נבחרות" eyebrow="Team leaders" />
        <div className="mt-3 grid gap-5 xl:grid-cols-3">
          {teamTables.map((table) => (
            <CompactLeaderTable
              key={table.id}
              title={table.title}
              eyebrow={table.eyebrow}
              rows={table.rows}
              emptyTitle="אין עדיין נתוני נבחרות"
              emptyDescription="טבלאות הנבחרות יתעדכנו מתוך טבלת הטורניר."
            />
          ))}
        </div>
      </section>

      <section id="odds" className="mt-6 scroll-mt-24">
        <SectionBand title="טבלאות יחסים" eyebrow="API odds" />
        <div className="mt-3 grid gap-5 xl:grid-cols-2">
          {oddsTables.map((table) => (
            <CompactLeaderTable
              key={table.id}
              title={table.title}
              eyebrow={table.eyebrow}
              rows={table.rows}
              emptyTitle="אין עדיין יחסים"
              emptyDescription="היחסים יופיעו אחרי סנכרון API או מילוי ב-Dev Tools."
            />
          ))}
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

function buildPlayerRows(
  players: PlayerRecord[],
  teamsById: Map<string, TournamentTeamRecord>,
  mode: PlayerTableMode,
): CompactLeaderRow[] {
  return players.slice(0, 10).map((player) => {
    const team = player.team_id ? teamsById.get(player.team_id) ?? null : null;
    return {
      id: String(player.id),
      title: player.name,
      subtitle: getPositionLabel(player.position),
      imageUrl: player.photo_url ?? null,
      imageAlt: player.name,
      team: team ? toCompactTeam(team) : null,
      metricLabel: getPlayerMetricLabel(mode),
      metricValue: getPlayerMetricValue(player, mode),
      metricTone: getPlayerMetricTone(mode),
    };
  });
}

function buildTeamRows(
  entries: TeamStanding[],
  teamsById: Map<string, TournamentTeamRecord>,
  mode: TeamTableMode,
): CompactLeaderRow[] {
  return entries.slice(0, 10).map((entry) => {
    const team = teamsById.get(entry.team.id) ?? entry.team;
    return {
      id: team.id,
      title: team.name_he ?? team.name,
      subtitle: team.group_letter ? `בית ${team.group_letter}` : null,
      imageUrl: team.logo_url,
      imageAlt: team.name_he ?? team.name,
      team: toCompactTeam(team),
      metricLabel: getTeamMetricLabel(mode),
      metricValue: getTeamMetricValue(entry, team, mode),
      metricTone: getTeamMetricTone(mode),
    };
  });
}

function sortPlayers(players: PlayerRecord[], mode: PlayerTableMode) {
  const relevantPlayers = players.filter((player) =>
    mode === "topScorerOdds" ? Number.isFinite(Number(player.top_scorer_odds)) : true,
  );

  return relevantPlayers.slice().sort((left, right) => {
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
      const leftOdds = Number(teamsById.get(left.team.id)?.outright_odds);
      const rightOdds = Number(teamsById.get(right.team.id)?.outright_odds);
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

function getPlayerMetricLabel(mode: PlayerTableMode) {
  if (mode === "assists") return "בישולים";
  if (mode === "yellow") return "צהובים";
  if (mode === "red") return "אדומים";
  if (mode === "topScorerOdds") return "יחס";
  return "שערים";
}

function getPlayerMetricValue(player: PlayerRecord, mode: PlayerTableMode) {
  if (mode === "assists") return String(player.assists ?? 0);
  if (mode === "yellow") return String(player.yellow_cards ?? 0);
  if (mode === "red") return String(player.red_cards ?? 0);
  if (mode === "topScorerOdds") return formatOdds(player.top_scorer_odds);
  return String(player.goals ?? 0);
}

function getPlayerMetricTone(mode: PlayerTableMode): CompactLeaderRow["metricTone"] {
  if (mode === "yellow") return "amber";
  if (mode === "red") return "red";
  if (mode === "topScorerOdds") return "cyan";
  return "green";
}

function getTeamMetricLabel(mode: TeamTableMode) {
  if (mode === "defense") return "חובה";
  if (mode === "points") return "נקודות";
  if (mode === "odds") return "יחס";
  return "זכות";
}

function getTeamMetricValue(entry: TeamStanding, team: TournamentTeamRecord, mode: TeamTableMode) {
  if (mode === "defense") return String(entry.ga);
  if (mode === "points") return String(entry.pts);
  if (mode === "odds") return formatOdds(team.outright_odds);
  return String(entry.gf);
}

function getTeamMetricTone(mode: TeamTableMode): CompactLeaderRow["metricTone"] {
  if (mode === "defense") return "cyan";
  if (mode === "odds") return "amber";
  return "green";
}

function toCompactTeam(team: TournamentTeamRecord): CompactLeaderTeam {
  return {
    id: team.id,
    name: team.name,
    name_he: team.name_he,
    logo_url: team.logo_url,
  };
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
  if (value === null || value === undefined || value === "") return "לא עודכן";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "לא עודכן";
  return numeric.toFixed(2);
}

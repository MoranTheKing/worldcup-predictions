import Image from "next/image";
import Link from "next/link";
import TeamLink from "@/components/TeamLink";
import { createClient } from "@/lib/supabase/server";
import { determineKnockoutLoserId, determineKnockoutWinnerId } from "@/lib/tournament/knockout-utils";
import {
  attachTeamsToMatches,
  getMatchStageKind,
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

type TeamRecord = TournamentTeamRecord & {
  bzzoiro_team_id?: string | null;
  coach_name?: string | null;
  bzzoiro_synced_at?: string | null;
};

type PlayerTeamRef = {
  team_id: string | null;
};

type RecentMatchRecord = {
  team_id: string;
  result: "win" | "draw" | "loss";
  played_at: string;
};

type TeamForm = {
  count: number;
  score: number;
  wins: number;
  draws: number;
  losses: number;
  items: Array<"W" | "D" | "L">;
};

type PodiumPlacement = {
  label: string;
  rank: number;
  className: string;
};

export default async function TeamsIndexPage() {
  const supabase = await createClient();

  const [{ data: teamsData }, { data: matchesData }, { data: playersData }, { data: recentMatchesData }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, name_he, logo_url, group_letter, fair_play_score, fifa_ranking, is_eliminated, outright_odds, outright_odds_updated_at, bzzoiro_team_id, coach_name, bzzoiro_synced_at")
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
      supabase.from("players").select("team_id"),
      supabase
        .from("team_recent_matches")
        .select("team_id, result, played_at")
        .order("played_at", { ascending: false }),
    ]);

  const teams = (teamsData ?? []) as TeamRecord[];
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

  const placementByTeamId = buildPodiumPlacements(matches);
  const playersByTeamId = countPlayersByTeam((playersData ?? []) as PlayerTeamRef[]);
  const recentByTeamId = groupRecentMatches((recentMatchesData ?? []) as RecentMatchRecord[]);
  const teamsWithSquad = [...playersByTeamId.values()].filter((count) => count > 0).length;
  const teamsWithCoach = teams.filter((team) => Boolean(team.coach_name)).length;
  const teamsWithRecentForm = [...recentByTeamId.values()].filter((matches) => matches.length > 0).length;
  const eliminatedTeams = teams.filter((team) =>
    isTeamInactive(team, standingsByTeamId.get(team.id) ?? null, placementByTeamId.get(team.id) ?? null),
  ).length;
  const liveMatches = matches.filter((match) => match.status === "live").length;
  const oddsLeaders = teams
    .filter((team) => Number.isFinite(Number(team.outright_odds)))
    .sort((left, right) => Number(left.outright_odds) - Number(right.outright_odds))
    .slice(0, 6);
  const formLeaders = teams
    .map((team) => ({
      team,
      standing: standingsByTeamId.get(team.id) ?? null,
      form: buildTeamForm(recentByTeamId.get(team.id) ?? []),
    }))
    .filter((item) => item.form.count > 0)
    .sort((left, right) => right.form.score - left.form.score || getTeamName(left.team).localeCompare(getTeamName(right.team), "he"))
    .slice(0, 6);
  const directoryTeams = teams
    .slice()
    .sort((left, right) => {
      const leftStanding = standingsByTeamId.get(left.id) ?? null;
      const rightStanding = standingsByTeamId.get(right.id) ?? null;
      const leftInactive = isTeamInactive(left, leftStanding, placementByTeamId.get(left.id) ?? null);
      const rightInactive = isTeamInactive(right, rightStanding, placementByTeamId.get(right.id) ?? null);
      const leftPlacement = placementByTeamId.get(left.id)?.rank ?? 99;
      const rightPlacement = placementByTeamId.get(right.id)?.rank ?? 99;

      if (leftInactive !== rightInactive) return leftInactive ? 1 : -1;
      if (leftPlacement !== rightPlacement) return leftPlacement - rightPlacement;
      if ((left.group_letter ?? "") !== (right.group_letter ?? "")) {
        return String(left.group_letter ?? "").localeCompare(String(right.group_letter ?? ""), "he");
      }
      return (leftStanding?.rank ?? 99) - (rightStanding?.rank ?? 99) || getTeamName(left).localeCompare(getTeamName(right), "he");
    });

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
              מרכז אחד לכל הנבחרות: כניסה מהירה לפרופיל, סגל, סטטיסטיקות, כושר אחרון ויחסי זכייה. נבחרת שהודחה תישאר נגישה, אבל תופיע בשקט כדי לא להעמיס על העין.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="#all-teams"
                className="rounded-full border border-wc-neon/30 bg-[rgba(95,255,123,0.11)] px-4 py-2 text-xs font-black text-wc-neon transition hover:border-wc-neon/55 hover:bg-[rgba(95,255,123,0.17)]"
              >
                כל הנבחרות
              </Link>
              <Link
                href="/dashboard/stats#odds"
                className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-black text-wc-fg1 transition hover:border-wc-neon/40 hover:text-wc-neon"
              >
                טבלאות היחסים
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[28rem]">
            <SummaryStat label="נבחרות" value={String(teams.length)} />
            <SummaryStat label="פעילות" value={String(teams.length - eliminatedTeams)} accent="text-wc-neon" />
            <SummaryStat label="משחקי לייב" value={String(liveMatches)} accent="text-cyan-300" />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard label="סגלים מסונכרנים" value={`${teamsWithSquad}/${teams.length}`} sub="שחקנים ותמונות מה-API" />
        <InsightCard label="מאמנים" value={`${teamsWithCoach}/${teams.length}`} sub="שם ותמונה כשיש מקור" />
        <InsightCard label="כושר אחרון" value={`${teamsWithRecentForm}/${teams.length}`} sub="5 משחקים אחרונים לנבחרת" />
        <InsightCard label="הודחו" value={String(eliminatedTeams)} sub="נשארות באפור בעמוד" tone="muted" />
      </section>

      {oddsLeaders.length > 0 ? (
        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
          <SectionHeader title="יחסים מובילים" eyebrow="זכייה בטורניר" />
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {oddsLeaders.map((team, index) => (
              <TeamOddsCard
                key={team.id}
                team={team}
                standing={standingsByTeamId.get(team.id) ?? null}
                placement={placementByTeamId.get(team.id) ?? null}
                rank={index + 1}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="כושר API" eyebrow="5 המשחקים האחרונים" />
        {formLeaders.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {formLeaders.map(({ team, standing, form }) => (
              <FormTeamCard
                key={team.id}
                team={team}
                standing={standing}
                form={form}
                placement={placementByTeamId.get(team.id) ?? null}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="עדיין אין משחקים אחרונים מסונכרנים"
            description="אחרי סנכרון BSD, כאן יוצגו נבחרות עם כושר אחרון לפי משחקים רשמיים/ידידותיים שהסתיימו לפני הטורניר."
          />
        )}
      </section>

      <section id="all-teams" className="mt-5 scroll-mt-24 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="אינדקס הנבחרות" eyebrow="לחיצה לכל עמוד נבחרת" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {directoryTeams.map((team) => {
            const standing = standingsByTeamId.get(team.id) ?? null;
            return (
              <TeamDirectoryCard
                key={team.id}
                team={team}
                standing={standing}
                playerCount={playersByTeamId.get(team.id) ?? 0}
                form={buildTeamForm(recentByTeamId.get(team.id) ?? [])}
                placement={placementByTeamId.get(team.id) ?? null}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TeamDirectoryCard({
  team,
  standing,
  playerCount,
  form,
  placement,
}: {
  team: TeamRecord;
  standing: TeamStanding | null;
  playerCount: number;
  form: TeamForm;
  placement: PodiumPlacement | null;
}) {
  const displayName = getTeamName(team);
  const status = getStatus(team, standing, placement);
  const inactive = isTeamInactive(team, standing, placement);

  return (
    <TeamLink
      team={team}
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.15rem] border px-3 py-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055] ${
        inactive
          ? "border-white/6 bg-white/[0.025] opacity-55 grayscale hover:opacity-80"
          : "border-white/10 bg-black/14"
      }`}
    >
      <TeamLogo team={team} muted={inactive} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-wc-fg1">{displayName}</span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-wc-fg3">
          <span className={`rounded-full px-2 py-0.5 font-black ${status.className}`}>{status.label}</span>
          {standing ? <span>מקום {standing.rank}</span> : null}
          {team.group_letter ? <span>בית {team.group_letter}</span> : null}
          <span>{playerCount} שחקנים</span>
        </span>
      </span>
      <span className="text-left">
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-wc-fg3">יחס</span>
        <span className={`block font-sans text-xl font-black ${inactive ? "text-wc-fg3" : "text-wc-neon"}`}>
          {formatOdds(team.outright_odds)}
        </span>
        <FormDots form={form} compact />
      </span>
    </TeamLink>
  );
}

function TeamOddsCard({
  team,
  standing,
  placement,
  rank,
}: {
  team: TeamRecord;
  standing: TeamStanding | null;
  placement: PodiumPlacement | null;
  rank: number;
}) {
  const inactive = isTeamInactive(team, standing, placement);

  return (
    <TeamLink
      team={team}
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.1rem] border px-3 py-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055] ${
        inactive ? "border-white/6 bg-white/[0.025] opacity-55 grayscale hover:opacity-80" : "border-white/10 bg-black/14"
      }`}
    >
      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-xs font-black text-wc-fg2">
        {rank}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <TeamLogo team={team} muted={inactive} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-black text-wc-fg1">{getTeamName(team)}</span>
          <span className="block text-[11px] text-wc-fg3">
            {team.group_letter ? `בית ${team.group_letter}` : "ללא בית"}
            {standing ? ` · מקום ${standing.rank}` : ""}
          </span>
        </span>
      </span>
      <span className={`font-sans text-2xl font-black ${inactive ? "text-wc-fg3" : "text-wc-neon"}`}>
        {formatOdds(team.outright_odds)}
      </span>
    </TeamLink>
  );
}

function FormTeamCard({
  team,
  standing,
  form,
  placement,
}: {
  team: TeamRecord;
  standing: TeamStanding | null;
  form: TeamForm;
  placement: PodiumPlacement | null;
}) {
  const inactive = isTeamInactive(team, standing, placement);

  return (
    <TeamLink
      team={team}
      className={`rounded-[1.25rem] border p-4 transition hover:border-wc-neon/35 hover:bg-white/[0.055] ${
        inactive ? "border-white/6 bg-white/[0.025] opacity-60 grayscale hover:opacity-85" : "border-white/10 bg-black/14"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <TeamLogo team={team} muted={inactive} />
          <span className="truncate text-sm font-black text-wc-fg1">{getTeamName(team)}</span>
        </span>
        <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-black text-wc-fg3">
          {form.score} נק׳ כושר
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <FormDots form={form} />
        <span className="text-xs font-bold text-wc-fg3">
          {form.wins} ניצ׳ · {form.draws} תיקו · {form.losses} הפס׳
        </span>
      </div>
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

function InsightCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "muted";
}) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className={`mt-2 font-sans text-3xl font-black tracking-normal ${tone === "muted" ? "text-wc-fg3" : "text-wc-neon"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-wc-fg3">{sub}</p>
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

function TeamLogo({ team, muted = false }: { team: TeamRecord; muted?: boolean }) {
  const displayName = getTeamName(team);

  return (
    <span className="grid h-8 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-white/10">
      {team.logo_url ? (
        <Image
          src={team.logo_url}
          alt={displayName}
          width={44}
          height={30}
          style={{ width: 44, height: 30 }}
          className={`h-full w-full object-cover ${muted ? "grayscale" : ""}`}
          unoptimized
        />
      ) : (
        <span className="text-[10px] font-black text-wc-fg2">{displayName.slice(0, 1)}</span>
      )}
    </span>
  );
}

function FormDots({ form, compact = false }: { form: TeamForm; compact?: boolean }) {
  if (form.count === 0) {
    return compact ? null : <span className="text-xs font-bold text-wc-fg3">אין כושר</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${compact ? "mt-1 justify-end" : ""}`}>
      {form.items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={`grid place-items-center rounded-full text-[10px] font-black ${
            compact ? "h-4 w-4" : "h-6 w-6"
          } ${getFormClass(item)}`}
        >
          {item}
        </span>
      ))}
    </span>
  );
}

function getStatus(team: TeamRecord, standing: TeamStanding | null, placement: PodiumPlacement | null) {
  if (placement) {
    return {
      label: placement.label,
      className: placement.className,
    };
  }

  if (isTeamInactive(team, standing, placement)) {
    return {
      label: "הודחה",
      className: "bg-white/8 text-wc-fg3",
    };
  }

  if (standing?.lockedRank !== null && standing?.lockedRank !== undefined) {
    return {
      label: `מקום ${standing.lockedRank}`,
      className:
        standing.lockedRank <= 2
          ? "bg-[rgba(95,255,123,0.14)] text-wc-neon"
          : "bg-white/8 text-wc-fg3",
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

function isTeamInactive(team: TeamRecord, standing: TeamStanding | null, placement: PodiumPlacement | null) {
  if (placement) return false;
  return team.is_eliminated === true || standing?.status === "eliminated" || (standing?.lockedRank !== null && standing?.lockedRank !== undefined && standing.lockedRank >= 4);
}

function buildPodiumPlacements(matches: TournamentMatchRecord[]) {
  const placements = new Map<string, PodiumPlacement>();
  const final = matches.find((match) => getMatchStageKind(match.stage) === "final" && match.status === "finished");
  const thirdPlace = matches.find((match) => getMatchStageKind(match.stage) === "third_place" && match.status === "finished");

  if (final) {
    const winner = determineKnockoutWinnerId(final, final.home_team_id, final.away_team_id);
    const runnerUp = determineKnockoutLoserId(final, final.home_team_id, final.away_team_id);
    if (winner) {
      placements.set(winner, {
        label: "אלופה",
        rank: 1,
        className: "bg-[rgba(95,255,123,0.16)] text-wc-neon",
      });
    }
    if (runnerUp) {
      placements.set(runnerUp, {
        label: "סגנית",
        rank: 2,
        className: "bg-[rgba(125,211,252,0.16)] text-cyan-300",
      });
    }
  }

  if (thirdPlace) {
    const third = determineKnockoutWinnerId(thirdPlace, thirdPlace.home_team_id, thirdPlace.away_team_id);
    const fourth = determineKnockoutLoserId(thirdPlace, thirdPlace.home_team_id, thirdPlace.away_team_id);
    if (third) {
      placements.set(third, {
        label: "מקום 3",
        rank: 3,
        className: "bg-[rgba(255,182,73,0.16)] text-wc-amber",
      });
    }
    if (fourth) {
      placements.set(fourth, {
        label: "מקום 4",
        rank: 4,
        className: "bg-white/10 text-wc-fg2",
      });
    }
  }

  return placements;
}

function countPlayersByTeam(players: PlayerTeamRef[]) {
  const counts = new Map<string, number>();

  for (const player of players) {
    if (!player.team_id) continue;
    counts.set(player.team_id, (counts.get(player.team_id) ?? 0) + 1);
  }

  return counts;
}

function groupRecentMatches(matches: RecentMatchRecord[]) {
  const groups = new Map<string, RecentMatchRecord[]>();

  for (const match of matches) {
    groups.set(match.team_id, [...(groups.get(match.team_id) ?? []), match]);
  }

  for (const [teamId, teamMatches] of groups) {
    groups.set(
      teamId,
      teamMatches
        .slice()
        .sort((left, right) => new Date(right.played_at).getTime() - new Date(left.played_at).getTime())
        .slice(0, 5),
    );
  }

  return groups;
}

function buildTeamForm(matches: RecentMatchRecord[]): TeamForm {
  const items = matches.slice(0, 5).map((match) => {
    if (match.result === "win") return "W";
    if (match.result === "loss") return "L";
    return "D";
  });
  const wins = items.filter((item) => item === "W").length;
  const draws = items.filter((item) => item === "D").length;
  const losses = items.filter((item) => item === "L").length;

  return {
    count: items.length,
    score: wins * 3 + draws,
    wins,
    draws,
    losses,
    items,
  };
}

function getFormClass(item: "W" | "D" | "L") {
  if (item === "W") return "bg-[rgba(95,255,123,0.14)] text-wc-neon";
  if (item === "L") return "bg-[rgba(255,92,130,0.14)] text-wc-danger";
  return "bg-[rgba(255,182,73,0.14)] text-wc-amber";
}

function getTeamName(team: Pick<TeamRecord, "name" | "name_he">) {
  return team.name_he ?? team.name;
}

function formatOdds(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "טרם";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "טרם";
  return numeric.toFixed(2);
}

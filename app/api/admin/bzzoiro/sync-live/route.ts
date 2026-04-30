import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bzzoiroGetPaginated } from "@/lib/bzzoiro/client";
import { normalizeTeamNameKey } from "@/lib/i18n/team-names";
import {
  clearUnfinishedMatchScoring,
  scoreFinishedMatchPredictions,
} from "@/lib/game/scoring-sync";
import { isAuthorizedAdminRequest } from "@/lib/security/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncTournamentState } from "@/lib/tournament/knockout-progression";

export const dynamic = "force-dynamic";

type LocalMatchRow = {
  match_number: number;
  date_time: string | null;
  status: string | null;
  match_phase: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_score: number | null;
  away_score: number | null;
  home_odds: number | string | null;
  draw_odds: number | string | null;
  away_odds: number | string | null;
  minute: number | null;
  is_extra_time: boolean | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
};

type LocalTeamRow = {
  id: string;
  name: string | null;
  name_he: string | null;
  bzzoiro_team_id: string | null;
};

type BzzoiroSyncEvent = {
  id?: number | string | null;
  event_date?: string | null;
  date?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  away_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  status?: string | null;
  period?: string | null;
  current_minute?: number | string | null;
  minute?: number | string | null;
  home_score?: number | string | null;
  away_score?: number | string | null;
  odds_home?: number | string | null;
  odds_draw?: number | string | null;
  odds_away?: number | string | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
  penalty_shootout?: unknown;
};

type MatchUpdate = Partial<Pick<
  LocalMatchRow,
  | "status"
  | "match_phase"
  | "home_score"
  | "away_score"
  | "home_odds"
  | "draw_odds"
  | "away_odds"
  | "minute"
  | "is_extra_time"
  | "home_penalty_score"
  | "away_penalty_score"
>>;

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "Missing BSD_WORLD_CUP_LEAGUE_ID" }, { status: 500 });
  }

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("date_from") ?? shiftDate(todayKey(), -1);
  const dateTo = url.searchParams.get("date_to") ?? shiftDate(todayKey(), 1);
  const supabase = createAdminClient();
  const [{ data: matchesData, error: matchesError }, { data: teamsData, error: teamsError }, events] =
    await Promise.all([
      supabase
        .from("matches")
        .select(`
          match_number,
          date_time,
          status,
          match_phase,
          home_team_id,
          away_team_id,
          home_placeholder,
          away_placeholder,
          home_score,
          away_score,
          home_odds,
          draw_odds,
          away_odds,
          minute,
          is_extra_time,
          home_penalty_score,
          away_penalty_score
        `)
        .order("date_time", { ascending: true }),
      supabase.from("teams").select("id, name, name_he, bzzoiro_team_id"),
      fetchBzzoiroEvents(leagueId, dateFrom, dateTo),
    ]);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const teamsById = new Map(((teamsData ?? []) as LocalTeamRow[]).map((team) => [team.id, team]));
  const matches = ((matchesData ?? []) as LocalMatchRow[]).filter((match) => match.date_time);
  const eventByMatchNumber = matchEventsToLocalMatches(matches, teamsById, events);
  const updatedMatchNumbers: number[] = [];
  const finishedMatchNumbers: number[] = [];
  const unfinishedMatchNumbers: number[] = [];
  let skippedUnchanged = 0;

  for (const match of matches) {
    const event = eventByMatchNumber.get(match.match_number);
    if (!event) continue;

    const update = buildMatchUpdate(match, event);
    if (Object.keys(update).length === 0) {
      skippedUnchanged += 1;
      continue;
    }

    const nextStatus = update.status ?? match.status;
    const { error } = await supabase
      .from("matches")
      .update(update)
      .eq("match_number", match.match_number);

    if (error) {
      return NextResponse.json(
        { error: error.message, match: match.match_number, event: event.id ?? null },
        { status: 500 },
      );
    }

    updatedMatchNumbers.push(match.match_number);
    if (nextStatus === "finished") finishedMatchNumbers.push(match.match_number);
    if (match.status === "finished" && nextStatus !== "finished") unfinishedMatchNumbers.push(match.match_number);
  }

  const tournamentSync = await syncTournamentState(supabase);
  const scoring =
    finishedMatchNumbers.length > 0
      ? await scoreFinishedMatchPredictions(supabase, finishedMatchNumbers)
      : null;
  const clearedScoring =
    unfinishedMatchNumbers.length > 0
      ? await clearUnfinishedMatchScoring(supabase, unfinishedMatchNumbers)
      : null;

  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/game/leagues");
  revalidatePath("/game/leaderboard");
  revalidatePath("/dev-tools");

  return NextResponse.json({
    dateFrom,
    dateTo,
    eventsChecked: events.length,
    updated: updatedMatchNumbers.length,
    updatedMatchNumbers,
    skippedUnchanged,
    finishedMatchNumbers,
    unfinishedMatchNumbers,
    tournamentSync,
    scoring,
    clearedScoring,
  });
}

async function fetchBzzoiroEvents(leagueId: string, dateFrom: string, dateTo: string) {
  const [windowEvents, liveEvents] = await Promise.all([
    bzzoiroGetPaginated<BzzoiroSyncEvent>(
      "/events/",
      { league: leagueId, date_from: dateFrom, date_to: dateTo, tz: "Asia/Jerusalem", full: true },
      4,
    ),
    bzzoiroGetPaginated<BzzoiroSyncEvent>(
      "/live/",
      { league: leagueId, tz: "Asia/Jerusalem", full: true },
      2,
    ),
  ]);

  const byId = new Map<string, BzzoiroSyncEvent>();
  for (const event of windowEvents) {
    const key = getEventKey(event);
    if (key) byId.set(key, event);
  }

  for (const event of liveEvents) {
    const key = getEventKey(event);
    if (key) byId.set(key, { ...(byId.get(key) ?? {}), ...event });
  }

  return Array.from(byId.values());
}

function matchEventsToLocalMatches(
  matches: LocalMatchRow[],
  teamsById: Map<string, LocalTeamRow>,
  events: BzzoiroSyncEvent[],
) {
  const result = new Map<number, BzzoiroSyncEvent>();
  const usedEventKeys = new Set<string>();

  for (const match of matches) {
    const candidate = findBestEventForMatch(match, teamsById, events, usedEventKeys);
    if (!candidate) continue;

    const key = getEventKey(candidate.event);
    if (key) usedEventKeys.add(key);
    result.set(match.match_number, candidate.event);
  }

  return result;
}

function findBestEventForMatch(
  match: LocalMatchRow,
  teamsById: Map<string, LocalTeamRow>,
  events: BzzoiroSyncEvent[],
  usedEventKeys: Set<string>,
) {
  const matchTime = match.date_time ? new Date(match.date_time).getTime() : Number.NaN;
  if (!Number.isFinite(matchTime)) return null;

  const homeTeam = match.home_team_id ? teamsById.get(match.home_team_id) ?? null : null;
  const awayTeam = match.away_team_id ? teamsById.get(match.away_team_id) ?? null : null;
  const homeKeys = homeTeam ? buildTeamKeys(homeTeam) : new Set<string>();
  const awayKeys = awayTeam ? buildTeamKeys(awayTeam) : new Set<string>();
  const homePlaceholder = normalizePlaceholder(match.home_placeholder);
  const awayPlaceholder = normalizePlaceholder(match.away_placeholder);

  return events
    .map((event) => {
      const eventKey = getEventKey(event);
      if (eventKey && usedEventKeys.has(eventKey)) return null;

      const eventTime = new Date(event.event_date ?? event.date ?? "").getTime();
      const timeDistance = Number.isFinite(eventTime) ? Math.abs(eventTime - matchTime) : Infinity;
      if (timeDistance > 36 * 60 * 60 * 1000) return null;

      const idsMatch =
        homeTeam !== null &&
        awayTeam !== null &&
        sameId(event.home_team_obj?.id, homeTeam.bzzoiro_team_id) &&
        sameId(event.away_team_obj?.id, awayTeam.bzzoiro_team_id);
      const namesMatch =
        homeTeam !== null &&
        awayTeam !== null &&
        homeKeys.has(normalizeTeamNameKey(event.home_team_obj?.name ?? event.home_team)) &&
        awayKeys.has(normalizeTeamNameKey(event.away_team_obj?.name ?? event.away_team));
      const placeholdersMatch =
        Boolean(homePlaceholder && awayPlaceholder) &&
        homePlaceholder === normalizePlaceholder(event.home_team_obj?.name ?? event.home_team) &&
        awayPlaceholder === normalizePlaceholder(event.away_team_obj?.name ?? event.away_team);

      if (!idsMatch && !namesMatch && !placeholdersMatch) return null;

      return {
        event,
        score:
          (idsMatch ? 30_000 : 0) +
          (namesMatch ? 20_000 : 0) +
          (placeholdersMatch ? 12_000 : 0) -
          timeDistance / 60_000,
        timeDistance,
      };
    })
    .filter((candidate): candidate is { event: BzzoiroSyncEvent; score: number; timeDistance: number } => candidate !== null)
    .sort((left, right) => right.score - left.score || left.timeDistance - right.timeDistance)[0] ?? null;
}

function buildMatchUpdate(match: LocalMatchRow, event: BzzoiroSyncEvent): MatchUpdate {
  const nextStatus = mapBzzoiroStatus(event.status);
  const nextHomeScore = readScore(event.home_score) ?? (nextStatus === "scheduled" ? 0 : match.home_score ?? 0);
  const nextAwayScore = readScore(event.away_score) ?? (nextStatus === "scheduled" ? 0 : match.away_score ?? 0);
  const nextMinute = nextStatus === "live"
    ? readMinute(event.current_minute ?? event.minute) ?? match.minute
    : null;
  const penalty = readPenaltyShootout(event.penalty_shootout);
  const odds = readOdds(event);
  const update: MatchUpdate = {};

  assignIfChanged(update, match, "status", nextStatus);
  assignIfChanged(update, match, "home_score", nextHomeScore);
  assignIfChanged(update, match, "away_score", nextAwayScore);
  assignIfChanged(update, match, "minute", nextMinute);
  assignIfChanged(update, match, "match_phase", normalizeText(event.period ?? event.status));

  if (odds) {
    assignIfChanged(update, match, "home_odds", odds.home_odds);
    assignIfChanged(update, match, "draw_odds", odds.draw_odds);
    assignIfChanged(update, match, "away_odds", odds.away_odds);
  }

  if (penalty) {
    assignIfChanged(update, match, "is_extra_time", true);
    assignIfChanged(update, match, "home_penalty_score", penalty.home);
    assignIfChanged(update, match, "away_penalty_score", penalty.away);
  } else if (nextStatus === "scheduled") {
    assignIfChanged(update, match, "is_extra_time", false);
    assignIfChanged(update, match, "home_penalty_score", null);
    assignIfChanged(update, match, "away_penalty_score", null);
  }

  return update;
}

function assignIfChanged<K extends keyof MatchUpdate>(
  update: MatchUpdate,
  current: LocalMatchRow,
  key: K,
  value: MatchUpdate[K],
) {
  if (current[key] !== value) {
    update[key] = value;
  }
}

function mapBzzoiroStatus(status: string | null | undefined) {
  const value = String(status ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!value) return "scheduled";
  if (value.includes("finish") || value === "ft" || value.includes("ended") || value.includes("final")) {
    return "finished";
  }
  if (
    value.includes("progress") ||
    value.includes("live") ||
    value.includes("half") ||
    value.includes("extra") ||
    value.includes("penalt") ||
    value === "1h" ||
    value === "2h"
  ) {
    return "live";
  }
  return "scheduled";
}

function readOdds(event: BzzoiroSyncEvent) {
  const home = normalizeOdds(event.odds_home ?? event.home_odds);
  const draw = normalizeOdds(event.odds_draw ?? event.draw_odds);
  const away = normalizeOdds(event.odds_away ?? event.away_odds);
  if (home === null || draw === null || away === null) return null;
  return { home_odds: home, draw_odds: draw, away_odds: away };
}

function readPenaltyShootout(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const home = readScore(record.home_score ?? record.home ?? record.home_penalty_score);
  const away = readScore(record.away_score ?? record.away ?? record.away_penalty_score);
  return home !== null && away !== null ? { home, away } : null;
}

function buildTeamKeys(team: LocalTeamRow) {
  return new Set(
    [team.name, team.name_he]
      .map((value) => normalizeTeamNameKey(value))
      .filter(Boolean),
  );
}

function normalizePlaceholder(value: string | null | undefined) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9/]/g, "");
}

function getEventKey(event: BzzoiroSyncEvent) {
  if (event.id !== null && event.id !== undefined) return String(event.id);
  return [
    event.event_date ?? event.date ?? "",
    event.home_team_obj?.name ?? event.home_team ?? "",
    event.away_team_obj?.name ?? event.away_team ?? "",
  ].join("|");
}

function sameId(left: number | string | null | undefined, right: number | string | null | undefined) {
  return Boolean(left !== null && left !== undefined && right !== null && right !== undefined && String(left) === String(right));
}

function readScore(value: unknown) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readMinute(value: unknown) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) && parsed >= 0 && parsed <= 135 ? parsed : null;
}

function normalizeOdds(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1
    ? Math.round(parsed * 100) / 100
    : null;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

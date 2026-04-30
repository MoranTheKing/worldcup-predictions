import {
  BzzoiroRequestError,
  bzzoiroGet,
  bzzoiroGetPaginated,
  getBzzoiroPublicImageUrl,
  type BzzoiroPage,
} from "@/lib/bzzoiro/client";
import type {
  BzzoiroBroadcast,
  BzzoiroMatchCenter,
  BzzoiroMatchEvent,
  BzzoiroPredictedLineupResponse,
} from "@/lib/bzzoiro/matches";
import type { BzzoiroPlayerStatsRow } from "@/lib/bzzoiro/players";
import { translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import type { MatchWithTeams, MatchPhase, MatchStatus, TournamentTeamRecord } from "@/lib/tournament/matches";
export { asArray } from "@/lib/utils/array";

export type BzzoiroLivePreview = {
  eventId: number;
  source: "live+detail" | "detail";
  event: BzzoiroMatchEvent;
  matchCenter: BzzoiroMatchCenter;
  previewMatch: MatchWithTeams;
};

export async function getBzzoiroLivePreview(eventId: number): Promise<BzzoiroLivePreview | null> {
  const [eventDetail, liveEvent, playerStats, broadcasts] = await Promise.all([
    fetchEventDetail(eventId),
    fetchLiveEvent(eventId),
    fetchPlayerStats(eventId),
    fetchBroadcasts(eventId),
  ]);

  if (!eventDetail && !liveEvent) return null;

  const event = {
    ...(eventDetail ?? {}),
    ...(liveEvent ?? {}),
  } as BzzoiroMatchEvent;
  const predictedLineup = shouldFetchPredictedLineup(event)
    ? await fetchPredictedLineup(eventId)
    : null;

  return {
    eventId,
    source: liveEvent ? "live+detail" : "detail",
    event,
    previewMatch: buildPreviewMatch(eventId, event),
    matchCenter: {
      source: "api",
      event,
      predictedLineup,
      playerStats,
      broadcasts,
      matchedEventId: String(eventId),
    },
  };
}

async function fetchEventDetail(eventId: number) {
  try {
    return await bzzoiroGet<BzzoiroMatchEvent>(
      `/events/${encodeURIComponent(String(eventId))}/`,
      { tz: "Asia/Jerusalem", full: true },
    );
  } catch (error) {
    if (error instanceof BzzoiroRequestError && error.status === 404) return null;
    throw error;
  }
}

async function fetchLiveEvent(eventId: number) {
  const payload = await bzzoiroGet<BzzoiroPage<BzzoiroMatchEvent>>(
    "/live/",
    { tz: "Asia/Jerusalem", full: true },
  );

  return (payload.results ?? []).find((event) => String(event.id ?? "") === String(eventId)) ?? null;
}

async function fetchPredictedLineup(eventId: number) {
  try {
    return await bzzoiroGet<BzzoiroPredictedLineupResponse>(
      `/predicted-lineup/${encodeURIComponent(String(eventId))}/`,
    );
  } catch (error) {
    if (
      error instanceof BzzoiroRequestError &&
      (error.status === 400 || error.status === 404)
    ) {
      return null;
    }
    throw error;
  }
}

function shouldFetchPredictedLineup(event: BzzoiroMatchEvent) {
  if (hasActualLineups(event)) return false;
  const status = String(event.status ?? "").toLowerCase();
  if (
    status.includes("finish") ||
    status === "ft" ||
    status.includes("ended") ||
    status.includes("final")
  ) {
    return false;
  }
  return true;
}

function hasActualLineups(event: BzzoiroMatchEvent) {
  const lineups = event.lineups;
  if (Array.isArray(lineups)) return lineups.length > 0;
  if (!lineups || typeof lineups !== "object") return false;
  const payload = lineups as {
    home?: { players?: unknown[] | null; substitutes?: unknown[] | null } | null;
    away?: { players?: unknown[] | null; substitutes?: unknown[] | null } | null;
  };
  return Boolean(
    (payload.home?.players?.length ?? 0) > 0 ||
    (payload.away?.players?.length ?? 0) > 0 ||
    (payload.home?.substitutes?.length ?? 0) > 0 ||
    (payload.away?.substitutes?.length ?? 0) > 0,
  );
}

async function fetchPlayerStats(eventId: number) {
  return bzzoiroGetPaginated<BzzoiroPlayerStatsRow>(
    "/player-stats/",
    { event: eventId, tz: "Asia/Jerusalem" },
    2,
  ).catch(() => []);
}

async function fetchBroadcasts(eventId: number) {
  return bzzoiroGetPaginated<BzzoiroBroadcast>(
    "/broadcasts/",
    { event: eventId },
    2,
  ).catch(() => []);
}

function buildPreviewMatch(eventId: number, event: BzzoiroMatchEvent): MatchWithTeams {
  const homeId = `bsd-preview-home-${eventId}`;
  const awayId = `bsd-preview-away-${eventId}`;
  const homeName = event.home_team_obj?.name ?? event.home_team ?? "Home";
  const awayName = event.away_team_obj?.name ?? event.away_team ?? "Away";

  return {
    match_number: eventId,
    stage: "Group A",
    status: mapStatus(event.status),
    match_phase: mapPhase(event.status, event.period),
    date_time: event.event_date ?? event.date ?? new Date().toISOString(),
    minute: readInteger(event.current_minute),
    home_team_id: homeId,
    away_team_id: awayId,
    home_placeholder: homeName,
    away_placeholder: awayName,
    home_score: readInteger(event.home_score) ?? 0,
    away_score: readInteger(event.away_score) ?? 0,
    home_odds: event.odds_home ?? event.home_odds ?? null,
    draw_odds: event.odds_draw ?? event.draw_odds ?? null,
    away_odds: event.odds_away ?? event.away_odds ?? null,
    is_extra_time: false,
    home_penalty_score: null,
    away_penalty_score: null,
    homeTeam: buildPreviewTeam(homeId, homeName, event.home_team_obj?.id, event.home_coach?.name),
    awayTeam: buildPreviewTeam(awayId, awayName, event.away_team_obj?.id, event.away_coach?.name),
  };
}

function buildPreviewTeam(
  id: string,
  name: string,
  bzzoiroTeamId: number | string | null | undefined,
  coachName: string | null | undefined,
): TournamentTeamRecord {
  return {
    id,
    name,
    name_he: translateTeamNameToHebrew(name),
    logo_url: getBzzoiroPublicImageUrl("team", bzzoiroTeamId),
    group_letter: "A",
    coach_name: coachName ?? null,
    bzzoiro_team_id: bzzoiroTeamId ?? null,
  };
}

function mapStatus(status: string | null | undefined): MatchStatus {
  const value = String(status ?? "").toLowerCase();
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
    value === "2h" ||
    value === "1st_half" ||
    value === "2nd_half"
  ) {
    return "live";
  }
  return "scheduled";
}

function mapPhase(status: string | null | undefined, period: string | null | undefined): MatchPhase | null {
  const value = `${status ?? ""} ${period ?? ""}`.toLowerCase();
  if (value.includes("half") && (value.includes("time") || value.includes("break"))) return "halftime";
  if (value.includes("2nd") || value.includes("2t") || value === "2h") return "second_half";
  if (value.includes("extra")) return "extra_time";
  if (value.includes("penalt")) return "penalties";
  if (value.includes("1st") || value.includes("1t") || value === "1h") return "first_half";
  return null;
}

function readInteger(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) ? parsed : null;
}

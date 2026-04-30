import {
  BzzoiroRequestError,
  bzzoiroGet,
  bzzoiroGetPaginated,
  type BzzoiroPage,
} from "@/lib/bzzoiro/client";
import type { BzzoiroPlayerStatsRow } from "@/lib/bzzoiro/players";
import { normalizeTeamNameKey } from "@/lib/i18n/team-names";
import type { MatchWithTeams, TournamentTeamRecord } from "@/lib/tournament/matches";

type BzzoiroTeamObject = {
  id?: number | string | null;
  name?: string | null;
  short_name?: string | null;
  country?: string | null;
  coach?: BzzoiroCoach | null;
};

type BzzoiroCoach = {
  id?: number | string | null;
  name?: string | null;
  short_name?: string | null;
  country?: string | null;
  profile?: string | null;
  preferred_formation?: string | null;
  pressing_intensity?: number | null;
  defensive_line?: string | null;
};

export type BzzoiroIncident = {
  type?: string | null;
  minute?: number | string | null;
  is_home?: boolean | null;
  player?: string | null;
  player_name?: string | null;
  assist?: string | null;
  assist_player?: string | null;
  card_type?: string | null;
  player_in?: string | null;
  player_out?: string | null;
  player_in_id?: number | string | null;
  player_out_id?: number | string | null;
  home_score?: number | null;
  away_score?: number | null;
  sequence?: unknown[] | null;
};

export type BzzoiroLiveStatBlock = Record<string, number | string | null | undefined>;

export type BzzoiroShot = {
  min?: number | string | null;
  type?: string | null;
  sit?: string | null;
  body?: string | null;
  home?: boolean | null;
  xg?: number | string | null;
  xgot?: number | string | null;
  pos?: { x?: number | string | null; y?: number | string | null } | null;
  pid?: number | string | null;
};

export type BzzoiroMomentumPoint = {
  m?: number | string | null;
  v?: number | string | null;
};

export type BzzoiroXgMinute = {
  m?: number | string | null;
  xg_home?: number | string | null;
  xg_away?: number | string | null;
  cum_home?: number | string | null;
  cum_away?: number | string | null;
};

export type BzzoiroActualLineupPlayer = {
  name?: string | null;
  player_name?: string | null;
  player?: string | null;
  api_id?: number | string | null;
  player_id?: number | string | null;
  position?: string | null;
  specific_position?: string | null;
  positions_detailed?: string[] | null;
  x?: number | string | null;
  y?: number | string | null;
  is_home?: boolean | null;
  number?: number | string | null;
  jersey_number?: number | string | null;
  goals?: number | string | null;
  rating?: number | string | null;
  yellow_card?: boolean | null;
  red_card?: boolean | null;
  sub_in?: number | string | null;
  sub_out?: number | string | null;
  replaces_player_id?: number | string | null;
  replaced_by_player_id?: number | string | null;
};

export type BzzoiroActualTeamLineup = {
  players?: BzzoiroActualLineupPlayer[] | null;
  substitutes?: BzzoiroActualLineupPlayer[] | null;
  formation?: string | null;
};

export type BzzoiroActualLineupsPayload =
  | BzzoiroActualLineupPlayer[]
  | {
      home?: BzzoiroActualTeamLineup | null;
      away?: BzzoiroActualTeamLineup | null;
      confirmed?: boolean | null;
    };

export type BzzoiroUnavailablePlayer = {
  name?: string | null;
  status?: string | null;
  reason?: string | null;
  expected_return?: string | null;
};

export type BzzoiroMatchEvent = {
  id?: number | string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_team_obj?: BzzoiroTeamObject | null;
  away_team_obj?: BzzoiroTeamObject | null;
  event_date?: string | null;
  date?: string | null;
  status?: string | null;
  period?: string | null;
  current_minute?: number | string | null;
  round_number?: number | string | null;
  league?: { id?: number | string | null; name?: string | null; country?: string | null } | string | null;
  season?: { id?: number | string | null; name?: string | null; year?: number | string | null } | null;
  venue?: { id?: number | string | null; name?: string | null; city?: string | null; country?: string | null; capacity?: number | null } | null;
  referee?: { name?: string | null; country?: string | null; yellowCards?: number | null; redCards?: number | null } | null;
  home_coach?: BzzoiroCoach | null;
  away_coach?: BzzoiroCoach | null;
  unavailable_players?: {
    home?: BzzoiroUnavailablePlayer[] | null;
    away?: BzzoiroUnavailablePlayer[] | null;
  } | null;
  home_score?: number | null;
  away_score?: number | null;
  home_score_ht?: number | null;
  away_score_ht?: number | null;
  home_xg_live?: number | string | null;
  away_xg_live?: number | string | null;
  actual_home_xg?: number | string | null;
  actual_away_xg?: number | string | null;
  odds_home?: number | string | null;
  odds_draw?: number | string | null;
  odds_away?: number | string | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
  incidents?: BzzoiroIncident[] | null;
  live_stats?: {
    home?: BzzoiroLiveStatBlock | null;
    away?: BzzoiroLiveStatBlock | null;
  } | null;
  lineups?: BzzoiroActualLineupsPayload | null;
  shotmap?: BzzoiroShot[] | null;
  momentum?: BzzoiroMomentumPoint[] | null;
  xg_per_minute?: BzzoiroXgMinute[] | null;
  average_positions?: unknown;
  home_form?: Record<string, unknown> | null;
  away_form?: Record<string, unknown> | null;
  head_to_head?: Record<string, unknown> | null;
};

export type BzzoiroPredictedLineupPlayer = {
  name?: string | null;
  position?: string | null;
  jersey_number?: number | null;
  ai_score?: number | null;
};

export type BzzoiroPredictedTeamLineup = {
  team?: string | null;
  predicted_formation?: string | null;
  confidence?: number | null;
  starters?: BzzoiroPredictedLineupPlayer[] | null;
  substitutes?: BzzoiroPredictedLineupPlayer[] | null;
  unavailable?: BzzoiroUnavailablePlayer[] | null;
  updated_at?: string | null;
};

export type BzzoiroPredictedLineupResponse = {
  beta?: boolean | null;
  event?: {
    id?: number | string | null;
    home_team?: string | null;
    away_team?: string | null;
    date?: string | null;
    league?: string | null;
    status?: string | null;
  } | null;
  lineups?: {
    home?: BzzoiroPredictedTeamLineup | null;
    away?: BzzoiroPredictedTeamLineup | null;
  } | null;
};

export type BzzoiroBroadcast = {
  id?: number | string | null;
  event_id?: number | string | null;
  country_code?: string | null;
  channel_id?: number | string | null;
  channel_name?: string | null;
  channel_link?: string | null;
  scheduled_start_time?: string | null;
};

export type BzzoiroMatchCenter = {
  source: "api" | "missing_teams" | "not_matched" | "error";
  event: BzzoiroMatchEvent | null;
  predictedLineup: BzzoiroPredictedLineupResponse | null;
  playerStats: BzzoiroPlayerStatsRow[];
  broadcasts: BzzoiroBroadcast[];
  matchedEventId: string | null;
  errorMessage?: string;
};

const MATCH_CENTER_TTL_MS = 30_000;
const matchCenterCache = new Map<string, { expiresAt: number; promise: Promise<BzzoiroMatchCenter> }>();

export async function getBzzoiroMatchCenter(match: MatchWithTeams): Promise<BzzoiroMatchCenter> {
  if (!match.date_time) {
    return emptyMatchCenter("missing_teams");
  }

  const cacheKey = buildMatchCenterCacheKey(match);
  const cached = matchCenterCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = loadBzzoiroMatchCenter(match);
  matchCenterCache.set(cacheKey, {
    expiresAt: now + MATCH_CENTER_TTL_MS,
    promise,
  });

  return promise;
}

async function loadBzzoiroMatchCenter(match: MatchWithTeams): Promise<BzzoiroMatchCenter> {
  try {
    const matchedEvent = await findMatchingBzzoiroEvent(match);
    const eventId = matchedEvent?.id;

    if (!eventId) {
      return emptyMatchCenter("not_matched");
    }

    const [detailEvent, liveEvent, predictedLineup, playerStats, broadcasts] = await Promise.all([
      fetchEventDetail(eventId),
      fetchLiveEvent(eventId),
      fetchPredictedLineup(eventId),
      fetchPlayerStats(eventId),
      fetchBroadcasts(eventId),
    ]);

    const event = {
      ...matchedEvent,
      ...(detailEvent ?? {}),
      ...(liveEvent ?? {}),
    };

    return {
      source: "api",
      event,
      predictedLineup,
      playerStats,
      broadcasts,
      matchedEventId: String(eventId),
    };
  } catch (error) {
    console.error("[bzzoiro] match center fetch failed", error);
    return {
      ...emptyMatchCenter("error"),
      errorMessage: error instanceof Error ? error.message : "Unknown BSD error",
    };
  }
}

function buildMatchCenterCacheKey(match: MatchWithTeams) {
  return [
    "bzzoiro-match-center",
    match.match_number,
    match.date_time,
    match.home_team_id ?? "",
    match.away_team_id ?? "",
    match.status,
    match.minute ?? "",
  ].join(":");
}

async function findMatchingBzzoiroEvent(match: MatchWithTeams) {
  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) return null;

  const dateKey = getDateKey(match.date_time);
  const events = await bzzoiroGetPaginated<BzzoiroMatchEvent>(
    "/events/",
    {
      league: leagueId,
      date_from: shiftDate(dateKey, -1),
      date_to: shiftDate(dateKey, 1),
      tz: "Asia/Jerusalem",
    },
    3,
  );

  return findBestEventMatch(events, match);
}

function findBestEventMatch(events: BzzoiroMatchEvent[], match: MatchWithTeams) {
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  const matchTime = new Date(match.date_time).getTime();
  if (!Number.isFinite(matchTime)) return null;

  const homeKeys = homeTeam ? buildTeamKeys(homeTeam) : new Set<string>();
  const awayKeys = awayTeam ? buildTeamKeys(awayTeam) : new Set<string>();
  const homePlaceholderKey = normalizeBzzoiroPlaceholderKey(match.home_placeholder);
  const awayPlaceholderKey = normalizeBzzoiroPlaceholderKey(match.away_placeholder);

  return events
    .map((event) => {
      const eventTime = new Date(event.event_date ?? event.date ?? "").getTime();
      const withinWindow =
        Number.isFinite(eventTime) && Math.abs(eventTime - matchTime) <= 36 * 60 * 60 * 1000;
      if (!withinWindow) return null;

      const idsMatch =
        homeTeam &&
        awayTeam &&
        sameRemoteId(event.home_team_obj?.id, homeTeam.bzzoiro_team_id) &&
        sameRemoteId(event.away_team_obj?.id, awayTeam.bzzoiro_team_id);
      const namesMatch =
        homeTeam &&
        awayTeam &&
        homeKeys.has(normalizeTeamNameKey(event.home_team_obj?.name ?? event.home_team)) &&
        awayKeys.has(normalizeTeamNameKey(event.away_team_obj?.name ?? event.away_team));
      const placeholdersMatch =
        Boolean(homePlaceholderKey && awayPlaceholderKey) &&
        homePlaceholderKey === normalizeBzzoiroPlaceholderKey(event.home_team_obj?.name ?? event.home_team) &&
        awayPlaceholderKey === normalizeBzzoiroPlaceholderKey(event.away_team_obj?.name ?? event.away_team);

      if (!idsMatch && !namesMatch && !placeholdersMatch) return null;

      const timeDistance = Math.abs(eventTime - matchTime);
      const score =
        (idsMatch ? 30_000 : 0) +
        (namesMatch ? 20_000 : 0) +
        (placeholdersMatch ? 12_000 : 0) -
        timeDistance / 60_000;

      return { event, score, timeDistance };
    })
    .filter((candidate): candidate is { event: BzzoiroMatchEvent; score: number; timeDistance: number } => candidate !== null)
    .sort((left, right) => {
      return right.score - left.score || left.timeDistance - right.timeDistance;
    })[0]?.event ?? null;
}

async function fetchEventDetail(eventId: number | string) {
  try {
    return await bzzoiroGet<BzzoiroMatchEvent>(
      `/events/${encodeURIComponent(String(eventId))}/`,
      { tz: "Asia/Jerusalem", full: true },
    );
  } catch (error) {
    if (error instanceof BzzoiroRequestError && error.status === 404) return null;
    console.error("[bzzoiro] match event detail fetch failed", error);
    return null;
  }
}

async function fetchLiveEvent(eventId: number | string) {
  try {
    const payload = await bzzoiroGet<BzzoiroPage<BzzoiroMatchEvent>>(
      "/live/",
      { tz: "Asia/Jerusalem", full: true },
    );

    return (payload.results ?? []).find((event) => String(event.id ?? "") === String(eventId)) ?? null;
  } catch (error) {
    console.error("[bzzoiro] live match fetch failed", error);
    return null;
  }
}

async function fetchPredictedLineup(eventId: number | string) {
  try {
    return await bzzoiroGet<BzzoiroPredictedLineupResponse>(
      `/predicted-lineup/${encodeURIComponent(String(eventId))}/`,
    );
  } catch (error) {
    if (error instanceof BzzoiroRequestError && error.status === 404) return null;
    console.error("[bzzoiro] match predicted lineup fetch failed", error);
    return null;
  }
}

async function fetchPlayerStats(eventId: number | string) {
  try {
    return await bzzoiroGetPaginated<BzzoiroPlayerStatsRow>(
      "/player-stats/",
      { event: eventId, tz: "Asia/Jerusalem" },
      2,
    );
  } catch (error) {
    console.error("[bzzoiro] match player stats fetch failed", error);
    return [];
  }
}

async function fetchBroadcasts(eventId: number | string) {
  try {
    return await bzzoiroGetPaginated<BzzoiroBroadcast>(
      "/broadcasts/",
      { event: eventId },
      2,
    );
  } catch (error) {
    console.error("[bzzoiro] match broadcasts fetch failed", error);
    return [];
  }
}

function emptyMatchCenter(source: BzzoiroMatchCenter["source"]): BzzoiroMatchCenter {
  return {
    source,
    event: null,
    predictedLineup: null,
    playerStats: [],
    broadcasts: [],
    matchedEventId: null,
  };
}

function buildTeamKeys(team: Pick<TournamentTeamRecord, "name" | "name_he">) {
  return new Set(
    [team.name, team.name_he]
      .map((value) => normalizeTeamNameKey(value))
      .filter(Boolean),
  );
}

export function normalizeBzzoiroPlaceholderKey(value: string | null | undefined) {
  if (!value) return "";

  const compact = value
    .toLowerCase()
    .replace(/winner\s*match\s*(\d+)/g, "w$1")
    .replace(/loser\s*match\s*(\d+)/g, "l$1")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9/]/g, "");

  const tokens = compact.split("/").filter(Boolean);
  if (tokens.length === 0) return "";

  let lastRank = "";
  const normalizedTokens = tokens.map((token) => {
    const winnerLoser = token.match(/^([wl])(\d+)$/);
    if (winnerLoser) return `${winnerLoser[1]}${winnerLoser[2]}`;

    const rankGroup = token.match(/^([1-4])([a-l])$/);
    if (rankGroup) {
      lastRank = rankGroup[1];
      return `${rankGroup[1]}${rankGroup[2]}`;
    }

    const groupRank = token.match(/^([a-l])([1-4])$/);
    if (groupRank) {
      lastRank = groupRank[2];
      return `${groupRank[2]}${groupRank[1]}`;
    }

    const shorthandGroup = token.match(/^([a-l])$/);
    if (shorthandGroup && lastRank) {
      return `${lastRank}${shorthandGroup[1]}`;
    }

    return token;
  });

  return normalizedTokens.sort().join("/");
}

function sameRemoteId(left: number | string | null | undefined, right: number | string | null | undefined) {
  return Boolean(left && right && String(left) === String(right));
}

function getDateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

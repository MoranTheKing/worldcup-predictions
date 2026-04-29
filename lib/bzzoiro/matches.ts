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
  player_name?: string | null;
  player?: string | null;
  position?: string | null;
  x?: number | string | null;
  y?: number | string | null;
  is_home?: boolean | null;
  number?: number | string | null;
  jersey_number?: number | string | null;
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
  lineups?: BzzoiroActualLineupPlayer[] | null;
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

export type BzzoiroMatchCenter = {
  source: "api" | "missing_teams" | "not_matched" | "error";
  event: BzzoiroMatchEvent | null;
  predictedLineup: BzzoiroPredictedLineupResponse | null;
  playerStats: BzzoiroPlayerStatsRow[];
  matchedEventId: string | null;
  errorMessage?: string;
};

export async function getBzzoiroMatchCenter(match: MatchWithTeams): Promise<BzzoiroMatchCenter> {
  if (!match.homeTeam || !match.awayTeam || !match.date_time) {
    return emptyMatchCenter("missing_teams");
  }

  try {
    const matchedEvent = await findMatchingBzzoiroEvent(match);
    const eventId = matchedEvent?.id;

    if (!eventId) {
      return emptyMatchCenter("not_matched");
    }

    const [detailEvent, liveEvent, predictedLineup, playerStats] = await Promise.all([
      fetchEventDetail(eventId),
      fetchLiveEvent(eventId),
      fetchPredictedLineup(eventId),
      fetchPlayerStats(eventId),
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
  if (!homeTeam || !awayTeam) return null;

  const matchTime = new Date(match.date_time).getTime();
  const homeKeys = buildTeamKeys(homeTeam);
  const awayKeys = buildTeamKeys(awayTeam);

  return events
    .filter((event) => {
      const eventTime = new Date(event.event_date ?? event.date ?? "").getTime();
      const withinWindow =
        Number.isFinite(eventTime) && Math.abs(eventTime - matchTime) <= 36 * 60 * 60 * 1000;
      const idsMatch =
        sameRemoteId(event.home_team_obj?.id, homeTeam.bzzoiro_team_id) &&
        sameRemoteId(event.away_team_obj?.id, awayTeam.bzzoiro_team_id);
      const namesMatch =
        homeKeys.has(normalizeTeamNameKey(event.home_team_obj?.name ?? event.home_team)) &&
        awayKeys.has(normalizeTeamNameKey(event.away_team_obj?.name ?? event.away_team));

      return withinWindow && (idsMatch || namesMatch);
    })
    .sort((left, right) => {
      const leftTime = Math.abs(new Date(left.event_date ?? left.date ?? "").getTime() - matchTime);
      const rightTime = Math.abs(new Date(right.event_date ?? right.date ?? "").getTime() - matchTime);
      return leftTime - rightTime;
    })[0] ?? null;
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

function emptyMatchCenter(source: BzzoiroMatchCenter["source"]): BzzoiroMatchCenter {
  return {
    source,
    event: null,
    predictedLineup: null,
    playerStats: [],
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

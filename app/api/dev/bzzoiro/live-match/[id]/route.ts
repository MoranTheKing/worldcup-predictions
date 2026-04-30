import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import {
  BzzoiroRequestError,
  bzzoiroGet,
  bzzoiroGetPaginated,
  type BzzoiroPage,
} from "@/lib/bzzoiro/client";
import type {
  BzzoiroBroadcast,
  BzzoiroMatchEvent,
  BzzoiroPredictedLineupResponse,
} from "@/lib/bzzoiro/matches";
import type { BzzoiroPlayerStatsRow } from "@/lib/bzzoiro/players";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "invalid BSD event id" }, { status: 400 });
  }

  let eventDetail: BzzoiroMatchEvent | null;
  let liveEvent: BzzoiroMatchEvent | null;
  let predictedLineup: BzzoiroPredictedLineupResponse | null;
  let playerStats: BzzoiroPlayerStatsRow[];
  let broadcasts: BzzoiroBroadcast[];

  try {
    [eventDetail, liveEvent, predictedLineup, playerStats, broadcasts] = await Promise.all([
      fetchEventDetail(eventId),
      fetchLiveEvent(eventId),
      fetchPredictedLineup(eventId),
      fetchPlayerStats(eventId),
      fetchBroadcasts(eventId),
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown BSD live-match check error",
        eventId,
      },
      { status: 500 },
    );
  }

  const event = {
    ...(eventDetail ?? {}),
    ...(liveEvent ?? {}),
  };

  if (!eventDetail && !liveEvent) {
    return NextResponse.json({ error: "BSD event not found", eventId }, { status: 404 });
  }

  const liveStats = event.live_stats ?? null;
  const lineups = asArray(event.lineups);
  const incidents = asArray(event.incidents);
  const shotmap = asArray(event.shotmap);
  const momentum = asArray(event.momentum);

  return NextResponse.json({
    eventId,
    source: liveEvent ? "live+detail" : "detail",
    summary: {
      homeTeam: event.home_team_obj?.name ?? event.home_team ?? null,
      awayTeam: event.away_team_obj?.name ?? event.away_team ?? null,
      status: event.status ?? null,
      period: event.period ?? null,
      minute: event.current_minute ?? null,
      score: {
        home: event.home_score ?? null,
        away: event.away_score ?? null,
      },
      xg: {
        home: event.home_xg_live ?? event.actual_home_xg ?? null,
        away: event.away_xg_live ?? event.actual_away_xg ?? null,
      },
      venue: event.venue ?? null,
      referee: event.referee ?? null,
      odds1x2: {
        home: event.odds_home ?? event.home_odds ?? null,
        draw: event.odds_draw ?? event.draw_odds ?? null,
        away: event.odds_away ?? event.away_odds ?? null,
      },
    },
    availability: {
      liveStats: {
        hasHome: Boolean(liveStats?.home),
        hasAway: Boolean(liveStats?.away),
        homeKeys: liveStats?.home ? Object.keys(liveStats.home) : [],
        awayKeys: liveStats?.away ? Object.keys(liveStats.away) : [],
      },
      incidents: incidents.length,
      lineups: lineups.length,
      predictedHomeStarters: predictedLineup?.lineups?.home?.starters?.length ?? 0,
      predictedAwayStarters: predictedLineup?.lineups?.away?.starters?.length ?? 0,
      playerStats: playerStats.length,
      broadcasts: broadcasts.length,
      shotmap: shotmap.length,
      momentum: momentum.length,
    },
    samples: {
      incidents: incidents.slice(0, 12),
      playerStats: playerStats.slice(0, 8),
      lineups: lineups.slice(0, 22),
      broadcasts: broadcasts.slice(0, 6),
      shots: shotmap.slice(-10),
      momentum: momentum.slice(-10),
    },
  });
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
    if (error instanceof BzzoiroRequestError && error.status === 404) return null;
    throw error;
  }
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

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

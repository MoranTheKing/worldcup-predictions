import { NextResponse } from "next/server";
import { devOnly } from "@/app/api/dev/_guard";
import { asArray, getBzzoiroLivePreview } from "@/lib/bzzoiro/live-preview";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const { id } = await params;
  const eventId = Number(id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return NextResponse.json({ error: "invalid BSD event id" }, { status: 400 });
  }

  let preview;

  try {
    preview = await getBzzoiroLivePreview(eventId);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown BSD live-match check error",
        eventId,
      },
      { status: 500 },
    );
  }

  if (!preview) {
    return NextResponse.json({ error: "BSD event not found", eventId }, { status: 404 });
  }

  const { event, source, matchCenter } = preview;
  const predictedLineup = matchCenter.predictedLineup;
  const playerStats = matchCenter.playerStats;
  const broadcasts = matchCenter.broadcasts;
  const liveStats = event.live_stats ?? null;
  const lineups = summarizeLineups(event.lineups);
  const incidents = asArray(event.incidents);
  const shotmap = asArray(event.shotmap);
  const momentum = asArray(event.momentum);

  return NextResponse.json({
    eventId,
    previewPage: `/dashboard/matches/bsd-live/${eventId}`,
    source,
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
      lineups: lineups.totalStarters,
      lineupSubstitutes: lineups.totalSubstitutes,
      lineupConfirmed: lineups.confirmed,
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
      lineups,
      broadcasts: broadcasts.slice(0, 6),
      shots: shotmap.slice(-10),
      momentum: momentum.slice(-10),
    },
  });
}

function summarizeLineups(lineups: NonNullable<Awaited<ReturnType<typeof getBzzoiroLivePreview>>>["event"]["lineups"]) {
  if (Array.isArray(lineups)) {
    const home = lineups.filter((player) => player.is_home === true);
    const away = lineups.filter((player) => player.is_home === false);
    return {
      confirmed: true,
      totalStarters: home.length + away.length,
      totalSubstitutes: 0,
      home: { starters: home.slice(0, 11), substitutes: [] },
      away: { starters: away.slice(0, 11), substitutes: [] },
    };
  }

  if (!lineups || typeof lineups !== "object") {
    return {
      confirmed: false,
      totalStarters: 0,
      totalSubstitutes: 0,
      home: { starters: [], substitutes: [] },
      away: { starters: [], substitutes: [] },
    };
  }

  const payload = lineups as {
    confirmed?: boolean | null;
    home?: { players?: unknown[] | null; substitutes?: unknown[] | null } | null;
    away?: { players?: unknown[] | null; substitutes?: unknown[] | null } | null;
  };
  const homeStarters = asArray(payload.home?.players);
  const awayStarters = asArray(payload.away?.players);
  const homeSubstitutes = asArray(payload.home?.substitutes);
  const awaySubstitutes = asArray(payload.away?.substitutes);

  return {
    confirmed: payload.confirmed === true,
    totalStarters: homeStarters.length + awayStarters.length,
    totalSubstitutes: homeSubstitutes.length + awaySubstitutes.length,
    home: { starters: homeStarters.slice(0, 11), substitutes: homeSubstitutes.slice(0, 12) },
    away: { starters: awayStarters.slice(0, 11), substitutes: awaySubstitutes.slice(0, 12) },
  };
}

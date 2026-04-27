import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { bzzoiroGetPaginated } from "@/lib/bzzoiro/client";
import { normalizeTeamNameKey } from "@/lib/i18n/team-names";
import { isAuthorizedAdminRequest } from "@/lib/security/admin-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type LocalMatchRow = {
  match_number: number;
  date_time: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
};

type LocalTeamRow = {
  id: string;
  name: string | null;
  name_he: string | null;
  bzzoiro_team_id: string | null;
};

type BzzoiroOddsEvent = {
  id?: number | string | null;
  event_date?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  away_team_obj?: { id?: number | string | null; name?: string | null; short_name?: string | null } | null;
  odds_home?: number | string | null;
  odds_draw?: number | string | null;
  odds_away?: number | string | null;
  home_odds?: number | string | null;
  draw_odds?: number | string | null;
  away_odds?: number | string | null;
};

type OddsTriple = {
  home_odds: number;
  draw_odds: number;
  away_odds: number;
};

export async function POST(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "Missing BSD_WORLD_CUP_LEAGUE_ID" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const [{ data: matchesData, error: matchesError }, { data: teamsData, error: teamsError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("match_number, date_time, home_team_id, away_team_id")
        .not("home_team_id", "is", null)
        .not("away_team_id", "is", null)
        .order("date_time", { ascending: true }),
      supabase.from("teams").select("id, name, name_he, bzzoiro_team_id"),
    ]);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const teamsById = new Map(((teamsData ?? []) as LocalTeamRow[]).map((team) => [team.id, team]));
  const matches = ((matchesData ?? []) as LocalMatchRow[]).filter((match) => match.date_time);
  const eventsByWindow = await fetchEventsByDateWindow(matches, leagueId);
  let updated = 0;
  let skippedNoOdds = 0;
  let skippedNoEvent = 0;

  for (const match of matches) {
    const homeTeam = match.home_team_id ? teamsById.get(match.home_team_id) ?? null : null;
    const awayTeam = match.away_team_id ? teamsById.get(match.away_team_id) ?? null : null;
    if (!homeTeam || !awayTeam || !match.date_time) continue;

    const event = findMatchingEvent(
      eventsByWindow.get(getDateKey(match.date_time)) ?? [],
      match.date_time,
      homeTeam,
      awayTeam,
    );

    if (!event) {
      skippedNoEvent += 1;
      continue;
    }

    const odds = readOdds(event);
    if (!odds) {
      skippedNoOdds += 1;
      continue;
    }

    const { error } = await supabase
      .from("matches")
      .update(odds)
      .eq("match_number", match.match_number);

    if (error) {
      return NextResponse.json({ error: error.message, match: match.match_number }, { status: 500 });
    }

    updated += 1;
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/game", "layout");
  revalidatePath("/game/predictions");
  revalidatePath("/dev-tools");

  return NextResponse.json({
    checked: matches.length,
    updated,
    skippedNoEvent,
    skippedNoOdds,
    windowsFetched: eventsByWindow.size,
  });
}

async function fetchEventsByDateWindow(matches: LocalMatchRow[], leagueId: string) {
  const dateKeys = Array.from(
    new Set(matches.map((match) => (match.date_time ? getDateKey(match.date_time) : null)).filter(Boolean)),
  ) as string[];
  const result = new Map<string, BzzoiroOddsEvent[]>();

  for (const dateKey of dateKeys) {
    const events = await bzzoiroGetPaginated<BzzoiroOddsEvent>("/events/", {
      league: leagueId,
      date_from: shiftDate(dateKey, -1),
      date_to: shiftDate(dateKey, 1),
    });
    result.set(dateKey, events);
  }

  return result;
}

function findMatchingEvent(
  events: BzzoiroOddsEvent[],
  matchDateTime: string,
  homeTeam: LocalTeamRow,
  awayTeam: LocalTeamRow,
) {
  const matchTime = new Date(matchDateTime).getTime();
  const homeKeys = buildTeamKeys(homeTeam);
  const awayKeys = buildTeamKeys(awayTeam);

  return events
    .filter((event) => {
      const eventTime = event.event_date ? new Date(event.event_date).getTime() : Number.NaN;
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
      const leftTime = left.event_date ? Math.abs(new Date(left.event_date).getTime() - matchTime) : Infinity;
      const rightTime = right.event_date ? Math.abs(new Date(right.event_date).getTime() - matchTime) : Infinity;
      return leftTime - rightTime;
    })[0] ?? null;
}

function readOdds(event: BzzoiroOddsEvent): OddsTriple | null {
  const home = normalizeOdds(event.odds_home ?? event.home_odds);
  const draw = normalizeOdds(event.odds_draw ?? event.draw_odds);
  const away = normalizeOdds(event.odds_away ?? event.away_odds);

  if (home === null || draw === null || away === null) {
    return null;
  }

  return { home_odds: home, draw_odds: draw, away_odds: away };
}

function buildTeamKeys(team: LocalTeamRow) {
  return new Set(
    [team.name, team.name_he]
      .map((value) => normalizeTeamNameKey(value))
      .filter(Boolean),
  );
}

function sameRemoteId(left: number | string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && String(left) === String(right));
}

function normalizeOdds(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1
    ? Math.round(parsed * 100) / 100
    : null;
}

function getDateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

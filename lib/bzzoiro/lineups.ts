import {
  bzzoiroGet,
  bzzoiroGetPaginated,
} from "@/lib/bzzoiro/client";

type BzzoiroLineupEvent = {
  id: number;
  home_team?: string | null;
  away_team?: string | null;
  event_date?: string | null;
  date?: string | null;
  status?: string | null;
  league?: {
    id?: number | null;
    name?: string | null;
  } | string | null;
  home_team_obj?: {
    id?: number | null;
    name?: string | null;
    short_name?: string | null;
  } | null;
  away_team_obj?: {
    id?: number | null;
    name?: string | null;
    short_name?: string | null;
  } | null;
};

export type BzzoiroPredictedStarter = {
  name?: string | null;
  position?: string | null;
  jersey_number?: number | null;
  ai_score?: number | null;
};

type BzzoiroPredictedTeamLineup = {
  team?: string | null;
  predicted_formation?: string | null;
  confidence?: number | null;
  starters?: BzzoiroPredictedStarter[] | null;
  substitutes?: BzzoiroPredictedStarter[] | null;
  unavailable?: Array<{ name?: string | null; reason?: string | null }> | null;
  updated_at?: string | null;
};

type BzzoiroPredictedLineupResponse = {
  event?: {
    id?: number | null;
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

export type BzzoiroTeamPredictedLineup = {
  event: NonNullable<BzzoiroPredictedLineupResponse["event"]>;
  formation: string | null;
  confidence: number | null;
  starters: BzzoiroPredictedStarter[];
  substitutes: BzzoiroPredictedStarter[];
  unavailable: Array<{ name?: string | null; reason?: string | null }>;
  updatedAt: string | null;
};

export async function getBzzoiroPredictedLineupForTeam(
  teamId: string | number | null | undefined,
  teamName: string | null | undefined,
) {
  if (teamId === null || teamId === undefined || teamId === "") return null;

  try {
    const event = await findNextTeamEvent(teamId);
    if (!event) return null;

    const payload = await bzzoiroGet<BzzoiroPredictedLineupResponse>(
      `/predicted-lineup/${encodeURIComponent(String(event.id))}/`,
    );
    const side = getTeamSide(event, teamId, teamName);
    const lineup = side ? payload.lineups?.[side] ?? null : null;
    if (!lineup) return null;

    return {
      event: payload.event ?? {
        id: event.id,
        home_team: event.home_team,
        away_team: event.away_team,
        date: event.event_date ?? event.date ?? null,
        league: typeof event.league === "string" ? event.league : event.league?.name ?? null,
        status: event.status ?? null,
      },
      formation: lineup.predicted_formation ?? null,
      confidence: lineup.confidence ?? null,
      starters: (lineup.starters ?? []).filter((player) => player.name),
      substitutes: lineup.substitutes ?? [],
      unavailable: lineup.unavailable ?? [],
      updatedAt: lineup.updated_at ?? null,
    } satisfies BzzoiroTeamPredictedLineup;
  } catch (error) {
    console.error("[bzzoiro] predicted lineup fetch failed", error);
    return null;
  }
}

async function findNextTeamEvent(teamId: string | number) {
  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  const today = new Date().toISOString().slice(0, 10);
  const events = await bzzoiroGetPaginated<BzzoiroLineupEvent>(
    "/events/",
    {
      league: leagueId,
      date_from: today,
      date_to: "2026-07-20",
      tz: "Asia/Jerusalem",
    },
    3,
  );

  return events
    .filter((event) => getTeamSide(event, teamId, null))
    .sort((left, right) => getEventTime(left) - getEventTime(right))[0] ?? null;
}

function getTeamSide(
  event: BzzoiroLineupEvent,
  teamId: string | number,
  teamName: string | null | undefined,
): "home" | "away" | null {
  const expectedId = String(teamId);
  const expectedName = normalizeName(teamName);

  if (
    String(event.home_team_obj?.id ?? "") === expectedId ||
    Boolean(expectedName && normalizeName(event.home_team_obj?.name) === expectedName) ||
    Boolean(expectedName && normalizeName(event.home_team_obj?.short_name) === expectedName) ||
    Boolean(expectedName && normalizeName(event.home_team) === expectedName)
  ) {
    return "home";
  }

  if (
    String(event.away_team_obj?.id ?? "") === expectedId ||
    Boolean(expectedName && normalizeName(event.away_team_obj?.name) === expectedName) ||
    Boolean(expectedName && normalizeName(event.away_team_obj?.short_name) === expectedName) ||
    Boolean(expectedName && normalizeName(event.away_team) === expectedName)
  ) {
    return "away";
  }

  return null;
}

function getEventTime(event: BzzoiroLineupEvent) {
  return new Date(event.event_date ?? event.date ?? "").getTime() || Number.MAX_SAFE_INTEGER;
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
}

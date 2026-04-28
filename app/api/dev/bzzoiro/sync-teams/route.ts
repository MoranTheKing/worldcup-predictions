import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import {
  bzzoiroGet,
  bzzoiroGetPaginated,
  getBzzoiroPublicImageUrl,
  type BzzoiroPage,
} from "@/lib/bzzoiro/client";
import { translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import { createAdminClient } from "@/lib/supabase/admin";

type BzzoiroTeam = {
  id: number;
  name: string;
  short_name?: string | null;
  country?: string | null;
  coach?: {
    id?: number | null;
    name?: string | null;
    shortName?: string | null;
    short_name?: string | null;
  } | null;
};

type BzzoiroManager = {
  id: number;
  name: string;
  short_name?: string | null;
};

type BzzoiroPlayer = {
  id: number;
  name: string;
  short_name?: string | null;
  position?: string | null;
  nationality?: string | null;
  jersey_number?: number | null;
  national_team?: {
    id?: number | null;
    name?: string | null;
    short_name?: string | null;
    country?: string | null;
  } | null;
};

type BzzoiroEvent = {
  id: number;
  home_team: string;
  away_team: string;
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
  event_date: string;
  league?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
  } | null;
  status?: string | null;
  home_score?: number | null;
  away_score?: number | null;
};

type LocalTeam = {
  id: string;
  name: string;
  name_he: string | null;
  bzzoiro_team_id?: string | null;
};

type LocalPlayer = {
  id: number;
  name: string;
  bzzoiro_player_id?: string | null;
};

type LegacyPlayerAction =
  | { kind: "update"; id: number; payload: ReturnType<typeof buildPlayerPayload> }
  | { kind: "delete"; id: number; replacementId?: number };

const MOCK_PLAYER_ID_MIN = 1;
const MOCK_PLAYER_ID_MAX = 49;

const TEAM_NAME_ALIASES: Record<string, string> = {
  czechrepublic: "czechia",
  czechia: "czechia",
  turkey: "turkiye",
  turkiye: "turkiye",
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  republicofkorea: "southkorea",
  korea: "southkorea",
  cote_divoire: "ivorycoast",
  cotedivoire: "ivorycoast",
  ivorycoast: "ivorycoast",
  drc: "drcongo",
  drcongo: "drcongo",
  bosniaherzegovina: "bosniaandherzegovina",
  bosniaandherzegovina: "bosniaandherzegovina",
};

const PLAYER_SEARCH_ALIASES: Record<string, string> = {
  gavi: "Pablo Gavi",
  gioreyna: "Giovanni Reyna",
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const leagueId = process.env.BSD_WORLD_CUP_LEAGUE_ID;
  if (!leagueId) {
    return NextResponse.json({ error: "Missing BSD_WORLD_CUP_LEAGUE_ID" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data: localTeamsData, error: localTeamsError } = await supabase
    .from("teams")
    .select("id, name, name_he, bzzoiro_team_id");

  if (localTeamsError) {
    return NextResponse.json({ error: localTeamsError.message }, { status: 500 });
  }

  const localTeams = (localTeamsData ?? []) as LocalTeam[];
  let remoteTeams = await bzzoiroGetPaginated<BzzoiroTeam>("/teams/", {
    league: leagueId,
    in_competition: true,
  });

  if (remoteTeams.length === 0) {
    remoteTeams = await bzzoiroGetPaginated<BzzoiroTeam>("/teams/", { league: leagueId });
  }

  const matchedTeams = matchTeams(localTeams, remoteTeams);
  const now = new Date().toISOString();
  let playersSynced = 0;
  let coachesSynced = 0;
  let recentMatchesSynced = 0;
  let teamsWithRecentMatches = 0;
  let legacyPlayersEnriched = 0;
  let legacyPlayersRemoved = 0;
  const playerSearchCache = new Map<string, BzzoiroPlayer | null>();
  const recentMatchesDateTo = new Date().toISOString().slice(0, 10);

  for (const { local, remote } of matchedTeams) {
    const [detail, managers, players, recentEvents, existingPlayersResult] = await Promise.all([
      safeBzzoiroGet<BzzoiroTeam>(`/teams/${remote.id}/`),
      safeBzzoiroPaginated<BzzoiroManager>("/managers/", { team_id: remote.id }),
      safeBzzoiroPaginated<BzzoiroPlayer>("/players/", { national_team: remote.id }),
      safeBzzoiroPaginated<BzzoiroEvent>("/events/", {
        team: getEventTeamSearchName(local, remote),
        date_from: "2024-01-01",
        date_to: recentMatchesDateTo,
        status: "finished",
      }),
      supabase
        .from("players")
        .select("id, name, bzzoiro_player_id")
        .eq("team_id", local.id),
    ]);

    const manager = managers[0] ?? null;
    const coach = manager ?? detail?.coach ?? remote.coach ?? null;
    const coachId = readNumericId(coach);
    const coachName = readName(coach);

    const { error: teamError } = await supabase
      .from("teams")
      .update({
        bzzoiro_team_id: String(remote.id),
        logo_url: getBzzoiroPublicImageUrl("team", remote.id),
        coach_name: coachName,
        coach_bzzoiro_id: coachId === null ? null : String(coachId),
        coach_photo_url: getBzzoiroPublicImageUrl("manager", coachId),
        coach_updated_at: coachName ? now : null,
        bzzoiro_synced_at: now,
      })
      .eq("id", local.id);

    if (teamError) {
      return NextResponse.json({ error: teamError.message, team: local.name }, { status: 500 });
    }

    if (coachName) {
      coachesSynced += 1;
    }

    const recentRows = buildRecentMatchRows(local, remote, recentEvents);
    const { error: recentDeleteError } = await supabase
      .from("team_recent_matches")
      .delete()
      .eq("team_id", local.id)
      .eq("source", "bzzoiro-events");

    if (recentDeleteError) {
      return NextResponse.json(
        { error: recentDeleteError.message, team: local.name },
        { status: 500 },
      );
    }

    if (recentRows.length > 0) {
      const { error: recentInsertError } = await supabase
        .from("team_recent_matches")
        .insert(recentRows);

      if (recentInsertError) {
        return NextResponse.json(
          { error: recentInsertError.message, team: local.name },
          { status: 500 },
        );
      }

      recentMatchesSynced += recentRows.length;
      teamsWithRecentMatches += 1;
    }

    const existingPlayers = (existingPlayersResult.data ?? []) as LocalPlayer[];
    const playerRows = buildPlayerRows(local.id, existingPlayers, players, now);

    if (playerRows.length > 0) {
      const { error: playersError } = await supabase
        .from("players")
        .upsert(playerRows, { onConflict: "id" });

      if (playersError) {
        return NextResponse.json({ error: playersError.message, team: local.name }, { status: 500 });
      }

      playersSynced += playerRows.length;
    }

    const legacyActions = await buildLegacyPlayerFallbackActions({
      local,
      remote,
      existingPlayers,
      remotePlayers: players,
      syncedAt: now,
      cache: playerSearchCache,
    });

    for (const row of legacyActions) {
      if (row.kind === "delete") {
        const { error: predictionMoveError } = await supabase
          .from("outright_bets")
          .update({ predicted_top_scorer_player_id: row.replacementId ?? null })
          .eq("predicted_top_scorer_player_id", row.id);

        if (predictionMoveError) {
          return NextResponse.json(
            { error: predictionMoveError.message, player_id: row.id, team: local.name },
            { status: 500 },
          );
        }

        const { error: deleteError } = await supabase
          .from("players")
          .delete()
          .eq("id", row.id);

        if (deleteError) {
          return NextResponse.json(
            { error: deleteError.message, player_id: row.id, team: local.name },
            { status: 500 },
          );
        }

        legacyPlayersRemoved += 1;
        continue;
      }

      const { error: legacyError } = await supabase
        .from("players")
        .update(row.payload)
        .eq("id", row.id);

      if (legacyError) {
        return NextResponse.json(
          { error: legacyError.message, player: row.payload.name, team: local.name },
          { status: 500 },
        );
      }

      legacyPlayersEnriched += 1;
    }
  }

  revalidateSyncPaths();

  return NextResponse.json({
    remoteTeams: remoteTeams.length,
    matchedTeams: matchedTeams.length,
    unmatchedTeams: remoteTeams.length - matchedTeams.length,
    coachesSynced,
    recentMatchesSynced,
    teamsWithRecentMatches,
    playersSynced,
    legacyPlayersEnriched,
    legacyPlayersRemoved,
  });
}

async function safeBzzoiroGet<T>(path: string, query: Record<string, string | number | boolean> = {}) {
  try {
    return await bzzoiroGet<T>(path, query);
  } catch {
    return null;
  }
}

async function safeBzzoiroPaginated<T>(path: string, query: Record<string, string | number | boolean>) {
  try {
    return await bzzoiroGetPaginated<T>(path, query);
  } catch {
    const fallback = await safeBzzoiroGet<BzzoiroPage<T>>(path, query);
    return fallback?.results ?? [];
  }
}

function matchTeams(localTeams: LocalTeam[], remoteTeams: BzzoiroTeam[]) {
  const byBzzoiroId = new Map(
    localTeams
      .filter((team) => team.bzzoiro_team_id)
      .map((team) => [String(team.bzzoiro_team_id), team]),
  );
  const byName = new Map<string, LocalTeam>();

  for (const team of localTeams) {
    for (const value of [team.name, team.name_he]) {
      if (value) {
        byName.set(normalizeName(value), team);
      }
    }
  }

  const matches: Array<{ local: LocalTeam; remote: BzzoiroTeam }> = [];
  const usedLocalIds = new Set<string>();

  for (const remote of remoteTeams) {
    const local =
      byBzzoiroId.get(String(remote.id)) ??
      byName.get(normalizeName(remote.name)) ??
      byName.get(normalizeName(remote.short_name)) ??
      byName.get(normalizeName(remote.country));

    if (!local || usedLocalIds.has(local.id)) {
      continue;
    }

    usedLocalIds.add(local.id);
    matches.push({ local, remote });
  }

  return matches;
}

function buildPlayerRows(
  teamId: string,
  existingPlayers: LocalPlayer[],
  remotePlayers: BzzoiroPlayer[],
  syncedAt: string,
) {
  const byBzzoiroId = new Map(
    existingPlayers
      .filter((player) => player.bzzoiro_player_id)
      .map((player) => [String(player.bzzoiro_player_id), player]),
  );
  const byName = new Map(existingPlayers.map((player) => [normalizeName(player.name), player]));
  const usedIds = new Set(existingPlayers.map((player) => player.id));

  return remotePlayers
    .filter((player) => player.id && player.name)
    .map((player) => {
      const existing =
        byBzzoiroId.get(String(player.id)) ??
        byName.get(normalizeName(player.name)) ??
        byName.get(normalizeName(player.short_name));
      const id = existing?.id ?? buildStableBzzoiroPlayerId(player.id, usedIds);
      usedIds.add(id);

      return {
        id,
        ...buildPlayerPayload(teamId, player, syncedAt),
      };
    });
}

function buildRecentMatchRows(
  local: LocalTeam,
  remote: BzzoiroTeam,
  events: BzzoiroEvent[],
) {
  const teamNames = new Set(
    [local.name, local.name_he, remote.name, remote.short_name, remote.country]
      .map(normalizeName)
      .filter(Boolean),
  );

  return events
    .filter((event) => {
      return (
        String(event.status ?? "").toLowerCase() === "finished" &&
        Number.isFinite(Number(event.home_score)) &&
        Number.isFinite(Number(event.away_score)) &&
        event.event_date &&
        getEventTeamSide(event, teamNames) !== null
      );
    })
    .sort((left, right) => {
      return new Date(right.event_date).getTime() - new Date(left.event_date).getTime();
    })
    .slice(0, 5)
    .map((event, index) => {
      const isHome = getEventTeamSide(event, teamNames) === "home";
      const opponentName = isHome ? event.away_team : event.home_team;
      const opponent = isHome ? event.away_team_obj : event.home_team_obj;
      const teamScore = Number(isHome ? event.home_score : event.away_score);
      const opponentScore = Number(isHome ? event.away_score : event.home_score);

      return {
        team_id: local.id,
        opponent_name: translateTeamNameToHebrew(opponentName),
        opponent_logo_url: getBzzoiroPublicImageUrl("team", opponent?.id),
        played_at: event.event_date,
        competition: normalizeCompetitionName(event.league?.name),
        team_score: teamScore,
        opponent_score: opponentScore,
        result: getRecentMatchResult(teamScore, opponentScore),
        source: "bzzoiro-events",
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
      };
    });
}

function normalizeCompetitionName(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized.includes("friendly") || normalized.includes("friendlies")) {
    return "משחק הכנה";
  }
  if (normalized.includes("world cup") && normalized.includes("qual")) {
    return "מוקדמות המונדיאל";
  }
  return value ?? "משחק הכנה";
}

function getEventTeamSide(event: BzzoiroEvent, teamNames: Set<string>) {
  if (
    teamNames.has(normalizeName(event.home_team)) ||
    teamNames.has(normalizeName(event.home_team_obj?.name)) ||
    teamNames.has(normalizeName(event.home_team_obj?.short_name))
  ) {
    return "home";
  }

  if (
    teamNames.has(normalizeName(event.away_team)) ||
    teamNames.has(normalizeName(event.away_team_obj?.name)) ||
    teamNames.has(normalizeName(event.away_team_obj?.short_name))
  ) {
    return "away";
  }

  return null;
}

function getRecentMatchResult(teamScore: number, opponentScore: number) {
  if (teamScore > opponentScore) return "win";
  if (teamScore < opponentScore) return "loss";
  return "draw";
}

function getEventTeamSearchName(local: LocalTeam, remote: BzzoiroTeam) {
  if (local.name === "Czech Republic") return "Czechia";
  if (local.name === "Turkiye") return "Türkiye";
  if (local.name === "Ivory Coast") return "Cote";
  return remote.country || remote.name || local.name;
}

async function buildLegacyPlayerFallbackActions({
  local,
  remote,
  existingPlayers,
  remotePlayers,
  syncedAt,
  cache,
}: {
  local: LocalTeam;
  remote: BzzoiroTeam;
  existingPlayers: LocalPlayer[];
  remotePlayers: BzzoiroPlayer[];
  syncedAt: string;
  cache: Map<string, BzzoiroPlayer | null>;
}) {
  const remoteNames = new Set(remotePlayers.map((player) => normalizeName(player.name)));
  const existingByBzzoiroId = new Map(
    existingPlayers
      .filter((player) => player.bzzoiro_player_id)
      .map((player) => [String(player.bzzoiro_player_id), player]),
  );
  const actions: LegacyPlayerAction[] = [];

  for (const player of existingPlayers) {
    if (!isMockSeedPlayer(player) || remoteNames.has(normalizeName(player.name))) {
      continue;
    }

    const remotePlayer = await findBzzoiroPlayerByExactName(player.name, local, remote, cache);
    if (!remotePlayer) {
      actions.push({ kind: "delete", id: player.id });
      continue;
    }

    const duplicate = existingByBzzoiroId.get(String(remotePlayer.id));
    if (duplicate && duplicate.id !== player.id) {
      actions.push({ kind: "delete", id: player.id, replacementId: duplicate.id });
      continue;
    }

    actions.push({
      kind: "update",
      id: player.id,
      payload: buildPlayerPayload(local.id, remotePlayer, syncedAt),
    });
  }

  return actions;
}

async function findBzzoiroPlayerByExactName(
  name: string,
  local: LocalTeam,
  remote: BzzoiroTeam,
  cache: Map<string, BzzoiroPlayer | null>,
) {
  const normalizedName = normalizeName(name);
  const cached = cache.get(normalizedName);
  if (cached !== undefined) {
    return cached;
  }

  const alias = PLAYER_SEARCH_ALIASES[normalizedName];
  const expectedNames = new Set(
    [normalizedName, alias ? normalizeName(alias) : null].filter(
      (candidate): candidate is string => Boolean(candidate),
    ),
  );
  const queries = Array.from(new Set([name, stripAccents(name), alias].filter(Boolean)));
  const resultGroups = await Promise.all(
    queries.map((query) => safeBzzoiroPaginated<BzzoiroPlayer>("/players/", { search: query })),
  );
  const exactMatches = resultGroups.flat().filter(
    (player) =>
      expectedNames.has(normalizeName(player.name)) ||
      expectedNames.has(normalizeName(player.short_name)),
  );
  const bestMatch = exactMatches.sort(
    (left, right) => scorePlayerTeamMatch(right, local, remote) - scorePlayerTeamMatch(left, local, remote),
  )[0] ?? null;

  cache.set(normalizedName, bestMatch);
  return bestMatch;
}

function scorePlayerTeamMatch(player: BzzoiroPlayer, local: LocalTeam, remote: BzzoiroTeam) {
  const localNames = [local.name, local.name_he, remote.name, remote.short_name, remote.country]
    .map(normalizeName)
    .filter(Boolean);
  let score = 0;

  if (player.national_team?.id && String(player.national_team.id) === String(remote.id)) {
    score += 6;
  }

  for (const value of [
    player.national_team?.name,
    player.national_team?.short_name,
    player.national_team?.country,
    player.nationality,
  ]) {
    if (localNames.includes(normalizeName(value))) {
      score += 2;
    }
  }

  return score;
}

function buildPlayerPayload(teamId: string, player: BzzoiroPlayer, syncedAt: string) {
  return {
    team_id: teamId,
    name: player.name,
    position: normalizePosition(player.position),
    shirt_number: normalizeNumber(player.jersey_number),
    photo_url: getBzzoiroPublicImageUrl("player", player.id),
    bzzoiro_player_id: String(player.id),
    bzzoiro_synced_at: syncedAt,
  };
}

function isMockSeedPlayer(player: LocalPlayer) {
  return (
    Number.isInteger(player.id) &&
    player.id >= MOCK_PLAYER_ID_MIN &&
    player.id <= MOCK_PLAYER_ID_MAX
  );
}

function buildStableBzzoiroPlayerId(remoteId: number, usedIds: Set<number>) {
  let id = -Math.abs(Number(remoteId));
  while (usedIds.has(id)) {
    id -= 1;
  }
  return id;
}

function readNumericId(value: { id?: number | null } | null) {
  const id = value?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

function readName(value: { name?: string | null; shortName?: string | null; short_name?: string | null } | null) {
  return value?.name ?? value?.shortName ?? value?.short_name ?? null;
}

function normalizePosition(position: string | null | undefined) {
  if (!position) return null;
  const normalized = position.trim().toUpperCase();
  if (normalized === "G") return "Goalkeeper";
  if (normalized === "D") return "Defender";
  if (normalized === "M") return "Midfielder";
  if (normalized === "F") return "Forward";
  return position;
}

function normalizeNumber(value: number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeName(value: string | null | undefined) {
  const normalized = stripAccents(value)
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
  return TEAM_NAME_ALIASES[normalized] ?? normalized;
}

function stripAccents(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function revalidateSyncPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/players", "layout");
  revalidatePath("/dev-tools");
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import {
  bzzoiroGet,
  bzzoiroGetPaginated,
  getBzzoiroPublicImageUrl,
  type BzzoiroPage,
} from "@/lib/bzzoiro/client";
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
  let legacyPlayersEnriched = 0;
  let legacyPlayersRemoved = 0;
  const playerSearchCache = new Map<string, BzzoiroPlayer | null>();

  for (const { local, remote } of matchedTeams) {
    const [detail, managers, players, existingPlayersResult] = await Promise.all([
      safeBzzoiroGet<BzzoiroTeam>(`/teams/${remote.id}/`),
      safeBzzoiroPaginated<BzzoiroManager>("/managers/", { team_id: remote.id }),
      safeBzzoiroPaginated<BzzoiroPlayer>("/players/", { national_team: remote.id }),
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
  const expectedNames = new Set([normalizedName, normalizeName(alias)]);
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
  revalidatePath("/dev-tools");
}

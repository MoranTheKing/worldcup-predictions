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
  jersey_number?: number | null;
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
  }

  revalidateSyncPaths();

  return NextResponse.json({
    remoteTeams: remoteTeams.length,
    matchedTeams: matchedTeams.length,
    unmatchedTeams: remoteTeams.length - matchedTeams.length,
    coachesSynced,
    playersSynced,
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
        team_id: teamId,
        name: player.name,
        position: normalizePosition(player.position),
        shirt_number: normalizeNumber(player.jersey_number),
        photo_url: getBzzoiroPublicImageUrl("player", player.id),
        bzzoiro_player_id: String(player.id),
        bzzoiro_synced_at: syncedAt,
      };
    });
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
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
  return TEAM_NAME_ALIASES[normalized] ?? normalized;
}

function revalidateSyncPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/dashboard/teams");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dev-tools");
}

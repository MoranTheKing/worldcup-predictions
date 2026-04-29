import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { devOnly } from "@/app/api/dev/_guard";
import { createAdminClient } from "@/lib/supabase/admin";

type PlayerSeed = {
  id: number;
  team_id?: string | null;
  position?: string | null;
  shirt_number?: number | null;
  top_scorer_odds?: number | string | null;
};

type MatchSeed = {
  match_number: number;
  status?: string | null;
  match_phase?: string | null;
  minute?: number | null;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_score?: number | null;
  away_score?: number | null;
};

type StatLine = {
  appearances: number;
  minutes_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
};

type SquadPlayer = {
  player: PlayerSeed;
  starter: boolean;
};

type DevMatchPlayerEventInsert = {
  match_number: number;
  team_id: string | null;
  player_id: number | null;
  related_player_id: number | null;
  event_type: "goal" | "yellow_card" | "red_card";
  minute: number;
  is_home: boolean | null;
};

export async function POST(request: Request) {
  const blocked = devOnly(request);
  if (blocked) return blocked;

  const supabase = createAdminClient();
  const [playersResult, matchesResult] = await Promise.all([
    fetchAllPlayersForStats(supabase),
    fetchScoredMatches(supabase),
  ]);

  if (playersResult.error) {
    return NextResponse.json({ error: playersResult.error }, { status: 500 });
  }

  if (matchesResult.error) {
    return NextResponse.json({ error: matchesResult.error }, { status: 500 });
  }

  const scoredMatches = matchesResult.matches.filter(isScoredMatch);

  if (scoredMatches.length === 0) {
    const updated = await updatePlayersWithFallbackStats(supabase, playersResult.players);
    if (typeof updated === "string") {
      return NextResponse.json({ error: updated }, { status: 500 });
    }

    revalidatePlayerStatPaths();
    return NextResponse.json({
      updated,
      mode: "position_fallback",
      matchesUsed: 0,
      eventsCreated: 0,
    });
  }

  const generated = buildScoreAwareStats(playersResult.players, scoredMatches);
  const clearError = await clearDevMatchPlayerEvents(supabase);
  if (clearError) {
    return NextResponse.json(
      {
        error: clearError,
        migrationRequired: "Run supabase/migrations/20260429000037_add_dev_match_player_events.sql",
      },
      { status: 500 },
    );
  }

  const updated = await updatePlayersWithGeneratedStats(supabase, playersResult.players, generated.statsByPlayerId);
  if (typeof updated === "string") {
    return NextResponse.json({ error: updated }, { status: 500 });
  }

  const insertError = await insertDevMatchPlayerEvents(supabase, generated.events);
  if (insertError) {
    return NextResponse.json({ error: insertError }, { status: 500 });
  }

  revalidatePlayerStatPaths();
  return NextResponse.json({
    updated,
    mode: "score_aware",
    matchesUsed: scoredMatches.length,
    eventsCreated: generated.events.length,
    goalsAssigned: generated.totals.goals,
    assistsAssigned: generated.totals.assists,
    yellowCardsAssigned: generated.totals.yellowCards,
    redCardsAssigned: generated.totals.redCards,
  });
}

async function fetchAllPlayersForStats(supabase: ReturnType<typeof createAdminClient>) {
  const players: PlayerSeed[] = [];
  const batchSize = 1000;

  for (let from = 0; ; from += batchSize) {
    const { data, error } = await supabase
      .from("players")
      .select("id, team_id, position, shirt_number, top_scorer_odds")
      .range(from, from + batchSize - 1);

    if (error) {
      return { players, error: error.message };
    }

    players.push(...((data ?? []) as PlayerSeed[]));

    if (!data || data.length < batchSize) {
      return { players, error: null };
    }
  }
}

async function fetchScoredMatches(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase
    .from("matches")
    .select("match_number, status, match_phase, minute, home_team_id, away_team_id, home_score, away_score")
    .order("match_number", { ascending: true });

  if (error) {
    return { matches: [] as MatchSeed[], error: error.message };
  }

  return { matches: (data ?? []) as MatchSeed[], error: null };
}

async function updatePlayersWithFallbackStats(
  supabase: ReturnType<typeof createAdminClient>,
  players: PlayerSeed[],
) {
  let updated = 0;

  for (const player of players) {
    const { data, error } = await supabase
      .from("players")
      .update(randomPlayerStats(player.position))
      .eq("id", player.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return error.message;
    }

    if (data) updated += 1;
  }

  return updated;
}

async function updatePlayersWithGeneratedStats(
  supabase: ReturnType<typeof createAdminClient>,
  players: PlayerSeed[],
  statsByPlayerId: Map<number, StatLine>,
) {
  let updated = 0;

  for (const player of players) {
    const stats = statsByPlayerId.get(player.id) ?? emptyStatLine();
    const { data, error } = await supabase
      .from("players")
      .update(stats)
      .eq("id", player.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return error.message;
    }

    if (data) updated += 1;
  }

  return updated;
}

async function clearDevMatchPlayerEvents(supabase: ReturnType<typeof createAdminClient>) {
  const { error } = await supabase
    .from("dev_match_player_events")
    .delete()
    .gte("match_number", 1);

  return error?.message ?? null;
}

async function insertDevMatchPlayerEvents(
  supabase: ReturnType<typeof createAdminClient>,
  events: DevMatchPlayerEventInsert[],
) {
  const chunkSize = 500;

  for (let index = 0; index < events.length; index += chunkSize) {
    const { error } = await supabase
      .from("dev_match_player_events")
      .insert(events.slice(index, index + chunkSize));

    if (error) {
      return error.message;
    }
  }

  return null;
}

function buildScoreAwareStats(players: PlayerSeed[], matches: MatchSeed[]) {
  const statsByPlayerId = new Map<number, StatLine>();
  const playersByTeam = new Map<string, PlayerSeed[]>();
  const events: DevMatchPlayerEventInsert[] = [];
  const totals = {
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
  };

  for (const player of players) {
    statsByPlayerId.set(player.id, emptyStatLine());
    if (!player.team_id) continue;
    const teamPlayers = playersByTeam.get(player.team_id) ?? [];
    teamPlayers.push(player);
    playersByTeam.set(player.team_id, teamPlayers);
  }

  for (const teamPlayers of playersByTeam.values()) {
    teamPlayers.sort(comparePlayerLikelihood);
  }

  for (const match of matches) {
    if (!isScoredMatch(match)) continue;

    const homeSquad = pickMatchSquad(playersByTeam.get(match.home_team_id) ?? []);
    const awaySquad = pickMatchSquad(playersByTeam.get(match.away_team_id) ?? []);
    const matchMinute = getEffectiveMatchMinute(match);

    creditAppearances(homeSquad, statsByPlayerId, matchMinute);
    creditAppearances(awaySquad, statsByPlayerId, matchMinute);

    const homeGoals = assignGoalsForSide(match, homeSquad, match.home_score, true, statsByPlayerId, events);
    const awayGoals = assignGoalsForSide(match, awaySquad, match.away_score, false, statsByPlayerId, events);
    totals.goals += homeGoals.goals + awayGoals.goals;
    totals.assists += homeGoals.assists + awayGoals.assists;

    const homeCards = assignCardsForSide(match, homeSquad, true, statsByPlayerId, events);
    const awayCards = assignCardsForSide(match, awaySquad, false, statsByPlayerId, events);
    totals.yellowCards += homeCards.yellowCards + awayCards.yellowCards;
    totals.redCards += homeCards.redCards + awayCards.redCards;
  }

  events.sort((left, right) => left.match_number - right.match_number || left.minute - right.minute);

  return {
    statsByPlayerId,
    events,
    totals,
  };
}

function assignGoalsForSide(
  match: MatchSeed & { home_score: number; away_score: number; home_team_id: string; away_team_id: string },
  squad: SquadPlayer[],
  goals: number,
  isHome: boolean,
  statsByPlayerId: Map<number, StatLine>,
  events: DevMatchPlayerEventInsert[],
) {
  let assists = 0;
  let goalsAssigned = 0;

  for (let index = 0; index < goals; index += 1) {
    const minute = pickGoalMinute(match, index, goals);
    const scorer = pickWeighted(squad, (entry) => scorerWeight(entry.player));
    goalsAssigned += 1;

    if (!scorer) {
      events.push({
        match_number: match.match_number,
        team_id: isHome ? match.home_team_id : match.away_team_id,
        player_id: null,
        related_player_id: null,
        event_type: "goal",
        minute,
        is_home: isHome,
      });
      continue;
    }

    const scorerStats = statsByPlayerId.get(scorer.player.id);
    if (scorerStats) scorerStats.goals += 1;

    const assistPlayer = Math.random() < 0.78
      ? pickWeighted(
          squad.filter((entry) => entry.player.id !== scorer.player.id && getPositionRole(entry.player.position) !== "goalkeeper"),
          (entry) => assistWeight(entry.player),
        )
      : null;

    if (assistPlayer) {
      const assistStats = statsByPlayerId.get(assistPlayer.player.id);
      if (assistStats) assistStats.assists += 1;
      assists += 1;
    }

    events.push({
      match_number: match.match_number,
      team_id: isHome ? match.home_team_id : match.away_team_id,
      player_id: scorer.player.id,
      related_player_id: assistPlayer?.player.id ?? null,
      event_type: "goal",
      minute,
      is_home: isHome,
    });
  }

  return { goals: goalsAssigned, assists };
}

function assignCardsForSide(
  match: MatchSeed & { home_score: number; away_score: number; home_team_id: string; away_team_id: string },
  squad: SquadPlayer[],
  isHome: boolean,
  statsByPlayerId: Map<number, StatLine>,
  events: DevMatchPlayerEventInsert[],
) {
  const yellowCardTarget = randomCardCount();
  const redCardTarget = Math.random() < 0.055 ? 1 : 0;
  let yellowCards = 0;
  let redCards = 0;

  for (let index = 0; index < yellowCardTarget; index += 1) {
    const player = pickWeighted(squad, (entry) => cardWeight(entry.player));
    if (!player) continue;
    yellowCards += 1;
    const stats = statsByPlayerId.get(player.player.id);
    if (stats) stats.yellow_cards += 1;
    events.push({
      match_number: match.match_number,
      team_id: isHome ? match.home_team_id : match.away_team_id,
      player_id: player.player.id,
      related_player_id: null,
      event_type: "yellow_card",
      minute: randomInt(12, getEffectiveMatchMinute(match)),
      is_home: isHome,
    });
  }

  for (let index = 0; index < redCardTarget; index += 1) {
    const player = pickWeighted(squad, (entry) => cardWeight(entry.player) * 0.75);
    if (!player) continue;
    redCards += 1;
    const stats = statsByPlayerId.get(player.player.id);
    if (stats) stats.red_cards += 1;
    events.push({
      match_number: match.match_number,
      team_id: isHome ? match.home_team_id : match.away_team_id,
      player_id: player.player.id,
      related_player_id: null,
      event_type: "red_card",
      minute: randomInt(38, getEffectiveMatchMinute(match)),
      is_home: isHome,
    });
  }

  return { yellowCards, redCards };
}

function pickMatchSquad(players: PlayerSeed[]) {
  if (players.length === 0) return [];

  const keepers = shuffled(players.filter((player) => getPositionRole(player.position) === "goalkeeper"));
  const defenders = shuffled(players.filter((player) => getPositionRole(player.position) === "defender"));
  const midfielders = shuffled(players.filter((player) => getPositionRole(player.position) === "midfielder"));
  const forwards = shuffled(players.filter((player) => getPositionRole(player.position) === "forward"));
  const others = shuffled(players.filter((player) => getPositionRole(player.position) === "other"));

  const starters: PlayerSeed[] = [
    ...keepers.slice(0, 1),
    ...defenders.slice(0, 4),
    ...midfielders.slice(0, 3),
    ...forwards.slice(0, 3),
  ];

  for (const player of [...midfielders.slice(3), ...defenders.slice(4), ...forwards.slice(3), ...others, ...players]) {
    if (starters.length >= Math.min(11, players.length)) break;
    if (!starters.some((starter) => starter.id === player.id)) starters.push(player);
  }

  const remaining = shuffled(players.filter((player) => !starters.some((starter) => starter.id === player.id)));
  const bench = remaining.slice(0, Math.min(5, remaining.length));

  return [
    ...starters.map((player) => ({ player, starter: true })),
    ...bench.map((player) => ({ player, starter: false })),
  ];
}

function creditAppearances(squad: SquadPlayer[], statsByPlayerId: Map<number, StatLine>, matchMinute: number) {
  for (const entry of squad) {
    const stats = statsByPlayerId.get(entry.player.id);
    if (!stats) continue;

    stats.appearances += 1;
    stats.minutes_played += entry.starter
      ? Math.max(1, Math.min(matchMinute, randomInt(Math.max(45, Math.floor(matchMinute * 0.65)), matchMinute)))
      : Math.max(1, Math.min(matchMinute, randomInt(8, Math.max(12, Math.floor(matchMinute * 0.45)))));
  }
}

function randomPlayerStats(position: string | null | undefined) {
  const role = getPositionRole(position);
  const appearances = weightedInt(0, 7, 1.4);

  if (appearances === 0) {
    return emptyStatLine();
  }

  return {
    appearances,
    minutes_played: weightedInt(25, appearances * 105, 0.85),
    goals: role === "goalkeeper" ? 0 : weightedInt(0, role === "forward" ? 8 : role === "midfielder" ? 5 : 3, role === "forward" ? 1.7 : 2.6),
    assists: role === "goalkeeper" ? 0 : weightedInt(0, role === "forward" ? 5 : role === "midfielder" ? 7 : 4, role === "midfielder" ? 1.9 : 2.4),
    yellow_cards: weightedInt(0, role === "defender" ? 4 : 3, 2.8),
    red_cards: Math.random() < 0.035 ? 1 : 0,
  };
}

function isScoredMatch(match: MatchSeed): match is MatchSeed & {
  home_score: number;
  away_score: number;
  home_team_id: string;
  away_team_id: string;
} {
  const status = String(match.status ?? "").toLowerCase();
  return (
    (status === "finished" || status === "live") &&
    Boolean(match.home_team_id && match.away_team_id) &&
    typeof match.home_score === "number" &&
    typeof match.away_score === "number" &&
    match.home_score >= 0 &&
    match.away_score >= 0
  );
}

function emptyStatLine(): StatLine {
  return {
    appearances: 0,
    minutes_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
  };
}

function comparePlayerLikelihood(left: PlayerSeed, right: PlayerSeed) {
  return compareOdds(left.top_scorer_odds, right.top_scorer_odds) || (left.shirt_number ?? 99) - (right.shirt_number ?? 99);
}

function scorerWeight(player: PlayerSeed) {
  const role = getPositionRole(player.position);
  const roleWeight =
    role === "forward" ? 7 :
    role === "midfielder" ? 3.2 :
    role === "defender" ? 1 :
    role === "goalkeeper" ? 0.02 :
    1.8;
  const odds = readOptionalNumber(player.top_scorer_odds);
  const oddsBoost = odds ? Math.max(0.4, Math.min(3.4, 18 / odds)) : 1;
  return roleWeight * oddsBoost;
}

function assistWeight(player: PlayerSeed) {
  const role = getPositionRole(player.position);
  if (role === "midfielder") return 5;
  if (role === "forward") return 3.8;
  if (role === "defender") return 1.7;
  return 0.4;
}

function cardWeight(player: PlayerSeed) {
  const role = getPositionRole(player.position);
  if (role === "defender") return 5;
  if (role === "midfielder") return 3.2;
  if (role === "forward") return 1.5;
  if (role === "goalkeeper") return 0.35;
  return 2;
}

function getPositionRole(position: string | null | undefined) {
  const value = String(position ?? "").toLowerCase();
  if (value === "g" || value === "gk" || value.includes("goal") || value.includes("keeper")) return "goalkeeper";
  if (value === "d" || value.includes("def") || value.includes("back")) return "defender";
  if (value === "m" || value.includes("mid")) return "midfielder";
  if (value === "f" || value.includes("att") || value.includes("for") || value.includes("wing") || value.includes("striker")) return "forward";
  return "other";
}

function pickGoalMinute(match: MatchSeed, index: number, goals: number) {
  const maxMinute = getEffectiveMatchMinute(match);
  const segment = Math.max(8, Math.floor(maxMinute / Math.max(1, goals)));
  const min = Math.max(1, index * segment + 1);
  const max = Math.min(maxMinute, min + segment + 10);
  return randomInt(min, max);
}

function getEffectiveMatchMinute(match: MatchSeed) {
  const status = String(match.status ?? "").toLowerCase();
  if (status === "live") {
    return Math.max(1, Math.min(135, match.minute ?? 65));
  }

  if (match.match_phase === "extra_time") return 120;
  return 90 + (Math.random() < 0.25 ? randomInt(1, 8) : 0);
}

function randomCardCount() {
  const roll = Math.random();
  if (roll < 0.18) return 0;
  if (roll < 0.48) return 1;
  if (roll < 0.76) return 2;
  if (roll < 0.91) return 3;
  return randomInt(4, 6);
}

function weightedInt(min: number, max: number, power: number) {
  const value = min + Math.pow(Math.random(), power) * (max - min);
  return Math.max(min, Math.round(value));
}

function randomInt(min: number, max: number) {
  const normalizedMin = Math.ceil(Math.min(min, max));
  const normalizedMax = Math.floor(Math.max(min, max));
  return normalizedMin + Math.floor(Math.random() * (normalizedMax - normalizedMin + 1));
}

function shuffled<T>(items: T[]) {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ item }) => item);
}

function pickWeighted<T>(items: T[], getWeight: (item: T) => number) {
  if (items.length === 0) return null;
  const weightedItems = items.map((item) => ({ item, weight: Math.max(0.01, getWeight(item)) }));
  const total = weightedItems.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of weightedItems) {
    cursor -= item.weight;
    if (cursor <= 0) return item.item;
  }

  return weightedItems[weightedItems.length - 1]?.item ?? null;
}

function compareOdds(left: number | string | null | undefined, right: number | string | null | undefined) {
  const leftNumber = readOptionalNumber(left);
  const rightNumber = readOptionalNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return 0;
}

function readOptionalNumber(value: number | string | null | undefined) {
  const number = typeof value === "string" ? Number(value.replace("%", "")) : Number(value);
  return Number.isFinite(number) ? number : null;
}

function revalidatePlayerStatPaths() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/stats");
  revalidatePath("/dashboard/teams", "layout");
  revalidatePath("/dashboard/players", "layout");
  revalidatePath("/dashboard/matches", "layout");
  revalidatePath("/dev-tools");
}

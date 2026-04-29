import {
  bzzoiroGet,
  bzzoiroGetPaginated,
} from "@/lib/bzzoiro/client";

export type BzzoiroPlayerDetail = {
  id: number;
  name: string;
  short_name?: string | null;
  position?: string | null;
  specific_position?: string | null;
  positions_detailed?: string[] | null;
  attributes?: Record<string, number | string | null> | string[] | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  jersey_number?: number | null;
  height?: number | string | null;
  weight?: number | string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  preferred_foot?: string | null;
  contract_until?: string | null;
  market_value?: number | string | null;
  current_team?: BzzoiroPlayerTeam | null;
  national_team?: BzzoiroPlayerTeam | null;
  availability?: string | null;
  injury_type?: string | null;
  injury_expected_return?: string | null;
  transfers?: BzzoiroTransfer[] | null;
};

export type BzzoiroPlayerTeam = {
  id?: number | null;
  name?: string | null;
  short_name?: string | null;
  country?: string | null;
};

export type BzzoiroTransfer = {
  date?: string | null;
  from_team?: string | null;
  to_team?: string | null;
  type?: string | null;
  fee?: number | string | null;
};

export type BzzoiroPlayerStatsRow = {
  event?: {
    id?: number | null;
    home_team?: string | null;
    away_team?: string | null;
    event_date?: string | null;
    home_score?: number | null;
    away_score?: number | null;
  } | null;
  player?: {
    id?: number | null;
    name?: string | null;
    short_name?: string | null;
    position?: string | null;
    team?: string | null;
  } | null;
  minutes_played?: number | null;
  rating?: number | null;
  touches?: number | null;
  goals?: number | null;
  goal_assist?: number | null;
  expected_goals?: number | null;
  expected_assists?: number | null;
  total_shots?: number | null;
  shots_on_target?: number | null;
  total_pass?: number | null;
  accurate_pass?: number | null;
  key_pass?: number | null;
  total_cross?: number | null;
  accurate_cross?: number | null;
  total_long_balls?: number | null;
  accurate_long_balls?: number | null;
  dribble_attempted?: number | null;
  dribble_won?: number | null;
  duel_won?: number | null;
  duel_lost?: number | null;
  aerial_won?: number | null;
  aerial_lost?: number | null;
  total_tackle?: number | null;
  won_tackle?: number | null;
  total_clearance?: number | null;
  interception?: number | null;
  ball_recovery?: number | null;
  dispossessed?: number | null;
  possession_lost?: number | null;
  was_fouled?: number | null;
  fouls?: number | null;
  yellow_card?: number | null;
  red_card?: number | null;
  penalty_won?: number | null;
  penalty_miss?: number | null;
  penalty_conceded?: number | null;
  saves?: number | null;
  goals_conceded?: number | null;
  penalty_save?: number | null;
  penalty_faced?: number | null;
  heatmap?: Array<{ x?: number | null; y?: number | null }> | null;
};

export async function getBzzoiroPlayerProfile(
  playerId: string | number | null | undefined,
) {
  if (playerId === null || playerId === undefined || playerId === "") {
    return { detail: null, stats: [] as BzzoiroPlayerStatsRow[] };
  }

  const [detail, stats] = await Promise.all([
    getBzzoiroPlayerById(playerId),
    getBzzoiroPlayerStats(playerId),
  ]);

  return { detail, stats };
}

async function getBzzoiroPlayerById(playerId: string | number) {
  try {
    return await bzzoiroGet<BzzoiroPlayerDetail>(
      `/players/${encodeURIComponent(String(playerId))}/`,
    );
  } catch (error) {
    console.error("[bzzoiro] player detail fetch failed", error);
    return null;
  }
}

async function getBzzoiroPlayerStats(playerId: string | number) {
  try {
    return await bzzoiroGetPaginated<BzzoiroPlayerStatsRow>(
      "/player-stats/",
      { player: playerId, tz: "Asia/Jerusalem" },
      4,
    );
  } catch (error) {
    console.error("[bzzoiro] player stats fetch failed", error);
    return [];
  }
}

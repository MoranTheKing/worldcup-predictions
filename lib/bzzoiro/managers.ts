import {
  bzzoiroGet,
  bzzoiroGetPaginated,
  getBzzoiroPublicImageUrl,
} from "@/lib/bzzoiro/client";

export type BzzoiroTacticalStyle = {
  rank?: number | null;
  code?: string | null;
  name?: string | null;
  category?: string | null;
  emoji?: string | null;
  description?: string | null;
  score?: number | null;
};

export type BzzoiroManager = {
  id: number;
  name: string;
  short_name?: string | null;
  country?: string | null;
  current_team?: {
    id?: number | null;
    name?: string | null;
  } | null;
  preferred_formation?: string | null;
  formations_used?: Record<string, number> | null;
  profile?: string | null;
  team_style?: string | null;
  pressing_intensity?: number | null;
  defensive_line?: string | null;
  tactical_styles?: BzzoiroTacticalStyle[] | null;
  matches_total?: number | null;
  wins?: number | null;
  draws?: number | null;
  losses?: number | null;
  win_pct?: number | null;
  avg_goals_scored?: number | null;
  avg_goals_conceded?: number | null;
  avg_goals_scored_1h?: number | null;
  avg_goals_conceded_1h?: number | null;
  avg_possession?: number | null;
  avg_shots?: number | null;
  avg_shots_on_target?: number | null;
  avg_xg_for?: number | null;
  avg_xg_against?: number | null;
  avg_corners?: number | null;
  avg_yellow_cards?: number | null;
  avg_red_cards?: number | null;
  avg_fouls?: number | null;
  clean_sheet_pct?: number | null;
  btts_pct?: number | null;
  over_25_pct?: number | null;
  over_15_pct?: number | null;
  fail_to_score_pct?: number | null;
};

export async function getBzzoiroManagerForTeam(teamId: string | number | null | undefined) {
  if (teamId === null || teamId === undefined || teamId === "") return null;

  try {
    const managers = await bzzoiroGetPaginated<BzzoiroManager>(
      "/managers/",
      { team_id: teamId },
      1,
    );
    const manager = managers[0] ?? null;
    if (!manager) return null;

    return (await getBzzoiroManagerById(manager.id)) ?? manager;
  } catch (error) {
    console.error("[bzzoiro] manager team fetch failed", error);
    return null;
  }
}

export async function getBzzoiroManagerById(managerId: string | number | null | undefined) {
  if (managerId === null || managerId === undefined || managerId === "") return null;

  try {
    return await bzzoiroGet<BzzoiroManager>(`/managers/${encodeURIComponent(String(managerId))}/`);
  } catch (error) {
    console.error("[bzzoiro] manager detail fetch failed", error);
    return null;
  }
}

export function getBzzoiroManagerPhotoUrl(manager: Pick<BzzoiroManager, "id"> | null | undefined) {
  return getBzzoiroPublicImageUrl("manager", manager?.id);
}

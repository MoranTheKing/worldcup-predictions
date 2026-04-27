import { notFound } from "next/navigation";
import { isLocalServerRequest } from "@/lib/security/local-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import DevToolsClient, { type DevMatchRow, type DevTeamOddsRow } from "./DevToolsClient";

export const dynamic = "force-dynamic";

export default async function DevToolsPage() {
  if (process.env.NODE_ENV === "production" || !(await isLocalServerRequest())) {
    notFound();
  }

  const supabase = createAdminClient();
  const [{ data: matchesData, error }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        match_number,
        stage,
        status,
        match_phase,
        date_time,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        home_score,
        away_score,
        home_odds,
        draw_odds,
        away_odds,
        minute,
        is_extra_time,
        home_penalty_score,
        away_penalty_score
      `)
      .order("date_time", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, outright_odds, outright_odds_updated_at")
      .order("name", { ascending: true }),
  ]);

  const rows = attachTeamsToMatches(
    (matchesData ?? []) as DevMatchRow[],
    teamsData ?? [],
  ) as DevMatchRow[];

  return (
    <DevToolsClient
      matches={rows}
      teams={(teamsData ?? []) as DevTeamOddsRow[]}
      error={error?.message ?? null}
    />
  );
}

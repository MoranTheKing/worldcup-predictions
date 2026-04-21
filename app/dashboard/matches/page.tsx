import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import MatchesClient, { type MatchListRow } from "./MatchesClient";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const supabase = await createClient();

  const [{ data: matchesData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        match_number,
        stage,
        status,
        date_time,
        minute,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        home_score,
        away_score,
        is_extra_time,
        home_penalty_score,
        away_penalty_score
      `)
      .order("date_time", { ascending: true }),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter")
      .order("name", { ascending: true }),
  ]);

  const matches = attachTeamsToMatches(
    (matchesData ?? []) as MatchListRow[],
    (teamsData ?? []),
  ) as MatchListRow[];

  return <MatchesClient matches={matches} />;
}

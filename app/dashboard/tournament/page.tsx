import { createClient } from "@/lib/supabase/server";
import { buildTournamentTeams, getGroupMatches, type TournamentTeamStateRow } from "@/lib/tournament/tournament-state";
import {
  buildTournamentStandings,
  type TournamentMatch,
} from "@/lib/utils/standings";
import { resolveKnockoutBracket } from "@/lib/bracket/knockout";
import TournamentClient from "./TournamentClient";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  const supabase = await createClient();

  const { data: matchesData } = await supabase
    .from("matches")
    .select("match_number, stage, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, status, minute, date_time, is_extra_time, home_penalty_score, away_penalty_score")
    .order("date_time", { ascending: true });

  const allMatches = (matchesData ?? []) as TournamentMatch[];
  const groupMatches = getGroupMatches(allMatches);

  const fullTeamsQuery = await supabase
    .from("teams")
    .select(`
      id,
      name,
      name_he,
      logo_url,
      group_letter,
      points,
      goals_for,
      goals_against,
      fair_play_score,
      fifa_ranking,
      played_count,
      is_eliminated
    `)
    .order("group_letter")
    .order("name_he", { ascending: true });

  const fallbackTeamsQuery = fullTeamsQuery.error
    ? await supabase
        .from("teams")
        .select("id, name, name_he, logo_url, group_letter, played_count, is_eliminated")
        .order("group_letter")
        .order("name_he", { ascending: true })
    : null;

  const rawTeams = (fullTeamsQuery.data ?? fallbackTeamsQuery?.data ?? []) as TournamentTeamStateRow[];
  const teams = buildTournamentTeams(rawTeams, groupMatches);

  const tournament = buildTournamentStandings(teams, groupMatches);
  const liveGroupTeamIds = Array.from(
    new Set(
      groupMatches.flatMap((match) => (
        match.status === "live"
          ? [match.home_team_id, match.away_team_id].filter((teamId): teamId is string => Boolean(teamId))
          : []
      )),
    ),
  );

  const bracket = resolveKnockoutBracket({
    groupStandings: tournament.groupStandings,
    bestThirdStandings: tournament.bestThirdStandings,
    matches: allMatches,
  });

  const hasLive = allMatches.some((m) => m.status === "live");

  return (
    <TournamentClient
      groupStandings={tournament.groupStandings}
      bestThirdStandings={tournament.bestThirdStandings}
      teamsRemaining={tournament.teamsRemaining}
      bracket={bracket}
      hasLive={hasLive}
      liveTeamIds={liveGroupTeamIds}
    />
  );
}

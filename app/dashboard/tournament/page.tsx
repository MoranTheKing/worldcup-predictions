import { createClient } from "@/lib/supabase/server";
import { buildTournamentTeams, getGroupMatches, type TournamentTeamStateRow } from "@/lib/tournament/tournament-state";
import {
  buildTournamentStandings,
  type TournamentMatch,
} from "@/lib/utils/standings";
import { resolveKnockoutBracket } from "@/lib/bracket/knockout";
import { buildKnockoutWinnerTree } from "@/lib/tournament/knockout-tree";
import TournamentClient, { type TournamentTab } from "./TournamentClient";

type LiveGroupScoreMap = Record<
  string,
  {
    teamGoals: number;
    opponentGoals: number;
    state: "winning" | "drawing" | "losing";
  }
>;

export const dynamic = "force-dynamic";

export default async function TournamentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  const initialTab = parseTournamentTab(tab);
  const supabase = await createClient();

  const { data: matchesData } = await supabase
    .from("public_tournament_matches")
    .select("match_number, stage, home_team_id, away_team_id, home_placeholder, away_placeholder, home_score, away_score, status, minute, date_time, is_extra_time, home_penalty_score, away_penalty_score")
    .order("date_time", { ascending: true });

  const allMatches = (matchesData ?? []) as TournamentMatch[];
  const groupMatches = getGroupMatches(allMatches);

  const fullTeamsQuery = await supabase
    .from("public_tournament_teams")
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
        .from("public_tournament_teams")
        .select("id, name, name_he, logo_url, group_letter, played_count, is_eliminated")
        .order("group_letter")
        .order("name_he", { ascending: true })
    : null;

  const rawTeams = (fullTeamsQuery.data ?? fallbackTeamsQuery?.data ?? []) as TournamentTeamStateRow[];
  const teams = buildTournamentTeams(rawTeams, groupMatches);

  const tournament = buildTournamentStandings(teams, groupMatches);
  const liveGroupScores = groupMatches.reduce<LiveGroupScoreMap>((accumulator, match) => {
    if (
      match.status !== "live" ||
      match.home_team_id === null ||
      match.away_team_id === null ||
      match.home_score === null ||
      match.away_score === null
    ) {
      return accumulator;
    }

    accumulator[match.home_team_id] = {
      teamGoals: match.home_score,
      opponentGoals: match.away_score,
      state:
        match.home_score > match.away_score
          ? "winning"
          : match.home_score < match.away_score
            ? "losing"
            : "drawing",
    };
    accumulator[match.away_team_id] = {
      teamGoals: match.away_score,
      opponentGoals: match.home_score,
      state:
        match.away_score > match.home_score
          ? "winning"
          : match.away_score < match.home_score
            ? "losing"
            : "drawing",
    };

    return accumulator;
  }, {});

  const bracket = resolveKnockoutBracket({
    groupStandings: tournament.groupStandings,
    bestThirdStandings: tournament.bestThirdStandings,
    matches: allMatches,
  });
  const knockoutTree = buildKnockoutWinnerTree(allMatches);
  const serializedKnockoutTree = {
    rounds: knockoutTree.rounds,
    leafCount: knockoutTree.leafCount,
    finalMatchNumber: knockoutTree.finalMatchNumber,
    thirdPlaceMatchNumber: knockoutTree.thirdPlaceMatchNumber,
  };

  const hasLive = allMatches.some((m) => m.status === "live");

  return (
    <TournamentClient
      key={initialTab}
      initialTab={initialTab}
      groupStandings={tournament.groupStandings}
      bestThirdStandings={tournament.bestThirdStandings}
      teamsRemaining={tournament.teamsRemaining}
      bracket={bracket}
      knockoutTree={serializedKnockoutTree}
      hasLive={hasLive}
      liveGroupScores={liveGroupScores}
    />
  );
}

function parseTournamentTab(value: string | string[] | undefined): TournamentTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "third" || tab === "knockout") {
    return tab;
  }

  return "groups";
}

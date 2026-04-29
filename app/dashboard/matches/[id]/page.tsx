import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import { getBzzoiroMatchCenter } from "@/lib/bzzoiro/matches";
import { notFound } from "next/navigation";
import MatchDetailClient, { type MatchDetailRow, type MatchPagePlayer } from "./MatchDetailClient";

export const dynamic = "force-dynamic";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isInteger(matchId)) notFound();

  const supabase = await createClient();
  const [{ data: matchData }, { data: teamsData }] = await Promise.all([
    supabase
      .from("matches")
      .select(`
        match_number,
        stage,
        status,
        match_phase,
        date_time,
        minute,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        home_score,
        away_score,
        home_odds,
        draw_odds,
        away_odds,
        is_extra_time,
        home_penalty_score,
        away_penalty_score
      `)
      .eq("match_number", matchId)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter, bzzoiro_team_id, coach_name, coach_photo_url")
      .order("name", { ascending: true }),
  ]);

  if (!matchData) notFound();

  const [attachedMatch] = attachTeamsToMatches(
    [matchData as MatchDetailRow],
    teamsData ?? [],
  );

  const match = attachedMatch as MatchDetailRow;
  const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean) as string[];
  const [{ data: playersData }, bzzoiro] = await Promise.all([
    teamIds.length > 0
      ? supabase
          .from("players")
          .select("id, name, team_id, position, photo_url, shirt_number, top_scorer_odds, bzzoiro_player_id")
          .in("team_id", teamIds)
          .order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
    getBzzoiroMatchCenter(match),
  ]);

  return (
    <MatchDetailClient
      match={match}
      bzzoiro={bzzoiro}
      players={(playersData ?? []) as MatchPagePlayer[]}
    />
  );
}

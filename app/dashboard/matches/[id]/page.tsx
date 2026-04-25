import { createClient } from "@/lib/supabase/server";
import { attachTeamsToMatches } from "@/lib/tournament/matches";
import { notFound } from "next/navigation";
import MatchDetailClient, { type MatchDetailRow } from "./MatchDetailClient";

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
        is_extra_time,
        home_penalty_score,
        away_penalty_score
      `)
      .eq("match_number", matchId)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url, group_letter")
      .order("name", { ascending: true }),
  ]);

  if (!matchData) notFound();

  const [match] = attachTeamsToMatches(
    [matchData as MatchDetailRow],
    teamsData ?? [],
  );

  return <MatchDetailClient match={match as MatchDetailRow} />;
}

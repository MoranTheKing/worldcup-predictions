import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: outright },
    { data: firstMatch },
    { data: teams },
    { data: players },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("username, current_streak, jokers_groups_remaining, jokers_knockouts_remaining")
      .eq("id", user.id)
      .single(),
    supabase
      .from("outright_bets")
      .select("predicted_winner_team_id, predicted_top_scorer_player_id, predicted_top_scorer_name, teams(name, name_he, logo_url), players(id, name)")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("date_time")
      .order("date_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url")
      .order("name_he", { ascending: true }),
    supabase
      .from("players")
      .select("id, name, team_id, position")
      .order("name", { ascending: true }),
  ]);

  const winnerTeam  = (outright as any)?.teams  as { name: string; name_he: string | null; logo_url: string | null } | null;
  const scorerPlayer = (outright as any)?.players as { id: number; name: string } | null;

  return (
    <ProfileClient
      userId={user.id}
      username={profile?.username ?? ""}
      streak={profile?.current_streak ?? 0}
      jokersGroups={profile?.jokers_groups_remaining ?? 1}
      jokersKnockouts={profile?.jokers_knockouts_remaining ?? 1}
      outrightWinnerId={(outright as any)?.predicted_winner_team_id ?? null}
      outrightWinnerName={winnerTeam?.name ?? null}
      outrightWinnerHe={winnerTeam?.name_he ?? null}
      outrightWinnerLogo={winnerTeam?.logo_url ?? null}
      outrightTopScorerPlayerId={scorerPlayer?.id ?? null}
      outrightTopScorerName={outright?.predicted_top_scorer_name ?? scorerPlayer?.name ?? null}
      firstMatchTime={firstMatch?.date_time ?? null}
      teams={teams ?? []}
      players={players ?? []}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: outright }] = await Promise.all([
    supabase
      .from("users")
      .select("username, current_streak, jokers_groups_remaining, jokers_knockouts_remaining")
      .eq("id", user!.id)
      .single(),
    supabase
      .from("outright_bets")
      .select("predicted_top_scorer_name, teams(name, name_he, logo_url)")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const team = (outright as any)?.teams as
    | { name: string; name_he: string | null; logo_url: string | null }
    | null;

  return (
    <DashboardClient
      username={profile?.username ?? ""}
      streak={profile?.current_streak ?? 0}
      jokersGroups={profile?.jokers_groups_remaining ?? 1}
      jokersKnockouts={profile?.jokers_knockouts_remaining ?? 1}
      outrightWinner={team?.name ?? null}
      outrightWinnerHe={team?.name_he ?? null}
      outrightWinnerLogo={team?.logo_url ?? null}
      outrightTopScorer={outright?.predicted_top_scorer_name ?? null}
    />
  );
}

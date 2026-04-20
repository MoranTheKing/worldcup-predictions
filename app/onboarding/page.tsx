import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If already onboarded, skip straight to dashboard
  const [{ data: profile }, { data: outright }] = await Promise.all([
    supabase.from("users").select("username").eq("id", user.id).single(),
    supabase
      .from("outright_bets")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (profile?.username && outright) redirect("/dashboard");

  // Load teams (with logo_url from DB) and players in parallel
  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, flag, logo_url, group_letter")
      .order("name_he", { ascending: true }),
    supabase
      .from("players")
      .select("id, name, team_id, position")
      .order("name", { ascending: true }),
  ]);

  return (
    <OnboardingForm
      userId={user.id}
      teams={teams ?? []}
      players={players ?? []}
      existingUsername={profile?.username ?? ""}
      hasOutright={!!outright}
    />
  );
}

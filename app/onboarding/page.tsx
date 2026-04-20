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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, name_he, flag, group_letter")
    .order("name_he", { ascending: true });

  return (
    <OnboardingForm
      userId={user.id}
      teams={teams ?? []}
      existingUsername={profile?.username ?? ""}
      hasOutright={!!outright}
    />
  );
}

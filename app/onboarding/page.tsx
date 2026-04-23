import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = getSafeRedirectPath(next, "/game");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  const onboardingStatus = await fetchOnboardingStatus(supabase, user.id);

  if (onboardingStatus.isComplete) {
    redirect(nextPath);
  }

  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, name_he, logo_url")
      .order("name_he", { ascending: true }),
    supabase.from("players").select("id, name, team_id, position").order("name", { ascending: true }),
  ]);

  const oauthAvatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <OnboardingForm
      existingAvatarUrl={onboardingStatus.avatarUrl}
      existingDisplayName={onboardingStatus.displayName ?? onboardingStatus.username ?? ""}
      nextPath={nextPath}
      oauthAvatarUrl={oauthAvatarUrl}
      players={
        ((players ?? []) as Array<{
          id: number;
          name: string;
          position: string | null;
          team_id: string | null;
        }>)
      }
      teams={
        ((teams ?? []) as Array<{
          id: string;
          logo_url: string | null;
          name: string;
          name_he: string | null;
        }>)
      }
      tournamentPrediction={onboardingStatus.tournamentPrediction}
      tournamentStarted={onboardingStatus.tournamentStarted}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const flow = searchParams.get("flow");
  const redirectPath = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (flow === "login") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const onboardingStatus = await fetchOnboardingStatus(supabase, user.id);

          if (!hasStartedAppRegistration(onboardingStatus)) {
            await supabase.auth.signOut();

            const signupUrl = new URL("/signup", origin);
            signupUrl.searchParams.set("notice", "google_signup_required");
            signupUrl.searchParams.set("next", redirectPath);
            return NextResponse.redirect(signupUrl);
          }
        }
      }

      return NextResponse.redirect(new URL(redirectPath, origin));
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  loginUrl.searchParams.set("next", redirectPath);
  return NextResponse.redirect(loginUrl);
}

function hasStartedAppRegistration(
  onboardingStatus: Awaited<ReturnType<typeof fetchOnboardingStatus>>,
) {
  return Boolean(
    onboardingStatus.username || onboardingStatus.hasTournamentPrediction,
  );
}

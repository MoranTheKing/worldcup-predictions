import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

const MFA_SETUP_REQUESTED_METADATA_KEY = "mfa_setup_requested";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const flow = searchParams.get("flow");
  const redirectPath = getSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (flow === "signup") {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { [MFA_SETUP_REQUESTED_METADATA_KEY]: redirectPath.startsWith("/mfa/setup") },
        });

        if (metadataError) {
          console.error("[auth/callback] Failed to mark MFA setup choice:", metadataError.message);
        }
      }

      if (flow === "login") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const onboardingStatus = await fetchOnboardingStatus(supabase, user.id);

          if (!hasStartedAppRegistration(onboardingStatus)) {
            const shouldDeleteUnusedGoogleAuthUser = isGoogleOnlyAuthUser(user);
            await supabase.auth.signOut();

            if (shouldDeleteUnusedGoogleAuthUser) {
              await deleteUnusedGoogleAuthUser(user.id);
            }

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

function isGoogleOnlyAuthUser(user: User) {
  const providers = getAuthProviders(user);

  return providers.has("google") && !providers.has("email");
}

function getAuthProviders(user: User) {
  const providers = new Set<string>();
  const metadataProviders = user.app_metadata?.providers;

  if (Array.isArray(metadataProviders)) {
    for (const provider of metadataProviders) {
      if (typeof provider === "string") {
        providers.add(provider);
      }
    }
  }

  for (const identity of user.identities ?? []) {
    if (typeof identity.provider === "string") {
      providers.add(identity.provider);
    }
  }

  return providers;
}

async function deleteUnusedGoogleAuthUser(userId: string) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("[auth/callback] Failed to delete unused Google auth user:", error.message);
    }
  } catch (error) {
    console.error("[auth/callback] Failed to prepare unused Google auth cleanup:", error);
  }
}

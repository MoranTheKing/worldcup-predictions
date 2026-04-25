import { redirect } from "next/navigation";
import type { MfaGateState } from "@/components/auth/AuthProvider";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_MFA_NEXT_PATH = "/game";

export function getMfaChallengePath(nextPath = DEFAULT_MFA_NEXT_PATH) {
  const safeNextPath = getSafeRedirectPath(nextPath, DEFAULT_MFA_NEXT_PATH);
  return `/mfa/challenge?next=${encodeURIComponent(safeNextPath)}`;
}

export async function getServerMfaGateState(
  supabase: ServerSupabaseClient,
): Promise<MfaGateState> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (error) {
    console.error("[MFA] assurance check failed:", error.message);
    return "challenge";
  }

  return data?.nextLevel === "aal2" && data.currentLevel !== data.nextLevel
    ? "challenge"
    : "clear";
}

export async function requireServerMfa(
  supabase: ServerSupabaseClient,
  nextPath = DEFAULT_MFA_NEXT_PATH,
) {
  const state = await getServerMfaGateState(supabase);

  if (state !== "clear") {
    redirect(getMfaChallengePath(nextPath));
  }
}

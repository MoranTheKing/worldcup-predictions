import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { fetchOnboardingStatus } from "@/lib/supabase/onboarding";
import { createClient } from "@/lib/supabase/server";
import MfaSetupClient from "./MfaSetupClient";

export const dynamic = "force-dynamic";

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const requestedNextPath = getSafeRedirectPath(next, "/onboarding");
  const nextPath = requestedNextPath.startsWith("/mfa/setup") ? "/onboarding" : requestedNextPath;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mfa/setup")}`);
  }

  const [{ data: factors, error: factorsError }, onboardingStatus] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    fetchOnboardingStatus(supabase, user.id),
  ]);
  const hasVerifiedTotp = !factorsError && Boolean(factors?.totp?.length);
  const hasPendingTotp =
    !factorsError &&
    Boolean(
      factors?.all?.some(
        (factor) => factor.factor_type === "totp" && factor.status === "unverified",
      ),
    );

  if (hasVerifiedTotp) {
    redirect(nextPath);
  }

  if (!hasPendingTotp && onboardingStatus.isComplete) {
    redirect(nextPath);
  }

  return <MfaSetupClient nextPath={nextPath} />;
}

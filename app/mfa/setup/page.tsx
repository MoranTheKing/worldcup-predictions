import { redirect } from "next/navigation";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";
import MfaSetupClient from "./MfaSetupClient";

export const dynamic = "force-dynamic";

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = getSafeRedirectPath(next, "/onboarding");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mfa/setup")}`);
  }

  return <MfaSetupClient nextPath={nextPath} />;
}

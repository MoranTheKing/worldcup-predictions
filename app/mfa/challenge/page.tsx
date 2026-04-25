import { redirect } from "next/navigation";
import { getServerMfaGateState } from "@/lib/auth/mfa-server";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MfaChallengePage({
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
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const mfaGateState = await getServerMfaGateState(supabase);

  if (mfaGateState === "clear") {
    redirect(nextPath);
  }

  return (
    <main className="wc-page flex min-h-screen items-center justify-center px-4 py-10">
      <div className="wc-glass w-full max-w-md rounded-[2rem] p-7 text-center sm:p-8">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-wc-neon/25 bg-wc-neon/10 text-2xl">
          MFA
        </div>
        <p className="mt-5 text-sm font-black text-wc-fg1">בודקים את שכבת האבטחה</p>
        <p className="mt-2 text-xs leading-6 text-wc-fg3">
          מיד נציג את מסך האימות הנוסף כדי להמשיך לאזור המשחק.
        </p>
      </div>
    </main>
  );
}

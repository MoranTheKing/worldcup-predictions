import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";
import GameHeroShell from "@/components/game/GameHeroShell";
import GameSubNav from "@/components/game/GameSubNav";
import { getUserJokerUsage } from "@/lib/game/boosters";
import { getUserGameStats } from "@/lib/game/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAuthProfile, resolveDisplayName } from "@/lib/supabase/auth-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/game");
  }

  const admin = createAdminClient();

  const [profile, jokerUsage, gameStats] = await Promise.all([
    fetchAuthProfile(admin, user.id).catch((error) => {
      console.error("[GameLayout] profile fetch failed:", error);
      return null;
    }),
    getUserJokerUsage(admin, user.id).catch((error) => {
      console.error("[GameLayout] joker usage failed:", error);
      return { groupUsed: false, knockoutUsed: false };
    }),
    getUserGameStats(admin, user.id).catch((error) => {
      console.error("[GameLayout] game stats failed:", error);
      return { totalHits: 0 };
    }),
  ]);

  const displayName = resolveDisplayName(profile, user);
  const avatarUrl = profile?.avatarUrl ?? null;
  const totalScore = profile?.totalScore ?? 0;
  const totalHits = gameStats.totalHits;

  return (
    <DashboardShell>
      <div className="max-w-5xl p-4 md:p-8">
        <GameHeroShell
          displayName={displayName}
          avatarUrl={avatarUrl}
          totalScore={totalScore}
          totalHits={totalHits}
          groupJokerUsed={jokerUsage.groupUsed}
          knockoutJokerUsed={jokerUsage.knockoutUsed}
        />

        <GameSubNav />
        {children}
      </div>
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}

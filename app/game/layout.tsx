import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";
import GameHeroShell from "@/components/game/GameHeroShell";
import GameSubNav from "@/components/game/GameSubNav";
import { requireServerMfa } from "@/lib/auth/mfa-server";
import {
  areGroupJokersAvailable,
  GROUP_JOKER_LIMIT,
  getUserJokerUsage,
} from "@/lib/game/boosters";
import { getUserLiveScoreProjection } from "@/lib/game/live-score-projection";
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

  await requireServerMfa(supabase, "/game");

  const admin = createAdminClient();

  const [profile, jokerUsage, groupJokersAvailable, gameStats, liveProjection] = await Promise.all([
    fetchAuthProfile(admin, user.id).catch((error) => {
      console.error("[GameLayout] profile fetch failed:", error);
      return null;
    }),
    getUserJokerUsage(admin, user.id).catch((error) => {
      console.error("[GameLayout] joker usage failed:", error);
      return {
        groupUsed: false,
        knockoutUsed: false,
        groupUsedCount: 0,
        groupRemaining: GROUP_JOKER_LIMIT,
      };
    }),
    areGroupJokersAvailable(admin).catch((error) => {
      console.error("[GameLayout] joker availability failed:", error);
      return false;
    }),
    getUserGameStats(admin, user.id).catch((error) => {
      console.error("[GameLayout] game stats failed:", error);
      return { totalHits: 0 };
    }),
    getUserLiveScoreProjection(admin, user.id).catch((error) => {
      console.error("[GameLayout] live projection failed:", error);
      return { liveScoreDelta: null, liveMatchCount: 0, livePredictionCount: 0 };
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
          currentUserId={user.id}
          displayName={displayName}
          avatarUrl={avatarUrl}
          totalScore={totalScore}
          totalHits={totalHits}
          liveScoreDelta={liveProjection.liveScoreDelta}
          liveMatchCount={liveProjection.liveMatchCount}
          groupJokerUsedCount={jokerUsage.groupUsedCount}
          groupJokerLimit={GROUP_JOKER_LIMIT}
          groupJokersAvailable={groupJokersAvailable}
        />

        <GameSubNav />
        {children}
      </div>
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}

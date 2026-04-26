import { NextResponse } from "next/server";
import { getServerMfaGateState } from "@/lib/auth/mfa-server";
import { getUserGameStats } from "@/lib/game/stats";
import { getUserLiveScoreProjection } from "@/lib/game/live-score-projection";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAuthProfile } from "@/lib/supabase/auth-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mfaState = await getServerMfaGateState(supabase);
  if (mfaState !== "clear") {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [profile, gameStats, liveProjection] = await Promise.all([
    fetchAuthProfile(admin, user.id).catch((error) => {
      console.error("[live-score-projection] profile fetch failed:", error);
      return null;
    }),
    getUserGameStats(admin, user.id).catch((error) => {
      console.error("[live-score-projection] game stats failed:", error);
      return { totalHits: 0 };
    }),
    getUserLiveScoreProjection(admin, user.id).catch((error) => {
      console.error("[live-score-projection] live projection failed:", error);
      return { liveScoreDelta: null, liveMatchCount: 0, livePredictionCount: 0 };
    }),
  ]);

  return NextResponse.json({
    totalScore: profile?.totalScore ?? 0,
    totalHits: gameStats.totalHits,
    ...liveProjection,
  });
}

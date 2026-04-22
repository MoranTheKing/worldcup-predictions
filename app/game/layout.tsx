import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/DashboardShell";
import DevToolsFloatingButton from "@/components/DevToolsFloatingButton";
import GameSubNav from "@/components/game/GameSubNav";
import { fetchAuthProfile, resolveDisplayName } from "@/lib/supabase/auth-profile";
import { getUserJokerUsage } from "@/lib/game/boosters";

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

  const [profile, jokerUsage] = await Promise.all([
    fetchAuthProfile(supabase, user.id).catch((error) => {
      console.error("[GameLayout] profile fetch failed:", error);
      return null;
    }),
    getUserJokerUsage(supabase, user.id).catch((error) => {
      console.error("[GameLayout] joker usage failed:", error);
      return { groupUsed: false, knockoutUsed: false };
    }),
  ]);

  const displayName = resolveDisplayName(profile, user);
  const avatarUrl = profile?.avatarUrl ?? null;
  const totalScore = profile?.totalScore ?? 0;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <DashboardShell>
      <div className="max-w-5xl p-4 md:p-8">
        <div
          className="mb-6 overflow-hidden rounded-[2rem] border border-white/10 p-5 shadow-[0_0_32px_rgba(95,255,123,0.08)]"
          style={{
            background:
              "linear-gradient(145deg, rgba(95,255,123,0.08) 0%, rgba(111,60,255,0.11) 55%, rgba(255,47,166,0.08) 100%)",
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={68}
                  height={68}
                  unoptimized
                  className="h-[68px] w-[68px] rounded-[1.4rem] object-cover"
                />
              ) : (
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,var(--wc-neon),var(--wc-violet))] text-2xl font-black text-[color:var(--wc-text-inverse)]">
                  {initial}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-wc-neon">
                  משחק הניחושים
                </p>
                <h1 className="wc-display mt-2 truncate text-4xl text-wc-fg1">
                  {displayName}
                </h1>
                <p className="mt-2 text-sm text-wc-fg2">
                  כל הניחושים, הליגות והבוסטרים שלך מרוכזים עכשיו במקום אחד.
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-wc-neon/20 bg-[rgba(6,13,26,0.42)] px-5 py-4 text-start shadow-[0_0_20px_rgba(95,255,123,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wc-fg3">
                Total Score
              </p>
              <p className="wc-display mt-2 text-5xl text-wc-neon">{totalScore}</p>
              <p className="mt-1 text-xs font-semibold text-wc-fg3">נקודות מצטברות</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <BoosterCard
              title="ג'וקר שלב הבתים"
              subtitle="זמין פעם אחת בלבד למשחקי הבתים"
              isUsed={jokerUsage.groupUsed}
            />
            <BoosterCard
              title="ג'וקר נוקאאוט"
              subtitle="זמין פעם אחת בלבד לשלבי ההכרעה"
              isUsed={jokerUsage.knockoutUsed}
            />
          </div>
        </div>

        <GameSubNav />
        {children}
      </div>
      <DevToolsFloatingButton />
    </DashboardShell>
  );
}

function BoosterCard({
  title,
  subtitle,
  isUsed,
}: {
  title: string;
  subtitle: string;
  isUsed: boolean;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border px-4 py-4 transition-all ${
        isUsed ? "opacity-70" : "shadow-[0_0_18px_rgba(111,60,255,0.18)]"
      }`}
      style={{
        borderColor: isUsed ? "rgba(255,255,255,0.08)" : "rgba(111,60,255,0.38)",
        background: isUsed
          ? "rgba(255,255,255,0.04)"
          : "linear-gradient(135deg, rgba(111,60,255,0.18), rgba(255,47,166,0.12))",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-wc-fg1">{title}</p>
          <p className="mt-1 text-xs text-wc-fg3">{subtitle}</p>
        </div>
        <span className={`text-3xl ${isUsed ? "grayscale" : ""}`}>🃏</span>
      </div>

      <div
        className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          isUsed ? "bg-white/6 text-wc-fg3" : "bg-[rgba(95,255,123,0.14)] text-wc-neon"
        }`}
      >
        {isUsed ? "נוצל" : "זמין"}
      </div>
    </div>
  );
}

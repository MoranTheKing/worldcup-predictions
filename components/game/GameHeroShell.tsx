"use client";

import { usePathname } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";

type GameHeroShellProps = {
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  totalHits: number;
  groupJokerUsed: boolean;
  knockoutJokerUsed: boolean;
};

export default function GameHeroShell({
  displayName,
  avatarUrl,
  totalScore,
  totalHits,
  groupJokerUsed,
  knockoutJokerUsed,
}: GameHeroShellProps) {
  const pathname = usePathname();
  const showOwnHeader = !pathname.startsWith("/game/users/");
  const showJokers = pathname === "/game/predictions" || pathname === "/game";

  if (!showOwnHeader) {
    return null;
  }

  return (
    <div
      className="mb-6 overflow-hidden rounded-[2rem] border border-white/10 p-5 shadow-[0_0_32px_rgba(95,255,123,0.08)]"
      style={{
        background:
          "linear-gradient(145deg, rgba(95,255,123,0.08) 0%, rgba(111,60,255,0.11) 55%, rgba(255,47,166,0.08) 100%)",
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar
            name={displayName}
            src={avatarUrl}
            size={68}
            roundedClassName="rounded-[1.4rem]"
            className="h-[68px] w-[68px]"
            priority
          />

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-wc-neon">
              משחק הניחושים
            </p>
            <h1 className="wc-display mt-2 truncate text-4xl text-wc-fg1">{displayName}</h1>
            <p className="mt-2 text-sm text-wc-fg2">
              כל הניחושים, הליגות והבוסטרים שלך מרוכזים עכשיו במקום אחד.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            title="Total Score"
            value={String(totalScore)}
            subtitle={'סה"כ נקודות'}
            accentClassName="text-wc-neon"
            borderClassName="border-wc-neon/20"
          />
          <MetricCard
            title="Total Hits"
            value={String(totalHits)}
            subtitle={'סה"כ בולים'}
            accentClassName="text-[#8BFFB7]"
            borderClassName="border-[rgba(34,197,94,0.22)]"
          />
        </div>
      </div>

      {showJokers ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <BoosterCard
            title="ג'וקר שלב הבתים"
            subtitle="זמין פעם אחת בלבד למשחקי הבתים"
            isUsed={groupJokerUsed}
          />
          <BoosterCard
            title="ג'וקר נוקאאוט"
            subtitle="זמין פעם אחת בלבד לשלבי ההכרעה"
            isUsed={knockoutJokerUsed}
          />
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  accentClassName,
  borderClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  accentClassName: string;
  borderClassName: string;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border bg-[rgba(6,13,26,0.42)] px-5 py-4 text-start shadow-[0_0_20px_rgba(95,255,123,0.08)] ${borderClassName}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wc-fg3">{title}</p>
      <p className={`wc-display mt-2 text-5xl ${accentClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-wc-fg3">{subtitle}</p>
    </div>
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
        <span className={`text-3xl ${isUsed ? "grayscale" : ""}`}>🎏</span>
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

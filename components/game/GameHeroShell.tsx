"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import { createClient } from "@/lib/supabase/client";

type GameHeroShellProps = {
  currentUserId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  totalHits: number;
  liveScoreDelta: number | null;
  liveMatchCount: number;
  groupJokerUsedCount: number;
  groupJokerLimit: number;
};

type HeroStats = {
  totalScore: number;
  totalHits: number;
  liveScoreDelta: number | null;
  liveMatchCount: number;
};

type HeroStatsResponse = Partial<HeroStats>;

export default function GameHeroShell({
  currentUserId,
  displayName,
  avatarUrl,
  totalScore,
  totalHits,
  liveScoreDelta,
  liveMatchCount,
  groupJokerUsedCount,
  groupJokerLimit,
}: GameHeroShellProps) {
  const pathname = usePathname();
  const showOwnHeader = !pathname.startsWith("/game/users/");
  const showJokers = pathname === "/game/predictions" || pathname === "/game";
  const initialStats = useMemo(
    () => ({ totalScore, totalHits, liveScoreDelta, liveMatchCount }),
    [liveMatchCount, liveScoreDelta, totalHits, totalScore],
  );
  const stats = useLiveHeroStats({
    currentUserId,
    initialStats,
    enabled: showOwnHeader,
  });

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
            value={String(stats.totalScore)}
            subtitle={'סה"כ נקודות'}
            liveDelta={stats.liveScoreDelta}
            hasLiveMatches={stats.liveMatchCount > 0}
            accentClassName="text-wc-neon"
            borderClassName="border-wc-neon/20"
          />
          <MetricCard
            title="Total Hits"
            value={String(stats.totalHits)}
            subtitle={'סה"כ בולים'}
            accentClassName="text-[#8BFFB7]"
            borderClassName="border-[rgba(34,197,94,0.22)]"
          />
        </div>
      </div>

      {showJokers ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Array.from({ length: groupJokerLimit }, (_, index) => (
            <BoosterCard
              key={index}
              title={`ג'וקר שלב הבתים ${index + 1}`}
              subtitle="זמין רק למשחקי שלב הבתים"
              isUsed={groupJokerUsedCount > index}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  liveDelta,
  hasLiveMatches = false,
  accentClassName,
  borderClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  liveDelta?: number | null;
  hasLiveMatches?: boolean;
  accentClassName: string;
  borderClassName: string;
}) {
  const shouldShowLiveDelta = hasLiveMatches && typeof liveDelta === "number";

  return (
    <div
      className={`rounded-[1.4rem] border bg-[rgba(6,13,26,0.42)] px-5 py-4 text-start shadow-[0_0_20px_rgba(95,255,123,0.08)] ${borderClassName}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-wc-fg3">{title}</p>
      <p className={`wc-display mt-2 text-5xl ${accentClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-wc-fg3">{subtitle}</p>
      {shouldShowLiveDelta ? (
        <p className="mt-2 flex items-center justify-end gap-1.5 text-[11px] font-black text-wc-neon">
          <span className="h-1.5 w-1.5 rounded-full bg-wc-neon shadow-[0_0_8px_rgba(95,255,123,0.65)]" />
          <span className="text-wc-fg3">Live</span>
          <span dir="ltr">+{liveDelta}</span>
        </p>
      ) : null}
    </div>
  );
}

function useLiveHeroStats({
  currentUserId,
  initialStats,
  enabled,
}: {
  currentUserId: string;
  initialStats: HeroStats;
  enabled: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState<HeroStats | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchRef = useRef(0);
  const hiddenRefreshPendingRef = useRef(false);

  const refreshStats = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (typeof document !== "undefined" && document.hidden) {
      hiddenRefreshPendingRef.current = true;
      return;
    }

    lastFetchRef.current = Date.now();

    try {
      const response = await fetch("/api/game/live-score-projection", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as HeroStatsResponse;
      setStats((current) => {
        const previous = current ?? initialStats;

        return {
          totalScore: normalizeNumber(payload.totalScore, previous.totalScore),
          totalHits: normalizeNumber(payload.totalHits, previous.totalHits),
          liveScoreDelta: typeof payload.liveScoreDelta === "number" ? payload.liveScoreDelta : null,
          liveMatchCount: normalizeNumber(payload.liveMatchCount, previous.liveMatchCount),
        };
      });
    } catch (error) {
      console.error("[GameHeroShell] live stats refresh failed:", error);
    }
  }, [enabled, initialStats]);

  const scheduleRefresh = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const elapsed = Date.now() - lastFetchRef.current;
    const delay = Math.max(450, 900 - elapsed);
    timerRef.current = setTimeout(() => {
      void refreshStats();
    }, delay);
  }, [enabled, refreshStats]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    timerRef.current = setTimeout(() => {
      void refreshStats();
    }, 0);

    const channel = supabase
      .channel(`game-hero-live-stats:${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, scheduleRefresh)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions", filter: `user_id=eq.${currentUserId}` },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${currentUserId}` },
        scheduleRefresh,
      );

    channel.subscribe();

    function handleVisibilityChange() {
      if (!document.hidden && hiddenRefreshPendingRef.current) {
        hiddenRefreshPendingRef.current = false;
        scheduleRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, enabled, refreshStats, scheduleRefresh, supabase]);

  return stats ?? initialStats;
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

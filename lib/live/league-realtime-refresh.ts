"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type RealtimeRecord = Record<string, unknown>;

type RealtimePayload = {
  new?: RealtimeRecord;
  old?: RealtimeRecord;
};

type UseLeagueRealtimeRefreshOptions = {
  leagueId: string;
  liveMatchIds: number[];
  memberIds: string[];
  debounceMs?: number;
  minRefreshIntervalMs?: number;
  enabled?: boolean;
};

export function useLeagueRealtimeRefresh({
  leagueId,
  liveMatchIds,
  memberIds,
  debounceMs = 650,
  minRefreshIntervalMs = 1200,
  enabled = true,
}: UseLeagueRealtimeRefreshOptions) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const liveMatchKey = useMemo(() => buildNumberKey(liveMatchIds), [liveMatchIds]);
  const memberKey = useMemo(() => buildStringKey(memberIds), [memberIds]);
  const timeoutRef = useRef<number | null>(null);
  const lastRefreshAtRef = useRef(0);
  const pendingWhileHiddenRef = useRef(false);

  useEffect(() => {
    if (!enabled || !leagueId) return;

    const liveIds = liveMatchKey ? liveMatchKey.split(",").map(Number) : [];
    const liveIdSet = new Set(liveIds);
    const memberIdSet = new Set(memberKey ? memberKey.split(",") : []);

    function clearScheduledRefresh() {
      if (timeoutRef.current === null) return;
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    function runRefresh() {
      timeoutRef.current = null;
      lastRefreshAtRef.current = Date.now();
      pendingWhileHiddenRef.current = false;

      startTransition(() => {
        router.refresh();
      });
    }

    function scheduleRefresh() {
      if (document.visibilityState !== "visible") {
        pendingWhileHiddenRef.current = true;
        clearScheduledRefresh();
        return;
      }

      clearScheduledRefresh();

      const elapsedSinceRefresh = Date.now() - lastRefreshAtRef.current;
      const throttleDelay = Math.max(0, minRefreshIntervalMs - elapsedSinceRefresh);
      timeoutRef.current = window.setTimeout(
        runRefresh,
        Math.max(debounceMs, throttleDelay),
      );
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && pendingWhileHiddenRef.current) {
        scheduleRefresh();
      }
    }

    const channel = supabase
      .channel(`league-live-refresh:${leagueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        (payload: RealtimePayload) => {
          if (shouldRefreshForMatch(payload, liveIdSet)) {
            scheduleRefresh();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `league_id=eq.${leagueId}`,
        },
        scheduleRefresh,
      );

    for (const matchId of liveIds) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predictions",
          filter: `match_id=eq.${matchId}`,
        },
        (payload: RealtimePayload) => {
          const changedUserId =
            readString(payload.new, "user_id") ?? readString(payload.old, "user_id");
          if (!changedUserId || memberIdSet.has(changedUserId)) {
            scheduleRefresh();
          }
        },
      );
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    channel.subscribe();

    return () => {
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [
    debounceMs,
    enabled,
    leagueId,
    liveMatchKey,
    memberKey,
    minRefreshIntervalMs,
    router,
    supabase,
  ]);
}

function shouldRefreshForMatch(payload: RealtimePayload, liveIdSet: Set<number>) {
  const nextStatus = readString(payload.new, "status");
  const nextMatchNumber =
    readNumber(payload.new, "match_number") ?? readNumber(payload.old, "match_number");

  if (nextStatus === "live") return true;
  if (nextMatchNumber !== null && liveIdSet.has(nextMatchNumber)) return true;

  return false;
}

function readString(record: RealtimeRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(record: RealtimeRecord | undefined, key: string) {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildNumberKey(values: number[]) {
  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value > 0)),
  )
    .sort((left, right) => left - right)
    .join(",");
}

function buildStringKey(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim()).map((value) => value.trim())))
    .sort()
    .join(",");
}

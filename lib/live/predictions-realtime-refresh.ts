"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefreshScheduler } from "@/lib/live/realtime-refresh-scheduler";

type RealtimeRecord = Record<string, unknown>;

type RealtimePayload = {
  new?: RealtimeRecord;
  old?: RealtimeRecord;
};

type UsePredictionsRealtimeRefreshOptions = {
  currentUserId: string | null;
  liveMatchIds: number[];
  debounceMs?: number;
  minRefreshIntervalMs?: number;
  enabled?: boolean;
};

export function usePredictionsRealtimeRefresh({
  currentUserId,
  liveMatchIds,
  debounceMs,
  minRefreshIntervalMs,
  enabled = true,
}: UsePredictionsRealtimeRefreshOptions) {
  const supabase = useMemo(() => createClient(), []);
  const liveMatchKey = useMemo(() => buildNumberKey(liveMatchIds), [liveMatchIds]);
  const scheduleRefresh = useRealtimeRefreshScheduler({ debounceMs, minRefreshIntervalMs });

  useEffect(() => {
    if (!enabled) return;

    const liveIds = liveMatchKey ? liveMatchKey.split(",").map(Number) : [];
    const liveIdSet = new Set(liveIds);
    const channel = supabase.channel(`predictions-live-refresh:${currentUserId ?? "anon"}`);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "matches" },
      (payload: RealtimePayload) => {
        if (shouldRefreshForMatch(payload, liveIdSet)) {
          scheduleRefresh();
        }
      },
    );

    if (currentUserId) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "predictions",
          filter: `user_id=eq.${currentUserId}`,
        },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, enabled, liveMatchKey, scheduleRefresh, supabase]);
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

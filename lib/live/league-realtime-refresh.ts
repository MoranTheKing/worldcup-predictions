"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefreshScheduler } from "@/lib/live/realtime-refresh-scheduler";

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
  watchLeagueMembers?: boolean;
  watchProfiles?: boolean;
};

export function useLeagueRealtimeRefresh({
  leagueId,
  liveMatchIds,
  memberIds,
  debounceMs = 650,
  minRefreshIntervalMs = 1200,
  enabled = true,
  watchLeagueMembers = true,
  watchProfiles = false,
}: UseLeagueRealtimeRefreshOptions) {
  const supabase = useMemo(() => createClient(), []);
  const liveMatchKey = useMemo(() => buildNumberKey(liveMatchIds), [liveMatchIds]);
  const memberKey = useMemo(() => buildStringKey(memberIds), [memberIds]);
  const scheduleRefresh = useRealtimeRefreshScheduler({ debounceMs, minRefreshIntervalMs });

  useEffect(() => {
    if (!enabled || !leagueId) return;

    const liveIds = liveMatchKey ? liveMatchKey.split(",").map(Number) : [];
    const liveIdSet = new Set(liveIds);
    const memberIdSet = new Set(memberKey ? memberKey.split(",") : []);

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
      );

    if (watchLeagueMembers) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "league_members",
          filter: `league_id=eq.${leagueId}`,
        },
        scheduleRefresh,
      );
    }

    if (watchProfiles) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        scheduleRefresh,
      );
    }

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

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    enabled,
    leagueId,
    liveMatchKey,
    memberKey,
    scheduleRefresh,
    supabase,
    watchLeagueMembers,
    watchProfiles,
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

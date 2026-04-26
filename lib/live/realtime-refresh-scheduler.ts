"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useRef } from "react";

type UseRealtimeRefreshSchedulerOptions = {
  debounceMs?: number;
  minRefreshIntervalMs?: number;
};

export function useRealtimeRefreshScheduler({
  debounceMs = 650,
  minRefreshIntervalMs = 1200,
}: UseRealtimeRefreshSchedulerOptions = {}) {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);
  const lastRefreshAtRef = useRef(0);
  const pendingWhileHiddenRef = useRef(false);

  const clearScheduledRefresh = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const runRefresh = useCallback(() => {
    timeoutRef.current = null;
    lastRefreshAtRef.current = Date.now();
    pendingWhileHiddenRef.current = false;

    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const scheduleRefresh = useCallback(() => {
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
  }, [clearScheduledRefresh, debounceMs, minRefreshIntervalMs, runRefresh]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && pendingWhileHiddenRef.current) {
        scheduleRefresh();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearScheduledRefresh, scheduleRefresh]);

  return scheduleRefresh;
}

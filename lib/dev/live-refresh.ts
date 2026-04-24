"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";

const DEV_LIVE_REFRESH_CHANNEL = "worldcup-dev-live-refresh";
const DEV_LIVE_REFRESH_STORAGE_KEY = "worldcup-dev-live-refresh:last-update";

type DevLiveRefreshMessage = {
  type: "matches:changed";
  at: number;
  reason?: string;
};

function isDevLiveRefreshMessage(value: unknown): value is DevLiveRefreshMessage {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DevLiveRefreshMessage>;
  return candidate.type === "matches:changed" && typeof candidate.at === "number";
}

export function notifyDevLiveRefresh(reason?: string) {
  if (typeof window === "undefined") return;

  const message: DevLiveRefreshMessage = {
    type: "matches:changed",
    at: Date.now(),
    reason,
  };

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(DEV_LIVE_REFRESH_CHANNEL);
    channel.postMessage(message);
    channel.close();
  }

  try {
    window.localStorage.setItem(DEV_LIVE_REFRESH_STORAGE_KEY, JSON.stringify(message));
  } catch {
    // localStorage may be blocked; BroadcastChannel already covered modern browsers.
  }
}

export function useDevLiveRefresh() {
  const router = useRouter();
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    function refreshFromMessage(message: DevLiveRefreshMessage) {
      if (message.at <= lastRefreshAtRef.current) return;
      lastRefreshAtRef.current = message.at;

      startTransition(() => {
        router.refresh();
      });
    }

    let channel: BroadcastChannel | null = null;

    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(DEV_LIVE_REFRESH_CHANNEL);
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (isDevLiveRefreshMessage(event.data)) {
          refreshFromMessage(event.data);
        }
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DEV_LIVE_REFRESH_STORAGE_KEY || !event.newValue) return;

      try {
        const message = JSON.parse(event.newValue) as unknown;
        if (isDevLiveRefreshMessage(message)) {
          refreshFromMessage(message);
        }
      } catch {
        // Ignore malformed storage payloads from older tabs or manual edits.
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);
}

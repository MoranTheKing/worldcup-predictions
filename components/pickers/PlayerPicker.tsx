"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

interface Props {
  players: PickerPlayer[];
  winnerId: string;
  value: PickerPlayer | null;
  fallbackLabel?: string;
  onChange: (player: PickerPlayer | null) => void;
}

export default function PlayerPicker({
  players,
  winnerId,
  value,
  fallbackLabel,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((left, right) => {
      const leftWinner = left.team_id === winnerId;
      const rightWinner = right.team_id === winnerId;

      if (leftWinner && !rightWinner) return -1;
      if (!leftWinner && rightWinner) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [players, winnerId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedPlayers;
    return sortedPlayers.filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, sortedPlayers]);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[rgba(8,16,28,0.92)] px-3 py-2.5 text-sm text-wc-fg1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:border-wc-neon/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatarIcon />
          <span className={`truncate ${value || fallbackLabel ? "text-wc-fg1" : "text-wc-fg3"}`}>
            {value ? value.name : fallbackLabel || "-- בחר שחקן --"}
          </span>
        </span>
        <span className="text-xs text-wc-fg3">{open ? "▴" : "▾"}</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[1rem] border border-white/10 bg-[rgba(7,13,24,0.98)] shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
          <div className="border-b border-white/8 p-2">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="חיפוש שחקן..."
              className="w-full rounded-lg border border-white/8 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 focus:border-wc-neon/30"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-wc-fg3">לא נמצא שחקן</li>
            ) : null}

            {filtered.map((player) => {
              const isSelected = value?.id === player.id;

              return (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(player);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-right text-sm transition ${
                      isSelected
                        ? "bg-[rgba(95,255,123,0.12)] text-wc-neon"
                        : "text-wc-fg1 hover:bg-white/6"
                    }`}
                  >
                    <PlayerAvatarIcon />
                    <span className="truncate">{player.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PlayerAvatarIcon() {
  return (
    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-wc-fg2">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.05 0-5.75 1.54-6.77 3.86-.19.44.13.94.61.94h12.32c.48 0 .8-.5.61-.94C15.75 13.04 13.05 11.5 10 11.5Z" />
      </svg>
    </span>
  );
}

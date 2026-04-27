"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
  photo_url?: string | null;
  top_scorer_odds?: number | string | null;
  reward_points?: number | null;
};

interface Props {
  players: PickerPlayer[];
  winnerId: string;
  value: PickerPlayer | null;
  fallbackLabel?: string;
  onChange: (player: PickerPlayer | null) => void;
  preserveOrder?: boolean;
}

export default function PlayerPicker({
  players,
  winnerId,
  value,
  fallbackLabel,
  onChange,
  preserveOrder = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const sortedPlayers = useMemo(() => {
    if (preserveOrder) return players;

    return [...players].sort((left, right) => {
      const leftWinner = String(left.team_id ?? "") === winnerId;
      const rightWinner = String(right.team_id ?? "") === winnerId;

      if (leftWinner && !rightWinner) return -1;
      if (!leftWinner && rightWinner) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [players, preserveOrder, winnerId]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return sortedPlayers;
    return sortedPlayers.filter((player) =>
      player.name.toLowerCase().includes(normalizedSearch),
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
        className="flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm font-bold text-wc-fg1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-wc-neon/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar player={value} />
          <span className={`truncate ${value || fallbackLabel ? "text-wc-fg1" : "text-wc-fg3"}`}>
            {value ? value.name : fallbackLabel || "-- בחר שחקן --"}
          </span>
          {value ? <RewardBadge points={value.reward_points} /> : null}
        </span>
        <span className="text-[11px] text-wc-fg3">{open ? "⌃" : "⌄"}</span>
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

          <ul className="max-h-72 overflow-y-auto py-1">
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
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-right text-sm transition ${
                      isSelected
                        ? "bg-[rgba(95,255,123,0.12)] text-wc-neon"
                        : "text-wc-fg1 hover:bg-white/6"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar player={player} />
                      <span className="truncate">{player.name}</span>
                    </span>
                    <RewardBadge points={player.reward_points} />
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

function PlayerAvatar({ player }: { player: PickerPlayer | null }) {
  if (player?.photo_url) {
    return (
      <span className="relative inline-flex h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/8">
        <Image
          src={player.photo_url}
          alt=""
          width={28}
          height={28}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/8 text-wc-fg2">
      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
        <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.05 0-5.75 1.54-6.77 3.86-.19.44.13.94.61.94h12.32c.48 0 .8-.5.61-.94C15.75 13.04 13.05 11.5 10 11.5Z" />
      </svg>
    </span>
  );
}

function RewardBadge({ points }: { points?: number | null }) {
  const value = Number.isFinite(Number(points)) ? Number(points) : 0;

  return (
    <span
      dir="ltr"
      className="inline-flex flex-shrink-0 items-center rounded-full border border-wc-neon/20 bg-[rgba(95,255,123,0.12)] px-2.5 py-1 font-sans text-[11px] font-black tracking-normal text-wc-neon"
    >
      +{value}
    </span>
  );
}

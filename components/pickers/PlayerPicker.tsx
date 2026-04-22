"use client";

import { useEffect, useRef, useState } from "react";

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

function translatePosition(position: string | null): string {
  if (!position) return "";
  if (position.includes("Attacker")) return "חלוץ";
  if (position.includes("Midfielder")) return "קשר";
  if (position.includes("Defender")) return "בלם";
  if (position.includes("Goalkeeper")) return "שוער";
  return position;
}

interface Props {
  players: PickerPlayer[];
  winnerId: string;
  value: PickerPlayer | null;
  onChange: (player: PickerPlayer | null) => void;
}

export default function PlayerPicker({
  players,
  winnerId,
  value,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const winnerPlayers = players.filter((player) => String(player.team_id) === winnerId);
  const pool = showAll || winnerPlayers.length === 0 ? players : winnerPlayers;
  const filtered = search.trim()
    ? pool.filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
    : pool;

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm outline-none"
        style={{
          background: "var(--wc-raised)",
          border: "1.5px solid var(--wc-border)",
          borderRadius: 12,
          color: "var(--wc-fg1)",
        }}
      >
        <span style={{ color: value ? "var(--wc-fg1)" : "var(--wc-fg3)" }}>
          {value ? value.name : "-- בחר שחקן --"}
        </span>
        <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {winnerPlayers.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setShowAll((current) => !current);
            setSearch("");
          }}
          className="text-center text-xs underline"
          style={{ color: "var(--wc-fg3)" }}
        >
          {showAll
            ? `שחקני הנבחרת הזוכה (${winnerPlayers.length})`
            : `כל השחקנים (${players.length})`}
        </button>
      ) : null}

      {open ? (
        <div
          className="absolute top-11 z-50 w-full overflow-hidden"
          style={{
            background: "var(--wc-surface)",
            border: "1px solid var(--wc-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            borderRadius: 12,
          }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid var(--wc-border)" }}>
            <input
              autoFocus
              type="text"
              placeholder="חיפוש שחקן..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--wc-raised)",
                border: "1px solid var(--wc-border)",
                color: "var(--wc-fg1)",
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm" style={{ color: "var(--wc-fg3)" }}>
                לא נמצא שחקן
              </li>
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
                    className="flex w-full items-center justify-between px-4 py-2 text-right text-sm transition-colors"
                    style={
                      isSelected
                        ? {
                            background: "var(--wc-neon-bg)",
                            color: "var(--wc-neon)",
                            fontWeight: 500,
                          }
                        : { color: "var(--wc-fg1)" }
                    }
                    onMouseEnter={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.background = "var(--wc-raised)";
                      }
                    }}
                    onMouseLeave={(event) => {
                      if (!isSelected) {
                        event.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span>{player.name}</span>
                    {player.position ? (
                      <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
                        {translatePosition(player.position)}
                      </span>
                    ) : null}
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

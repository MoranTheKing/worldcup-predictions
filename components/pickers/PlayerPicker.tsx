"use client";

import { useEffect, useRef, useState } from "react";

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

function translatePosition(pos: string | null): string {
  if (!pos) return "";
  if (pos.includes("Attacker")) return "חלוץ";
  if (pos.includes("Midfielder")) return "קשר";
  if (pos.includes("Defender")) return "בלם";
  if (pos.includes("Goalkeeper")) return "שוער";
  return pos;
}

interface Props {
  players: PickerPlayer[];
  winnerId: string;
  value: PickerPlayer | null;
  onChange: (p: PickerPlayer | null) => void;
}

export default function PlayerPicker({ players, winnerId, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const winnerPlayers = players.filter((p) => String(p.team_id) === winnerId);
  const pool = showAll || winnerPlayers.length === 0 ? players : winnerPlayers;
  const filtered = search.trim()
    ? pool.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : pool;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm outline-none"
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
          {open ? "▲" : "▼"}
        </span>
      </button>

      {winnerPlayers.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setShowAll((s) => !s);
            setSearch("");
          }}
          className="text-xs underline text-center"
          style={{ color: "var(--wc-fg3)" }}
        >
          {showAll
            ? `שחקני הנבחרת הזוכה (${winnerPlayers.length})`
            : `כל השחקנים (${players.length})`}
        </button>
      )}

      {open && (
        <div
          className="absolute z-50 top-11 w-full overflow-hidden"
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--wc-raised)",
                border: "1px solid var(--wc-border)",
                color: "var(--wc-fg1)",
              }}
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <li
                className="px-4 py-3 text-sm text-center"
                style={{ color: "var(--wc-fg3)" }}
              >
                לא נמצא שחקן
              </li>
            )}
            {filtered.map((p) => {
              const isSelected = value?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-right px-4 py-2 text-sm flex items-center justify-between transition-colors"
                    style={
                      isSelected
                        ? {
                            background: "var(--wc-neon-bg)",
                            color: "var(--wc-neon)",
                            fontWeight: 500,
                          }
                        : { color: "var(--wc-fg1)" }
                    }
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "var(--wc-raised)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                    }}
                  >
                    <span>{p.name}</span>
                    {p.position && (
                      <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
                        {translatePosition(p.position)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

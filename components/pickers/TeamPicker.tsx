"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type PickerTeam = {
  id: string;
  name: string;
  name_he: string | null;
  logo_url: string | null;
};

interface Props {
  teams: PickerTeam[];
  value: string;
  label: string;
  onChange: (id: string, label: string) => void;
  placeholder?: string;
}

export default function TeamPicker({
  teams,
  value,
  label,
  onChange,
  placeholder = "-- בחר קבוצה --",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? teams.filter(
        (team) =>
          (team.name_he ?? team.name).includes(search) ||
          team.name.toLowerCase().includes(search.toLowerCase()),
      )
    : teams;

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedTeam = teams.find((team) => String(team.id) === value);

  return (
    <div ref={ref} className="relative">
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
        <span className="flex items-center gap-2">
          {selectedTeam?.logo_url ? (
            <Image
              src={selectedTeam.logo_url}
              alt=""
              width={20}
              height={13}
              className="flex-shrink-0 rounded-sm object-cover"
              unoptimized
            />
          ) : null}
          <span style={{ color: value ? "var(--wc-fg1)" : "var(--wc-fg3)" }}>
            {value ? label : placeholder}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden"
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
              placeholder="חיפוש..."
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
                לא נמצאה קבוצה
              </li>
            ) : null}
            {filtered.map((team) => {
              const displayLabel = team.name_he ?? team.name;
              const isSelected = String(team.id) === value;

              return (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(team.id), displayLabel);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-right text-sm transition-colors"
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
                    {team.logo_url ? (
                      <Image
                        src={team.logo_url}
                        alt=""
                        width={18}
                        height={12}
                        className="flex-shrink-0 rounded-sm object-cover"
                        unoptimized
                      />
                    ) : null}
                    <span>{displayLabel}</span>
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

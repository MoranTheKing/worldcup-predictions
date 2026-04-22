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
        (t) =>
          (t.name_he ?? t.name).includes(search) ||
          t.name.toLowerCase().includes(search.toLowerCase())
      )
    : teams;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedTeam = teams.find((t) => String(t.id) === value);

  return (
    <div ref={ref} className="relative">
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
        <span className="flex items-center gap-2">
          {selectedTeam?.logo_url && (
            <Image
              src={selectedTeam.logo_url}
              alt=""
              width={20}
              height={13}
              className="rounded-sm flex-shrink-0"
              unoptimized
            />
          )}
          <span style={{ color: value ? "var(--wc-fg1)" : "var(--wc-fg3)" }}>
            {value ? label : placeholder}
          </span>
        </span>
        <span className="text-xs" style={{ color: "var(--wc-fg3)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
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
                לא נמצאה קבוצה
              </li>
            )}
            {filtered.map((t) => {
              const dl = t.name_he ?? t.name;
              const isSelected = String(t.id) === value;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(t.id), dl);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="w-full text-right px-4 py-2 text-sm flex items-center gap-2 transition-colors"
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
                    {t.logo_url && (
                      <Image
                        src={t.logo_url}
                        alt=""
                        width={18}
                        height={12}
                        className="rounded-sm flex-shrink-0"
                        unoptimized
                      />
                    )}
                    <span>{dl}</span>
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

"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

export type PickerTeam = {
  id: string;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  outright_odds?: number | string | null;
  reward_points?: number | null;
};

interface Props {
  teams: PickerTeam[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}

export default function TeamPicker({
  teams,
  value,
  onChange,
  placeholder = "-- בחר נבחרת --",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === value) ?? null,
    [teams, value],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return teams;

    return teams.filter((team) => {
      const display = team.name_he ?? team.name;
      return (
        display.toLowerCase().includes(search.toLowerCase()) ||
        team.name.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search, teams]);

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
        className="flex w-full items-center justify-between rounded-[1.2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm font-bold text-wc-fg1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-wc-neon/30"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedTeam?.logo_url ? (
            <Image
              src={selectedTeam.logo_url}
              alt=""
              width={22}
              height={16}
              className="h-4 w-[22px] flex-shrink-0 rounded-[4px] object-cover"
              style={{ height: 16, width: 22 }}
              unoptimized
            />
          ) : (
            <span className="h-4 w-[22px] rounded-[4px] bg-white/8" />
          )}
          <span className={`truncate ${selectedTeam ? "text-wc-fg1" : "text-wc-fg3"}`}>
            {selectedTeam ? selectedTeam.name_he ?? selectedTeam.name : placeholder}
          </span>
          {selectedTeam ? <RewardBadge points={selectedTeam.reward_points} /> : null}
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
              placeholder="חיפוש נבחרת..."
              className="w-full rounded-lg border border-white/8 bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-wc-fg1 outline-none placeholder:text-wc-fg3 focus:border-wc-neon/30"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-wc-fg3">לא נמצאה נבחרת</li>
            ) : null}

            {filtered.map((team) => {
              const displayName = team.name_he ?? team.name;
              const isSelected = String(team.id) === value;

              return (
                <li key={team.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(String(team.id));
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
                      {team.logo_url ? (
                        <Image
                          src={team.logo_url}
                          alt=""
                          width={22}
                          height={15}
                          className="h-[15px] w-[22px] flex-shrink-0 rounded-[3px] object-cover"
                          style={{ height: 15, width: 22 }}
                          unoptimized
                        />
                      ) : (
                        <span className="h-[15px] w-[22px] rounded-[3px] bg-white/8" />
                      )}
                      <span className="truncate">{displayName}</span>
                    </span>
                    <RewardBadge points={team.reward_points} />
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

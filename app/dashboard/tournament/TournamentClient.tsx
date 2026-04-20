"use client";

import Image from "next/image";
import { useState } from "react";

type Team = {
  id:           number;
  name:         string;
  name_he:      string | null;
  logo_url:     string | null;
  group_letter: string;
};

type Standing = {
  team:   Team;
  rank:   number;
  played: number;
  won:    number;
  drawn:  number;
  lost:   number;
  gf:     number;
  ga:     number;
  pts:    number;
};

type Props = {
  groups:       Record<string, Team[]>;
  groupLetters: string[];
};

type Tab = "groups" | "third" | "knockout";

export default function TournamentClient({ groups, groupLetters }: Props) {
  const [tab, setTab] = useState<Tab>("groups");

  return (
    <div className="p-4 md:p-8">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">טורניר מונדיאל 2026</h1>
        <p className="text-sm text-zinc-500 mt-0.5">19 ביוני – 19 ביולי 2026</p>
      </div>

      {/* ── Tab switcher ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 mb-6 w-fit">
        {(
          [
            { id: "groups",   label: "שלב הבתים" },
            { id: "third",    label: "מקום שלישי" },
            { id: "knockout", label: "נוקאאוט"    },
          ] as { id: Tab; label: string }[]
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === id
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Group Stage ────────────────────────────────────────────── */}
      {tab === "groups" && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-5 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-zinc-600 dark:text-zinc-400">עוברים (1–2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-zinc-600 dark:text-zinc-400">מועמדים לעבור כ-3</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-zinc-200 dark:bg-zinc-700" />
              <span className="text-zinc-600 dark:text-zinc-400">נפלטים (4)</span>
            </div>
          </div>

          {/* 12 group tables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupLetters.map((letter) => (
              <GroupTable key={letter} letter={letter} teams={groups[letter]} />
            ))}
          </div>
        </>
      )}

      {/* ── TAB: Best 3rd Place ─────────────────────────────────────────── */}
      {tab === "third" && (
        <>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5 text-xs text-amber-700 dark:text-amber-400">
            8 מתוך 12 הקבוצות שיסיימו שלישיות בבתיהן יעפילו לשלב ה-32 הטובים.
            הדירוג נקבע לפי נקודות → הפרש שערים → שערים בקבוצות שבהן שיחקו.
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* section header — Qualifiers */}
            <div className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700">
              <p className="text-xs font-bold text-white">עוברות לשלב ה-32 הטובים (8 מקומות)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <TableHead showGroup />
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <PlaceholderRow key={i} rank={i + 1} qualified />
                  ))}
                </tbody>
              </table>
            </div>

            {/* section header — Eliminated */}
            <div className="px-4 py-2 bg-red-600 dark:bg-red-700">
              <p className="text-xs font-bold text-white">נפלטות (4 מקומות)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <TableHead showGroup />
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PlaceholderRow key={i} rank={9 + i} qualified={false} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400 text-center">
                הטבלה תתמלא עם תחילת הטורניר — 11 ביוני 2026
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: Knockout Bracket ───────────────────────────────────────── */}
      {tab === "knockout" && (
        <>
          <p className="text-xs text-zinc-500 mb-4">32 קבוצות · 5 סיבובים · גביע</p>

          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">

              <BracketRound
                label="32 הטובים"
                matches={Array.from({ length: 16 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={52}
              />

              <BracketRound
                label="16 הטובים"
                matches={Array.from({ length: 8 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={116}
                offsetTop={32}
              />

              <BracketRound
                label="רבע גמר"
                matches={Array.from({ length: 4 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={244}
                offsetTop={96}
              />

              <BracketRound
                label="חצי גמר"
                matches={Array.from({ length: 2 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={500}
                offsetTop={224}
              />

              {/* Final */}
              <div className="flex flex-col w-36">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2">גמר</p>
                <div style={{ marginTop: "476px" }}>
                  <MatchCard t1="TBD" t2="TBD" label="🏆 גמר" highlight />
                </div>
              </div>

            </div>
          </div>

          {/* Trophy note */}
          <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
            <p className="text-2xl mb-1">🏆</p>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">גביע העולם 2026</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              הגמר — 19 ביולי 2026 · ניו יורק / ניו ג׳רסי
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ── GroupTable ────────────────────────────────────────────────────────────────

function GroupTable({ letter, teams }: { letter: string; teams: Team[] }) {
  const standings: Standing[] = teams.map((team, i) => ({
    team,
    rank:   i + 1,
    played: 0, won: 0, drawn: 0, lost: 0,
    gf:     0, ga: 0, pts: 0,
  }));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-800">
        <p className="text-sm font-bold text-white">בית {letter}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="px-3 py-1.5 text-right font-semibold text-zinc-400 w-6">#</th>
              <th className="px-2 py-1.5 text-right font-semibold text-zinc-400">קבוצה</th>
              <th className="px-2 py-1.5 text-center font-semibold text-zinc-400">מ</th>
              <th className="px-2 py-1.5 text-center font-semibold text-zinc-400">נ</th>
              <th className="px-2 py-1.5 text-center font-semibold text-zinc-400">ת</th>
              <th className="px-2 py-1.5 text-center font-semibold text-zinc-400">ה</th>
              <th className="px-2 py-1.5 text-center font-semibold text-zinc-400">נק׳</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const rankCls =
                s.rank === 1 ? "border-r-4 border-r-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                : s.rank === 2 ? "border-r-4 border-r-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/5"
                : s.rank === 3 ? "border-r-4 border-r-amber-400 bg-amber-50 dark:bg-amber-900/10"
                : "border-r-4 border-r-transparent";

              return (
                <tr
                  key={s.team.id}
                  className={`border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 ${rankCls}`}
                >
                  <td className="px-3 py-2 text-zinc-500 font-medium">{s.rank}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {s.team.logo_url ? (
                        <Image
                          src={s.team.logo_url}
                          alt={s.team.name}
                          width={18}
                          height={12}
                          className="rounded-sm flex-shrink-0 object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-[18px] h-3 bg-zinc-200 dark:bg-zinc-700 rounded-sm flex-shrink-0" />
                      )}
                      <span className="font-medium text-zinc-900 dark:text-zinc-50 truncate max-w-[80px]">
                        {s.team.name_he ?? s.team.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-zinc-500">{s.played}</td>
                  <td className="px-2 py-2 text-center text-zinc-500">{s.won}</td>
                  <td className="px-2 py-2 text-center text-zinc-500">{s.drawn}</td>
                  <td className="px-2 py-2 text-center text-zinc-500">{s.lost}</td>
                  <td className="px-2 py-2 text-center font-bold text-zinc-900 dark:text-zinc-50">{s.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── TableHead ─────────────────────────────────────────────────────────────────

function TableHead({ showGroup }: { showGroup?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-zinc-100 dark:border-zinc-800">
        <th className="px-4 py-2 text-right font-semibold text-zinc-400 w-8">#</th>
        <th className="px-3 py-2 text-right font-semibold text-zinc-400">קבוצה</th>
        {showGroup && <th className="px-3 py-2 text-center font-semibold text-zinc-400">בית</th>}
        <th className="px-3 py-2 text-center font-semibold text-zinc-400">מ</th>
        <th className="px-3 py-2 text-center font-semibold text-zinc-400">נק׳</th>
        <th className="px-3 py-2 text-center font-semibold text-zinc-400">הפרש</th>
        <th className="px-3 py-2 text-center font-semibold text-zinc-400">סטטוס</th>
      </tr>
    </thead>
  );
}

// ── PlaceholderRow ────────────────────────────────────────────────────────────

function PlaceholderRow({ rank, qualified }: { rank: number; qualified: boolean }) {
  return (
    <tr className={`border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 ${
      !qualified ? "bg-red-50/40 dark:bg-red-900/10" : ""
    }`}>
      <td className={`px-4 py-2.5 font-medium ${qualified ? "text-zinc-500" : "text-red-400"}`}>
        {rank}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-[18px] h-3 rounded-sm ${qualified ? "bg-zinc-100 dark:bg-zinc-800" : "bg-red-100 dark:bg-red-900/30"}`} />
          <span className={qualified ? "text-zinc-300 dark:text-zinc-600" : "text-red-300 dark:text-red-700"}>—</span>
        </div>
      </td>
      <td className={`px-3 py-2.5 text-center ${qualified ? "text-zinc-300 dark:text-zinc-600" : "text-red-300 dark:text-red-700"}`}>—</td>
      <td className={`px-3 py-2.5 text-center ${qualified ? "text-zinc-300 dark:text-zinc-600" : "text-red-300 dark:text-red-700"}`}>—</td>
      <td className={`px-3 py-2.5 text-center ${qualified ? "text-zinc-300 dark:text-zinc-600" : "text-red-300 dark:text-red-700"}`}>—</td>
      <td className="px-3 py-2.5 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          qualified
            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        }`}>
          {qualified ? "ממתין" : "בחוץ"}
        </span>
      </td>
    </tr>
  );
}

// ── BracketRound ──────────────────────────────────────────────────────────────

function BracketRound({
  label,
  matches,
  matchHeight,
  offsetTop = 0,
}: {
  label:       string;
  matches:     { id: number; t1: string; t2: string }[];
  matchHeight: number;
  offsetTop?:  number;
}) {
  return (
    <div className="flex flex-col w-36">
      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-2">
        {label}
      </p>
      <div
        className="flex flex-col"
        style={{ gap: matchHeight - 44 + "px", paddingTop: offsetTop + "px" }}
      >
        {matches.map((m) => (
          <MatchCard key={m.id} t1={m.t1} t2={m.t2} />
        ))}
      </div>
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({
  t1, t2, label, highlight = false,
}: {
  t1:         string;
  t2:         string;
  label?:     string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border overflow-hidden text-[11px] leading-tight ${
      highlight
        ? "border-amber-300 dark:border-amber-700 shadow-md shadow-amber-100 dark:shadow-amber-900/30"
        : "border-zinc-200 dark:border-zinc-700"
    }`}>
      {label && (
        <div className="px-2 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold text-center">
          {label}
        </div>
      )}
      <div className={`px-2 py-1.5 border-b font-medium truncate ${
        highlight
          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300"
          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500"
      }`}>
        {t1 === "TBD" ? <span className="text-zinc-300 dark:text-zinc-700">— TBD —</span> : t1}
      </div>
      <div className={`px-2 py-1.5 font-medium truncate ${
        highlight
          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
          : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500"
      }`}>
        {t2 === "TBD" ? <span className="text-zinc-300 dark:text-zinc-700">— TBD —</span> : t2}
      </div>
    </div>
  );
}

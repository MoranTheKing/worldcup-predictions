"use client";

import Image from "next/image";
import { useState } from "react";

type Team = {
  id: number;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  group_letter: string;
};

type Standing = {
  team: Team;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  pts: number;
};

type Props = {
  groups: Record<string, Team[]>;
  groupLetters: string[];
};

type Tab = "groups" | "third" | "knockout";

const TABS: { id: Tab; label: string }[] = [
  { id: "groups", label: "שלב הבתים" },
  { id: "third", label: "מקום שלישי" },
  { id: "knockout", label: "נוקאאוט" },
];

export default function TournamentClient({ groups, groupLetters }: Props) {
  const [tab, setTab] = useState<Tab>("groups");

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <section className="wc-card overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="text-start">
            <p className="wc-kicker">Tournament Hub</p>
            <h1 className="wc-display mt-3 text-5xl text-wc-fg1 sm:text-6xl">מונדיאל 2026</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
              צבעוניות כהה, היררכיית מידע ברורה ותחושת אולפן ספורט פרימיום. הטבלאות מסומנות
              אוטומטית למעפילות, למועמדות מהמקום השלישי ולמודחות, והבראקט נבנה לזרימה RTL.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="wc-panel p-4 text-start">
              <p className="text-xs uppercase tracking-[0.24em] text-wc-fg3">קבוצות</p>
              <p className="wc-display mt-2 text-4xl text-wc-neon">48</p>
            </div>
            <div className="wc-panel p-4 text-start">
              <p className="text-xs uppercase tracking-[0.24em] text-wc-fg3">בתים</p>
              <p className="wc-display mt-2 text-4xl text-wc-magenta">12</p>
            </div>
            <div className="wc-panel p-4 text-start">
              <p className="text-xs uppercase tracking-[0.24em] text-wc-fg3">גמר</p>
              <p className="wc-display mt-2 text-4xl text-wc-amber">19.07</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 inline-flex w-full max-w-max rounded-[1.5rem] p-1.5 wc-glass">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-[1rem] px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === id
                ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.12))] text-wc-fg1 shadow-[0_0_26px_rgba(95,255,123,0.16)]"
                : "text-wc-fg3 hover:text-wc-fg1"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "groups" && (
        <>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <div className="wc-badge text-wc-fg2">
              <div className="h-3 w-3 rounded-full bg-wc-neon shadow-[0_0_12px_rgba(95,255,123,0.7)]" />
              <span>עולות אוטומטית (1–2)</span>
            </div>
            <div className="wc-badge text-wc-fg2">
              <div className="h-3 w-3 rounded-full bg-wc-amber shadow-[0_0_12px_rgba(255,182,73,0.7)]" />
              <span>מועמדות מהמקום השלישי</span>
            </div>
            <div className="wc-badge text-wc-fg2">
              <div className="h-3 w-3 rounded-full bg-white/25" />
              <span>מחוץ לתמונה</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupLetters.map((letter) => (
              <GroupTable key={letter} letter={letter} teams={groups[letter]} />
            ))}
          </div>
        </>
      )}

      {tab === "third" && (
        <>
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(255,182,73,0.22)] bg-[linear-gradient(135deg,rgba(255,182,73,0.12),rgba(111,60,255,0.08))] p-4 text-sm leading-7 text-[rgba(255,205,136,0.96)]">
            8 מתוך 12 הקבוצות שיסיימו שלישיות בבתיהן יעפילו לשלב 32 האחרונות. הדירוג נקבע לפי
            נקודות, אחר כך הפרש שערים ולבסוף שערי זכות.
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] wc-card">
            <div className="bg-[linear-gradient(135deg,rgba(95,255,123,0.24),rgba(95,255,123,0.08))] px-4 py-3">
              <p className="text-sm font-bold text-wc-fg1">עולות לשלב 32 האחרונות (8 מקומות)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <TableHead showGroup />
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <PlaceholderRow key={i} rank={i + 1} qualified />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[linear-gradient(135deg,rgba(255,92,130,0.26),rgba(255,92,130,0.08))] px-4 py-3">
              <p className="text-sm font-bold text-wc-fg1">נפלטות (4 מקומות)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <TableHead showGroup />
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PlaceholderRow key={i} rank={9 + i} qualified={false} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-white/8 px-4 py-4">
              <p className="text-center text-xs text-wc-fg3">
                הטבלה תתמלא עם תחילת הטורניר ב-11 ביוני 2026
              </p>
            </div>
          </div>
        </>
      )}

      {tab === "knockout" && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-wc-fg2">
            <span className="wc-badge">32 קבוצות</span>
            <span className="wc-badge">5 סיבובים</span>
            <span className="wc-badge">בראקט RTL מלא</span>
          </div>

          <div className="mt-6 overflow-x-auto pb-4">
            <div className="flex min-w-max gap-4">
              <BracketRound
                label="32 האחרונות"
                matches={Array.from({ length: 16 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={52}
              />

              <BracketRound
                label="16 האחרונות"
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

              <div className="flex w-40 shrink-0 flex-col">
                <p className="wc-display mb-3 text-center text-2xl text-wc-amber">גמר</p>
                <div style={{ marginTop: "476px" }}>
                  <MatchCard t1="TBD" t2="TBD" label="🏆 גמר" highlight />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-[rgba(255,182,73,0.2)] bg-[linear-gradient(135deg,rgba(255,182,73,0.18),rgba(111,60,255,0.12))] p-5 text-center">
            <p className="mb-2 text-3xl">🏆</p>
            <p className="wc-display text-4xl text-wc-amber">גביע העולם 2026</p>
            <p className="mt-2 text-sm text-[rgba(255,219,170,0.95)]">
              הגמר יתקיים ב-19 ביולי 2026 בניו יורק / ניו ג׳רזי
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function GroupTable({ letter, teams }: { letter: string; teams: Team[] }) {
  const standings: Standing[] = teams.map((team, i) => ({
    team,
    rank: i + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    pts: 0,
  }));

  return (
    <div className="wc-card overflow-hidden">
      <div className="bg-[linear-gradient(135deg,rgba(111,60,255,0.32),rgba(255,47,166,0.2))] px-4 py-3">
        <p className="wc-display text-3xl text-wc-fg1">בית {letter}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="ps-4 pe-2 py-2 text-start font-semibold text-wc-fg3">#</th>
              <th className="px-2 py-2 text-start font-semibold text-wc-fg3">קבוצה</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">מ</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">נ</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">ת</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">ה</th>
              <th className="ps-2 pe-4 py-2 text-center font-semibold text-wc-fg3">נק׳</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => {
              const rankClass =
                s.rank === 1
                  ? "wc-rank-top"
                  : s.rank === 2
                    ? "wc-rank-second"
                    : s.rank === 3
                      ? "wc-rank-third"
                      : "wc-rank-out";

              return (
                <tr key={s.team.id} className={`border-b border-white/6 last:border-0 ${rankClass}`}>
                  <td className="ps-4 pe-2 py-3 font-semibold text-wc-fg2">{s.rank}</td>
                  <td className="px-2 py-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {s.team.logo_url ? (
                        <Image
                          src={s.team.logo_url}
                          alt={s.team.name}
                          width={18}
                          height={12}
                          className="rounded-sm object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="h-3 w-[18px] rounded-sm bg-white/10" />
                      )}
                      <span className="max-w-[8.5rem] truncate font-semibold text-wc-fg1">
                        {s.team.name_he ?? s.team.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center text-wc-fg2">{s.played}</td>
                  <td className="px-2 py-3 text-center text-wc-fg2">{s.won}</td>
                  <td className="px-2 py-3 text-center text-wc-fg2">{s.drawn}</td>
                  <td className="px-2 py-3 text-center text-wc-fg2">{s.lost}</td>
                  <td className="ps-2 pe-4 py-3 text-center font-bold text-wc-fg1">{s.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableHead({ showGroup }: { showGroup?: boolean }) {
  return (
    <thead>
      <tr className="border-b border-white/8">
        <th className="ps-4 pe-2 py-3 text-start font-semibold text-wc-fg3">#</th>
        <th className="px-3 py-3 text-start font-semibold text-wc-fg3">קבוצה</th>
        {showGroup && <th className="px-3 py-3 text-center font-semibold text-wc-fg3">בית</th>}
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">מ</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">נק׳</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">הפרש</th>
        <th className="ps-2 pe-4 py-3 text-center font-semibold text-wc-fg3">סטטוס</th>
      </tr>
    </thead>
  );
}

function PlaceholderRow({ rank, qualified }: { rank: number; qualified: boolean }) {
  return (
    <tr className={`border-b border-white/6 last:border-0 ${qualified ? "wc-rank-third" : "bg-[rgba(255,92,130,0.08)]"}`}>
      <td className={`ps-4 pe-2 py-3 font-semibold ${qualified ? "text-wc-fg2" : "text-wc-danger"}`}>
        {rank}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-[18px] rounded-sm ${qualified ? "bg-white/10" : "bg-[rgba(255,92,130,0.18)]"}`} />
          <span className={qualified ? "text-wc-fg3" : "text-wc-danger"}>—</span>
        </div>
      </td>
      <td className={`px-3 py-3 text-center ${qualified ? "text-wc-fg3" : "text-wc-danger"}`}>—</td>
      <td className={`px-3 py-3 text-center ${qualified ? "text-wc-fg3" : "text-wc-danger"}`}>—</td>
      <td className={`px-3 py-3 text-center ${qualified ? "text-wc-fg3" : "text-wc-danger"}`}>—</td>
      <td className="ps-2 pe-4 py-3 text-center">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            qualified ? "bg-[rgba(255,182,73,0.12)] text-wc-amber" : "bg-[rgba(255,92,130,0.14)] text-wc-danger"
          }`}
        >
          {qualified ? "ממתין" : "בחוץ"}
        </span>
      </td>
    </tr>
  );
}

function BracketRound({
  label,
  matches,
  matchHeight,
  offsetTop = 0,
}: {
  label: string;
  matches: { id: number; t1: string; t2: string }[];
  matchHeight: number;
  offsetTop?: number;
}) {
  return (
    <div className="flex w-40 shrink-0 flex-col">
      <p className="wc-display mb-3 text-center text-2xl text-wc-fg2">{label}</p>
      <div className="flex flex-col" style={{ gap: `${matchHeight - 44}px`, paddingTop: `${offsetTop}px` }}>
        {matches.map((m) => (
          <MatchCard key={m.id} t1={m.t1} t2={m.t2} />
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  t1,
  t2,
  label,
  highlight = false,
}: {
  t1: string;
  t2: string;
  label?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`wc-bracket-card text-[11px] leading-tight ${highlight ? "wc-bracket-final" : ""}`}>
      {label && (
        <div className="bg-[linear-gradient(90deg,var(--wc-amber),#ffd580)] px-2 py-1 text-center text-[10px] font-bold text-[color:var(--wc-text-inverse)]">
          {label}
        </div>
      )}
      <div
        className={`border-b px-3 py-2 font-medium ${
          highlight ? "border-[rgba(255,182,73,0.2)] bg-[rgba(255,182,73,0.1)] text-wc-fg1" : "border-white/8 text-wc-fg2"
        }`}
      >
        {t1 === "TBD" ? <span className="text-wc-fg3">— TBD —</span> : t1}
      </div>
      <div className={`px-3 py-2 font-medium ${highlight ? "bg-[rgba(255,182,73,0.08)] text-wc-fg1" : "text-wc-fg2"}`}>
        {t2 === "TBD" ? <span className="text-wc-fg3">— TBD —</span> : t2}
      </div>
    </div>
  );
}

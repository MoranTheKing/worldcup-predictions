"use client";

import type { TeamStanding } from "@/lib/utils/standings";
import Image from "next/image";
import { useState } from "react";

type Props = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  teamsRemaining: number;
  eliminatedCount: number;
};

type Tab = "groups" | "third" | "knockout";

const TABS: { id: Tab; label: string }[] = [
  { id: "groups", label: "שלב הבתים" },
  { id: "third", label: "המקום השלישי" },
  { id: "knockout", label: "נוקאאוט" },
];

const STATUS_META: Record<TeamStanding["status"], { label: string; pillClassName: string; rowClassName: string }> = {
  qualified: {
    label: "העפלה מובטחת",
    pillClassName: "bg-[rgba(95,255,123,0.14)] text-wc-neon",
    rowClassName: "bg-[rgba(95,255,123,0.08)]",
  },
  third_qualified: {
    label: "מובטחת בטופ 8 של המקום השלישי",
    pillClassName: "bg-[rgba(255,182,73,0.18)] text-wc-amber",
    rowClassName: "bg-[rgba(255,182,73,0.09)]",
  },
  pending: {
    label: "עדיין פתוח",
    pillClassName: "bg-white/8 text-wc-fg2",
    rowClassName: "",
  },
  eliminated: {
    label: "הודחה מתמטית",
    pillClassName: "bg-[rgba(255,92,130,0.14)] text-wc-danger",
    rowClassName: "bg-[rgba(255,92,130,0.08)]",
  },
};

export default function TournamentClient({
  groupStandings,
  bestThirdStandings,
  teamsRemaining,
  eliminatedCount,
}: Props) {
  const [tab, setTab] = useState<Tab>("groups");
  const groupLetters = Object.keys(groupStandings).sort();
  const qualifiedThirdCount = bestThirdStandings.filter((entry) => entry.status === "third_qualified").length;

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <section className="wc-card overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="text-start">
            <p className="wc-kicker">Tournament Hub</p>
            <h1 className="wc-display mt-3 text-5xl text-wc-fg1 sm:text-6xl">מונדיאל 2026</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
              המיון בטבלאות משתמש בהיררכיית שוברי השוויון של פיפ&quot;א:
              נקודות ראש בראש, הפרש שערים ראש בראש, שערי זכות ראש בראש,
              הפרש שערים כללי, שערי זכות כלליים, Fair Play ולבסוף דירוג פיפ&quot;א.
              תוויות ההעפלה וההדחה מוצגות רק כשהמצב מובטח מתמטית.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <HeaderStat label="נבחרות שנותרו" value={String(teamsRemaining)} accent="text-wc-neon" />
            <HeaderStat label="מודחות" value={String(eliminatedCount)} accent="text-wc-danger" />
            <HeaderStat label="מקום 3 בטוח" value={`${qualifiedThirdCount}/8`} accent="text-wc-amber" />
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
            <LegendBadge colorClassName="bg-wc-neon shadow-[0_0_12px_rgba(95,255,123,0.7)]" label="העפלה מובטחת" />
            <LegendBadge colorClassName="bg-wc-amber shadow-[0_0_12px_rgba(255,182,73,0.7)]" label="מובטחת דרך המקום השלישי" />
            <LegendBadge colorClassName="bg-white/25" label="עדיין פתוח" />
            <LegendBadge colorClassName="bg-wc-danger shadow-[0_0_12px_rgba(255,92,130,0.7)]" label="הדחה מתמטית" />
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/4 p-4 text-sm leading-7 text-wc-fg2">
            הטבלה מציגה סטטוס מתמטי בלבד. גם אם נבחרת במקום 1, 2 או 3 כרגע,
            היא לא תקבל תווית של העפלה או הדחה עד שהנקודות האפשריות של שאר היריבות
            כבר לא יאפשרו שינוי.
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupLetters.map((letter) => (
              <GroupTable key={letter} letter={letter} standings={groupStandings[letter]} />
            ))}
          </div>
        </>
      )}

      {tab === "third" && (
        <>
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(255,182,73,0.22)] bg-[linear-gradient(135deg,rgba(255,182,73,0.12),rgba(111,60,255,0.08))] p-4 text-sm leading-7 text-[rgba(255,205,136,0.96)]">
            בטבלת המקום השלישי כל שורה מייצגת את הקבוצה שבמקום 3 כרגע בכל בית.
            &quot;העפלה מובטחת&quot; תופיע רק כשכבר לא ניתן לרדת מחוץ לטופ 8 של המקומות השלישיים,
            ו&quot;הדחה מתמטית&quot; רק כשכבר אין דרך להיכנס אליהם.
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] wc-card">
            <div className="bg-[linear-gradient(135deg,rgba(255,182,73,0.18),rgba(95,255,123,0.08))] px-4 py-3">
              <p className="text-sm font-bold text-wc-fg1">טבלת המקומות השלישיים</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <BestThirdHead />
                <tbody>
                  {bestThirdStandings.map((entry) => (
                    <BestThirdRow key={entry.team.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "knockout" && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-wc-fg2">
            <span className="wc-badge">32 נבחרות</span>
            <span className="wc-badge">5 סיבובים</span>
            <span className="wc-badge">Bracket RTL מלא</span>
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
        </>
      )}
    </div>
  );
}

function HeaderStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="wc-panel p-4 text-start">
      <p className="text-xs tracking-[0.24em] text-wc-fg3">{label}</p>
      <p className={`wc-display mt-2 text-4xl ${accent}`}>{value}</p>
    </div>
  );
}

function LegendBadge({ colorClassName, label }: { colorClassName: string; label: string }) {
  return (
    <div className="wc-badge text-wc-fg2">
      <div className={`h-3 w-3 rounded-full ${colorClassName}`} />
      <span>{label}</span>
    </div>
  );
}

function GroupTable({ letter, standings }: { letter: string; standings: TeamStanding[] }) {
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
              <th className="px-2 py-2 text-start font-semibold text-wc-fg3">נבחרת</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">מש</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">נצ</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">ת</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">הפ</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">ז+</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">הפרש</th>
              <th className="ps-2 pe-4 py-2 text-center font-semibold text-wc-fg3">נק׳</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => (
              <tr key={entry.team.id} className={`border-b border-white/6 last:border-0 ${STATUS_META[entry.status].rowClassName}`}>
                <td className="ps-4 pe-2 py-3 font-semibold text-wc-fg2">{entry.rank}</td>
                <td className="px-2 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {entry.team.logo_url ? (
                      <Image
                        src={entry.team.logo_url}
                        alt={entry.team.name}
                        width={18}
                        height={12}
                        className="rounded-sm object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-3 w-[18px] rounded-sm bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-wc-fg1">
                        {entry.team.name_he ?? entry.team.name}
                      </p>
                      <StatusPill status={entry.status} />
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.played}</td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.won}</td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.drawn}</td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.lost}</td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.gf}</td>
                <td className="px-2 py-3 text-center text-wc-fg2">{entry.gd}</td>
                <td className="ps-2 pe-4 py-3 text-center font-bold text-wc-fg1">{entry.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BestThirdHead() {
  return (
    <thead>
      <tr className="border-b border-white/8">
        <th className="ps-4 pe-2 py-3 text-start font-semibold text-wc-fg3">#</th>
        <th className="px-3 py-3 text-start font-semibold text-wc-fg3">נבחרת</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">בית</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">מש</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">נק׳</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">הפרש</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">ז+</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">Fair Play</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">דירוג פיפ״א</th>
        <th className="ps-2 pe-4 py-3 text-center font-semibold text-wc-fg3">סטטוס</th>
      </tr>
    </thead>
  );
}

function BestThirdRow({ entry }: { entry: TeamStanding }) {
  return (
    <tr className={`border-b border-white/6 last:border-0 ${STATUS_META[entry.status].rowClassName}`}>
      <td className="ps-4 pe-2 py-3 font-semibold text-wc-fg2">{entry.rank}</td>
      <td className="px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {entry.team.logo_url ? (
            <Image
              src={entry.team.logo_url}
              alt={entry.team.name}
              width={18}
              height={12}
              className="rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <div className="h-3 w-[18px] rounded-sm bg-white/10" />
          )}
          <span className="truncate font-semibold text-wc-fg1">
            {entry.team.name_he ?? entry.team.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.team.group_letter}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.played}</td>
      <td className="px-3 py-3 text-center font-bold text-wc-fg1">{entry.pts}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.gd}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.gf}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.fairPlay}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.fifaRanking}</td>
      <td className="ps-2 pe-4 py-3 text-center">
        <StatusPill status={entry.status} />
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: TeamStanding["status"] }) {
  const meta = STATUS_META[status];

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.pillClassName}`}>
      {meta.label}
    </span>
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
        {matches.map((match) => (
          <MatchCard key={match.id} t1={match.t1} t2={match.t2} />
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
        {t1 === "TBD" ? <span className="text-wc-fg3">- TBD -</span> : t1}
      </div>
      <div className={`px-3 py-2 font-medium ${highlight ? "bg-[rgba(255,182,73,0.08)] text-wc-fg1" : "text-wc-fg2"}`}>
        {t2 === "TBD" ? <span className="text-wc-fg3">- TBD -</span> : t2}
      </div>
    </div>
  );
}

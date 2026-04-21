"use client";

import type { TeamStanding } from "@/lib/utils/standings";
import Image from "next/image";
import { useState } from "react";

type Props = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  teamsRemaining: number;
};

type Tab = "groups" | "third" | "knockout";

type StatusDisplay = {
  label: string;
  pillClassName: string;
};

const TEXT = {
  tabs: {
    groups: "\u05e9\u05dc\u05d1 \u05d4\u05d1\u05ea\u05d9\u05dd",
    third: "\u05d4\u05de\u05e7\u05d5\u05dd \u05d4\u05e9\u05dc\u05d9\u05e9\u05d9",
    knockout: "\u05e0\u05d5\u05e7\u05d0\u05d0\u05d5\u05d8",
  },
  hub: "\u05de\u05e8\u05db\u05d6 \u05d4\u05d8\u05d5\u05e8\u05e0\u05d9\u05e8",
  title: "\u05de\u05d5\u05e0\u05d3\u05d9\u05d0\u05dc 2026",
  remainingTeams: "\u05e0\u05d1\u05d7\u05e8\u05d5\u05ea \u05e9\u05e0\u05d5\u05ea\u05e8\u05d5",
  lockedPositionLegend: "\u05de\u05d9\u05e7\u05d5\u05dd \u05e1\u05d5\u05e4\u05d9 \u05e0\u05e2\u05d5\u05dc",
  qualifiedLegend: "\u05d4\u05e2\u05e4\u05dc\u05d4 \u05d5\u05d3\u05d0\u05d9\u05ea",
  eliminatedLegend: "\u05d4\u05d3\u05d7\u05d4 \u05d5\u05d3\u05d0\u05d9\u05ea",
  lockedPosition: "\u05de\u05e7\u05d5\u05dd",
  qualified: "\u05d4\u05e2\u05e4\u05dc\u05d4",
  eliminated: "\u05d4\u05d3\u05d7\u05d4",
  lockedThirdQualified: "\u05de\u05e7\u05d5\u05dd 3 - \u05d4\u05e2\u05e4\u05dc\u05d4 \u05de\u05d5\u05d1\u05d8\u05d7\u05ea",
  lockedThirdEliminated: "\u05de\u05e7\u05d5\u05dd 3 - \u05d4\u05d3\u05d7\u05d4 \u05d5\u05d3\u05d0\u05d9\u05ea",
  group: "\u05d1\u05d9\u05ea",
  team: "\u05e0\u05d1\u05d7\u05e8\u05ea",
  played: "\u05de\u05e9",
  won: "\u05e0\u05e6",
  drawn: "\u05ea",
  lost: "\u05d4\u05e4",
  goalsFor: "\u05d6+",
  goalDifference: "\u05d4\u05e4\u05e8\u05e9",
  points: "\u05e0\u05e7\u05f3",
  bestThirdTitle: "\u05d8\u05d1\u05dc\u05ea \u05d4\u05de\u05e7\u05d5\u05de\u05d5\u05ea \u05d4\u05e9\u05dc\u05d9\u05e9\u05d9\u05d9\u05dd",
  status: "\u05e1\u05d8\u05d8\u05d5\u05e1",
  round32: "32 \u05d4\u05d0\u05d7\u05e8\u05d5\u05e0\u05d5\u05ea",
  round16: "16 \u05d4\u05d0\u05d7\u05e8\u05d5\u05e0\u05d5\u05ea",
  quarterFinal: "\u05e8\u05d1\u05e2 \u05d2\u05de\u05e8",
  semiFinal: "\u05d7\u05e6\u05d9 \u05d2\u05de\u05e8",
  final: "\u05d2\u05de\u05e8",
  teams32: "32 \u05e0\u05d1\u05d7\u05e8\u05d5\u05ea",
  rounds5: "5 \u05e1\u05d9\u05d1\u05d5\u05d1\u05d9\u05dd",
  rtlBracket: "Bracket RTL \u05de\u05dc\u05d0",
  summary: "\u05ea\u05d5\u05d5\u05d9\u05d5\u05ea \u05de\u05d5\u05e6\u05d2\u05d5\u05ea \u05e8\u05e7 \u05db\u05e9\u05d4\u05ea\u05de\u05d5\u05e0\u05d4 \u05d4\u05de\u05ea\u05de\u05d8\u05d9\u05ea \u05e0\u05e2\u05d5\u05dc\u05d4: \u05de\u05e7\u05d5\u05dd \u05e1\u05d5\u05e4\u05d9 \u05de\u05e7\u05d1\u05dc \u05e2\u05d3\u05d9\u05e4\u05d5\u05ea, \u05d5\u05d0\u05dd \u05d4\u05de\u05d9\u05e7\u05d5\u05dd \u05e2\u05d5\u05d3 \u05e4\u05ea\u05d5\u05d7 \u05de\u05d5\u05e6\u05d2\u05ea \u05e8\u05e7 \u05d5\u05d3\u05d0\u05d5\u05ea \u05e9\u05dc \u05d4\u05e2\u05e4\u05dc\u05d4 \u05d0\u05d5 \u05d4\u05d3\u05d7\u05d4.",
  groupsNote: "\u05ea\u05d5\u05d5\u05d9\u05ea \u05f3\u05e2\u05d3\u05d9\u05d9\u05df \u05e4\u05ea\u05d5\u05d7\u05f4 \u05d4\u05d5\u05e1\u05e8\u05d4 \u05dc\u05d7\u05dc\u05d5\u05d8\u05d9\u05df. \u05de\u05d5\u05e6\u05d2\u05d9\u05dd \u05e8\u05e7 \u05de\u05e7\u05d5\u05dd \u05e1\u05d5\u05e4\u05d9 \u05e0\u05e2\u05d5\u05dc, \u05d4\u05e2\u05e4\u05dc\u05d4 \u05d5\u05d3\u05d0\u05d9\u05ea \u05d0\u05d5 \u05d4\u05d3\u05d7\u05d4 \u05d5\u05d3\u05d0\u05d9\u05ea.",
  thirdNote: "Fair Play \u05d5\u05d3\u05d9\u05e8\u05d5\u05d2 FIFA \u05e2\u05d3\u05d9\u05d9\u05df \u05de\u05e9\u05ea\u05ea\u05e4\u05d9\u05dd \u05d1\u05d0\u05dc\u05d2\u05d5\u05e8\u05d9\u05ea\u05dd \u05d4\u05de\u05d9\u05d5\u05df, \u05d0\u05d1\u05dc \u05d4\u05dd \u05de\u05d5\u05e1\u05ea\u05e8\u05d9\u05dd \u05de\u05d4\u05d8\u05d1\u05dc\u05d4 \u05db\u05d3\u05d9 \u05dc\u05e9\u05de\u05d5\u05e8 \u05e2\u05dc \u05de\u05de\u05e9\u05e7 \u05e0\u05e7\u05d9.",
  cutoffNote: "\u05e7\u05d5 \u05d4\u05d7\u05d9\u05ea\u05d5\u05da \u05de\u05e1\u05de\u05df \u05d0\u05ea \u05d4\u05de\u05e2\u05d1\u05e8 \u05d1\u05d9\u05df 8 \u05d4\u05e2\u05d5\u05dc\u05d5\u05ea \u05dc-4 \u05d4\u05d0\u05d7\u05e8\u05d5\u05e0\u05d5\u05ea.",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "groups", label: TEXT.tabs.groups },
  { id: "third", label: TEXT.tabs.third },
  { id: "knockout", label: TEXT.tabs.knockout },
];

const STATUS_META: Record<TeamStanding["status"], { rowClassName: string }> = {
  qualified: {
    rowClassName: "bg-[rgba(95,255,123,0.08)]",
  },
  pending: {
    rowClassName: "",
  },
  eliminated: {
    rowClassName: "bg-[rgba(255,92,130,0.08)]",
  },
};

const QUALIFIED_PILL_CLASS = "bg-[rgba(95,255,123,0.14)] text-wc-neon";
const ELIMINATED_PILL_CLASS = "bg-[rgba(255,92,130,0.14)] text-wc-danger";
const LOCKED_POSITION_PILL_CLASS = "bg-white/8 text-wc-fg2";

function getLockedPositionLabel(rank: number) {
  return `${TEXT.lockedPosition} ${rank}`;
}

function getGroupStatusDisplay(entry: TeamStanding): StatusDisplay | null {
  if (entry.lockedRank === 3 && entry.status === "qualified") {
    return {
      label: TEXT.lockedThirdQualified,
      pillClassName: QUALIFIED_PILL_CLASS,
    };
  }

  if (entry.lockedRank === 3 && entry.status === "eliminated") {
    return {
      label: TEXT.lockedThirdEliminated,
      pillClassName: ELIMINATED_PILL_CLASS,
    };
  }

  if (entry.lockedRank !== null) {
    return {
      label: getLockedPositionLabel(entry.lockedRank),
      pillClassName:
        entry.lockedRank <= 2
          ? QUALIFIED_PILL_CLASS
          : entry.lockedRank === 4
            ? ELIMINATED_PILL_CLASS
            : LOCKED_POSITION_PILL_CLASS,
    };
  }

  if (entry.status === "qualified") {
    return {
      label: TEXT.qualified,
      pillClassName: QUALIFIED_PILL_CLASS,
    };
  }

  if (entry.status === "eliminated") {
    return {
      label: TEXT.eliminated,
      pillClassName: ELIMINATED_PILL_CLASS,
    };
  }

  return null;
}

function getBestThirdStatusDisplay(entry: TeamStanding): StatusDisplay | null {
  if (entry.status === "qualified") {
    return {
      label: TEXT.qualified,
      pillClassName: QUALIFIED_PILL_CLASS,
    };
  }

  if (entry.status === "eliminated") {
    return {
      label: TEXT.eliminated,
      pillClassName: ELIMINATED_PILL_CLASS,
    };
  }

  return null;
}

export default function TournamentClient({
  groupStandings,
  bestThirdStandings,
  teamsRemaining,
}: Props) {
  const [tab, setTab] = useState<Tab>("groups");
  const groupLetters = Object.keys(groupStandings).sort();

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <section className="wc-card overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-start">
            <p className="wc-kicker">{TEXT.hub}</p>
            <h1 className="wc-display mt-3 text-5xl text-wc-fg1 sm:text-6xl">{TEXT.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
              {TEXT.summary}
            </p>
          </div>

          <div className="max-w-[14rem]">
            <HeaderStat label={TEXT.remainingTeams} value={String(teamsRemaining)} accent="text-wc-neon" />
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
            <LegendBadge colorClassName="bg-white/25" label={TEXT.lockedPositionLegend} />
            <LegendBadge colorClassName="bg-wc-neon shadow-[0_0_12px_rgba(95,255,123,0.7)]" label={TEXT.qualifiedLegend} />
            <LegendBadge colorClassName="bg-wc-danger shadow-[0_0_12px_rgba(255,92,130,0.7)]" label={TEXT.eliminatedLegend} />
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/4 p-4 text-sm leading-7 text-wc-fg2">
            {TEXT.groupsNote}
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
            {TEXT.thirdNote}
          </div>

          <div className="mt-6 overflow-hidden rounded-[1.75rem] wc-card">
            <div className="bg-[linear-gradient(135deg,rgba(255,182,73,0.18),rgba(95,255,123,0.08))] px-4 py-3">
              <p className="text-sm font-bold text-wc-fg1">{TEXT.bestThirdTitle}</p>
              <p className="mt-1 text-xs text-[rgba(255,220,170,0.84)]">{TEXT.cutoffNote}</p>
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
            <span className="wc-badge">{TEXT.teams32}</span>
            <span className="wc-badge">{TEXT.rounds5}</span>
            <span className="wc-badge">{TEXT.rtlBracket}</span>
          </div>

          <div className="mt-6 overflow-x-auto pb-4">
            <div className="flex min-w-max gap-4">
              <BracketRound
                label={TEXT.round32}
                matches={Array.from({ length: 16 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={52}
              />

              <BracketRound
                label={TEXT.round16}
                matches={Array.from({ length: 8 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={116}
                offsetTop={32}
              />

              <BracketRound
                label={TEXT.quarterFinal}
                matches={Array.from({ length: 4 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={244}
                offsetTop={96}
              />

              <BracketRound
                label={TEXT.semiFinal}
                matches={Array.from({ length: 2 }, (_, i) => ({ id: i, t1: "TBD", t2: "TBD" }))}
                matchHeight={500}
                offsetTop={224}
              />

              <div className="flex w-40 shrink-0 flex-col">
                <p className="wc-display mb-3 text-center text-2xl text-wc-amber">{TEXT.final}</p>
                <div style={{ marginTop: "476px" }}>
                  <MatchCard t1="TBD" t2="TBD" label={TEXT.final} highlight />
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
        <p className="wc-display text-3xl text-wc-fg1">{`${TEXT.group} ${letter}`}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="ps-4 pe-2 py-2 text-start font-semibold text-wc-fg3">#</th>
              <th className="px-2 py-2 text-start font-semibold text-wc-fg3">{TEXT.team}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.played}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.won}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.drawn}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.lost}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.goalsFor}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.goalDifference}</th>
              <th className="ps-2 pe-4 py-2 text-center font-semibold text-wc-fg3">{TEXT.points}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => {
              const statusDisplay = getGroupStatusDisplay(entry);

              return (
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
                        <p className="truncate font-semibold text-wc-fg1">{entry.team.name_he ?? entry.team.name}</p>
                        <StatusPill display={statusDisplay} />
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
              );
            })}
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
        <th className="px-3 py-3 text-start font-semibold text-wc-fg3">{TEXT.team}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.group}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.played}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.points}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.goalDifference}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.goalsFor}</th>
        <th className="ps-2 pe-4 py-3 text-center font-semibold text-wc-fg3">{TEXT.status}</th>
      </tr>
    </thead>
  );
}

function BestThirdRow({ entry }: { entry: TeamStanding }) {
  const statusDisplay = getBestThirdStatusDisplay(entry);
  const isBelowCutoff = entry.rank > 8;
  const rowAccentClassName = isBelowCutoff
    ? "bg-[linear-gradient(90deg,rgba(255,92,130,0.08),rgba(255,92,130,0.02))]"
    : "";
  const dividerClassName = entry.rank === 9 ? "border-t-2 border-t-[rgba(255,92,130,0.45)]" : "";
  const rankClassName = isBelowCutoff ? "text-wc-danger" : "text-wc-fg2";

  return (
    <tr className={`border-b border-white/6 last:border-0 ${dividerClassName} ${STATUS_META[entry.status].rowClassName} ${rowAccentClassName}`}>
      <td className={`ps-4 pe-2 py-3 font-semibold ${rankClassName}`}>{entry.rank}</td>
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
          <span className="truncate font-semibold text-wc-fg1">{entry.team.name_he ?? entry.team.name}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.team.group_letter}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.played}</td>
      <td className="px-3 py-3 text-center font-bold text-wc-fg1">{entry.pts}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.gd}</td>
      <td className="px-3 py-3 text-center text-wc-fg2">{entry.gf}</td>
      <td className="ps-2 pe-4 py-3 text-center">
        <StatusPill display={statusDisplay} />
      </td>
    </tr>
  );
}

function StatusPill({ display }: { display: StatusDisplay | null }) {
  if (!display) return null;

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${display.pillClassName}`}>
      {display.label}
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

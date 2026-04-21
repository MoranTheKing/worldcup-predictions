"use client";

import { buildKnockoutWinnerTree } from "@/lib/tournament/knockout-tree";
import {
  formatMatchDateLabel,
  formatMatchTimeLabel,
  getMatchScoreSummary,
  getMatchStageKind,
  getStageLabelHe,
  getTeamDisplayLogo,
  getTeamDisplayName,
  isMatchScoreVisible,
  type MatchWithTeams,
} from "@/lib/tournament/matches";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

export type MatchListRow = MatchWithTeams;

type Filter = "all" | "live" | "scheduled" | "finished";

type KnockoutSortNode = {
  round: string;
  order: number;
  leafStart: number;
  center: number;
};

const KNOCKOUT_STAGE_ORDER = {
  group: -1,
  round_of_32: 0,
  round_of_16: 1,
  quarter_final: 2,
  semi_final: 3,
  third_place: 4,
  final: 5,
  unknown: 99,
} as const;

const TEXT: Record<Filter, { label: string; empty: string }> = {
  all: {
    label: "הכל",
    empty: "אין משחקים להצגה",
  },
  live: {
    label: "בשידור חי",
    empty: "אין משחקים חיים כרגע",
  },
  scheduled: {
    label: "מתוכננים",
    empty: "אין משחקים עתידיים",
  },
  finished: {
    label: "הסתיימו",
    empty: "עדיין לא הסתיימו משחקים",
  },
};

function getStatusMeta(status: string, minute: number | null) {
  if (status === "live") {
    return {
      label: minute !== null ? `${minute}' LIVE` : "LIVE",
      pillClassName: "bg-[rgba(255,92,130,0.18)] text-wc-danger border border-[rgba(255,92,130,0.35)]",
      cardClassName: "border-[rgba(255,92,130,0.28)] shadow-[0_0_28px_rgba(255,92,130,0.08)]",
    };
  }

  if (status === "finished") {
    return {
      label: "הסתיים",
      pillClassName: "bg-white/8 text-wc-fg2 border border-white/10",
      cardClassName: "border-white/12",
    };
  }

  return {
    label: "מתוכנן",
    pillClassName: "bg-[rgba(95,255,123,0.12)] text-wc-neon border border-[rgba(95,255,123,0.22)]",
    cardClassName: "border-[rgba(95,255,123,0.14)]",
  };
}

export default function MatchesClient({ matches }: { matches: MatchListRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const knockoutTree = useMemo(() => buildKnockoutWinnerTree(matches), [matches]);
  const knockoutNodesByMatchNumber = useMemo<Map<number, KnockoutSortNode>>(
    () =>
      new Map(
        knockoutTree.nodes.map((node) => [
          node.matchNumber,
          {
            round: node.round,
            order: node.order,
            leafStart: node.leafStart,
            center: node.center,
          },
        ]),
      ),
    [knockoutTree.nodes],
  );

  const counts = useMemo(
    () => ({
      all: matches.length,
      live: matches.filter((match) => match.status === "live").length,
      scheduled: matches.filter((match) => match.status === "scheduled").length,
      finished: matches.filter((match) => match.status === "finished").length,
    }),
    [matches],
  );

  const filtered = useMemo(
    () => matches.filter((match) => filter === "all" || match.status === filter),
    [filter, matches],
  );

  const grouped = useMemo(() => {
    const byDate = new Map<string, MatchListRow[]>();

    for (const match of filtered) {
      const key = formatMatchDateLabel(match.date_time);
      const bucket = byDate.get(key) ?? [];
      bucket.push(match);
      byDate.set(key, bucket);
    }

    return Array.from(byDate.entries()).map(([date, rows]) => [
      date,
      [...rows].sort((left, right) =>
        compareMatches(left, right, knockoutNodesByMatchNumber),
      ),
    ] as const);
  }, [filtered, knockoutNodesByMatchNumber]);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <section className="wc-card overflow-hidden p-6">
        <div className="text-start">
          <p className="wc-kicker">Match Center</p>
          <h1 className="wc-display mt-3 text-5xl text-wc-fg1">משחקים</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">
            כל 104 משחקי מונדיאל 2026, מקובצים לפי תאריך ומוצגים בשעון IDT. בימי נוקאאוט,
            סדר הכרטיסים בתוך אותו יום נשען גם על מסלול הברקט הרשמי כדי לשמור על הזרימה
            הלוגית מהסיבוב הראשון ועד הגמר.
          </p>
        </div>
      </section>

      <div className="mt-6 inline-flex w-full max-w-max flex-wrap rounded-[1.5rem] p-1.5 wc-glass">
        {(["all", "live", "scheduled", "finished"] as Filter[]).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex items-center gap-2 rounded-[1rem] px-5 py-2.5 text-sm font-semibold transition-all ${
              filter === value
                ? "bg-[linear-gradient(135deg,rgba(95,255,123,0.14),rgba(255,47,166,0.12))] text-wc-fg1 shadow-[0_0_26px_rgba(95,255,123,0.16)]"
                : "text-wc-fg3 hover:text-wc-fg1"
            }`}
          >
            {value === "live" && (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wc-danger opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-wc-danger" />
              </span>
            )}
            {TEXT[value].label}
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{counts[value]}</span>
          </button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/4 p-8 text-center text-sm text-wc-fg3">
          {TEXT[filter].empty}
        </div>
      ) : (
        grouped.map(([date, rows]) => (
          <section key={date} className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-wc-fg3">{date}</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((match) => (
                <MatchCard key={match.match_number} match={match} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function compareMatches(
  left: MatchListRow,
  right: MatchListRow,
  knockoutNodesByMatchNumber: Map<number, KnockoutSortNode>,
) {
  const timeComparison = left.date_time.localeCompare(right.date_time);
  if (timeComparison !== 0) return timeComparison;

  const leftStage = getMatchStageKind(left.stage);
  const rightStage = getMatchStageKind(right.stage);
  const leftStageOrder = KNOCKOUT_STAGE_ORDER[leftStage];
  const rightStageOrder = KNOCKOUT_STAGE_ORDER[rightStage];

  if (leftStageOrder !== rightStageOrder) {
    return leftStageOrder - rightStageOrder;
  }

  const leftNode = knockoutNodesByMatchNumber.get(left.match_number);
  const rightNode = knockoutNodesByMatchNumber.get(right.match_number);

  if (leftNode && rightNode) {
    const leftPathOrder =
      leftNode.round === "round_of_32" ? leftNode.leafStart : leftNode.center;
    const rightPathOrder =
      rightNode.round === "round_of_32" ? rightNode.leafStart : rightNode.center;

    if (leftPathOrder !== rightPathOrder) {
      return leftPathOrder - rightPathOrder;
    }

    if (leftNode.order !== rightNode.order) {
      return leftNode.order - rightNode.order;
    }
  }

  return left.match_number - right.match_number;
}

function MatchCard({ match }: { match: MatchListRow }) {
  const scoreVisible = isMatchScoreVisible(match);
  const scoreSummary = scoreVisible ? getMatchScoreSummary(match) : null;
  const statusMeta = getStatusMeta(match.status, match.minute);
  const homeName = getTeamDisplayName(match.homeTeam, match.home_placeholder);
  const awayName = getTeamDisplayName(match.awayTeam, match.away_placeholder);
  const homeLogo = getTeamDisplayLogo(match.homeTeam);
  const awayLogo = getTeamDisplayLogo(match.awayTeam);

  return (
    <Link
      href={`/dashboard/matches/${match.match_number}`}
      className={`wc-card group flex flex-col gap-4 border p-4 transition hover:border-white/20 ${statusMeta.cardClassName}`}
    >
      <div className="flex items-center justify-between gap-3 text-[11px] text-wc-fg3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-wc-fg2">{getStageLabelHe(match.stage)}</p>
          <p className="mt-1 font-mono text-[10px] text-wc-fg3">Match #{match.match_number}</p>
        </div>
        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusMeta.pillClassName}`}>
          {statusMeta.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TeamSide logo={homeLogo} name={homeName} />
        <div className="flex shrink-0 flex-col items-center gap-1 text-center">
          {scoreSummary ? (
            <span className={`wc-display text-wc-fg1 ${scoreSummary.hasPenalties ? "text-xl" : "text-2xl"}`}>
              {scoreSummary.displayScore}
            </span>
          ) : (
            <span className="wc-display text-2xl text-wc-fg3">VS</span>
          )}
          <span className="text-[11px] text-wc-fg3">{formatMatchTimeLabel(match.date_time)}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-wc-fg3">IDT</span>
        </div>
        <TeamSide logo={awayLogo} name={awayName} reverse />
      </div>
    </Link>
  );
}

function TeamSide({
  logo,
  name,
  reverse = false,
}: {
  logo: string | null;
  name: string;
  reverse?: boolean;
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${reverse ? "flex-row-reverse text-end" : "text-start"}`}>
      {logo ? (
        <Image src={logo} alt={name} width={26} height={18} className="rounded-sm object-cover" unoptimized />
      ) : (
        <div className="h-[18px] w-[26px] rounded-sm bg-white/10" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-wc-fg1">{name}</p>
      </div>
    </div>
  );
}

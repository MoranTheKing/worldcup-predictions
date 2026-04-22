"use client";

import type { ResolvedBracketMatch, ResolvedSeed } from "@/lib/bracket/knockout";
import type { StandingStatus, TeamStanding } from "@/lib/utils/standings";
import Image from "next/image";
import { type ReactNode, useMemo, useState } from "react";

type Props = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  teamsRemaining: number;
  bracket: ResolvedBracketMatch[];
  knockoutTree: {
    rounds: Record<string, unknown[]>;
    leafCount: number;
    finalMatchNumber?: number | null;
    thirdPlaceMatchNumber: number | null;
  };
  hasLive: boolean;
  liveTeamIds: string[];
};

type Tab = "groups" | "third" | "knockout";

type StatusDisplay = {
  label: string;
  pillClassName: string;
};

const TEXT = {
  tabs: {
    groups: "שלב הבתים",
    third: "המקום השלישי",
    knockout: "נוקאאוט",
  },
  hub: "מרכז הטורניר",
  title: "מונדיאל 2026",
  remainingTeams: "נבחרות שנותרו",
  lockedPositionLegend: "מיקום סופי נעול",
  qualifiedLegend: "העפלה ודאית",
  eliminatedLegend: "הדחה ודאית",
  liveLegend: "נבחרת שמשחקת עכשיו",
  lockedPosition: "מקום",
  qualified: "העפלה",
  eliminated: "הדחה",
  group: "בית",
  team: "נבחרת",
  played: "מש'",
  won: "נצ'",
  drawn: "ת'",
  lost: "הפ'",
  goalsFor: "ז+",
  goalDifference: "הפרש",
  points: "נק'",
  bestThirdTitle: "טבלת המקומות השלישיים",
  status: "סטטוס",
  round32: "32 האחרונות",
  round16: "16 האחרונות",
  quarterFinal: "רבע גמר",
  semiFinal: "חצי גמר",
  thirdPlace: "משחק על המקום השלישי",
  final: "הגמר",
  teams32: "32 נבחרות",
  rounds5: "5 סיבובי הכרעה",
  verticalBracket: "בראקט אנכי מפוצל",
  matchLabel: "משחק",
  liveBannerTitle: "טבלה בזמן אמת",
  liveBannerNote: "הניקוד מתעדכן בזמן אמת, ו-LIVE מופיע ליד הנבחרות שמשחקות עכשיו.",
  summary:
    "הבתים, טבלת המקומות השלישיים והנוקאאוט מסונכרנים עכשיו מאותו מקור נתונים, כולל מסלול נוקאאוט רשמי ולא-רציף.",
  groupsNote:
    "מקומות 1-2 מסומנים לפי מצב הקבוצה, ומקום 3 מקבל סטטוס ירוק או אדום לפי טבלת 12 הקבוצות מהמקום השלישי ברמה הגלובלית.",
  thirdNote:
    "הטבלה הגלובלית מדרגת את כל 12 הקבוצות מהמקום השלישי לפי כללי פיפ\"א, והקו מסמן את הגבול בין 8 העולות ל-4 המודחות.",
  cutoffNote: "מקום 8 מסמן את קו העלייה. מקום 9 ומטה נשארים מחוץ ל-32 האחרונות.",
  bracketNote:
    "הנוקאאוט מוצג כעת כבראקט מפוצל שנפגש במרכז: המסלול העליון זורם למטה אל חצי הגמר הראשון, המסלול התחתון זורם למעלה אל חצי הגמר השני, ושניהם נפגשים בגמר שבמרכז.",
  emptyBracket: "ברגע שיוזנו משחקי הנוקאאוט, העץ המלא יוצג כאן.",
  thirdPlaceShort: "מקום 3",
  thirdPlaceLong: "משחק על המקום השלישי",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "groups", label: TEXT.tabs.groups },
  { id: "third", label: TEXT.tabs.third },
  { id: "knockout", label: TEXT.tabs.knockout },
];

const STATUS_META: Record<StandingStatus, { rowClassName: string }> = {
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
const CONNECTOR_CLASS = "bg-[rgba(255,255,255,0.18)]";
const CARD_WIDTH_CLASS = "mx-auto w-full max-w-[220px]";
const TOP_ROUND_OF_32_ORDER = [74, 77, 73, 75, 83, 84, 81, 82] as const;
const TOP_ROUND_OF_32_PAIRS = [
  [74, 77],
  [73, 75],
  [83, 84],
  [81, 82],
] as const;
const TOP_ROUND_OF_16_PAIRS = [
  [89, 90],
  [93, 94],
] as const;
const TOP_QUARTERS = [97, 98] as const;
const TOP_SEMI = 101;
const BOTTOM_ROUND_OF_32_ORDER = [76, 78, 79, 80, 86, 88, 85, 87] as const;
const BOTTOM_ROUND_OF_32_PAIRS = [
  [76, 78],
  [79, 80],
  [86, 88],
  [85, 87],
] as const;
const BOTTOM_ROUND_OF_16_PAIRS = [
  [91, 92],
  [95, 96],
] as const;
const BOTTOM_QUARTERS = [99, 100] as const;
const BOTTOM_SEMI = 102;

function getLockedPositionLabel(rank: number) {
  return `${TEXT.lockedPosition} ${rank}`;
}

function getEffectiveThirdPlaceStatus(
  entry: TeamStanding,
  qualifiedThirdPlaceTeamIds: Set<string>,
  eliminatedThirdPlaceTeamIds: Set<string>,
): StandingStatus | null {
  if (entry.rank !== 3) return null;
  if (qualifiedThirdPlaceTeamIds.has(entry.team.id)) return "qualified";
  if (eliminatedThirdPlaceTeamIds.has(entry.team.id)) return "eliminated";
  return null;
}

function getEffectiveGroupStatus(
  entry: TeamStanding,
  qualifiedThirdPlaceTeamIds: Set<string>,
  eliminatedThirdPlaceTeamIds: Set<string>,
): StandingStatus {
  const thirdPlaceStatus = getEffectiveThirdPlaceStatus(
    entry,
    qualifiedThirdPlaceTeamIds,
    eliminatedThirdPlaceTeamIds,
  );

  if (thirdPlaceStatus) return thirdPlaceStatus;
  if (entry.lockedRank !== null && entry.lockedRank <= 2) return "qualified";
  if (entry.lockedRank !== null && entry.lockedRank >= 4) return "eliminated";
  return entry.status;
}

function getGroupStatusDisplay(
  entry: TeamStanding,
  qualifiedThirdPlaceTeamIds: Set<string>,
  eliminatedThirdPlaceTeamIds: Set<string>,
): StatusDisplay | null {
  const effectiveStatus = getEffectiveGroupStatus(
    entry,
    qualifiedThirdPlaceTeamIds,
    eliminatedThirdPlaceTeamIds,
  );

  if (entry.rank === 3) {
    if (effectiveStatus === "qualified") {
      return {
        label: getLockedPositionLabel(3),
        pillClassName: QUALIFIED_PILL_CLASS,
      };
    }

    if (effectiveStatus === "eliminated") {
      return {
        label: getLockedPositionLabel(3),
        pillClassName: ELIMINATED_PILL_CLASS,
      };
    }
  }

  if (entry.lockedRank !== null) {
    let pillClassName: string;
    if (entry.lockedRank <= 2) {
      pillClassName = QUALIFIED_PILL_CLASS;
    } else if (entry.lockedRank >= 4) {
      pillClassName = ELIMINATED_PILL_CLASS;
    } else {
      pillClassName = LOCKED_POSITION_PILL_CLASS;
    }

    return {
      label: getLockedPositionLabel(entry.lockedRank),
      pillClassName,
    };
  }

  if (effectiveStatus === "qualified") {
    return { label: TEXT.qualified, pillClassName: QUALIFIED_PILL_CLASS };
  }

  if (effectiveStatus === "eliminated") {
    return { label: TEXT.eliminated, pillClassName: ELIMINATED_PILL_CLASS };
  }

  return null;
}

function getBestThirdStatusDisplay(
  entry: TeamStanding,
  qualifiedThirdPlaceTeamIds: Set<string>,
  eliminatedThirdPlaceTeamIds: Set<string>,
): StatusDisplay | null {
  const effectiveStatus =
    qualifiedThirdPlaceTeamIds.has(entry.team.id)
      ? "qualified"
      : eliminatedThirdPlaceTeamIds.has(entry.team.id)
        ? "eliminated"
        : entry.status;

  if (effectiveStatus === "qualified") {
    return {
      label: TEXT.qualified,
      pillClassName: QUALIFIED_PILL_CLASS,
    };
  }

  if (effectiveStatus === "eliminated") {
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
  bracket,
  knockoutTree,
  hasLive,
  liveTeamIds,
}: Props) {
  const [tab, setTab] = useState<Tab>("groups");
  const groupLetters = Object.keys(groupStandings).sort();
  const liveTeamIdSet = useMemo(() => new Set(liveTeamIds), [liveTeamIds]);
  const qualifiedThirdPlaceTeamIds = useMemo(
    () => new Set(bestThirdStandings.slice(0, 8).map((entry) => entry.team.id)),
    [bestThirdStandings],
  );
  const eliminatedThirdPlaceTeamIds = useMemo(
    () => new Set(bestThirdStandings.slice(8).map((entry) => entry.team.id)),
    [bestThirdStandings],
  );

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      {hasLive && <LiveTableBanner />}

      <section className="wc-card overflow-hidden p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="text-start">
            <p className="wc-kicker">{TEXT.hub}</p>
            <h1 className="wc-display mt-3 text-5xl text-wc-fg1 sm:text-6xl">{TEXT.title}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-wc-fg2">{TEXT.summary}</p>
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
            <LegendBadge colorClassName="bg-wc-danger shadow-[0_0_12px_rgba(255,92,130,0.7)]" label={TEXT.liveLegend} pulse />
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/4 p-4 text-sm leading-7 text-wc-fg2">
            {TEXT.groupsNote}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groupLetters.map((letter) => (
              <GroupTable
                key={letter}
                letter={letter}
                standings={groupStandings[letter]}
                liveTeamIdSet={liveTeamIdSet}
                qualifiedThirdPlaceTeamIds={qualifiedThirdPlaceTeamIds}
                eliminatedThirdPlaceTeamIds={eliminatedThirdPlaceTeamIds}
              />
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
                    <BestThirdRow
                      key={entry.team.id}
                      entry={entry}
                      qualifiedThirdPlaceTeamIds={qualifiedThirdPlaceTeamIds}
                      eliminatedThirdPlaceTeamIds={eliminatedThirdPlaceTeamIds}
                    />
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
            <span className="wc-badge">{TEXT.verticalBracket}</span>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/4 p-4 text-sm leading-7 text-wc-fg2">
            {TEXT.bracketNote}
          </div>

          <KnockoutBracket bracket={bracket} knockoutTree={knockoutTree} />
        </>
      )}
    </div>
  );
}

function LiveTableBanner() {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-[1.5rem] border border-[rgba(255,92,130,0.35)] bg-[linear-gradient(135deg,rgba(255,92,130,0.16),rgba(255,47,166,0.08))] px-4 py-3">
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wc-danger opacity-70" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-wc-danger shadow-[0_0_12px_rgba(255,92,130,0.8)]" />
      </span>
      <div className="text-start">
        <p className="text-sm font-bold text-wc-fg1">{TEXT.liveBannerTitle}</p>
        <p className="text-xs text-wc-fg2">{TEXT.liveBannerNote}</p>
      </div>
    </div>
  );
}

function KnockoutBracket({
  bracket,
  knockoutTree,
}: {
  bracket: ResolvedBracketMatch[];
  knockoutTree: Props["knockoutTree"];
}) {
  const matchesByNumber = useMemo(
    () => new Map(bracket.map((match) => [match.matchNumber, match])),
    [bracket],
  );
  const finalMatch =
    (knockoutTree.finalMatchNumber
      ? matchesByNumber.get(knockoutTree.finalMatchNumber)
      : null) ?? bracket.find((match) => match.round === "final") ?? null;
  const thirdPlaceMatch =
    (knockoutTree.thirdPlaceMatchNumber
      ? matchesByNumber.get(knockoutTree.thirdPlaceMatchNumber)
      : null) ?? bracket.find((match) => match.round === "third_place") ?? null;
  const hasWinnerTree =
    TOP_ROUND_OF_32_PAIRS.flat().some((matchNumber) => matchesByNumber.has(matchNumber)) ||
    BOTTOM_ROUND_OF_32_PAIRS.flat().some((matchNumber) => matchesByNumber.has(matchNumber));

  if (!hasWinnerTree) {
    return (
      <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/4 p-8 text-center text-sm text-wc-fg3">
        {TEXT.emptyBracket}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 pb-6">
      <SplitBracketSection
        direction="down"
        matchesByNumber={matchesByNumber}
        roundOf32Order={TOP_ROUND_OF_32_ORDER}
        roundOf32Pairs={TOP_ROUND_OF_32_PAIRS}
        roundOf16Pairs={TOP_ROUND_OF_16_PAIRS}
        quarterFinals={TOP_QUARTERS}
        semiFinal={TOP_SEMI}
      />

      <CenterClimaxBlock finalMatch={finalMatch} thirdPlaceMatch={thirdPlaceMatch} />

      <SplitBracketSection
        direction="up"
        matchesByNumber={matchesByNumber}
        roundOf32Order={BOTTOM_ROUND_OF_32_ORDER}
        roundOf32Pairs={BOTTOM_ROUND_OF_32_PAIRS}
        roundOf16Pairs={BOTTOM_ROUND_OF_16_PAIRS}
        quarterFinals={BOTTOM_QUARTERS}
        semiFinal={BOTTOM_SEMI}
      />
    </div>
  );
}

function SplitBracketSection({
  direction,
  matchesByNumber,
  roundOf32Order,
  roundOf32Pairs,
  roundOf16Pairs,
  quarterFinals,
  semiFinal,
}: {
  direction: "down" | "up";
  matchesByNumber: Map<number, ResolvedBracketMatch>;
  roundOf32Order: readonly number[];
  roundOf32Pairs: readonly (readonly [number, number])[];
  roundOf16Pairs: readonly (readonly [number, number])[];
  quarterFinals: readonly number[];
  semiFinal: number;
}) {
  const roundOf32Matches = roundOf32Order
    .map((matchNumber) => matchesByNumber.get(matchNumber))
    .filter((match): match is ResolvedBracketMatch => Boolean(match));
  const pairMatches = roundOf32Pairs
    .map(([left, right]) => {
      const leftMatch = matchesByNumber.get(left);
      const rightMatch = matchesByNumber.get(right);
      if (!leftMatch || !rightMatch) return null;
      return [leftMatch, rightMatch] as const;
    })
    .filter((pair): pair is readonly [ResolvedBracketMatch, ResolvedBracketMatch] => Boolean(pair));

  const roundOf16PairMatches = roundOf16Pairs
    .map(([left, right]) => {
      const leftMatch = matchesByNumber.get(left);
      const rightMatch = matchesByNumber.get(right);
      if (!leftMatch || !rightMatch) return null;
      return [leftMatch, rightMatch] as const;
    })
    .filter((pair): pair is readonly [ResolvedBracketMatch, ResolvedBracketMatch] => Boolean(pair));
  const quarterFinalMatches = quarterFinals
    .map((matchNumber) => matchesByNumber.get(matchNumber))
    .filter((match): match is ResolvedBracketMatch => Boolean(match));
  const semiFinalMatch = matchesByNumber.get(semiFinal) ?? null;

  const orderedRows =
    direction === "down"
      ? [
          <StageRow key="round32" label={TEXT.round32}>
            <OrderedMatchGrid matches={roundOf32Matches} columnsClassName="grid-cols-2 xl:grid-cols-4" />
          </StageRow>,
          <ParallelConnectorBand key="parallel" count={pairMatches.length} direction="down" />,
          <StageRow key="round16" label={TEXT.round16}>
            <PairMatchesGrid pairs={roundOf16PairMatches} direction="down" />
          </StageRow>,
          <MergeConnectorBand key="merge-quarters" count={quarterFinalMatches.length} direction="down" />,
          <StageRow key="quarters" label={TEXT.quarterFinal}>
            <CompactMatchGrid matches={quarterFinalMatches} columnsClassName="grid-cols-1 sm:grid-cols-2" />
          </StageRow>,
          <MergeConnectorBand key="merge-semi" count={1} direction="down" />,
          <StageRow key="semi" label={TEXT.semiFinal}>
            <SingleMatchSlot match={semiFinalMatch} />
          </StageRow>,
        ]
      : [
          <StageRow key="semi" label={TEXT.semiFinal}>
            <SingleMatchSlot match={semiFinalMatch} />
          </StageRow>,
          <MergeConnectorBand key="merge-semi" count={1} direction="up" />,
          <StageRow key="quarters" label={TEXT.quarterFinal}>
            <CompactMatchGrid matches={quarterFinalMatches} columnsClassName="grid-cols-1 sm:grid-cols-2" />
          </StageRow>,
          <MergeConnectorBand key="merge-round16" count={quarterFinalMatches.length} direction="up" />,
          <StageRow key="round16" label={TEXT.round16}>
            <PairMatchesGrid pairs={roundOf16PairMatches} direction="up" />
          </StageRow>,
          <ParallelConnectorBand key="parallel" count={pairMatches.length} direction="up" />,
          <StageRow key="round32" label={TEXT.round32}>
            <OrderedMatchGrid matches={roundOf32Matches} columnsClassName="grid-cols-2 xl:grid-cols-4" />
          </StageRow>,
        ];

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 sm:p-5">
      <div className="space-y-4">{orderedRows}</div>
    </section>
  );
}

function StageRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-wc-fg2">
          {label}
        </div>
      </div>
      {children}
    </div>
  );
}

function PairMatchesGrid({
  pairs,
  direction,
}: {
  pairs: ReadonlyArray<readonly [ResolvedBracketMatch, ResolvedBracketMatch]>;
  direction: "down" | "up";
}) {
  if (pairs.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {pairs.map(([leftMatch, rightMatch]) => (
        <PairMatchCell
          key={`${leftMatch.matchNumber}-${rightMatch.matchNumber}`}
          matches={[leftMatch, rightMatch]}
          direction={direction}
        />
      ))}
    </div>
  );
}

function OrderedMatchGrid({
  matches,
  columnsClassName,
}: {
  matches: ReadonlyArray<ResolvedBracketMatch>;
  columnsClassName: string;
}) {
  if (matches.length === 0) return null;

  return (
    <div className={`grid gap-4 ${columnsClassName}`}>
      {matches.map((match) => (
        <KnockoutMatchCard key={match.matchNumber} match={match} variant="default" compact />
      ))}
    </div>
  );
}

function PairMatchCell({
  matches,
  direction,
}: {
  matches: readonly [ResolvedBracketMatch, ResolvedBracketMatch];
  direction: "down" | "up";
}) {
  const cards = (
    <div className="grid grid-cols-2 gap-2">
      {matches.map((match) => (
        <KnockoutMatchCard key={match.matchNumber} match={match} variant="default" compact />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {direction === "up" && <PairConnector direction="up" />}
      <div className="w-full max-w-[460px]">{cards}</div>
      {direction === "down" && <PairConnector direction="down" />}
    </div>
  );
}

function PairConnector({ direction }: { direction: "down" | "up" }) {
  return (
    <svg
      className="h-10 w-full max-w-[220px]"
      viewBox="0 0 220 40"
      fill="none"
      aria-hidden="true"
    >
      {direction === "down" ? (
        <>
          <path d="M55 0 V14 H110 V40" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <path d="M165 0 V14 H110" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <path d="M55 40 V26 H110 V0" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
          <path d="M165 40 V26 H110" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

function CompactMatchGrid({
  matches,
  columnsClassName,
}: {
  matches: ReadonlyArray<ResolvedBracketMatch>;
  columnsClassName: string;
}) {
  if (matches.length === 0) return null;

  return (
    <div className={`grid gap-4 ${columnsClassName}`}>
      {matches.map((match) => (
        <SingleMatchSlot key={match.matchNumber} match={match} />
      ))}
    </div>
  );
}

function SingleMatchSlot({ match }: { match: ResolvedBracketMatch | null }) {
  if (!match) return null;

  return <KnockoutMatchCard match={match} variant="default" compact />;
}

function ParallelConnectorBand({
  count,
  direction,
}: {
  count: number;
  direction: "down" | "up";
}) {
  if (count <= 0) return null;

  return (
    <div className={`grid gap-4 ${count === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : count === 2 ? "sm:grid-cols-2" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`${direction}-${count}-${index}`} className="flex justify-center">
          <div className={`h-8 w-px ${CONNECTOR_CLASS}`} />
        </div>
      ))}
    </div>
  );
}

function MergeConnectorBand({
  count,
  direction,
}: {
  count: number;
  direction: "down" | "up";
}) {
  return (
    <div className={`grid gap-4 ${count === 2 ? "sm:grid-cols-2" : ""}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`${direction}-merge-${count}-${index}`} className="flex justify-center">
          <svg
            className="h-10 w-full max-w-[220px]"
            viewBox="0 0 220 40"
            fill="none"
            aria-hidden="true"
          >
            {direction === "down" ? (
              <>
                <path d="M55 0 V12 H110 V40" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                <path d="M165 0 V12 H110" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
              </>
            ) : (
              <>
                <path d="M55 40 V28 H110 V0" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                <path d="M165 40 V28 H110" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
              </>
            )}
          </svg>
        </div>
      ))}
    </div>
  );
}

function CenterClimaxBlock({
  finalMatch,
  thirdPlaceMatch,
}: {
  finalMatch: ResolvedBracketMatch | null;
  thirdPlaceMatch: ResolvedBracketMatch | null;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[rgba(255,182,73,0.2)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,182,73,0.05))] p-4 sm:p-5">
      <div className="mb-5 flex justify-center">
        <div className="rounded-full border border-[rgba(255,182,73,0.22)] bg-[rgba(7,11,18,0.9)] px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.26)] backdrop-blur">
          <p className="wc-display text-xl text-wc-fg1">מרכז ההכרעה</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {finalMatch ? (
          <FeaturedMatchCard
            label={TEXT.final}
            sublabel={TEXT.final}
            variant="final"
            match={finalMatch}
          />
        ) : null}
        {thirdPlaceMatch ? (
          <FeaturedMatchCard
            label={TEXT.thirdPlaceShort}
            sublabel={TEXT.thirdPlaceLong}
            variant="third"
            match={thirdPlaceMatch}
          />
        ) : null}
      </div>
    </section>
  );
}

function FeaturedMatchCard({
  label,
  sublabel,
  variant,
  match,
}: {
  label: string;
  sublabel: string;
  variant: "final" | "third";
  match: ResolvedBracketMatch;
}) {
  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
      <div className="text-center">
        <p className={`wc-display text-2xl ${variant === "final" ? "text-wc-amber" : "text-[#CD7F32]"}`}>
          {label}
        </p>
        <p className="mt-1 text-xs text-wc-fg2">{sublabel}</p>
      </div>
      <KnockoutMatchCard match={match} variant={variant} />
    </div>
  );
}

function KnockoutMatchCard({
  match,
  variant,
  compact = false,
}: {
  match: ResolvedBracketMatch;
  variant: "default" | "final" | "third";
  compact?: boolean;
}) {
  const isLive = match.liveMatch?.status === "live";
  const liveMatch = match.liveMatch;
  const isFinished = liveMatch?.status === "finished";
  const finalVariant = variant === "final";
  const thirdVariant = variant === "third";

  const hasPenalties =
    isFinished &&
    liveMatch &&
    liveMatch.home_score === liveMatch.away_score &&
    liveMatch.home_penalty_score !== null &&
    liveMatch.home_penalty_score !== undefined &&
    liveMatch.away_penalty_score !== null &&
    liveMatch.away_penalty_score !== undefined;

  let homeWins: boolean | null = null;
  if (isFinished && liveMatch) {
    homeWins = hasPenalties
      ? (liveMatch.home_penalty_score ?? 0) > (liveMatch.away_penalty_score ?? 0)
      : (liveMatch.home_score ?? 0) > (liveMatch.away_score ?? 0);
  }

  return (
    <div
      dir="rtl"
      className={`wc-bracket-card overflow-hidden text-[11px] leading-tight ${
        finalVariant
          ? "wc-bracket-final"
          : thirdVariant
            ? "border-[rgba(205,127,50,0.82)] shadow-[0_0_0_1px_rgba(205,127,50,0.28)]"
            : ""
      } ${compact ? CARD_WIDTH_CLASS : "w-full"}`}
    >
      <div
        className={`flex items-center justify-between gap-2 px-2.5 py-2 text-[10px] font-semibold ${
          finalVariant
            ? "bg-[linear-gradient(90deg,var(--wc-amber),#ffd580)] text-[color:var(--wc-text-inverse)]"
            : thirdVariant
              ? "bg-[linear-gradient(90deg,rgba(205,127,50,0.48),rgba(120,72,24,0.8))] text-wc-fg1"
              : "bg-white/8 text-wc-fg3"
        }`}
      >
        <span className="opacity-80">{`${TEXT.matchLabel} ${match.matchNumber}`}</span>
        <span className="inline-flex items-center gap-1">
          {liveMatch?.is_extra_time && !hasPenalties && (
            <span className={finalVariant ? "text-[color:var(--wc-text-inverse)]/70" : "text-wc-fg3"}>ET</span>
          )}
          {hasPenalties && (
            <span className={finalVariant ? "text-[color:var(--wc-text-inverse)]/70" : "text-wc-fg3"}>PEN</span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-1 text-wc-danger">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-wc-danger shadow-[0_0_6px_rgba(255,92,130,0.9)]" />
              LIVE
            </span>
          )}
        </span>
      </div>

      <SeedRow
        seed={match.home}
        highlight={finalVariant}
        score={liveMatch?.home_score ?? null}
        penaltyScore={hasPenalties ? (liveMatch?.home_penalty_score ?? null) : null}
        isWinner={homeWins === true}
        isLoser={homeWins === false}
        divider
      />
      <SeedRow
        seed={match.away}
        highlight={finalVariant}
        score={liveMatch?.away_score ?? null}
        penaltyScore={hasPenalties ? (liveMatch?.away_penalty_score ?? null) : null}
        isWinner={homeWins === false}
        isLoser={homeWins === true}
      />
    </div>
  );
}

function SeedRow({
  seed,
  highlight,
  score,
  penaltyScore,
  isWinner,
  isLoser,
  divider = false,
}: {
  seed: ResolvedSeed;
  highlight: boolean;
  score: number | null;
  penaltyScore: number | null;
  isWinner: boolean;
  isLoser: boolean;
  divider?: boolean;
}) {
  const borderClass = divider
    ? `border-b ${highlight ? "border-[rgba(255,182,73,0.2)]" : "border-white/8"}`
    : "";

  const bgClass = divider && highlight ? "bg-[rgba(255,182,73,0.1)]" : "";

  const textClass = isWinner
    ? "font-bold text-wc-fg1"
    : isLoser
      ? `opacity-40 font-medium ${highlight ? "text-wc-fg1" : "text-wc-fg2"}`
      : `font-medium ${highlight ? "text-wc-fg1" : "text-wc-fg2"}`;

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 ${borderClass} ${bgClass}`}>
      <div className={`flex min-w-0 items-center gap-1.5 ${textClass}`}>
        {seed.kind === "team" && seed.team.logo_url ? (
          <Image
            src={seed.team.logo_url}
            alt={seed.team.name}
            width={14}
            height={10}
            className="rounded-sm object-cover"
            unoptimized
          />
        ) : (
          <div className="h-[10px] w-3.5 shrink-0 rounded-sm bg-white/10" />
        )}
        <span className="truncate text-[10.5px] sm:text-[11px]">
          {seed.kind === "team" ? seed.team.name_he ?? seed.team.name : <span className="text-wc-fg3">{seed.labelHe}</span>}
        </span>
      </div>

      {score !== null && (
        <div className={`flex shrink-0 items-center gap-1 ${textClass}`}>
          {penaltyScore !== null && (
            <span className={isLoser ? "" : "text-wc-fg3"}>({penaltyScore})</span>
          )}
          <span className="min-w-[1ch] text-center">{score}</span>
        </div>
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

function LegendBadge({
  colorClassName,
  label,
  pulse = false,
}: {
  colorClassName: string;
  label: string;
  pulse?: boolean;
}) {
  return (
    <div className="wc-badge text-wc-fg2">
      <div className={`relative h-3 w-3 rounded-full ${colorClassName}`}>
        {pulse && <div className={`absolute inset-0 animate-ping rounded-full ${colorClassName}`} />}
      </div>
      <span>{label}</span>
    </div>
  );
}

function GroupTable({
  letter,
  standings,
  liveTeamIdSet,
  qualifiedThirdPlaceTeamIds,
  eliminatedThirdPlaceTeamIds,
}: {
  letter: string;
  standings: TeamStanding[];
  liveTeamIdSet: Set<string>;
  qualifiedThirdPlaceTeamIds: Set<string>;
  eliminatedThirdPlaceTeamIds: Set<string>;
}) {
  return (
    <div className="wc-card overflow-hidden">
      <div className="bg-[linear-gradient(135deg,rgba(111,60,255,0.32),rgba(255,47,166,0.2))] px-4 py-3">
        <p className="wc-display text-3xl text-wc-fg1">{`${TEXT.group} ${letter}`}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="py-2 pe-2 ps-4 text-start font-semibold text-wc-fg3">#</th>
              <th className="px-2 py-2 text-start font-semibold text-wc-fg3">{TEXT.team}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.played}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.won}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.drawn}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.lost}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.goalsFor}</th>
              <th className="px-2 py-2 text-center font-semibold text-wc-fg3">{TEXT.goalDifference}</th>
              <th className="py-2 pe-4 ps-2 text-center font-semibold text-wc-fg3">{TEXT.points}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry) => {
              const statusDisplay = getGroupStatusDisplay(
                entry,
                qualifiedThirdPlaceTeamIds,
                eliminatedThirdPlaceTeamIds,
              );
              const rowStatus = getEffectiveGroupStatus(
                entry,
                qualifiedThirdPlaceTeamIds,
                eliminatedThirdPlaceTeamIds,
              );
              const isLive = liveTeamIdSet.has(entry.team.id);

              return (
                <tr
                  key={entry.team.id}
                  className={`border-b border-white/6 last:border-0 ${STATUS_META[rowStatus].rowClassName}`}
                >
                  <td className="py-3 pe-2 ps-4 font-semibold text-wc-fg2">{entry.rank}</td>
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
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-wc-fg1">{entry.team.name_he ?? entry.team.name}</p>
                          {isLive && <InlineLiveBadge />}
                        </div>
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
                  <td className="py-3 pe-4 ps-2 text-center font-bold text-wc-fg1">{entry.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InlineLiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,92,130,0.12)] px-2 py-0.5 text-[10px] font-bold text-wc-danger">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-wc-danger opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-wc-danger" />
      </span>
      LIVE
    </span>
  );
}

function BestThirdHead() {
  return (
    <thead>
      <tr className="border-b border-white/8">
        <th className="py-3 pe-2 ps-4 text-start font-semibold text-wc-fg3">#</th>
        <th className="px-3 py-3 text-start font-semibold text-wc-fg3">{TEXT.team}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.group}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.played}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.points}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.goalDifference}</th>
        <th className="px-3 py-3 text-center font-semibold text-wc-fg3">{TEXT.goalsFor}</th>
        <th className="py-3 pe-4 ps-2 text-center font-semibold text-wc-fg3">{TEXT.status}</th>
      </tr>
    </thead>
  );
}

function BestThirdRow({
  entry,
  qualifiedThirdPlaceTeamIds,
  eliminatedThirdPlaceTeamIds,
}: {
  entry: TeamStanding;
  qualifiedThirdPlaceTeamIds: Set<string>;
  eliminatedThirdPlaceTeamIds: Set<string>;
}) {
  const statusDisplay = getBestThirdStatusDisplay(
    entry,
    qualifiedThirdPlaceTeamIds,
    eliminatedThirdPlaceTeamIds,
  );
  const effectiveStatus =
    qualifiedThirdPlaceTeamIds.has(entry.team.id)
      ? "qualified"
      : eliminatedThirdPlaceTeamIds.has(entry.team.id)
        ? "eliminated"
        : entry.status;
  const isBelowCutoff = entry.rank > 8;
  const rowAccentClassName = isBelowCutoff
    ? "bg-[linear-gradient(90deg,rgba(255,92,130,0.08),rgba(255,92,130,0.02))]"
    : "bg-[linear-gradient(90deg,rgba(95,255,123,0.06),rgba(95,255,123,0.01))]";
  const dividerClassName = entry.rank === 9 ? "border-t-2 border-t-[rgba(255,92,130,0.45)]" : "";
  const rankClassName = isBelowCutoff ? "text-wc-danger" : "text-wc-fg2";

  return (
    <tr
      className={`border-b border-white/6 last:border-0 ${dividerClassName} ${STATUS_META[effectiveStatus].rowClassName} ${rowAccentClassName}`}
    >
      <td className={`py-3 pe-2 ps-4 font-semibold ${rankClassName}`}>{entry.rank}</td>
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
      <td className="py-3 pe-4 ps-2 text-center">
        <StatusPill display={statusDisplay} />
      </td>
    </tr>
  );
}

function StatusPill({ display }: { display: StatusDisplay | null }) {
  if (!display) return null;

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 ${display.pillClassName}`}>
      {display.label}
    </span>
  );
}

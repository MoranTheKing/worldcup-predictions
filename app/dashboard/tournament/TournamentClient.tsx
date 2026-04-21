"use client";

import type { ResolvedBracketMatch, ResolvedSeed } from "@/lib/bracket/knockout";
import type { TeamStanding } from "@/lib/utils/standings";
import Image from "next/image";
import { useMemo, useState } from "react";

type Props = {
  groupStandings: Record<string, TeamStanding[]>;
  bestThirdStandings: TeamStanding[];
  teamsRemaining: number;
  bracket: ResolvedBracketMatch[];
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
  played: "מש",
  won: "נצ",
  drawn: "ת",
  lost: "הפ",
  goalsFor: "ז+",
  goalDifference: "הפרש",
  points: "נק׳",
  bestThirdTitle: "טבלת המקומות השלישיים",
  status: "סטטוס",
  round32: "32 האחרונות",
  round16: "16 האחרונות",
  quarterFinal: "רבע גמר",
  semiFinal: "חצי גמר",
  thirdPlace: "משחק המקום השלישי",
  final: "גמר",
  teams32: "32 נבחרות",
  rounds5: "5 סיבובים",
  rtlBracket: "Bracket RTL מלא",
  matchLabel: "משחק",
  liveBannerTitle: "טבלה בזמן אמת",
  liveBannerNote: "הניקוד מתעדכן בזמן אמת, ו-LIVE מופיע ליד הנבחרות שמשחקות כרגע.",
  summary:
    "הטבלאות מסודרות לפי חוקי ההכרעה הרשמיים של הטורניר, כולל head-to-head רק בין הקבוצות הקשורות לשוויון.",
  groupsNote:
    "בקבוצות מוצגים רק מקום סופי נעול, סימון LIVE בזמן אמת, וצבע ירוק או אדום לקבוצת מקום שלישי כשמצבה המתמטי נסגר.",
  thirdNote: "בטבלת המקומות השלישיים נשמרות תוויות הטקסט המפורשות של העפלה או הדחה.",
  cutoffNote: "קו החיתוך מסמן את המעבר בין 8 העולות ל-4 האחרונות.",
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
  if (entry.lockedRank !== null) {
    let pillClassName: string;
    if (entry.lockedRank <= 2) {
      pillClassName = QUALIFIED_PILL_CLASS;
    } else if (entry.lockedRank === 3) {
      pillClassName =
        entry.status === "qualified"
          ? QUALIFIED_PILL_CLASS
          : entry.status === "eliminated"
            ? ELIMINATED_PILL_CLASS
            : LOCKED_POSITION_PILL_CLASS;
    } else {
      pillClassName = ELIMINATED_PILL_CLASS;
    }
    return { label: getLockedPositionLabel(entry.lockedRank), pillClassName };
  }

  if (entry.rank === 3) {
    if (entry.status === "qualified") {
      return { label: getLockedPositionLabel(3), pillClassName: QUALIFIED_PILL_CLASS };
    }
    if (entry.status === "eliminated") {
      return { label: getLockedPositionLabel(3), pillClassName: ELIMINATED_PILL_CLASS };
    }
    return null;
  }

  if (entry.status === "qualified") {
    return { label: TEXT.qualified, pillClassName: QUALIFIED_PILL_CLASS };
  }

  if (entry.status === "eliminated") {
    return { label: TEXT.eliminated, pillClassName: ELIMINATED_PILL_CLASS };
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
  bracket,
  hasLive,
  liveTeamIds,
}: Props) {
  const [tab, setTab] = useState<Tab>("groups");
  const groupLetters = Object.keys(groupStandings).sort();
  const liveTeamIdSet = useMemo(() => new Set(liveTeamIds), [liveTeamIds]);

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

          <KnockoutBracket bracket={bracket} />
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

function KnockoutBracket({ bracket }: { bracket: ResolvedBracketMatch[] }) {
  const byRound = {
    round_of_32: bracket.filter((match) => match.round === "round_of_32"),
    round_of_16: bracket.filter((match) => match.round === "round_of_16"),
    quarter_final: bracket.filter((match) => match.round === "quarter_final"),
    semi_final: bracket.filter((match) => match.round === "semi_final"),
    third_place: bracket.filter((match) => match.round === "third_place"),
    final: bracket.filter((match) => match.round === "final"),
  };

  return (
    <div className="mt-6 overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4">
        <KnockoutColumn label={TEXT.round32} matches={byRound.round_of_32} matchHeight={110} />
        <KnockoutColumn label={TEXT.round16} matches={byRound.round_of_16} matchHeight={232} offsetTop={56} />
        <KnockoutColumn label={TEXT.quarterFinal} matches={byRound.quarter_final} matchHeight={474} offsetTop={176} />
        <KnockoutColumn label={TEXT.semiFinal} matches={byRound.semi_final} matchHeight={958} offsetTop={416} />
        <div className="flex w-56 shrink-0 flex-col">
          <p className="wc-display mb-3 text-center text-2xl text-wc-amber">{TEXT.final}</p>
          <div style={{ marginTop: "910px" }}>
            {byRound.final.map((match) => (
              <KnockoutMatchCard key={match.matchNumber} match={match} highlight />
            ))}
          </div>
          {byRound.third_place.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-center text-xs font-semibold text-wc-fg3">{TEXT.thirdPlace}</p>
              {byRound.third_place.map((match) => (
                <KnockoutMatchCard key={match.matchNumber} match={match} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KnockoutColumn({
  label,
  matches,
  matchHeight,
  offsetTop = 0,
}: {
  label: string;
  matches: ResolvedBracketMatch[];
  matchHeight: number;
  offsetTop?: number;
}) {
  return (
    <div className="flex w-56 shrink-0 flex-col">
      <p className="wc-display mb-3 text-center text-2xl text-wc-fg2">{label}</p>
      <div className="flex flex-col" style={{ gap: `${matchHeight - 104}px`, paddingTop: `${offsetTop}px` }}>
        {matches.map((match) => (
          <KnockoutMatchCard key={match.matchNumber} match={match} />
        ))}
      </div>
    </div>
  );
}

function KnockoutMatchCard({ match, highlight = false }: { match: ResolvedBracketMatch; highlight?: boolean }) {
  const isLive = match.liveMatch?.status === "live";
  const liveMatch = match.liveMatch;
  const isFinished = liveMatch?.status === "finished";

  const hasPenalties =
    isFinished &&
    liveMatch &&
    liveMatch.home_score === liveMatch.away_score &&
    liveMatch.home_penalty_score !== null &&
    liveMatch.home_penalty_score !== undefined &&
    liveMatch.away_penalty_score !== null &&
    liveMatch.away_penalty_score !== undefined;

  // null = undecided, true = home wins, false = away wins
  let homeWins: boolean | null = null;
  if (isFinished && liveMatch) {
    homeWins = hasPenalties
      ? (liveMatch.home_penalty_score ?? 0) > (liveMatch.away_penalty_score ?? 0)
      : (liveMatch.home_score ?? 0) > (liveMatch.away_score ?? 0);
  }

  return (
    <div className={`wc-bracket-card overflow-hidden text-[11px] leading-tight ${highlight ? "wc-bracket-final" : ""}`}>
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-bold ${
          highlight
            ? "bg-[linear-gradient(90deg,var(--wc-amber),#ffd580)] text-[color:var(--wc-text-inverse)]"
            : "bg-white/8 text-wc-fg3"
        }`}
      >
        <span>{`${TEXT.matchLabel} ${match.matchNumber}`}</span>
        <span className="inline-flex items-center gap-1">
          {liveMatch?.is_extra_time && !hasPenalties && (
            <span className={highlight ? "text-[color:var(--wc-text-inverse)]/70" : "text-wc-fg3"}>ET</span>
          )}
          {hasPenalties && (
            <span className={highlight ? "text-[color:var(--wc-text-inverse)]/70" : "text-wc-fg3"}>PEN</span>
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
        highlight={highlight}
        score={liveMatch?.home_score ?? null}
        penaltyScore={hasPenalties ? (liveMatch?.home_penalty_score ?? null) : null}
        isWinner={homeWins === true}
        isLoser={homeWins === false}
        divider
      />
      <SeedRow
        seed={match.away}
        highlight={highlight}
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
      <div className={`flex min-w-0 items-center gap-2 ${textClass}`}>
        {seed.kind === "team" && seed.team.logo_url ? (
          <Image src={seed.team.logo_url} alt={seed.team.name} width={16} height={11} className="rounded-sm object-cover" unoptimized />
        ) : (
          <div className="h-[11px] w-4 shrink-0 rounded-sm bg-white/10" />
        )}
        <span className="truncate">
          {seed.kind === "team" ? (seed.team.name_he ?? seed.team.name) : <span className="text-wc-fg3">{seed.labelHe}</span>}
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
}: {
  letter: string;
  standings: TeamStanding[];
  liveTeamIdSet: Set<string>;
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
              const isLive = liveTeamIdSet.has(entry.team.id);

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

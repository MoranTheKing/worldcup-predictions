"use client";

import { useDevLiveRefresh } from "@/lib/dev/live-refresh";
import FormationPitch, { type FormationPitchPlayer } from "@/components/football/FormationPitch";
import PlayerLink from "@/components/PlayerLink";
import TeamLink from "@/components/TeamLink";
import type {
  BzzoiroBroadcast,
  BzzoiroActualLineupPlayer,
  BzzoiroIncident,
  BzzoiroMatchCenter,
  BzzoiroMatchEvent,
  BzzoiroPredictedLineupPlayer,
  BzzoiroPredictedTeamLineup,
  BzzoiroShot,
  BzzoiroUnavailablePlayer,
} from "@/lib/bzzoiro/matches";
import { asArray } from "@/lib/utils/array";
import type { BzzoiroPlayerStatsRow } from "@/lib/bzzoiro/players";
import { normalizeTeamNameKey, translateTeamNameToHebrew } from "@/lib/i18n/team-names";
import { buildFootballFormation, normalizeFootballPosition } from "@/lib/football/formation";
import {
  formatMatchTimeLabel,
  getLiveMatchStatusLabel,
  getMatchScoreSummary,
  getStageLabelHe,
  getTeamDisplayLogo,
  getTeamDisplayName,
  isMatchScoreVisible,
  type MatchWithTeams,
} from "@/lib/tournament/matches";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type MatchDetailRow = MatchWithTeams;

export type MatchPagePlayer = {
  id: number | string;
  name: string;
  team_id: string | null;
  position: string | null;
  photo_url?: string | null;
  shirt_number?: number | null;
  top_scorer_odds?: number | string | null;
  bzzoiro_player_id?: string | number | null;
  goals?: number | null;
  assists?: number | null;
  appearances?: number | null;
  minutes_played?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
};

export type MatchDetailDevEvent = {
  id: string;
  match_number: number;
  team_id: string | null;
  player_id: number | string | null;
  related_player_id: number | string | null;
  event_type: "goal" | "yellow_card" | "red_card";
  minute: number | null;
  is_home: boolean | null;
};

type PlayerMatchEventSummary = {
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
};

type FormationLineupPlayer = MatchPagePlayer & FormationPitchPlayer & {
  id: MatchPagePlayer["id"] | string;
  ai_score?: number | null;
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MatchDetailClient({
  match,
  bzzoiro,
  players,
  devEvents,
}: {
  match: MatchDetailRow;
  bzzoiro: BzzoiroMatchCenter;
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  useDevLiveRefresh({ pollIntervalMs: 1500 });
  useMatchAutoRefresh(shouldAutoRefresh(match, bzzoiro), 15000);

  const event = bzzoiro.event;
  const scoreSummary = getBestScoreSummary(match, event);
  const homeName = getTeamDisplayName(match.homeTeam, match.home_placeholder);
  const awayName = getTeamDisplayName(match.awayTeam, match.away_placeholder);
  const homeLogo = getTeamDisplayLogo(match.homeTeam);
  const awayLogo = getTeamDisplayLogo(match.awayTeam);
  const isPreMatch = isPreMatchView(match, event);
  const isBsdPreview = isBsdPreviewMatch(match);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6" dir="rtl">
      <Link
        href="/dashboard/matches"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 transition hover:text-wc-fg1"
      >
        חזרה לכל המשחקים
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(95,255,123,0.12),rgba(111,60,255,0.22)_45%,rgba(8,14,29,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
        <div className="p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-wc-fg3">
            <span className="wc-badge">
              {getStageLabelHe(match.stage)}
              <span className="ms-2 font-mono">משחק {match.match_number}</span>
            </span>
            <span>{formatDateTime(match.date_time)}</span>
          </div>

          <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-6">
            <TeamBlock team={match.homeTeam} logo={homeLogo} name={homeName} />
            <div className="flex min-w-[7rem] flex-col items-center text-center">
              {scoreSummary ? (
                <ScoreSummaryHero
                  summary={scoreSummary}
                  className={`wc-display text-wc-fg1 ${scoreSummary.hasPenalties ? "text-3xl md:text-4xl" : "text-5xl md:text-6xl"}`}
                />
              ) : (
                <p className="wc-display text-4xl text-wc-fg3">VS</p>
              )}
              <p className="mt-3 inline-flex items-center justify-center rounded-full border border-wc-neon/25 bg-wc-neon/10 px-4 py-1.5 text-sm font-black text-wc-neon shadow-[0_0_24px_rgba(95,255,123,0.12)]">
                {getStatusLabel(match, event)}
              </p>
              {shouldPreferLocalScore(match, event) ? (
                <p className="mt-2 rounded-full border border-wc-neon/25 bg-wc-neon/10 px-3 py-1 text-[11px] font-black text-wc-neon">
                  תוצאת סימולציה מקומית
                </p>
              ) : null}
            </div>
            <TeamBlock team={match.awayTeam} logo={awayLogo} name={awayName} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <InfoTile label="פתיחה" value={`${formatMatchTimeLabel(match.date_time)} IDT`} />
            <InfoTile label="סטטוס API" value={getApiStatusText(event, bzzoiro.source)} />
            <VenueTile event={event} disableLink={isBsdPreview} />
            <InfoTile label="שופט" value={formatReferee(event)} />
          </div>
        </div>
      </section>

      {bzzoiro.source === "api" && event ? (
        <>
          {isPreMatch ? (
            <>
              <MatchContextPanel event={event} match={match} />
              <BroadcastPanel broadcasts={bzzoiro.broadcasts} />
            </>
          ) : null}
          <TimelinePanel event={event} match={match} players={players} devEvents={devEvents} />
          <LiveStatsPanel
            event={event}
            match={match}
            devEvents={devEvents}
            showOdds={isPreMatch}
          />
          <LineupsPanel
            event={event}
            predictedLineup={bzzoiro.predictedLineup}
            match={match}
            players={players}
            devEvents={devEvents}
          />
          <PlayerStatsPanel rows={bzzoiro.playerStats} match={match} players={players} />
          <MomentumAndShotsPanel event={event} match={match} players={players} />
        </>
      ) : (
        <LocalFallbackMatchCenter
          match={match}
          source={bzzoiro.source}
          players={players}
          devEvents={devEvents}
        />
      )}
    </div>
  );
}

function useMatchAutoRefresh(enabled: boolean, intervalMs: number) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs, router]);
}

function shouldAutoRefresh(match: MatchDetailRow, bzzoiro: BzzoiroMatchCenter) {
  if (match.status === "live") return true;
  const status = String(bzzoiro.event?.status ?? "").toLowerCase();
  return status.includes("progress") || status.includes("half") || status === "live";
}

function ScoreSummaryHero({
  summary,
  className,
}: {
  summary: NonNullable<ReturnType<typeof getMatchScoreSummary>>;
  className: string;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`} dir="ltr">
      <span>{summary.awayScore}</span>
      <span>-</span>
      <span>{summary.homeScore}</span>
      {summary.hasPenalties && summary.homePenaltyScore !== null && summary.awayPenaltyScore !== null ? (
        <span className="text-xl text-wc-fg3">
          ({summary.awayPenaltyScore}-{summary.homePenaltyScore} PEN)
        </span>
      ) : summary.statusSuffix ? (
        <span className="text-xl text-wc-fg3">{summary.statusSuffix}</span>
      ) : null}
    </div>
  );
}

function TeamBlock({
  team,
  logo,
  name,
}: {
  team: MatchDetailRow["homeTeam"];
  logo: string | null;
  name: string;
}) {
  const content = (
    <>
      {logo ? (
        <Image
          src={logo}
          alt={name}
          width={82}
          height={56}
          className="rounded-md object-cover"
          style={{ height: 56, width: 82 }}
          unoptimized
        />
      ) : (
        <div className="h-14 w-[82px] rounded-md bg-white/10" />
      )}
      <p className="text-center text-sm font-black text-wc-fg1 md:text-lg">{name}</p>
    </>
  );
  const className = "flex min-w-0 flex-col items-center gap-3 rounded-2xl p-2 transition hover:bg-white/5";

  if (team && !String(team.id).startsWith("bsd-preview-")) {
    return (
      <TeamLink team={team} className={className}>
        {content}
      </TeamLink>
    );
  }

  return <div className={className}>{content}</div>;
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">{label}</p>
      <p className="mt-2 truncate text-sm font-black text-wc-fg1">{value}</p>
    </div>
  );
}

function VenueTile({
  event,
  disableLink = false,
}: {
  event: BzzoiroMatchEvent | null;
  disableLink?: boolean;
}) {
  const venue = event?.venue;
  const content = (
    <div className="min-w-0 rounded-[1.15rem] border border-white/10 bg-black/18 p-3 text-center transition hover:border-wc-neon/35 hover:bg-white/[0.055]">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wc-fg3">אצטדיון</p>
      <p className="mt-2 truncate text-sm font-black text-wc-fg1">{formatVenue(event)}</p>
      {venue?.capacity ? (
        <p className="mt-1 text-[10px] font-bold text-wc-fg3">{venue.capacity.toLocaleString("he-IL")} מקומות</p>
      ) : null}
    </div>
  );

  return venue?.id && !disableLink ? (
    <Link href={`/dashboard/stadiums/${encodeURIComponent(String(venue.id))}`} className="block min-w-0">
      {content}
    </Link>
  ) : (
    content
  );
}

function LocalFallbackMatchCenter({
  match,
  source,
  players,
  devEvents,
}: {
  match: MatchDetailRow;
  source: BzzoiroMatchCenter["source"];
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  return (
    <>
      <section className="mt-5 rounded-[1.75rem] border border-[rgba(95,255,123,0.18)] bg-[linear-gradient(135deg,rgba(95,255,123,0.07),rgba(111,60,255,0.1),rgba(255,255,255,0.025))] p-4 md:p-5">
        <SectionHeader title="מרכז משחק מקומי" eyebrow="סימולציה" />
        <p className="mt-2 max-w-3xl text-sm leading-7 text-wc-fg2">
          {getBzzoiroEmptyDescription(source)} עד ש-BSD יחבר את האירוע הרשמי, העמוד מציג את תוצאת הסימולציה, xG מקומי, אירועים והרכב משוער מתוך הדאטה המקומי.
        </p>
      </section>
      <LiveStatsPanel event={null} match={match} devEvents={devEvents} />
      <LocalLineupsPanel match={match} players={players} devEvents={devEvents} />
      <LocalTimelinePanel match={match} players={players} devEvents={devEvents} />
    </>
  );
}

function LiveStatsPanel({
  event,
  match,
  devEvents,
  showOdds = true,
}: {
  event: BzzoiroMatchEvent | null;
  match: MatchDetailRow;
  devEvents: MatchDetailDevEvent[];
  showOdds?: boolean;
}) {
  const pairs = getLiveStatPairs(event, match, devEvents);

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="מצב משחק" eyebrow={event ? "BSD live/full" : "סימולציה מקומית"} />
      {pairs.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-black/14">
          {pairs.map((pair) => (
            <StatCompareRow key={pair.label} pair={pair} />
          ))}
        </div>
      ) : (
        <EmptyState text={event ? "הסטטיסטיקות החיות יופיעו כאן כש־BSD יחזיר live_stats או xG למשחק." : "תוצאה מקומית או אירועי Dev יופיעו כאן אחרי סימולציה."} />
      )}
      {event && showOdds ? <OddsStrip event={event} match={match} /> : null}
    </section>
  );
}

function MatchContextPanel({ event, match }: { event: BzzoiroMatchEvent; match: MatchDetailRow }) {
  const homeForm = event.home_form ?? null;
  const awayForm = event.away_form ?? null;
  const headToHead = event.head_to_head ?? null;
  const hasContext = Boolean(homeForm || awayForm || headToHead || event.home_coach || event.away_coach);

  if (!hasContext) return null;

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="תמונת פתיחה" eyebrow="API preview" />
      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <FormCard
          title={getTeamDisplayName(match.homeTeam, match.home_placeholder)}
          form={homeForm}
          coach={event.home_coach?.name}
        />
        <HeadToHeadCard headToHead={headToHead} />
        <FormCard
          title={getTeamDisplayName(match.awayTeam, match.away_placeholder)}
          form={awayForm}
          coach={event.away_coach?.name}
        />
      </div>
    </section>
  );
}

function FormCard({
  title,
  form,
  coach,
}: {
  title: string;
  form: Record<string, unknown> | null;
  coach?: string | null;
}) {
  const formString = readRecordString(form, "form_string");
  const matchesPlayed = readRecordOptionalNumber(form, "matches_played");
  const goalsFor = readRecordOptionalNumber(form, "goals_scored_last_n");
  const goalsAgainst = readRecordOptionalNumber(form, "goals_conceded_last_n");

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4">
      <div className="min-w-0 text-center">
        <p className="truncate text-sm font-black text-wc-fg1">{title}</p>
        <p className="mt-1 truncate text-xs font-bold text-wc-fg3">{coach ? `מאמן: ${coach}` : "מאמן לא זמין"}</p>
      </div>
      <FormSequence value={formString} />
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <MiniMetric label="משחקים אחרונים" value={matchesPlayed ?? "-"} />
        <MiniMetricPair
          title="שערים"
          firstLabel="בעד"
          firstValue={goalsFor ?? 0}
          secondLabel="נגד"
          secondValue={goalsAgainst ?? 0}
          empty={goalsFor === null && goalsAgainst === null}
        />
      </div>
    </div>
  );
}

function HeadToHeadCard({ headToHead }: { headToHead: Record<string, unknown> | null }) {
  const total = readRecordOptionalNumber(headToHead, "total_matches");
  const avgGoals = readRecordOptionalNumber(headToHead, "avg_total_goals");

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">ראש בראש</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniMetric label="בית" value={readRecordNumber(headToHead, "home_wins")} />
        <MiniMetric label="תיקו" value={readRecordNumber(headToHead, "draws")} />
        <MiniMetric label="חוץ" value={readRecordNumber(headToHead, "away_wins")} />
      </div>
      <p className="mt-3 text-xs font-bold text-wc-fg3">
        {total ?? 0} משחקים · {formatDecimal(avgGoals)} שערים בממוצע
      </p>
    </div>
  );
}

function FormSequence({ value }: { value: string }) {
  const letters = value
    .split("")
    .map((letter) => letter.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 6);

  if (letters.length === 0) {
    return <p className="mt-4 text-center text-xs font-bold text-wc-fg3">אין רצף כושר זמין מ-BSD</p>;
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-1.5" dir="ltr">
      {letters.map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-black ${getFormLetterClass(letter)}`}
          title={formatFormLetter(letter)}
        >
          {letter}
        </span>
      ))}
    </div>
  );
}

function getFormLetterClass(letter: string) {
  if (letter === "W") return "bg-wc-neon text-wc-bg";
  if (letter === "D") return "bg-wc-amber text-wc-bg";
  if (letter === "L") return "bg-wc-danger text-white";
  return "bg-white/10 text-wc-fg2";
}

function formatFormLetter(letter: string) {
  if (letter === "W") return "ניצחון";
  if (letter === "D") return "תיקו";
  if (letter === "L") return "הפסד";
  return letter;
}

function BroadcastPanel({ broadcasts }: { broadcasts: BzzoiroBroadcast[] }) {
  const visible = broadcasts
    .filter((broadcast) => broadcast.channel_name)
    .slice(0, 6);

  if (visible.length === 0) return null;

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="שידורים רשמיים" eyebrow="BSD broadcasts" />
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((broadcast, index) => (
          <BroadcastCard key={`${broadcast.channel_id ?? broadcast.channel_name}-${index}`} broadcast={broadcast} />
        ))}
      </div>
    </section>
  );
}

function BroadcastCard({ broadcast }: { broadcast: BzzoiroBroadcast }) {
  const content = (
    <div className="rounded-[1rem] border border-white/10 bg-black/14 p-3 transition hover:border-wc-neon/35 hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-wc-fg1">{broadcast.channel_name}</p>
          <p className="mt-1 text-xs font-bold text-wc-fg3">{broadcast.country_code ?? "Global"}</p>
        </div>
        <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-black text-wc-fg2">
          {formatShortTime(broadcast.scheduled_start_time)}
        </span>
      </div>
    </div>
  );

  return broadcast.channel_link ? (
    <a href={broadcast.channel_link} target="_blank" rel="noreferrer" className="block">
      {content}
    </a>
  ) : (
    content
  );
}

function StatCompareRow({ pair }: { pair: StatPair }) {
  const homeNumber = readOptionalNumber(pair.home);
  const awayNumber = readOptionalNumber(pair.away);
  const total = (homeNumber ?? 0) + (awayNumber ?? 0);
  const homePercent = total > 0 ? `${Math.max(8, ((homeNumber ?? 0) / total) * 100)}%` : "50%";
  const awayPercent = total > 0 ? `${Math.max(8, ((awayNumber ?? 0) / total) * 100)}%` : "50%";

  return (
    <div className="border-b border-white/8 px-3 py-3 last:border-b-0">
      <div className="grid grid-cols-[4rem_minmax(0,1fr)_4rem] items-center gap-3 text-center">
        <span className="truncate font-sans text-xl font-black tracking-normal text-wc-fg1" dir="ltr">{pair.home}</span>
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-wc-fg3">{pair.label}</span>
        <span className="truncate font-sans text-xl font-black tracking-normal text-wc-fg1" dir="ltr">{pair.away}</span>
      </div>
      {homeNumber !== null || awayNumber !== null ? (
        <div className="mt-2 grid grid-cols-2 gap-1" dir="rtl">
          <div className="flex justify-end">
            <span className="h-1.5 rounded-full bg-wc-violet/75" style={{ width: homePercent }} />
          </div>
          <div className="flex justify-start">
            <span className="h-1.5 rounded-full bg-wc-neon/70" style={{ width: awayPercent }} />
          </div>
        </div>
      ) : null}
      <div className="mt-1 flex justify-between text-[10px] font-bold text-wc-fg3">
        <span>בית</span>
        <span>חוץ</span>
      </div>
    </div>
  );
}

function OddsStrip({ event, match }: { event: BzzoiroMatchEvent; match: MatchDetailRow }) {
  const odds = [
    { label: "1", value: normalizeOdds(event.odds_home ?? event.home_odds ?? match.home_odds) },
    { label: "X", value: normalizeOdds(event.odds_draw ?? event.draw_odds ?? match.draw_odds) },
    { label: "2", value: normalizeOdds(event.odds_away ?? event.away_odds ?? match.away_odds) },
  ];

  if (odds.every((item) => item.value === null)) return null;

  return (
    <div className="mt-4 grid gap-2 rounded-[1.25rem] border border-white/10 bg-black/14 p-3 sm:grid-cols-3">
      {odds.map((item) => (
        <div key={item.label} className="grid grid-cols-[2rem_1fr] items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-2 text-center">
          <span className="text-xs font-black text-wc-fg3">{item.label}</span>
          <span className="font-sans text-lg font-black tracking-normal text-wc-fg1" dir="ltr">
            {item.value ?? "-"}
          </span>
        </div>
      ))}
    </div>
  );
}

function LineupsPanel({
  event,
  predictedLineup,
  match,
  players,
  devEvents,
}: {
  event: BzzoiroMatchEvent;
  predictedLineup: BzzoiroMatchCenter["predictedLineup"];
  match: MatchDetailRow;
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  const actualLineups = asArray<BzzoiroActualLineupPlayer>(event.lineups);
  const actualHome = actualLineups.filter((player) => player.is_home === true);
  const actualAway = actualLineups.filter((player) => player.is_home === false);
  const hasActualLineups = actualHome.length > 0 || actualAway.length > 0;
  const homePredicted = predictedLineup?.lineups?.home ?? null;
  const awayPredicted = predictedLineup?.lineups?.away ?? null;
  const hasPredicted = Boolean(homePredicted || awayPredicted);
  const eventSummaryByPlayerId = buildPlayerEventSummaryMap(devEvents, event);
  const hasStarted = !isPreMatchView(match, event);
  const lineupEyebrow = hasActualLineups
    ? "הרכב רשמי"
    : hasPredicted
      ? hasStarted
        ? "מבנה זמני מ-BSD"
        : "הרכב משוער"
      : hasStarted
        ? "ממתין להרכב הרשמי"
        : "ממתין ל-BSD";
  const lineupSourceLabel = hasStarted ? "מבנה זמני מ-BSD" : "הרכב משוער";

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="הרכבים וסגלים למשחק" eyebrow={lineupEyebrow} />
      {hasActualLineups ? (
        <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-2">
          <ActualLineupSide
            title={getTeamDisplayName(match.homeTeam, match.home_placeholder)}
            teamId={match.home_team_id}
            players={players}
            lineupPlayers={actualHome}
            formationName={event.home_coach?.preferred_formation}
            eventSummaryByPlayerId={eventSummaryByPlayerId}
          />
          <ActualLineupSide
            title={getTeamDisplayName(match.awayTeam, match.away_placeholder)}
            teamId={match.away_team_id}
            players={players}
            lineupPlayers={actualAway}
            formationName={event.away_coach?.preferred_formation}
            eventSummaryByPlayerId={eventSummaryByPlayerId}
          />
        </div>
      ) : hasPredicted ? (
        <div className="mt-4 grid items-stretch gap-4 2xl:grid-cols-2">
          <PredictedLineupSide
            title={getTeamDisplayName(match.homeTeam, match.home_placeholder)}
            teamId={match.home_team_id}
            players={players}
            lineup={homePredicted}
            eventUnavailable={event.unavailable_players?.home ?? []}
            coachFormation={event.home_coach?.preferred_formation}
            eventSummaryByPlayerId={eventSummaryByPlayerId}
            sourceLabel={lineupSourceLabel}
            hasStarted={hasStarted}
          />
          <PredictedLineupSide
            title={getTeamDisplayName(match.awayTeam, match.away_placeholder)}
            teamId={match.away_team_id}
            players={players}
            lineup={awayPredicted}
            eventUnavailable={event.unavailable_players?.away ?? []}
            coachFormation={event.away_coach?.preferred_formation}
            eventSummaryByPlayerId={eventSummaryByPlayerId}
            sourceLabel={lineupSourceLabel}
            hasStarted={hasStarted}
          />
        </div>
      ) : (
        players.length > 0 ? (
          <LocalSquadPreview match={match} event={event} players={players} eventSummaryByPlayerId={eventSummaryByPlayerId} />
        ) : (
          <EmptyState text={hasStarted ? "ממתין להרכב הרשמי מ-BSD. ברגע שהוא יגיע, הפותחים והספסל יתעדכנו כאן אוטומטית." : "כש־BSD יחזיר predicted-lineup או lineups בפועל, יוצגו כאן פותחים, ספסל וחסרים."} />
        )
      )}
    </section>
  );
}

function LocalLineupsPanel({
  match,
  players,
  devEvents,
}: {
  match: MatchDetailRow;
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  const eventSummaryByPlayerId = buildPlayerEventSummaryMap(devEvents);

  if (players.length === 0) {
    return (
      <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
        <SectionHeader title="הרכבים וסגלים למשחק" eyebrow="סימולציה מקומית" />
        <EmptyState text="ברגע שיהיו שחקנים מחוברים לנבחרות המשחק, יוצג כאן הרכב משוער לסימולציה." />
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="הרכבים וסגלים למשחק" eyebrow="סימולציה מקומית" />
      <div className="mt-4 grid gap-4 2xl:grid-cols-2">
        <SquadPreviewSide
          title={getTeamDisplayName(match.homeTeam, match.home_placeholder)}
          players={getPreviewPlayers(players, match.home_team_id)}
          formationName="4-3-3"
          eventSummaryByPlayerId={eventSummaryByPlayerId}
        />
        <SquadPreviewSide
          title={getTeamDisplayName(match.awayTeam, match.away_placeholder)}
          players={getPreviewPlayers(players, match.away_team_id)}
          formationName="4-3-3"
          eventSummaryByPlayerId={eventSummaryByPlayerId}
        />
      </div>
    </section>
  );
}

function LocalSquadPreview({
  match,
  event,
  players,
  eventSummaryByPlayerId,
}: {
  match: MatchDetailRow;
  event: BzzoiroMatchEvent;
  players: MatchPagePlayer[];
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>;
}) {
  const homePlayers = getPreviewPlayers(players, match.home_team_id);
  const awayPlayers = getPreviewPlayers(players, match.away_team_id);

  return (
    <div className="mt-4 grid gap-4 2xl:grid-cols-2">
      <SquadPreviewSide
        title={getTeamDisplayName(match.homeTeam, match.home_placeholder)}
        players={homePlayers}
        formationName={event.home_coach?.preferred_formation}
        eventSummaryByPlayerId={eventSummaryByPlayerId}
      />
      <SquadPreviewSide
        title={getTeamDisplayName(match.awayTeam, match.away_placeholder)}
        players={awayPlayers}
        formationName={event.away_coach?.preferred_formation}
        eventSummaryByPlayerId={eventSummaryByPlayerId}
      />
    </div>
  );
}

function SquadPreviewSide({
  title,
  players,
  formationName,
  eventSummaryByPlayerId,
}: {
  title: string;
  players: MatchPagePlayer[];
  formationName?: string | null;
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>;
}) {
  const formation = formationName ?? "4-3-3";
  const formationPlayers = players.map((player) => toFormationPlayer(player, eventSummaryByPlayerId));
  const lines = buildFootballFormation(formationPlayers, formation);
  const projectedCount = lines.reduce((sum, line) => sum + line.players.length, 0);
  const starterIds = new Set(lines.flatMap((line) => line.players.map((player) => String(player.id))));
  const benchPlayers = formationPlayers
    .filter((player) => !starterIds.has(String(player.id)))
    .sort(compareBenchEventPriority)
    .slice(0, 12);

  if (formationPlayers.length === 0) {
    return <EmptyLocalSquadPreview title={title} formation={formation} />;
  }

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-wc-fg3">
            מבנה זמני עד לפרסום ההרכב הרשמי ב-BSD.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-full border border-wc-neon/20 bg-wc-neon/10 px-3 py-1 text-xs font-black text-wc-neon" dir="ltr">
            {formation}
          </span>
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-wc-fg3">
            {projectedCount} בהרכב
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-4">
        <FormationPitch lines={lines} formationName={formation} source="מבוסס סגל מקומי" compact />
        <CompactBenchPreview
          players={benchPlayers}
          allPlayers={players}
          eventSummaryByPlayerId={eventSummaryByPlayerId}
        />
      </div>
    </div>
  );
}

function EmptyLocalSquadPreview({ title, formation }: { title: string; formation: string }) {
  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.052),rgba(255,255,255,0.018))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-wc-fg3">
            הסגל עדיין לא זמין למשחק הזה.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-wc-fg2" dir="ltr">
          {formation}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-dashed border-white/12 bg-[radial-gradient(circle_at_50%_0%,rgba(95,255,123,0.09),transparent_35%),linear-gradient(180deg,rgba(16,83,54,0.16),rgba(5,8,18,0.72))] p-4">
        <div className="relative min-h-[18rem] rounded-[1.1rem] border border-white/10 bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:4rem_4rem]">
          <div className="absolute inset-x-[22%] top-1/2 h-16 -translate-y-1/2 rounded-full border border-white/10" />
          <div className="absolute inset-x-[33%] top-3 h-14 rounded-b-[2rem] border-x border-b border-white/10" />
          <div className="absolute inset-x-[33%] bottom-3 h-14 rounded-t-[2rem] border-x border-t border-white/10" />
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-[19rem] rounded-2xl border border-white/10 bg-black/26 px-5 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur">
              <p className="text-sm font-black text-wc-fg1">ממתין לסגל</p>
              <p className="mt-2 text-xs leading-6 text-wc-fg3">
                כשה־API או הסנכרון המקומי יחזירו שחקנים, יוצגו כאן הרכב, ספסל ואירועי שחקנים.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactBenchPreview({
  players,
  allPlayers,
  eventSummaryByPlayerId,
}: {
  players: FormationLineupPlayer[];
  allPlayers: MatchPagePlayer[];
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>;
}) {
  const visiblePlayers = players.slice(0, 8);
  const hiddenCount = Math.max(0, players.length - visiblePlayers.length);

  return (
    <div className="rounded-[1.15rem] border border-white/10 bg-black/18 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-wc-fg2">ספסל משוער</p>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold text-wc-fg3">
          {players.length} שחקנים
        </span>
      </div>
      {visiblePlayers.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visiblePlayers.map((player) => (
            <LineupPlayerRow
              key={player.id}
              name={player.name}
              position={player.position}
              number={player.shirt_number}
              teamId={player.team_id}
              players={allPlayers}
              eventSummary={eventSummaryByPlayerId.get(String(player.id))}
            />
          ))}
          {hiddenCount > 0 ? (
            <div className="grid min-h-[3.5rem] place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.035] px-3 py-2 text-center text-xs font-black text-wc-fg3">
              ועוד {hiddenCount} בסגל
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.035] px-3 py-3 text-center text-xs leading-6 text-wc-fg3">
          אין עדיין שחקני ספסל זמינים.
        </div>
      )}
    </div>
  );
}

function ActualLineupSide({
  title,
  teamId,
  players,
  lineupPlayers,
  formationName,
  eventSummaryByPlayerId,
}: {
  title: string;
  teamId: string | null;
  players: MatchPagePlayer[];
  lineupPlayers: Array<{ player_name?: string | null; player?: string | null; position?: string | null; number?: number | string | null; jersey_number?: number | string | null }>;
  formationName?: string | null;
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>;
}) {
  const lineup = lineupPlayers.map((player, index) => mapApiLineupPlayer(player, players, teamId, index, eventSummaryByPlayerId));
  const lines = buildFootballFormation(lineup, formationName ?? "4-3-3", lineup);

  return (
    <div className="flex h-full flex-col rounded-[1.35rem] border border-white/10 bg-black/14 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-wc-fg3">
          {lineupPlayers.length} שחקנים
        </span>
      </div>
      <FormationPitch lines={lines} formationName={formationName} source="הרכב רשמי" />
    </div>
  );
}

function PredictedLineupSide({
  title,
  teamId,
  players,
  lineup,
  eventUnavailable,
  coachFormation,
  eventSummaryByPlayerId,
  sourceLabel,
  hasStarted,
}: {
  title: string;
  teamId: string | null;
  players: MatchPagePlayer[];
  lineup: BzzoiroPredictedTeamLineup | null;
  eventUnavailable: BzzoiroUnavailablePlayer[];
  coachFormation?: string | null;
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>;
  sourceLabel: string;
  hasStarted: boolean;
}) {
  const starters = (lineup?.starters ?? []).filter((player) => player.name);
  const substitutes = (lineup?.substitutes ?? []).filter((player) => player.name);
  const unavailable = [...(lineup?.unavailable ?? []), ...eventUnavailable].filter((player) => player.name);
  const formationName = lineup?.predicted_formation ?? coachFormation ?? "4-3-3";
  const pitchPlayers = mapPredictedStarters(starters, players, teamId, eventSummaryByPlayerId);
  const lines = buildFootballFormation(pitchPlayers, formationName, pitchPlayers);
  const substitutesTitle = hasStarted ? "שחקנים נוספים מהמודל" : "ספסל משוער";
  const substitutesEmpty = hasStarted ? "אין עדיין שחקנים נוספים מהמודל" : "אין עדיין ספסל משוער";

  return (
    <div className="flex h-full flex-col rounded-[1.35rem] border border-white/10 bg-black/14 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-sans text-lg font-black tracking-normal text-wc-fg1">{title}</h3>
        <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-black text-wc-fg3" dir="ltr">
          {formationName}
        </span>
      </div>
      <div className="mt-4 grid flex-1 content-start gap-4">
        {pitchPlayers.length > 0 ? (
          <FormationPitch lines={lines} formationName={formationName} source={sourceLabel} />
        ) : (
          <div>
            <EmptyMini text="אין עדיין פותחים" />
          </div>
        )}
        <LineupGroup className="" title={substitutesTitle} empty={substitutesEmpty} count={substitutes.length}>
          {substitutes.slice(0, 12).map((player, index) => (
            <LineupPlayerRow
              key={`${player.name}-${index}`}
              name={player.name ?? "-"}
              position={player.position}
              number={player.jersey_number}
              teamId={teamId}
              players={players}
              eventSummary={getEventSummaryForLineupName(player.name, players, teamId, eventSummaryByPlayerId)}
            />
          ))}
        </LineupGroup>
      </div>
      <UnavailableList players={unavailable} />
    </div>
  );
}

function mapApiLineupPlayer(
  player: { player_name?: string | null; player?: string | null; position?: string | null; number?: number | string | null; jersey_number?: number | string | null },
  players: MatchPagePlayer[],
  teamId: string | null,
  index: number,
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>,
): FormationLineupPlayer {
  const name = readApiPlayerName(player);
  const localPlayer = findLocalPlayer(name, players, teamId);
  const shirtNumber = readOptionalNumber(player.number ?? player.jersey_number);

  return applyEventSummary({
    ...toFormationPlayer(localPlayer ?? {
      id: `api-lineup-${index}-${name}`,
      name,
      team_id: teamId,
      position: normalizeFootballPosition(player.position),
      photo_url: null,
      shirt_number: shirtNumber,
      top_scorer_odds: null,
      bzzoiro_player_id: null,
    }),
    isLocal: Boolean(localPlayer),
    position: localPlayer?.position ?? normalizeFootballPosition(player.position),
    shirt_number: localPlayer?.shirt_number ?? shirtNumber,
  }, eventSummaryByPlayerId);
}

function mapPredictedStarters(
  starters: BzzoiroPredictedLineupPlayer[],
  players: MatchPagePlayer[],
  teamId: string | null,
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>,
) {
  return starters.map((starter, index): FormationLineupPlayer => {
    const name = starter.name ?? "שחקן";
    const localPlayer = findLocalPlayer(name, players, teamId);

    return applyEventSummary({
      ...toFormationPlayer(localPlayer ?? {
        id: `api-predicted-${index}-${name}`,
        name,
        team_id: teamId,
        position: normalizeFootballPosition(starter.position),
        photo_url: null,
        shirt_number: starter.jersey_number ?? null,
        top_scorer_odds: null,
        bzzoiro_player_id: null,
      }),
      ai_score: starter.ai_score,
      isLocal: Boolean(localPlayer),
      position: localPlayer?.position ?? normalizeFootballPosition(starter.position),
      shirt_number: localPlayer?.shirt_number ?? starter.jersey_number ?? null,
    }, eventSummaryByPlayerId);
  });
}

function toFormationPlayer(
  player: MatchPagePlayer,
  eventSummaryByPlayerId?: Map<string, PlayerMatchEventSummary>,
): FormationLineupPlayer {
  return applyEventSummary({
    ...player,
    isLocal: true,
  }, eventSummaryByPlayerId);
}

function buildPlayerEventSummaryMap(events: MatchDetailDevEvent[], apiEvent?: BzzoiroMatchEvent | null) {
  const summaries = new Map<string, PlayerMatchEventSummary>();

  for (const event of events) {
    if (event.player_id !== null && event.player_id !== undefined) {
      const summary = getOrCreatePlayerEventSummary(summaries, event.player_id);
      if (event.event_type === "goal") summary.goals += 1;
      if (event.event_type === "yellow_card") summary.yellowCards += 1;
      if (event.event_type === "red_card") summary.redCards += 1;
    }

    if (event.event_type === "goal" && event.related_player_id !== null && event.related_player_id !== undefined) {
      getOrCreatePlayerEventSummary(summaries, event.related_player_id).assists += 1;
    }
  }

  for (const incident of asArray(apiEvent?.incidents)) {
    const type = String(incident.type ?? "").toLowerCase();
    const cardType = String(incident.card_type ?? "").toLowerCase();
    const playerName = incident.player_name ?? incident.player ?? incident.player_out ?? incident.player_in ?? null;
    const playerSummary = playerName ? getOrCreatePlayerNameEventSummary(summaries, playerName) : null;

    if (playerSummary && type.includes("goal")) {
      playerSummary.goals += 1;
    } else if (playerSummary && type.includes("card") && cardType.includes("red")) {
      playerSummary.redCards += 1;
    } else if (playerSummary && type.includes("card")) {
      playerSummary.yellowCards += 1;
    }

    const assistName = incident.assist ?? incident.assist_player ?? null;
    if (type.includes("goal") && assistName) {
      getOrCreatePlayerNameEventSummary(summaries, assistName).assists += 1;
    }
  }

  return summaries;
}

function getOrCreatePlayerEventSummary(
  summaries: Map<string, PlayerMatchEventSummary>,
  playerId: number | string,
) {
  const key = String(playerId);
  const existing = summaries.get(key);
  if (existing) return existing;

  const summary = { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
  summaries.set(key, summary);
  return summary;
}

function getOrCreatePlayerNameEventSummary(
  summaries: Map<string, PlayerMatchEventSummary>,
  playerName: string,
) {
  const keys = getPlayerNameSummaryKeys(playerName);
  const existing = keys
    .map((key) => summaries.get(key))
    .find((summary): summary is PlayerMatchEventSummary => Boolean(summary));
  const summary = existing ?? { goals: 0, assists: 0, yellowCards: 0, redCards: 0 };

  for (const key of keys) {
    summaries.set(key, summary);
  }

  return summary;
}

function getPlayerEventSummaryByName(
  summaries: Map<string, PlayerMatchEventSummary> | undefined,
  playerName: string | null | undefined,
) {
  if (!summaries) return null;

  for (const key of getPlayerNameSummaryKeys(playerName)) {
    const summary = summaries.get(key);
    if (summary) return summary;
  }

  return null;
}

function getPlayerNameSummaryKeys(playerName: string | null | undefined) {
  const normalized = normalizePlayerName(playerName);
  if (!normalized) return [];

  const parts = String(playerName ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9א-ת]+/i)
    .filter(Boolean);
  const lastName = normalizePlayerName(parts.at(-1));
  const keys = [`name:${normalized}`];

  if (lastName && lastName !== normalized) {
    keys.push(`last:${lastName}`);
  }

  return keys;
}

function applyEventSummary<T extends FormationPitchPlayer>(
  player: T,
  eventSummaryByPlayerId?: Map<string, PlayerMatchEventSummary>,
): T {
  const summary =
    eventSummaryByPlayerId?.get(String(player.id)) ??
    getPlayerEventSummaryByName(eventSummaryByPlayerId, player.name);
  if (!summary || !hasEventSummary(summary)) return player;

  return {
    ...player,
    match_goals: summary.goals,
    match_assists: summary.assists,
    match_yellow_cards: summary.yellowCards,
    match_red_cards: summary.redCards,
  };
}

function getEventSummaryForLineupName(
  name: string | null | undefined,
  players: MatchPagePlayer[],
  teamId: string | null,
  eventSummaryByPlayerId: Map<string, PlayerMatchEventSummary>,
) {
  const localPlayer = findLocalPlayer(name, players, teamId);
  return (localPlayer ? eventSummaryByPlayerId.get(String(localPlayer.id)) : null) ??
    getPlayerEventSummaryByName(eventSummaryByPlayerId, name) ??
    null;
}

function hasEventSummary(summary: PlayerMatchEventSummary | null | undefined): summary is PlayerMatchEventSummary {
  return Boolean(summary && (summary.goals > 0 || summary.assists > 0 || summary.yellowCards > 0 || summary.redCards > 0));
}

function LineupGroup({
  title,
  empty,
  count,
  children,
  className = "mt-4",
}: {
  title: string;
  empty: string;
  count: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-wc-fg2">{title}</p>
        <span className="text-[11px] font-bold text-wc-fg3">{count}</span>
      </div>
      {count > 0 ? <div className="grid gap-2">{children}</div> : <EmptyMini text={empty} />}
    </div>
  );
}

function LineupPlayerRow({
  name,
  position,
  number,
  teamId,
  players,
  eventSummary,
}: {
  name: string;
  position?: string | null;
  number?: number | string | null;
  teamId: string | null;
  players: MatchPagePlayer[];
  eventSummary?: PlayerMatchEventSummary | null;
}) {
  const localPlayer = findLocalPlayer(name, players, teamId);
  const content = (
    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-2 transition hover:bg-white/[0.075]">
      <LineupPlayerAvatar
        name={localPlayer?.name ?? name}
        photoUrl={localPlayer?.photo_url ?? null}
        number={number ?? localPlayer?.shirt_number ?? null}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-wc-fg1">{localPlayer?.name ?? name}</p>
        <p className="mt-0.5 text-[11px] font-bold text-wc-fg3">{formatPosition(position ?? localPlayer?.position)}</p>
      </div>
      <InlineEventBadges summary={eventSummary} />
    </div>
  );

  return localPlayer ? (
    <PlayerLink player={localPlayer} className="block">
      {content}
    </PlayerLink>
  ) : (
    content
  );
}

function LineupPlayerAvatar({
  name,
  photoUrl,
  number,
}: {
  name: string;
  photoUrl: string | null;
  number?: number | string | null;
}) {
  return (
    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-black/24">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={name}
          width={40}
          height={40}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <span className="font-sans text-[11px] font-black tracking-normal text-wc-fg2" dir="ltr">
          #{number ?? "-"}
        </span>
      )}
    </span>
  );
}

function InlineEventBadges({ summary }: { summary?: PlayerMatchEventSummary | null }) {
  if (!hasEventSummary(summary)) return null;

  const badges = [
    summary.goals > 0 ? { key: "g", value: summary.goals, kind: "goal" as const, label: "שער", plural: "שערים", className: "border-wc-neon/45 bg-wc-neon/16 text-wc-neon shadow-[0_0_18px_rgba(95,255,123,0.18)]" } : null,
    summary.assists > 0 ? { key: "a", value: summary.assists, kind: "assist" as const, label: "בישול", plural: "בישולים", className: "border-cyan-300/35 bg-cyan-300/13 text-cyan-100 shadow-[0_0_14px_rgba(103,232,249,0.12)]" } : null,
    summary.yellowCards > 0 ? { key: "y", value: summary.yellowCards, kind: "yellow" as const, label: "צהוב", plural: "צהובים", className: "border-wc-amber/38 bg-wc-amber/13 text-wc-amber" } : null,
    summary.redCards > 0 ? { key: "r", value: summary.redCards, kind: "red" as const, label: "אדום", plural: "אדומים", className: "border-wc-danger/38 bg-wc-danger/13 text-wc-danger" } : null,
  ].filter((badge): badge is { key: string; value: number; kind: EventBadgeKind; label: string; plural: string; className: string } => Boolean(badge));

  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full border px-2 text-[10px] font-black leading-none ${badge.className}`}
          title={formatEventBadgeCount(badge.value, badge.label, badge.plural)}
          aria-label={formatEventBadgeCount(badge.value, badge.label, badge.plural)}
          dir="ltr"
        >
          <EventBadgeSymbol kind={badge.kind} />
          {badge.value > 1 ? <span className="font-sans tracking-normal">×{badge.value}</span> : null}
        </span>
      ))}
    </span>
  );
}

type EventBadgeKind = "goal" | "assist" | "yellow" | "red";

function EventBadgeSymbol({ kind }: { kind: EventBadgeKind }) {
  if (kind === "goal") {
    return <span aria-hidden="true">⚽</span>;
  }

  if (kind === "assist") {
    return <span aria-hidden="true">👟</span>;
  }

  if (kind === "yellow") {
    return <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-wc-amber shadow-[0_0_10px_rgba(255,199,77,0.35)]" />;
  }

  return <span aria-hidden="true" className="h-3.5 w-2.5 rounded-[2px] bg-wc-danger shadow-[0_0_10px_rgba(255,92,130,0.35)]" />;
}

function compareBenchEventPriority(left: FormationLineupPlayer, right: FormationLineupPlayer) {
  return getBenchEventScore(right) - getBenchEventScore(left) || compareOdds(left.top_scorer_odds, right.top_scorer_odds) || left.name.localeCompare(right.name, "he");
}

function getBenchEventScore(player: FormationLineupPlayer) {
  return (
    readNumber(player.match_goals) * 10 +
    readNumber(player.match_assists) * 6 +
    readNumber(player.match_red_cards) * 3 +
    readNumber(player.match_yellow_cards)
  );
}

function formatEventBadgeCount(value: number, singular: string, plural: string) {
  return value > 1 ? `${value} ${plural}` : singular;
}

function UnavailableList({ players }: { players: BzzoiroUnavailablePlayer[] }) {
  if (players.length === 0) return null;

  return (
    <div className="mt-4 rounded-[1rem] border border-[rgba(255,92,130,0.18)] bg-[rgba(255,92,130,0.08)] p-3">
      <p className="text-xs font-black text-wc-danger">חסרים / בספק</p>
      <div className="mt-2 grid gap-2">
        {players.slice(0, 8).map((player, index) => (
          <div key={`${player.name}-${index}`} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-wc-fg1">{player.name}</span>
            <span className="text-wc-fg3">{player.reason ?? player.status ?? "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocalTimelinePanel({
  match,
  players,
  devEvents,
}: {
  match: MatchDetailRow;
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  const devRows = buildDevTimelineRows(devEvents, match, players);

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="אירועי משחק" eyebrow="סימולציה מקומית" />
      {devRows.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {devRows.map((row) => (
            <DevIncidentRow key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <EmptyState text="אחרי Randomize All Matches והרצת רנדום שחקנים לפי תוצאות, יופיעו כאן שערים, בישולים וכרטיסים." />
      )}
    </section>
  );
}

function TimelinePanel({
  event,
  match,
  players,
  devEvents,
}: {
  event: BzzoiroMatchEvent;
  match: MatchDetailRow;
  players: MatchPagePlayer[];
  devEvents: MatchDetailDevEvent[];
}) {
  const incidents = asArray(event.incidents)
    .filter(isDisplayableIncident)
    .slice()
    .sort((left, right) => readNumber(left.minute) - readNumber(right.minute));
  const devRows = buildDevTimelineRows(devEvents, match, players);
  const hasApiTimeline = incidents.length > 0;

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="אירועי משחק" eyebrow={hasApiTimeline ? "שערים, כרטיסים, חילופים, VAR" : "Dev Tools timeline"} />
      {hasApiTimeline ? (
        <div className="mt-4 grid gap-3">
          {incidents.map((incident, index) => (
            <IncidentRow key={`${incident.minute}-${incident.type}-${index}`} incident={incident} match={match} players={players} />
          ))}
        </div>
      ) : devRows.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {devRows.map((row) => (
            <DevIncidentRow key={row.id} row={row} />
          ))}
        </div>
      ) : (
        <EmptyState text="אירועים יופיעו כאן בזמן המשחק או לאחר ש־BSD יעדכן את האירוע המלא." />
      )}
    </section>
  );
}

type DevTimelineRow = MatchDetailDevEvent & {
  player: MatchPagePlayer | null;
  assistPlayer: MatchPagePlayer | null;
  score: string | null;
  teamName: string;
};

function buildDevTimelineRows(
  events: MatchDetailDevEvent[],
  match: MatchDetailRow,
  players: MatchPagePlayer[],
): DevTimelineRow[] {
  let homeGoals = 0;
  let awayGoals = 0;

  return events
    .slice()
    .sort((left, right) => readNumber(left.minute) - readNumber(right.minute))
    .map((event) => {
      let score: string | null = null;
      if (event.event_type === "goal") {
        if (event.is_home) {
          homeGoals += 1;
        } else {
          awayGoals += 1;
        }
        score = formatTimelineScore(homeGoals, awayGoals);
      }

      const teamId = event.is_home === true ? match.home_team_id : event.is_home === false ? match.away_team_id : null;
      const teamName = event.is_home === true
        ? getTeamDisplayName(match.homeTeam, match.home_placeholder)
        : event.is_home === false
          ? getTeamDisplayName(match.awayTeam, match.away_placeholder)
          : "-";
      return {
        ...event,
        player: findLocalPlayerById(event.player_id, players, teamId),
        assistPlayer: findLocalPlayerById(event.related_player_id, players, teamId),
        score,
        teamName,
      };
    });
}

function DevIncidentRow({ row }: { row: DevTimelineRow }) {
  const title = formatDevEventTitle(row.event_type);
  const accentClass =
    row.event_type === "goal"
      ? "border-wc-neon/30 bg-[rgba(95,255,123,0.075)]"
      : row.event_type === "red_card"
        ? "border-wc-danger/30 bg-[rgba(255,92,130,0.075)]"
        : "border-wc-amber/30 bg-[rgba(255,199,77,0.07)]";

  const playerNode = row.player ? (
    <PlayerLink player={row.player} className="font-black text-wc-fg1 hover:text-wc-neon">
      {row.player.name}
    </PlayerLink>
  ) : row.event_type === "goal" ? (
    <span className="font-black text-wc-fg1">מבקיע מהסגל העתידי</span>
  ) : (
    <span className="font-black text-wc-fg1">שחקן מהסגל העתידי</span>
  );

  return (
    <div className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[1rem] border px-3 py-3 ${accentClass}`}>
      <span className="text-center font-mono text-sm font-black text-wc-fg2" dir="ltr">
        {row.minute !== null ? `${row.minute}'` : "-"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-wc-fg2">{title}</p>
        {playerNode ? <p className="mt-1 truncate text-xs text-wc-fg3">{playerNode}</p> : null}
        {row.assistPlayer ? (
          <p className="mt-1 truncate text-xs text-wc-fg3">
            בישול:{" "}
            <PlayerLink player={row.assistPlayer} className="font-bold text-wc-fg2 hover:text-wc-neon">
              {row.assistPlayer.name}
            </PlayerLink>
          </p>
        ) : null}
      </div>
      <span className="rounded-full bg-white/8 px-2 py-1 text-xs font-black text-wc-fg2" dir={row.score ? "ltr" : "rtl"}>
        {row.score ?? row.teamName}
      </span>
    </div>
  );
}

function IncidentRow({
  incident,
  match,
  players,
}: {
  incident: BzzoiroIncident;
  match: MatchDetailRow;
  players: MatchPagePlayer[];
}) {
  const minute = readNumber(incident.minute);
  const sideTeamId = incident.is_home === true ? match.home_team_id : incident.is_home === false ? match.away_team_id : null;
  const playerName = incident.player_name ?? incident.player ?? incident.player_out ?? incident.player_in ?? "";
  const localPlayer = playerName ? findLocalPlayer(playerName, players, sideTeamId) : null;
  const title = formatIncidentTitle(incident);
  const sideName = incident.is_home === true
    ? getTeamDisplayName(match.homeTeam, match.home_placeholder)
    : incident.is_home === false
      ? getTeamDisplayName(match.awayTeam, match.away_placeholder)
      : "-";
  const score = incident.home_score !== null && incident.home_score !== undefined && incident.away_score !== null && incident.away_score !== undefined
    ? formatTimelineScore(readNumber(incident.home_score), readNumber(incident.away_score))
    : null;

  const playerNode = localPlayer ? (
    <PlayerLink player={localPlayer} className="font-black text-wc-fg1 hover:text-wc-neon">
      {localPlayer.name}
    </PlayerLink>
  ) : playerName ? (
    <span className="font-black text-wc-fg1">{playerName}</span>
  ) : null;

  return (
    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-[1rem] border border-white/10 bg-black/14 px-3 py-3">
      <span className="text-center font-mono text-sm font-black text-wc-fg2" dir="ltr">
        {Number.isFinite(minute) ? `${minute}'` : "-"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-black text-wc-fg2">{title}</p>
        {playerNode ? <p className="mt-1 truncate text-xs text-wc-fg3">{playerNode}</p> : null}
        {incident.assist || incident.assist_player ? (
          <p className="mt-1 truncate text-xs text-wc-fg3">בישול: {incident.assist ?? incident.assist_player}</p>
        ) : null}
      </div>
      <span className="rounded-full bg-white/8 px-2 py-1 text-xs font-black text-wc-fg2" dir={score ? "ltr" : "rtl"}>
        {score ?? sideName}
      </span>
    </div>
  );
}

function PlayerStatsPanel({
  rows,
  match,
  players,
}: {
  rows: BzzoiroPlayerStatsRow[];
  match: MatchDetailRow;
  players: MatchPagePlayer[];
}) {
  const topRows = rows
    .filter((row) => readNumber(row.minutes_played) > 0 || readNumber(row.rating) > 0)
    .slice()
    .sort((left, right) => readNumber(right.rating) - readNumber(left.rating) || readNumber(right.minutes_played) - readNumber(left.minutes_played))
    .slice(0, 8);

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="שחקנים בולטים" eyebrow="player-stats" />
      {topRows.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {topRows.map((row, index) => (
            <PlayerStatRow key={`${row.player?.id ?? row.player?.name ?? "player"}-${index}`} row={row} match={match} players={players} />
          ))}
        </div>
      ) : (
        <EmptyState text="מדדי שחקנים יופיעו כאן בזמן/אחרי משחק כשה־API יחזיר player-stats לאירוע." />
      )}
    </section>
  );
}

function PlayerStatRow({
  row,
  match,
  players,
}: {
  row: BzzoiroPlayerStatsRow;
  match: MatchDetailRow;
  players: MatchPagePlayer[];
}) {
  const playerName = row.player?.name ?? "-";
  const sideTeamId = namesMatch(row.player?.team, match.homeTeam?.name) ? match.home_team_id : namesMatch(row.player?.team, match.awayTeam?.name) ? match.away_team_id : null;
  const localPlayer = findLocalPlayer(playerName, players, sideTeamId);
  const content = (
    <div className="rounded-[1.1rem] border border-white/10 bg-black/14 p-3 transition hover:bg-white/[0.055]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-wc-fg1">{localPlayer?.name ?? playerName}</p>
          <p className="mt-1 text-xs font-bold text-wc-fg3">{translateTeamNameToHebrew(row.player?.team)}</p>
        </div>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-black text-wc-fg2" dir="ltr">
          {formatDecimal(row.rating)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        <MiniMetric label="דקות" value={readNumber(row.minutes_played)} />
        <MiniMetric label="שערים" value={readNumber(row.goals)} />
        <MiniMetric label="בישולים" value={readNumber(row.goal_assist)} />
        <MiniMetric label="בעיטות" value={readNumber(row.total_shots)} />
      </div>
    </div>
  );

  return localPlayer ? (
    <PlayerLink player={localPlayer} className="block">
      {content}
    </PlayerLink>
  ) : (
    content
  );
}

function MomentumAndShotsPanel({
  event,
  match,
  players,
}: {
  event: BzzoiroMatchEvent;
  match: MatchDetailRow;
  players: MatchPagePlayer[];
}) {
  const shots = asArray(event.shotmap);
  if (shots.length === 0) return null;

  return (
    <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
      <SectionHeader title="בעיטות אחרונות" eyebrow="מפת בעיטות מה-API" />
      <div className="mt-4">
        <ShotList shots={shots} match={match} players={players} />
      </div>
    </section>
  );
}

function ShotList({
  shots,
  match,
  players,
}: {
  shots: BzzoiroShot[];
  match: MatchDetailRow;
  players: MatchPagePlayer[];
}) {
  const visible = shots.slice(-8).reverse();
  if (visible.length === 0) return <EmptyState text="בעיטות יופיעו כאן כשה־API יחזיר shotmap." />;

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/14 p-4">
      <p className="text-xs font-black text-wc-fg2">בעיטות אחרונות</p>
      <div className="mt-3 grid gap-2">
        {visible.map((shot, index) => {
          const localPlayer = findLocalPlayerByBzzoiroId(shot.pid, players);
          const teamName = shot.home === true
            ? getTeamDisplayName(match.homeTeam, match.home_placeholder)
            : shot.home === false
              ? getTeamDisplayName(match.awayTeam, match.away_placeholder)
              : "-";
          return (
            <div key={`${shot.min ?? index}-${index}`} className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-xl bg-white/[0.045] px-3 py-2">
              <span className="text-center font-sans text-xs font-black text-wc-fg3" dir="rtl">{formatShotMinute(shot.min)}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-wc-fg1">
                  {localPlayer ? (
                    <PlayerLink player={localPlayer} className="hover:text-wc-neon">
                      {localPlayer.name}
                    </PlayerLink>
                  ) : (
                    teamName
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-wc-fg3">
                  {formatShotType(shot.body ?? shot.sit ?? shot.type)} · {formatShotSituation(shot.sit)} · שערים צפויים {formatDecimal(shot.xg)}
                </p>
              </div>
              <span className="rounded-full bg-white/8 px-2 py-1 text-xs font-black text-wc-fg2">{formatShotResult(shot.type)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div>
      {eyebrow ? <p className="wc-kicker text-[0.68rem]">{eyebrow}</p> : null}
      <h2 className="mt-1 font-sans text-xl font-black tracking-normal text-wc-fg1">{title}</h2>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white/[0.045] px-2 py-1 text-center">
      <p className="text-[10px] font-bold text-wc-fg3">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-wc-fg1" dir="ltr">{value}</p>
    </div>
  );
}

function MiniMetricPair({
  title,
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  empty,
}: {
  title: string;
  firstLabel: string;
  firstValue: number | string;
  secondLabel: string;
  secondValue: number | string;
  empty?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-white/[0.045] px-2 py-1 text-center">
      <p className="text-[10px] font-bold text-wc-fg3">{title}</p>
      {empty ? (
        <p className="mt-0.5 text-sm font-black text-wc-fg1">-</p>
      ) : (
        <div className="mt-1 grid grid-cols-2 divide-x divide-x-reverse divide-white/10">
          <div className="min-w-0 px-1">
            <p className="font-sans text-sm font-black tracking-normal text-wc-fg1" dir="ltr">{firstValue}</p>
            <p className="text-[10px] font-bold text-wc-fg3">{firstLabel}</p>
          </div>
          <div className="min-w-0 px-1">
            <p className="font-sans text-sm font-black tracking-normal text-wc-fg1" dir="ltr">{secondValue}</p>
            <p className="text-[10px] font-bold text-wc-fg3">{secondLabel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-[1.25rem] border border-dashed border-white/10 bg-black/12 p-5 text-center text-sm leading-7 text-wc-fg3">
      {text}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.035] px-3 py-2 text-center text-xs text-wc-fg3">
      {text}
    </div>
  );
}

type StatPair = {
  label: string;
  home: string;
  away: string;
};

function getLiveStatPairs(
  event: BzzoiroMatchEvent | null,
  match: MatchDetailRow,
  devEvents: MatchDetailDevEvent[],
): StatPair[] {
  const homeStats = event?.live_stats?.home ?? null;
  const awayStats = event?.live_stats?.away ?? null;
  const pairDefinitions: Array<{ label: string; keys: string[]; formatter?: (value: number) => string }> = [
    { label: "החזקה", keys: ["possession", "ball_possession", "possession_percent"], formatter: formatPercent },
    { label: "בעיטות", keys: ["total_shots", "shots", "shot"] },
    { label: "למסגרת", keys: ["shots_on_target", "on_target", "shotsOnTarget"] },
    { label: "קרנות", keys: ["corners", "corner_kicks", "corner"] },
    { label: "עבירות", keys: ["fouls", "foul"] },
    { label: "צהובים", keys: ["yellow_cards", "yellowcards", "yellow"] },
  ];

  const pairs: StatPair[] = [];
  const xgPair = getBestXgPair(event, match, devEvents);
  if (xgPair) pairs.push(xgPair);

  const score = getBestScoreSummary(match, event);
  if (score) {
    pairs.push({
      label: "תוצאה",
      home: String(score.homeScore),
      away: String(score.awayScore),
    });
  }

  for (const definition of pairDefinitions) {
    const home = readStat(homeStats, definition.keys);
    const away = readStat(awayStats, definition.keys);
    if (home === null && away === null) continue;
    pairs.push({
      label: definition.label,
      home: definition.formatter ? definition.formatter(home ?? 0) : String(home ?? 0),
      away: definition.formatter ? definition.formatter(away ?? 0) : String(away ?? 0),
    });
  }

  return pairs.slice(0, 8);
}

function getBestXgPair(
  event: BzzoiroMatchEvent | null,
  match: MatchDetailRow,
  devEvents: MatchDetailDevEvent[],
): StatPair | null {
  if (shouldPreferLocalScore(match, event)) {
    const score = getMatchScoreSummary(match);
    if (!score) return null;

    return {
      label: "xG סימולציה",
      home: formatDecimal(buildSimulatedXgValue(match.match_number, score.homeScore, score.awayScore, true, devEvents)),
      away: formatDecimal(buildSimulatedXgValue(match.match_number, score.awayScore, score.homeScore, false, devEvents)),
    };
  }

  const homeXg = event ? readOptionalNumber(event.home_xg_live ?? event.actual_home_xg) : null;
  const awayXg = event ? readOptionalNumber(event.away_xg_live ?? event.actual_away_xg) : null;

  if (homeXg !== null || awayXg !== null) {
    return {
      label: "xG",
      home: formatDecimal(homeXg),
      away: formatDecimal(awayXg),
    };
  }
  return null;
}

function buildSimulatedXgValue(
  matchNumber: number,
  goalsFor: number,
  goalsAgainst: number,
  isHome: boolean,
  devEvents: MatchDetailDevEvent[],
) {
  const sideGoalEvents = devEvents.filter((event) => event.event_type === "goal" && event.is_home === isHome).length;
  const seed = deterministicFraction(matchNumber * (isHome ? 37 : 53) + goalsFor * 11 + goalsAgainst * 7);
  const base = goalsFor * 0.78 + (goalsFor === 0 ? 0.36 : 0.52);
  const pressure = Math.max(0, goalsAgainst - goalsFor) * 0.12;
  const eventConfidence = sideGoalEvents === goalsFor && goalsFor > 0 ? 0.1 : 0;
  const value = base + pressure + eventConfidence + seed * 0.42;

  return Math.max(0.05, Math.min(5.8, value));
}

function deterministicFraction(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function getBestScoreSummary(match: MatchDetailRow, event: BzzoiroMatchEvent | null) {
  if (shouldPreferLocalScore(match, event)) {
    return getMatchScoreSummary(match);
  }

  const homeScore = readOptionalNumber(event?.home_score);
  const awayScore = readOptionalNumber(event?.away_score);

  if (homeScore !== null && awayScore !== null) {
    return getMatchScoreSummary({
      ...match,
      home_score: homeScore,
      away_score: awayScore,
    });
  }

  return isMatchScoreVisible(match) ? getMatchScoreSummary(match) : null;
}

function shouldPreferLocalScore(match: MatchDetailRow, event: BzzoiroMatchEvent | null) {
  if (!isMatchScoreVisible(match)) return false;
  const apiStatus = String(event?.status ?? "").toLowerCase();
  const apiIsLiveOrFinished =
    apiStatus.includes("progress") ||
    apiStatus.includes("half") ||
    apiStatus === "live" ||
    apiStatus === "finished";

  return !apiIsLiveOrFinished;
}

function isBsdPreviewMatch(match: MatchDetailRow) {
  return (
    String(match.home_team_id ?? "").startsWith("bsd-preview-") ||
    String(match.away_team_id ?? "").startsWith("bsd-preview-")
  );
}

function isPreMatchView(match: MatchDetailRow, event: BzzoiroMatchEvent | null) {
  const apiStatus = String(event?.status ?? "").toLowerCase();
  const apiStarted =
    apiStatus.includes("progress") ||
    apiStatus.includes("half") ||
    apiStatus.includes("finish") ||
    apiStatus === "live" ||
    apiStatus === "ft";

  return match.status === "scheduled" && !apiStarted;
}

function getStatusLabel(match: MatchDetailRow, event: BzzoiroMatchEvent | null) {
  const apiStatus = String(event?.status ?? "").toLowerCase();
  if (match.status === "live" || apiStatus.includes("progress") || apiStatus.includes("half")) {
    const minute = readOptionalNumber(event?.current_minute) ?? match.minute;
    return getLiveMatchStatusLabel(minute, match.match_phase);
  }
  if (match.status === "finished" || apiStatus === "finished") return "הסתיים";
  if (apiStatus === "postponed") return "נדחה";
  if (apiStatus === "cancelled") return "בוטל";
  return `${formatMatchTimeLabel(match.date_time)} IDT`;
}

function getApiStatusText(event: BzzoiroMatchEvent | null, source: BzzoiroMatchCenter["source"]) {
  if (event?.status) return translateApiStatus(event.status);
  if (source === "api") return "זמין";
  if (source === "missing_teams") return "ממתין לנבחרות";
  if (source === "not_matched") return "לא נמצא אירוע";
  return "לא זמין";
}

function translateApiStatus(status: string) {
  const value = status.toLowerCase();
  if (value.includes("progress") || value.includes("half")) return "חי";
  if (value === "finished") return "הסתיים";
  if (value === "notstarted" || value === "scheduled") return "טרם התחיל";
  if (value === "postponed") return "נדחה";
  if (value === "cancelled") return "בוטל";
  return status;
}

function formatVenue(event: BzzoiroMatchEvent | null) {
  const venue = event?.venue;
  if (!venue?.name) return "-";
  return [venue.name, venue.city].filter(Boolean).join(", ");
}

function formatReferee(event: BzzoiroMatchEvent | null) {
  return event?.referee?.name ?? "-";
}

function getBzzoiroEmptyDescription(source: BzzoiroMatchCenter["source"]) {
  if (source === "missing_teams") {
    return "המשחק עדיין כולל placeholder או שחסרים מזהי נבחרות, ולכן אי אפשר למפות אותו לאירוע BSD בוודאות.";
  }
  if (source === "not_matched") {
    return "לא נמצא אירוע BSD תואם לפי הנבחרות והתאריך. כש־BSD יפרסם את אירוע המונדיאל המתאים, הפאנלים יתמלאו אוטומטית.";
  }
  return "ה־API לא החזיר מידע זמין כרגע. העמוד נשאר יציב ומציג את נתוני הטורניר המקומיים.";
}

function readStat(block: Record<string, number | string | null | undefined> | null, keys: string[]) {
  if (!block) return null;
  for (const key of keys) {
    const value = readOptionalNumber(block[key]);
    if (value !== null) return value;
  }
  return null;
}

function readRecordNumber(record: Record<string, unknown> | null, key: string) {
  return readRecordOptionalNumber(record, key) ?? 0;
}

function readRecordOptionalNumber(record: Record<string, unknown> | null, key: string) {
  if (!record) return null;
  const value = record[key];
  if (typeof value !== "number" && typeof value !== "string") return null;
  return readOptionalNumber(value);
}

function readRecordString(record: Record<string, unknown> | null, key: string) {
  if (!record) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readNumber(value: number | string | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function readOptionalNumber(value: number | string | null | undefined) {
  const number = typeof value === "string" ? Number(value.replace("%", "")) : Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatShortTime(iso: string | null | undefined) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleTimeString("he-IL", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatDecimal(value: number | string | null | undefined) {
  const number = readOptionalNumber(value);
  if (number === null) return "-";
  return number.toFixed(2);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getPreviewPlayers(players: MatchPagePlayer[], teamId: string | null) {
  return players
    .filter((player) => !teamId || player.team_id === teamId)
    .slice()
    .sort((left, right) => compareOdds(left.top_scorer_odds, right.top_scorer_odds) || left.name.localeCompare(right.name, "he"));
}

function compareOdds(left: number | string | null | undefined, right: number | string | null | undefined) {
  const leftNumber = readOptionalNumber(left);
  const rightNumber = readOptionalNumber(right);
  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber;
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return 0;
}

function normalizeOdds(value: number | string | null | undefined) {
  const number = readOptionalNumber(value);
  return number === null ? null : number.toFixed(2);
}

function readApiPlayerName(player: { player_name?: string | null; player?: string | null; name?: string | null }) {
  return player.player_name ?? player.player ?? player.name ?? "-";
}

function findLocalPlayer(name: string | null | undefined, players: MatchPagePlayer[], teamId: string | null) {
  const normalized = normalizePlayerName(name);
  if (!normalized) return null;

  return players.find((player) => {
    if (teamId && player.team_id !== teamId) return false;
    return normalizePlayerName(player.name) === normalized;
  }) ?? null;
}

function findLocalPlayerById(id: number | string | null | undefined, players: MatchPagePlayer[], teamId: string | null) {
  if (id === null || id === undefined || id === "") return null;
  return players.find((player) => {
    if (teamId && player.team_id !== teamId) return false;
    return String(player.id) === String(id);
  }) ?? null;
}

function findLocalPlayerByBzzoiroId(id: number | string | null | undefined, players: MatchPagePlayer[]) {
  if (id === null || id === undefined || id === "") return null;
  return players.find((player) => String(player.bzzoiro_player_id ?? "") === String(id)) ?? null;
}

function normalizePlayerName(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9א-ת]+/gi, "")
    .toLowerCase();
}

function namesMatch(leftValue: string | null | undefined, rightValue: string | null | undefined) {
  const left = normalizeTeamNameKey(leftValue);
  const right = normalizeTeamNameKey(rightValue);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function formatTimelineScore(homeGoals: number, awayGoals: number) {
  return `${awayGoals}-${homeGoals}`;
}

function formatPosition(position: string | null | undefined) {
  if (!position) return "שחקן";
  const value = position.trim().toLowerCase();
  if (value === "g" || value === "gk" || value.includes("goal") || value.includes("keeper")) return "שוער";
  if (value === "d" || value.includes("def") || value.includes("back")) return "הגנה";
  if (value === "m" || value.includes("mid")) return "קישור";
  if (value === "f" || value.includes("att") || value.includes("for") || value.includes("wing") || value.includes("striker")) return "התקפה";
  return position;
}

function formatIncidentTitle(incident: BzzoiroIncident) {
  const type = String(incident.type ?? "").toLowerCase();
  const cardType = String(incident.card_type ?? "").toLowerCase();
  if (type.includes("goal")) return "שער";
  if (type.includes("card") && cardType.includes("red")) return "כרטיס אדום";
  if (type.includes("card")) return "כרטיס צהוב";
  if (type.includes("sub")) return "חילוף";
  if (type.includes("var")) return "בדיקת VAR";
  if (type.includes("pen")) return "פנדל";
  return incident.type ?? "אירוע";
}

function isDisplayableIncident(incident: BzzoiroIncident) {
  const type = String(incident.type ?? "").toLowerCase();
  return (
    type.includes("goal") ||
    type.includes("card") ||
    type.includes("sub") ||
    type.includes("var") ||
    type.includes("pen")
  );
}

function formatDevEventTitle(type: MatchDetailDevEvent["event_type"]) {
  if (type === "goal") return "שער";
  if (type === "red_card") return "כרטיס אדום";
  return "כרטיס צהוב";
}

function formatShotType(type: string | null | undefined) {
  const value = String(type ?? "").toLowerCase();
  if (!value) return "בעיטה";
  if (value.includes("pen")) return "פנדל";
  if (value.includes("free")) return "כדור חופשי";
  if (value.includes("set")) return "מצב נייח";
  if (value.includes("counter") || value.includes("fast")) return "מתפרצת";
  if (value.includes("header") || value.includes("head")) return "נגיחה";
  if (value.includes("left")) return "רגל שמאל";
  if (value.includes("right")) return "רגל ימין";
  if (value.includes("foot")) return "בעיטה";
  if (value.includes("regular") || value.includes("normal") || value.includes("shot")) return "בעיטה";
  return "בעיטה";
}

function formatShotSituation(value: string | null | undefined) {
  const situation = String(value ?? "").toLowerCase();
  if (!situation) return "מהלך פתוח";
  if (situation.includes("assist")) return "אחרי מסירה";
  if (situation.includes("regular")) return "מהלך פתוח";
  if (situation.includes("corner")) return "קרן";
  if (situation.includes("free")) return "כדור חופשי";
  if (situation.includes("pen")) return "פנדל";
  if (situation.includes("fast") || situation.includes("counter")) return "מתפרצת";
  return "מהלך פתוח";
}

function formatShotResult(value: string | null | undefined) {
  const result = String(value ?? "").toLowerCase();
  if (!result) return "-";
  if (result.includes("goal")) return "שער";
  if (result.includes("save")) return "הצלה";
  if (result.includes("block")) return "חסימה";
  if (result.includes("post") || result.includes("wood") || result.includes("bar")) return "קורה/משקוף";
  if (result.includes("wide") || result.includes("off") || result.includes("miss")) return "מחוץ למסגרת";
  if (result.includes("assist") || result.includes("regular")) return "בעיטה";
  if (result.includes("on")) return "למסגרת";
  return "-";
}

function formatShotMinute(minute: number | string | null | undefined) {
  if (minute === null || minute === undefined || minute === "") return "-";
  return `${minute}'`;
}

"use client";

import { useDevLiveRefresh } from "@/lib/dev/live-refresh";
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

export type MatchDetailRow = MatchWithTeams;

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

export default function MatchDetailClient({ match }: { match: MatchDetailRow }) {
  useDevLiveRefresh({ pollIntervalMs: 1500 });

  const scoreSummary = isMatchScoreVisible(match) ? getMatchScoreSummary(match) : null;
  const homeName = getTeamDisplayName(match.homeTeam, match.home_placeholder);
  const awayName = getTeamDisplayName(match.awayTeam, match.away_placeholder);
  const homeLogo = getTeamDisplayLogo(match.homeTeam);
  const awayLogo = getTeamDisplayLogo(match.awayTeam);

  return (
    <div className="wc-shell px-4 py-4 md:px-6 md:py-6">
      <Link
        href="/dashboard/matches"
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-wc-fg3 hover:text-wc-fg1"
      >
        ← חזרה לכל המשחקים
      </Link>

      <section className="wc-card overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-wc-fg3">
          <span className="wc-badge">
            {getStageLabelHe(match.stage)}
            <span className="ms-2 font-mono">משחק {match.match_number}</span>
          </span>
          <span>{formatDateTime(match.date_time)}</span>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <TeamBlock logo={homeLogo} name={homeName} />
          <div className="flex flex-col items-center text-center">
            {scoreSummary ? (
              <ScoreSummaryHero
                summary={scoreSummary}
                className={`wc-display text-wc-fg1 ${scoreSummary.hasPenalties ? "text-4xl" : "text-6xl"}`}
              />
            ) : (
              <p className="wc-display text-4xl text-wc-fg3">VS</p>
            )}
            <p className="mt-2 text-xs font-bold text-wc-fg3">
              {match.status === "live"
                ? getLiveMatchStatusLabel(match.minute)
                : match.status === "finished"
                  ? "הסתיים"
                  : `${formatMatchTimeLabel(match.date_time)} IDT`}
            </p>
          </div>
          <TeamBlock logo={awayLogo} name={awayName} />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/4 p-5 text-sm leading-7 text-wc-fg2">
          עמוד הפרטים מחובר ישירות למשחקי הטורניר. בנוקאאוט, כשהזהות של placeholder נסגרת דרך טבלת הבתים
          או דרך מנצחת של משחק קודם, השם והדגל יוצגו אוטומטית.
        </div>
      </section>
    </div>
  );
}

function ScoreSummaryHero({
  summary,
  className,
}: {
  summary: NonNullable<ReturnType<typeof getMatchScoreSummary>>;
  className: string;
}) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <span className="font-bold">{summary.homeScore}</span>
        <span>-</span>
        <span className="font-bold">{summary.awayScore}</span>
      </span>
      {summary.hasPenalties && summary.homePenaltyScore !== null && summary.awayPenaltyScore !== null ? (
        <span className="inline-flex items-center gap-1 text-lg text-wc-fg3">
          <span>(</span>
          <span className="inline-flex items-center gap-1">
            <span className="font-bold">{summary.homePenaltyScore}</span>
            <span>-</span>
            <span className="font-bold">{summary.awayPenaltyScore}</span>
          </span>
          <span>PEN)</span>
        </span>
      ) : summary.statusSuffix ? (
        <span className="text-lg text-wc-fg3">{summary.statusSuffix}</span>
      ) : null}
    </div>
  );
}

function TeamBlock({ logo, name }: { logo: string | null; name: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {logo ? (
        <Image
          src={logo}
          alt={name}
          width={72}
          height={48}
          className="rounded-md object-cover"
          style={{ height: 48, width: 72 }}
          unoptimized
        />
      ) : (
        <div className="h-12 w-[72px] rounded-md bg-white/10" />
      )}
      <p className="text-center text-sm font-bold text-wc-fg1">{name}</p>
    </div>
  );
}

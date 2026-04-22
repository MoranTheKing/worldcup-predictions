"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import { getJokerBucket } from "@/lib/game/boosters";
import MatchPredictionCard from "./MatchPredictionCard";
import OutrightForm from "./OutrightForm";
import type { PickerPlayer, PickerTeam } from "./OutrightForm";

export type MatchPredictionRow = {
  match_id: number;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied: boolean | null;
  points_earned?: number | null;
};

export type TournamentPredRow = {
  predicted_winner_team_id: string | null;
  predicted_top_scorer_name: string | null;
};

type JokerSelectionState = {
  group: number | null;
  knockout: number | null;
};

type JokerSelectionOverride = {
  group?: number | null;
  knockout?: number | null;
};

export default function PredictionsClient({
  matches,
  teams,
  players,
  existingPredictions,
  tournamentPrediction,
  isAuthenticated,
  groupJokerUsed,
  knockoutJokerUsed,
  hiddenMatchCount,
}: {
  matches: MatchWithTeams[];
  teams: PickerTeam[];
  players: PickerPlayer[];
  existingPredictions: MatchPredictionRow[];
  tournamentPrediction: TournamentPredRow | null;
  isAuthenticated: boolean;
  groupJokerUsed: boolean;
  knockoutJokerUsed: boolean;
  hiddenMatchCount: number;
}) {
  const predictionMap = useMemo(
    () => new Map(existingPredictions.map((prediction) => [prediction.match_id, prediction])),
    [existingPredictions],
  );

  const initialJokerSelection = useMemo<JokerSelectionState>(() => {
    const selection: JokerSelectionState = { group: null, knockout: null };

    for (const match of matches) {
      const existing = predictionMap.get(match.match_number);
      if (!existing?.is_joker_applied) {
        continue;
      }

      const bucket = getJokerBucket(match.stage, match.match_number);
      selection[bucket] = match.match_number;
    }

    return selection;
  }, [matches, predictionMap]);

  const [jokerSelectionOverride, setJokerSelectionOverride] = useState<JokerSelectionOverride>({});
  const didAutoScroll = useRef(false);
  const matchRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const firstOpenMatchId = useMemo(
    () =>
      matches.find((match) => match.status === "live" || match.status === "scheduled")?.match_number ??
      null,
    [matches],
  );

  useEffect(() => {
    if (didAutoScroll.current || firstOpenMatchId === null) {
      return;
    }

    const element = matchRefs.current[firstOpenMatchId];
    if (!element) {
      return;
    }

    didAutoScroll.current = true;
    window.setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [firstOpenMatchId]);

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <div className="text-5xl">🔐</div>
        <p className="mt-3 text-base font-semibold text-wc-fg2">
          צריך להתחבר כדי לנהל ניחושים, בוסטרים והיסטוריית תוצאות.
        </p>
        <Link
          href="/login?next=/game/predictions"
          className="wc-button-primary mt-5 inline-flex px-6 py-3 text-sm font-bold"
        >
          התחבר עכשיו
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-white/8 bg-[rgba(13,27,46,0.82)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
              הניחושים שלי
            </p>
            <p className="mt-2 text-sm text-wc-fg2">
              כל משחק בטורניר מופיע כאן. המשחקים שעדיין לא התחילו נשארים פתוחים לעריכה, ומשחקים חיים או גמורים נשמרים כתיעוד מלא עם ניקוד.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label="ג'וקר בתים" used={groupJokerUsed} />
            <StatusPill label="ג'וקר נוקאאוט" used={knockoutJokerUsed} />
          </div>
        </div>

        <OutrightForm teams={teams} players={players} existing={tournamentPrediction} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
              היסטוריית משחקים וניחושים
            </p>
            <p className="mt-1 text-xs text-wc-fg3">
              מסך אחד לכל הלו&quot;ז: עבר, הווה ועתיד.
            </p>
          </div>
          <div className="text-end text-xs font-semibold text-wc-fg3">
            <div>{matches.length} משחקים מוצגים</div>
            {hiddenMatchCount > 0 ? (
              <div className="mt-1">{hiddenMatchCount} משחקים עתידיים מוסתרים עד ששתי הנבחרות ייקבעו</div>
            ) : null}
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[rgba(13,27,46,0.82)] p-10 text-center">
            <div className="text-5xl">🗓️</div>
            <p className="mt-3 text-base font-semibold text-wc-fg2">
              אין כרגע משחקים זמינים למסך הניחושים.
            </p>
            <p className="mt-2 text-sm text-wc-fg3">
              משחקים עתידיים עם placeholders יופיעו כאן אוטומטית ברגע ששתי הנבחרות יהיו ידועות.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {matches.map((match) => {
              const existing = predictionMap.get(match.match_number);
              const bucket = getJokerBucket(match.stage, match.match_number);
              const savedStageUsed = bucket === "group" ? groupJokerUsed : knockoutJokerUsed;
              const selectedMatchId =
                jokerSelectionOverride[bucket] !== undefined
                  ? jokerSelectionOverride[bucket] ?? null
                  : initialJokerSelection[bucket];
              const isSelected = selectedMatchId === match.match_number;
              const canUseJoker = isSelected || (!savedStageUsed && selectedMatchId === null);

              return (
                <div
                  key={match.match_number}
                  ref={(element) => {
                    matchRefs.current[match.match_number] = element;
                  }}
                >
                  <MatchPredictionCard
                    match={match}
                    existingHome={existing?.home_score_guess ?? null}
                    existingAway={existing?.away_score_guess ?? null}
                    existingIsJoker={existing?.is_joker_applied ?? false}
                    pointsEarned={existing?.points_earned ?? null}
                    isJokerSelected={isSelected}
                    canUseJoker={canUseJoker}
                    onToggleJoker={() =>
                      setJokerSelectionOverride((current) => ({
                        ...current,
                        [bucket]: current[bucket] === match.match_number ? null : match.match_number,
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({
  label,
  used,
}: {
  label: string;
  used: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        used ? "bg-white/6 text-wc-fg3" : "bg-[rgba(95,255,123,0.14)] text-wc-neon"
      }`}
    >
      {label}: {used ? "נוצל" : "זמין"}
    </span>
  );
}

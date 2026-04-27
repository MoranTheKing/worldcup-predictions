"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import { GROUP_JOKER_LIMIT, canUseJokerOnMatch } from "@/lib/game/boosters";
import { usePredictionsRealtimeRefresh } from "@/lib/live/predictions-realtime-refresh";
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
  predicted_winner_odds?: number | string | null;
  predicted_scorer_odds?: number | string | null;
  winner_points_earned?: number | null;
  scorer_points_earned?: number | null;
};

type JokerSelectionState = {
  group: number[];
};

export default function PredictionsClient({
  currentUserId,
  matches,
  teams,
  players,
  existingPredictions,
  tournamentPrediction,
  isAuthenticated,
  groupJokerUsedCount,
  groupJokerLimit = GROUP_JOKER_LIMIT,
  tournamentStarted,
}: {
  currentUserId: string | null;
  matches: MatchWithTeams[];
  teams: PickerTeam[];
  players: PickerPlayer[];
  existingPredictions: MatchPredictionRow[];
  tournamentPrediction: TournamentPredRow | null;
  isAuthenticated: boolean;
  groupJokerUsedCount: number;
  groupJokerLimit?: number;
  tournamentStarted: boolean;
}) {
  const liveMatchIds = useMemo(
    () =>
      matches
        .filter((match) => match.status === "live")
        .map((match) => match.match_number),
    [matches],
  );

  usePredictionsRealtimeRefresh({
    currentUserId,
    liveMatchIds,
    enabled: isAuthenticated,
  });

  const predictionMap = useMemo(
    () => new Map(existingPredictions.map((prediction) => [prediction.match_id, prediction])),
    [existingPredictions],
  );

  const initialJokerSelection = useMemo<JokerSelectionState>(() => {
    const selection: JokerSelectionState = { group: [] };

    for (const match of matches) {
      const existing = predictionMap.get(match.match_number);
      if (!existing?.is_joker_applied) continue;
      if (!canUseJokerOnMatch(match.stage, match.match_number)) continue;

      selection.group.push(match.match_number);
    }

    return selection;
  }, [matches, predictionMap]);

  const [jokerSelectionOverride, setJokerSelectionOverride] = useState<JokerSelectionState | null>(
    null,
  );
  const didAutoScroll = useRef(false);
  const matchRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const firstOpenMatchId = useMemo(
    () =>
      matches.find((match) => match.status === "live" || match.status === "scheduled")?.match_number ??
      null,
    [matches],
  );

  useEffect(() => {
    if (didAutoScroll.current || firstOpenMatchId === null) return;

    const element = matchRefs.current[firstOpenMatchId];
    if (!element) return;

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
      <section className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(13,27,46,0.88),rgba(10,20,35,0.92))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.22)] sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">בחירות הפתיחה שלי</p>
          </div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-wc-fg3">
            {tournamentStarted ? "בחירות הטורניר נעולות" : "אפשר לערוך עד שריקת הפתיחה"}
          </div>
        </div>

        <div className="rounded-[1.7rem] border border-white/8 bg-[rgba(255,255,255,0.03)] p-4 sm:p-5">
          <OutrightForm
            teams={teams}
            players={players}
            existing={tournamentPrediction}
            isLocked={tournamentStarted}
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">לוח המשחקים</p>
          <p className="mt-1 text-xs text-wc-fg3">כל המשחקים, כל הניקוד, וכל הבחירות שלך במקום אחד.</p>
        </div>

        {matches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[rgba(13,27,46,0.82)] p-10 text-center">
            <div className="text-5xl">📄</div>
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
              const isGroupStageJokerMatch = canUseJokerOnMatch(match.stage, match.match_number);
              const effectiveExistingIsJoker =
                existing?.is_joker_applied === true && isGroupStageJokerMatch;
              const selectedGroupJokers =
                jokerSelectionOverride?.group ?? initialJokerSelection.group;
              const persistedVisibleJokerCount = initialJokerSelection.group.length;
              const activeGroupJokerCount = Math.max(
                0,
                groupJokerUsedCount - persistedVisibleJokerCount + selectedGroupJokers.length,
              );
              const isSelected =
                isGroupStageJokerMatch && selectedGroupJokers.includes(match.match_number);
              const showJokerToggle =
                isGroupStageJokerMatch &&
                (isSelected || activeGroupJokerCount < groupJokerLimit);

              return (
                <div
                  key={`${match.match_number}-${existing?.home_score_guess ?? "x"}-${existing?.away_score_guess ?? "x"}-${effectiveExistingIsJoker ? "joker" : "plain"}-${match.status}`}
                  ref={(element) => {
                    matchRefs.current[match.match_number] = element;
                  }}
                >
                  <MatchPredictionCard
                    match={match}
                    existingHome={existing?.home_score_guess ?? null}
                    existingAway={existing?.away_score_guess ?? null}
                    existingIsJoker={effectiveExistingIsJoker}
                    pointsEarned={existing?.points_earned ?? null}
                    isJokerSelected={isSelected}
                    showJokerToggle={showJokerToggle}
                    onToggleJoker={() =>
                      setJokerSelectionOverride((current) => {
                        const currentGroup = current?.group ?? initialJokerSelection.group;
                        const nextGroup = currentGroup.includes(match.match_number)
                          ? currentGroup.filter((matchNumber) => matchNumber !== match.match_number)
                          : [...currentGroup, match.match_number].slice(0, groupJokerLimit);

                        return { group: nextGroup };
                      })
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

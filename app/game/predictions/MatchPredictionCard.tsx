"use client";

import type { CSSProperties } from "react";
import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertMatchPrediction, type PredictionActionState } from "@/app/actions/predictions";
import {
  formatScorePair,
  getMatchScoreSummary,
  getStageLabelHe,
  type MatchWithTeams,
} from "@/lib/tournament/matches";

type PredictionTone = "neutral" | "direction" | "success" | "jackpot" | "live";

export default function MatchPredictionCard({
  match,
  existingHome,
  existingAway,
  existingIsJoker,
  pointsEarned,
  isJokerSelected,
  canUseJoker,
  onToggleJoker,
}: {
  match: MatchWithTeams;
  existingHome: number | null;
  existingAway: number | null;
  existingIsJoker: boolean;
  pointsEarned: number | null;
  isJokerSelected: boolean;
  canUseJoker: boolean;
  onToggleJoker: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isEditable = match.status === "scheduled";
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const boundAction = upsertMatchPrediction.bind(null, match.match_number, match.stage);
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    boundAction,
    null,
  );

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state?.savedAt, state?.success]);

  const homeTeamName = match.homeTeam?.name_he ?? match.homeTeam?.name ?? "נבחרת בית";
  const awayTeamName = match.awayTeam?.name_he ?? match.awayTeam?.name ?? "נבחרת חוץ";
  const actualSummary = getMatchScoreSummary(match);
  const stageLabel = getStageLabelHe(match.stage);
  const matchDate = new Date(match.date_time);
  const hasPrediction = existingHome !== null && existingAway !== null;
  const predictionScore = hasPrediction ? formatScorePair(existingHome, existingAway) : null;
  const exactHit =
    isFinished &&
    hasPrediction &&
    match.home_score === existingHome &&
    match.away_score === existingAway;
  const directionHit =
    isFinished &&
    hasPrediction &&
    !exactHit &&
    compareOutcome(match.home_score, match.away_score, existingHome, existingAway) &&
    (typeof pointsEarned !== "number" || pointsEarned > 0);
  const jokerJackpot = exactHit && existingIsJoker;
  const cardTone: PredictionTone = jokerJackpot
    ? "jackpot"
    : exactHit
      ? "success"
      : directionHit
        ? "direction"
        : isLive
          ? "live"
          : "neutral";
  const disabledReason = "הג'וקר כבר שמור כרגע על משחק אחר באותו מסלול.";

  return (
    <div className="relative overflow-hidden rounded-[1.6rem]">
      {cardTone === "jackpot" ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{
              background:
                "linear-gradient(135deg, rgba(64,224,255,0.28), rgba(155,92,255,0.24), rgba(255,98,194,0.22))",
            }}
          />
          <div
            className="pointer-events-none absolute inset-[1px] rounded-[1.45rem]"
            style={{
              boxShadow:
                "0 0 34px rgba(64,224,255,0.26), 0 0 54px rgba(155,92,255,0.2), inset 0 0 26px rgba(255,255,255,0.06)",
            }}
          />
        </>
      ) : null}

      <div
        className="relative overflow-hidden rounded-[1.6rem] border"
        style={getCardChrome(cardTone, isJokerSelected || existingIsJoker, Boolean(state?.success))}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-wc-fg3">{stageLabel}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusPillClass(isFinished, isLive)}`}>
              {isFinished ? "FT" : isLive ? "LIVE" : "UPCOMING"}
            </span>
            {cardTone === "jackpot" ? (
              <span className="rounded-full bg-[rgba(64,224,255,0.16)] px-2 py-0.5 text-[10px] font-black text-[#8CF3FF] shadow-[0_0_16px_rgba(64,224,255,0.25)]">
                DIAMOND JOKER HIT
              </span>
            ) : cardTone === "success" ? (
              <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-[10px] font-bold text-wc-neon">
                PERFECT HIT
              </span>
            ) : cardTone === "direction" ? (
              <span className="rounded-full bg-[rgba(110,184,255,0.14)] px-2 py-0.5 text-[10px] font-bold text-[#89C6FF]">
                TREND HIT
              </span>
            ) : null}
            {state?.success ? (
              <span className="animate-pulse rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-[10px] font-bold text-wc-neon">
                ✓ נשמר
              </span>
            ) : null}
          </div>

          <span className="text-[11px] font-semibold text-wc-fg3">
            {matchDate.toLocaleDateString("he-IL", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <TeamSide align="right" name={homeTeamName} logoUrl={match.homeTeam?.logo_url ?? null} />

            <div className="flex flex-shrink-0 items-center gap-2">
              {isEditable ? (
                <>
                  <ScoreInput name="home_score" defaultValue={existingHome} disabled={isPending} />
                  <span className="text-sm font-black text-wc-fg3">-</span>
                  <ScoreInput name="away_score" defaultValue={existingAway} disabled={isPending} />
                </>
              ) : (
                <ReadOnlyScore score={actualSummary?.displayScore ?? "—"} />
              )}
            </div>

            <TeamSide align="left" name={awayTeamName} logoUrl={match.awayTeam?.logo_url ?? null} />
          </div>

          {isEditable ? (
            <form action={formAction} className="mt-3">
              <input
                type="hidden"
                name="is_joker_applied"
                value={isJokerSelected ? "true" : "false"}
              />

              {hasPrediction && predictionScore ? (
                <div className="mb-3 rounded-xl border border-[rgba(95,255,123,0.18)] bg-[rgba(95,255,123,0.08)] px-3 py-2 text-xs font-semibold text-wc-fg1">
                  <span className="text-wc-neon">הניחוש שלך:</span>{" "}
                  <span dir="ltr" className="inline-flex font-black tracking-[0.08em]">
                    {predictionScore}
                  </span>
                  {existingIsJoker ? <span className="ms-2 text-wc-violet">🎏</span> : null}
                </div>
              ) : null}

              <button
                type="button"
                disabled={(!canUseJoker && !isJokerSelected) || isPending}
                title={!canUseJoker && !isJokerSelected ? disabledReason : ""}
                onClick={onToggleJoker}
                className="w-full rounded-xl py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  isJokerSelected
                    ? {
                        background: "rgba(111,60,255,0.2)",
                        border: "1.5px solid rgba(111,60,255,0.6)",
                        color: "var(--wc-violet)",
                        boxShadow: "0 0 12px rgba(111,60,255,0.25)",
                      }
                    : {
                        background: "var(--wc-raised)",
                        border: "1.5px solid var(--wc-border)",
                        color: "var(--wc-fg2)",
                      }
                }
              >
                {isJokerSelected
                  ? "🎏 הג'וקר פעיל על המשחק הזה"
                  : canUseJoker
                    ? "🎏 הפעל ג'וקר"
                    : `🎏 ${disabledReason}`}
              </button>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="min-h-[1.25rem] flex-1">
                  {state?.error ? (
                    <p role="alert" className="text-xs font-semibold text-wc-danger">
                      {state.error}
                    </p>
                  ) : state?.success ? (
                    <p className="text-xs font-semibold text-wc-neon">
                      הניחוש נשמר{isJokerSelected ? " עם ג'וקר" : ""}.
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="wc-button-primary flex-shrink-0 px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  {isPending ? "שומר..." : "שמור ניחוש"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ResultPanel
                label={isLive ? "התוצאה כרגע" : "התוצאה בפועל"}
                value={actualSummary?.displayScore ?? "—"}
                tone={isLive ? "live" : cardTone}
                isScore
              />
              <ResultPanel
                label="הניחוש שלך"
                value={
                  hasPrediction && predictionScore
                    ? `${predictionScore}${existingIsJoker ? " 🎏" : ""}`
                    : "לא נשמר"
                }
                tone={cardTone}
                isScore={Boolean(hasPrediction && predictionScore)}
              />
              <ResultPanel
                label="נקודות"
                value={typeof pointsEarned === "number" ? String(pointsEarned) : "0"}
                tone={cardTone}
                emphasize
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamSide({
  align,
  name,
  logoUrl,
}: {
  align: "left" | "right";
  name: string;
  logoUrl: string | null;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "justify-end" : ""}`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
      ) : null}
      <span className="truncate text-sm font-bold text-wc-fg1">{name}</span>
    </div>
  );
}

function ResultPanel({
  label,
  value,
  tone,
  emphasize = false,
  isScore = false,
}: {
  label: string;
  value: string;
  tone: PredictionTone;
  emphasize?: boolean;
  isScore?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${getResultPanelClass(tone)}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      <p
        dir={isScore ? "ltr" : undefined}
        className={`mt-2 font-black ${emphasize ? "text-3xl" : "text-lg"} ${isScore ? "text-left" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function ReadOnlyScore({ score }: { score: string }) {
  return (
    <div
      dir="ltr"
      className="min-w-[118px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-black text-wc-fg1"
    >
      {score}
    </div>
  );
}

function ScoreInput({
  name,
  defaultValue,
  disabled,
}: {
  name: string;
  defaultValue: number | null;
  disabled: boolean;
}) {
  return (
    <input
      type="number"
      name={name}
      min="0"
      max="99"
      required
      disabled={disabled}
      defaultValue={defaultValue ?? 0}
      placeholder="0"
      className="wc-input w-16 text-center text-lg font-black"
      style={{ padding: "0.5rem 0.25rem" }}
    />
  );
}

function compareOutcome(
  actualHome: number | null,
  actualAway: number | null,
  predictedHome: number | null,
  predictedAway: number | null,
) {
  if (
    actualHome === null ||
    actualAway === null ||
    predictedHome === null ||
    predictedAway === null
  ) {
    return false;
  }

  return Math.sign(actualHome - actualAway) === Math.sign(predictedHome - predictedAway);
}

function getStatusPillClass(isFinished: boolean, isLive: boolean) {
  if (isFinished) {
    return "bg-white/8 text-wc-fg2";
  }

  if (isLive) {
    return "bg-[rgba(255,92,130,0.12)] text-wc-danger";
  }

  return "bg-white/6 text-wc-fg3";
}

function getCardChrome(
  tone: PredictionTone,
  hasJokerSelected: boolean,
  wasJustSaved: boolean,
): CSSProperties {
  if (tone === "jackpot") {
    return {
      borderColor: "rgba(64,224,255,0.92)",
      background: "linear-gradient(135deg, rgba(5,13,24,0.98), rgba(20,14,34,0.98))",
      boxShadow:
        "0 0 0 1px rgba(155,92,255,0.35), 0 0 28px rgba(64,224,255,0.24), 0 0 48px rgba(155,92,255,0.2)",
    };
  }

  if (tone === "success") {
    return {
      borderColor: "rgba(34,197,94,0.9)",
      background: "linear-gradient(135deg, rgba(7,25,14,0.96), rgba(8,19,33,0.92))",
      boxShadow: "0 0 24px rgba(34,197,94,0.18)",
    };
  }

  if (tone === "direction") {
    return {
      borderColor: "rgba(110,184,255,0.72)",
      background: "linear-gradient(135deg, rgba(12,22,41,0.95), rgba(24,28,10,0.88))",
      boxShadow: "0 0 20px rgba(110,184,255,0.12)",
    };
  }

  if (tone === "live") {
    return {
      borderColor: "rgba(255,92,130,0.5)",
      background: "var(--wc-surface)",
      boxShadow: "0 0 18px rgba(255,92,130,0.1)",
    };
  }

  return {
    borderColor: hasJokerSelected
      ? "rgba(111,60,255,0.5)"
      : wasJustSaved
        ? "rgba(95,255,123,0.4)"
        : "var(--wc-border)",
    background: "var(--wc-surface)",
    boxShadow: hasJokerSelected ? "0 0 18px rgba(111,60,255,0.2)" : undefined,
  };
}

function getResultPanelClass(tone: PredictionTone) {
  if (tone === "jackpot") {
    return "border-[rgba(64,224,255,0.46)] bg-[linear-gradient(135deg,rgba(64,224,255,0.12),rgba(155,92,255,0.12))] text-[#9AF4FF]";
  }

  if (tone === "success") {
    return "border-[rgba(34,197,94,0.38)] bg-[rgba(34,197,94,0.1)] text-[#7BFFB1]";
  }

  if (tone === "direction") {
    return "border-[rgba(110,184,255,0.3)] bg-[rgba(110,184,255,0.09)] text-[#9ACEFF]";
  }

  if (tone === "live") {
    return "border-[rgba(255,92,130,0.24)] bg-[rgba(255,92,130,0.08)] text-wc-danger";
  }

  return "border-white/10 bg-white/5 text-wc-fg1";
}

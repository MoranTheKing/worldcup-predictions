"use client";

import type { CSSProperties } from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertMatchPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import {
  formatScorePair,
  getMatchScoreSummary,
  getStageLabelHe,
  type MatchWithTeams,
} from "@/lib/tournament/matches";

type PredictionTone =
  | "scheduled"
  | "saved"
  | "miss"
  | "direction"
  | "success"
  | "jackpot"
  | "live";

export default function MatchPredictionCard({
  match,
  existingHome,
  existingAway,
  existingIsJoker,
  pointsEarned,
  isJokerSelected,
  showJokerToggle,
  onToggleJoker,
  predictionOwnerLabel = "הניחוש שלך",
  isReadOnly = false,
  hideScheduledPrediction = false,
}: {
  match: MatchWithTeams;
  existingHome: number | null;
  existingAway: number | null;
  existingIsJoker: boolean;
  pointsEarned: number | null;
  isJokerSelected: boolean;
  showJokerToggle: boolean;
  onToggleJoker?: () => void;
  predictionOwnerLabel?: string;
  isReadOnly?: boolean;
  hideScheduledPrediction?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isEditable = match.status === "scheduled" && !isReadOnly;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const boundAction = upsertMatchPrediction.bind(null, match.match_number, match.stage);
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    boundAction,
    null,
  );
  const [homeDraft, setHomeDraft] = useState(String(existingHome ?? 0));
  const [awayDraft, setAwayDraft] = useState(String(existingAway ?? 0));

  useEffect(() => {
    if (!state?.success) return;

    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state?.savedAt, state?.success]);

  const homeTeamName = match.homeTeam?.name_he ?? match.homeTeam?.name ?? "נבחרת בית";
  const awayTeamName = match.awayTeam?.name_he ?? match.awayTeam?.name ?? "נבחרת חוץ";
  const actualSummary = getMatchScoreSummary(match);
  const stageLabel = getStageLabelHe(match.stage);
  const matchDate = new Date(match.date_time);
  const optimisticHome = state?.success ? parseDraftValue(homeDraft) : existingHome;
  const optimisticAway = state?.success ? parseDraftValue(awayDraft) : existingAway;
  const optimisticIsJoker = state?.success ? isJokerSelected : existingIsJoker;
  const hasPrediction = optimisticHome !== null && optimisticAway !== null;
  const predictionScore =
    optimisticHome !== null && optimisticAway !== null
      ? formatScorePair(optimisticHome, optimisticAway)
      : null;
  const exactHit =
    isFinished &&
    hasPrediction &&
    match.home_score === optimisticHome &&
    match.away_score === optimisticAway;
  const directionHit =
    isFinished &&
    hasPrediction &&
    !exactHit &&
    compareOutcome(match.home_score, match.away_score, optimisticHome, optimisticAway);
  const jokerJackpot = exactHit && optimisticIsJoker;
  const tone = resolveTone({
    isEditable,
    isLive,
    isFinished,
    hasPrediction,
    exactHit,
    directionHit,
    jokerJackpot,
  });
  const hiddenPredictionForPrivacy =
    isReadOnly && hideScheduledPrediction && match.status === "scheduled";

  return (
    <div className="relative overflow-hidden rounded-[1.6rem]">
      {tone === "jackpot" ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{
              background:
                "linear-gradient(130deg, rgba(72,232,255,0.24), rgba(129,92,255,0.28), rgba(255,214,66,0.18), rgba(255,90,201,0.22))",
            }}
          />
          <div
            className="pointer-events-none absolute inset-[1px] rounded-[1.45rem]"
            style={{
              boxShadow:
                "0 0 20px 5px rgba(255,215,0,0.45), 0 0 44px rgba(64,224,255,0.32), 0 0 56px rgba(155,92,255,0.28), inset 0 0 24px rgba(255,255,255,0.08)",
            }}
          />
        </>
      ) : null}

      <div
        className="relative overflow-hidden rounded-[1.6rem] border"
        style={getCardChrome(tone, isJokerSelected || optimisticIsJoker, Boolean(state?.success))}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-wc-fg3">{stageLabel}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusPillClass(
                isFinished,
                isLive,
              )}`}
            >
              {isFinished ? "FT" : isLive ? "LIVE" : "UPCOMING"}
            </span>
            {tone === "jackpot" ? (
              <span className="rounded-full bg-[rgba(64,224,255,0.16)] px-2 py-0.5 text-[10px] font-black text-[#8CF3FF] shadow-[0_0_18px_rgba(64,224,255,0.32)]">
                👑 DIAMOND JOKER HIT
              </span>
            ) : tone === "success" ? (
              <span className="rounded-full bg-[rgba(34,197,94,0.16)] px-2 py-0.5 text-[10px] font-bold text-[#7BFFB1]">
                EXACT HIT
              </span>
            ) : tone === "direction" ? (
              <span className="rounded-full bg-[rgba(255,222,89,0.14)] px-2 py-0.5 text-[10px] font-bold text-[#FFE68A]">
                DIRECTION HIT
              </span>
            ) : tone === "miss" ? (
              <span className="rounded-full bg-[rgba(255,92,130,0.12)] px-2 py-0.5 text-[10px] font-bold text-wc-danger">
                0 POINTS
              </span>
            ) : state?.success ? (
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
          {isEditable ? (
            <form action={formAction} className="space-y-3">
              <input type="hidden" name="is_joker_applied" value={isJokerSelected ? "true" : "false"} />

              <div className="flex items-center gap-3">
                <TeamSide align="right" name={homeTeamName} logoUrl={match.homeTeam?.logo_url ?? null} />

                <div className="flex flex-shrink-0 items-center gap-2">
                  <ScoreInput name="home_score" value={homeDraft} disabled={isPending} onChange={setHomeDraft} />
                  <span className="text-sm font-black text-wc-fg3">-</span>
                  <ScoreInput name="away_score" value={awayDraft} disabled={isPending} onChange={setAwayDraft} />
                </div>

                <TeamSide align="left" name={awayTeamName} logoUrl={match.awayTeam?.logo_url ?? null} />
              </div>

              {hasPrediction && predictionScore ? (
                <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-wc-fg1">
                  <span className="text-wc-neon">{predictionOwnerLabel}:</span>{" "}
                  <span dir="ltr" className="inline-flex font-black tracking-[0.08em]">
                    {predictionScore}
                  </span>
                  {optimisticIsJoker ? <span className="ms-2 text-wc-violet">🎏</span> : null}
                </div>
              ) : null}

              {showJokerToggle && onToggleJoker ? (
                <button
                  type="button"
                  disabled={isPending}
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
                  {isJokerSelected ? "🎏 הג'וקר פעיל על המשחק הזה" : "🎏 הפעל ג'וקר"}
                </button>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <div className="min-h-[1.25rem] flex-1">
                  {state?.error ? (
                    <p role="alert" className="text-xs font-semibold text-wc-danger">
                      {state.error}
                    </p>
                  ) : state?.success ? (
                    <p className="text-xs font-semibold text-wc-neon">
                      הניחוש נשמר{isJokerSelected ? " עם ג'וקר" : ""}.
                    </p>
                  ) : hasPrediction && predictionScore ? (
                    <p className="text-xs text-wc-fg3">
                      {predictionOwnerLabel}:{" "}
                      <span dir="ltr" className="font-bold">
                        {predictionScore}
                      </span>
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
            <>
              <div className="flex items-center gap-3">
                <TeamSide align="right" name={homeTeamName} logoUrl={match.homeTeam?.logo_url ?? null} />

                <div className="flex flex-shrink-0 items-center gap-2">
                  <ReadOnlyScore score={actualSummary?.displayScore ?? "—"} />
                </div>

                <TeamSide align="left" name={awayTeamName} logoUrl={match.awayTeam?.logo_url ?? null} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <ResultPanel
                  label={isLive ? "התוצאה כרגע" : match.status === "scheduled" ? "טרם התחיל" : "התוצאה בפועל"}
                  value={actualSummary?.displayScore ?? "—"}
                  tone={isLive ? "live" : tone}
                  isScore
                />
                <ResultPanel
                  label={predictionOwnerLabel}
                  value={
                    hiddenPredictionForPrivacy
                      ? "🔒 ? - ?"
                      : hasPrediction && predictionScore
                        ? `${predictionScore}${optimisticIsJoker ? " 👑" : ""}`
                        : "לא נשלח"
                  }
                  tone={hiddenPredictionForPrivacy ? "scheduled" : tone}
                  isScore={!hiddenPredictionForPrivacy && Boolean(hasPrediction && predictionScore)}
                />
                <ResultPanel
                  label="נקודות"
                  value={
                    hiddenPredictionForPrivacy
                      ? "🔒"
                      : typeof pointsEarned === "number"
                        ? String(pointsEarned)
                        : "0"
                  }
                  tone={hiddenPredictionForPrivacy ? "scheduled" : tone}
                  emphasize
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function resolveTone({
  isEditable,
  isLive,
  isFinished,
  hasPrediction,
  exactHit,
  directionHit,
  jokerJackpot,
}: {
  isEditable: boolean;
  isLive: boolean;
  isFinished: boolean;
  hasPrediction: boolean;
  exactHit: boolean;
  directionHit: boolean;
  jokerJackpot: boolean;
}): PredictionTone {
  if (jokerJackpot) return "jackpot";
  if (exactHit) return "success";
  if (directionHit) return "direction";
  if (isFinished) return "miss";
  if (isLive) return "live";
  if (isEditable && hasPrediction) return "saved";
  return "scheduled";
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
  value,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      name={name}
      min="0"
      max="99"
      required
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
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

function parseDraftValue(value: string) {
  const trimmed = value.trim();
  const parsed = trimmed === "" ? 0 : Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
      background: "linear-gradient(135deg, rgba(6,12,30,0.98), rgba(24,13,40,0.98))",
      boxShadow:
        "0 0 0 1px rgba(255,215,0,0.35), 0 0 20px 5px rgba(255,215,0,0.32), 0 0 34px rgba(64,224,255,0.24), 0 0 56px rgba(155,92,255,0.26)",
    };
  }

  if (tone === "success") {
    return {
      borderColor: "rgba(34,197,94,0.95)",
      background: "linear-gradient(135deg, rgba(6,30,15,0.96), rgba(8,25,18,0.92))",
      boxShadow: "0 0 24px rgba(34,197,94,0.18)",
    };
  }

  if (tone === "direction") {
    return {
      borderColor: "rgba(255,222,89,0.58)",
      background: "linear-gradient(135deg, rgba(38,28,8,0.94), rgba(26,20,10,0.9))",
      boxShadow: "0 0 18px rgba(255,222,89,0.12)",
    };
  }

  if (tone === "miss") {
    return {
      borderColor: "rgba(255,92,130,0.64)",
      background: "linear-gradient(135deg, rgba(33,11,18,0.94), rgba(26,12,24,0.92))",
      boxShadow: "0 0 18px rgba(255,92,130,0.12)",
    };
  }

  if (tone === "live") {
    return {
      borderColor: "rgba(255,92,130,0.5)",
      background: "var(--wc-surface)",
      boxShadow: "0 0 18px rgba(255,92,130,0.1)",
    };
  }

  if (tone === "saved") {
    return {
      borderColor: "rgba(109,141,188,0.42)",
      background: "linear-gradient(135deg, rgba(10,18,32,0.96), rgba(11,16,26,0.94))",
      boxShadow: "0 0 18px rgba(79,112,164,0.12)",
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
    return "border-[rgba(34,197,94,0.42)] bg-[rgba(34,197,94,0.12)] text-[#7BFFB1]";
  }

  if (tone === "direction") {
    return "border-[rgba(255,222,89,0.35)] bg-[rgba(255,222,89,0.08)] text-[#FFE9A1]";
  }

  if (tone === "miss") {
    return "border-[rgba(255,92,130,0.28)] bg-[rgba(255,92,130,0.08)] text-[#FFB5C9]";
  }

  if (tone === "live") {
    return "border-[rgba(255,92,130,0.24)] bg-[rgba(255,92,130,0.08)] text-wc-danger";
  }

  if (tone === "saved") {
    return "border-[rgba(109,141,188,0.24)] bg-[rgba(109,141,188,0.08)] text-wc-fg1";
  }

  return "border-white/10 bg-white/5 text-wc-fg1";
}

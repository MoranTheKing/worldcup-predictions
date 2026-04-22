"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertMatchPrediction, type PredictionActionState } from "@/app/actions/predictions";
import {
  getMatchScoreSummary,
  getStageLabelHe,
  type MatchWithTeams,
} from "@/lib/tournament/matches";

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
  const exactHit =
    isFinished &&
    hasPrediction &&
    match.home_score === existingHome &&
    match.away_score === existingAway;
  const jokerJackpot = exactHit && existingIsJoker;
  const disabledReason = "הג'וקר כבר שמור כרגע על משחק אחר באותו מסלול.";

  return (
    <div className="relative overflow-hidden rounded-[1.6rem]">
      {jokerJackpot ? (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-[linear-gradient(135deg,rgba(245,197,24,0.45),rgba(95,255,123,0.35),rgba(111,60,255,0.35))]" />
      ) : null}
      <div
        className="relative overflow-hidden rounded-[1.6rem] border"
        style={{
          borderColor: jokerJackpot
            ? "rgba(245,197,24,0.9)"
            : exactHit
              ? "rgba(95,255,123,0.8)"
              : isJokerSelected || existingIsJoker
                ? "rgba(111,60,255,0.5)"
                : state?.success
                  ? "rgba(95,255,123,0.4)"
                  : "var(--wc-border)",
          background:
            jokerJackpot
              ? "linear-gradient(135deg, rgba(27,20,6,0.96), rgba(19,15,33,0.95))"
              : exactHit
                ? "linear-gradient(135deg, rgba(8,24,17,0.95), rgba(8,19,33,0.92))"
                : "var(--wc-surface)",
          boxShadow: jokerJackpot
            ? "0 0 34px rgba(245,197,24,0.28)"
            : exactHit
              ? "0 0 24px rgba(95,255,123,0.18)"
              : isJokerSelected
                ? "0 0 18px rgba(111,60,255,0.2)"
                : undefined,
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: "var(--wc-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-wc-fg3">{stageLabel}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isFinished
                  ? "bg-[rgba(95,255,123,0.12)] text-wc-neon"
                  : isLive
                    ? "bg-[rgba(255,92,130,0.12)] text-wc-danger"
                    : "bg-white/6 text-wc-fg3"
              }`}
            >
              {isFinished ? "FT" : isLive ? "LIVE" : "UPCOMING"}
            </span>
            {jokerJackpot ? (
              <span className="rounded-full bg-[rgba(245,197,24,0.16)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--wc-amber)]">
                JOKER HIT ✨
              </span>
            ) : exactHit ? (
              <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-[10px] font-bold text-wc-neon">
                PERFECT HIT
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
            <TeamSide
              align="right"
              name={homeTeamName}
              logoUrl={match.homeTeam?.logo_url ?? null}
            />

            <div className="flex flex-shrink-0 items-center gap-2">
              {isEditable ? (
                <>
                  <ScoreInput name="home_score" defaultValue={existingHome} disabled={isPending} />
                  <span className="text-sm font-black text-wc-fg3">:</span>
                  <ScoreInput name="away_score" defaultValue={existingAway} disabled={isPending} />
                </>
              ) : (
                <ReadOnlyScore score={actualSummary?.displayScore ?? "—"} />
              )}
            </div>

            <TeamSide
              align="left"
              name={awayTeamName}
              logoUrl={match.awayTeam?.logo_url ?? null}
            />
          </div>

          {isEditable ? (
            <form action={formAction} className="mt-3">
              <input
                type="hidden"
                name="is_joker_applied"
                value={isJokerSelected ? "true" : "false"}
              />

              <div>
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
              </div>

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
                  ) : hasPrediction ? (
                    <p className="text-xs text-wc-fg3">
                      ניחוש קיים: {existingHome}:{existingAway}
                      {existingIsJoker ? " 🎏" : ""}
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
                tone={isLive ? "live" : "neutral"}
              />
              <ResultPanel
                label="הניחוש שלך"
                value={hasPrediction ? `${existingHome}:${existingAway}${existingIsJoker ? " 🎏" : ""}` : "לא נשמר"}
                tone={exactHit ? "success" : "neutral"}
              />
              <ResultPanel
                label="נקודות"
                value={typeof pointsEarned === "number" ? String(pointsEarned) : "0"}
                tone={jokerJackpot ? "jackpot" : exactHit ? "success" : "neutral"}
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
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      {align === "right" ? (
        <>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 flex-shrink-0 object-contain" />
          ) : null}
          <span className="truncate text-sm font-bold text-wc-fg1">{name}</span>
        </>
      ) : (
        <>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-7 w-7 flex-shrink-0 object-contain" />
          ) : null}
          <span className="truncate text-sm font-bold text-wc-fg1">{name}</span>
        </>
      )}
    </div>
  );
}

function ResultPanel({
  label,
  value,
  tone,
  emphasize = false,
}: {
  label: string;
  value: string;
  tone: "neutral" | "success" | "jackpot" | "live";
  emphasize?: boolean;
}) {
  const styles =
    tone === "jackpot"
      ? "border-[rgba(245,197,24,0.35)] bg-[rgba(245,197,24,0.08)] text-[color:var(--wc-amber)]"
      : tone === "success"
        ? "border-[rgba(95,255,123,0.28)] bg-[rgba(95,255,123,0.08)] text-wc-neon"
        : tone === "live"
          ? "border-[rgba(255,92,130,0.24)] bg-[rgba(255,92,130,0.08)] text-wc-danger"
          : "border-white/10 bg-white/5 text-wc-fg1";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${styles}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">{label}</p>
      <p className={`mt-2 ${emphasize ? "text-3xl" : "text-lg"} font-black`}>{value}</p>
    </div>
  );
}

function ReadOnlyScore({ score }: { score: string }) {
  return (
    <div className="min-w-[108px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-lg font-black text-wc-fg1">
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

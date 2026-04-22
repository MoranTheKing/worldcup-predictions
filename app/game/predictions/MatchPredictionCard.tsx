"use client";

import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertMatchPrediction, type PredictionActionState } from "@/app/actions/predictions";
import type { MatchWithTeams } from "@/lib/tournament/matches";

const STAGE_LABELS: Record<string, string> = {
  group: "שלב הבתים",
  round_of_32: "32 האחרונות",
  round_of_16: "16 האחרונות",
  quarter_final: "רבע הגמר",
  semi_final: "חצי הגמר",
  third_place: "מקום 3",
  final: "הגמר",
};

export default function MatchPredictionCard({
  match,
  existingHome,
  existingAway,
  existingIsJoker,
  isJokerSelected,
  canUseJoker,
  onToggleJoker,
}: {
  match: MatchWithTeams;
  existingHome: number | null;
  existingAway: number | null;
  existingIsJoker: boolean;
  isJokerSelected: boolean;
  canUseJoker: boolean;
  onToggleJoker: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
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
  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;
  const matchDate = new Date(match.date_time);
  const disabledReason = "הג'וקר כבר שמור כרגע על משחק אחר באותו שלב.";

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: isJokerSelected
          ? "rgba(111,60,255,0.5)"
          : state?.success
            ? "rgba(95,255,123,0.4)"
            : "var(--wc-border)",
        background: "var(--wc-surface)",
        boxShadow: isJokerSelected ? "0 0 18px rgba(111,60,255,0.2)" : undefined,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: "var(--wc-border)" }}
      >
        <span className="text-[11px] font-semibold text-wc-fg3">{stageLabel}</span>
        <span className="text-[11px] font-semibold text-wc-fg3">
          {matchDate.toLocaleDateString("he-IL", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      <form action={formAction} className="px-4 py-4">
        <input
          type="hidden"
          name="is_joker_applied"
          value={isJokerSelected ? "true" : "false"}
        />

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {match.homeTeam?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.homeTeam.logo_url}
                alt=""
                className="h-7 w-7 flex-shrink-0 object-contain"
              />
            ) : null}
            <span className="truncate text-right text-sm font-bold text-wc-fg1">
              {homeTeamName}
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <ScoreInput name="home_score" defaultValue={existingHome} disabled={isPending} />
            <span className="text-sm font-black text-wc-fg3">:</span>
            <ScoreInput name="away_score" defaultValue={existingAway} disabled={isPending} />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {match.awayTeam?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.awayTeam.logo_url}
                alt=""
                className="h-7 w-7 flex-shrink-0 object-contain"
              />
            ) : null}
            <span className="truncate text-left text-sm font-bold text-wc-fg1">
              {awayTeamName}
            </span>
          </div>
        </div>

        <div className="mt-3">
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
            ) : existingHome !== null && existingAway !== null ? (
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

"use client";

import { useActionState } from "react";
import { upsertMatchPrediction, type PredictionActionState } from "@/app/actions/predictions";
import type { MatchWithTeams } from "@/lib/tournament/matches";

interface Props {
  match: MatchWithTeams;
  existingHome: number | null;
  existingAway: number | null;
}

const STAGE_LABELS: Record<string, string> = {
  group: "שלב בתים",
  round_of_32: "32 האחרונות",
  round_of_16: "16 האחרונות",
  quarter_final: "רבע גמר",
  semi_final: "חצי גמר",
  third_place: "מקום שלישי",
  final: "גמר",
};

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
      defaultValue={defaultValue ?? ""}
      placeholder="0"
      className="wc-input w-16 text-center text-lg font-black"
      style={{ padding: "0.5rem 0.25rem" }}
    />
  );
}

export default function MatchPredictionCard({ match, existingHome, existingAway }: Props) {
  const boundAction = upsertMatchPrediction.bind(null, match.match_number);
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    boundAction,
    null
  );

  const homeTeamName = match.homeTeam?.name_he ?? match.homeTeam?.name ?? match.home_placeholder ?? "?";
  const awayTeamName = match.awayTeam?.name_he ?? match.awayTeam?.name ?? match.away_placeholder ?? "?";
  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage;

  const matchDate = new Date(match.date_time);
  const dateStr = matchDate.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasSaved = existingHome !== null && existingAway !== null;
  const justSaved = state?.success === true;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--wc-surface)",
        border: `1px solid ${justSaved ? "rgba(95,255,123,0.4)" : "var(--wc-border)"}`,
        transition: "border-color 300ms",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "var(--wc-border)" }}
      >
        <span className="text-[11px] font-semibold" style={{ color: "var(--wc-fg3)" }}>
          {stageLabel}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: "var(--wc-fg3)" }}>
          {dateStr}
        </span>
      </div>

      {/* Teams + score inputs */}
      <form action={formAction} className="px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Home team */}
          <div className="flex flex-1 items-center gap-2 justify-end min-w-0">
            {match.homeTeam?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.homeTeam.logo_url}
                alt=""
                className="h-7 w-7 object-contain flex-shrink-0"
              />
            )}
            <span
              className="truncate text-sm font-bold text-right"
              style={{ color: "var(--wc-fg1)" }}
            >
              {homeTeamName}
            </span>
          </div>

          {/* Score inputs */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ScoreInput name="home_score" defaultValue={existingHome} disabled={isPending} />
            <span className="text-sm font-black" style={{ color: "var(--wc-fg3)" }}>:</span>
            <ScoreInput name="away_score" defaultValue={existingAway} disabled={isPending} />
          </div>

          {/* Away team */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {match.awayTeam?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.awayTeam.logo_url}
                alt=""
                className="h-7 w-7 object-contain flex-shrink-0"
              />
            )}
            <span
              className="truncate text-sm font-bold text-left"
              style={{ color: "var(--wc-fg1)" }}
            >
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* Status / error */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-h-[1.25rem]">
            {state?.error && (
              <p
                role="alert"
                className="text-xs font-semibold"
                style={{ color: "var(--wc-danger)" }}
              >
                {state.error}
              </p>
            )}
            {justSaved && (
              <p className="text-xs font-semibold" style={{ color: "var(--wc-neon)" }}>
                ✓ הניחוש נשמר
              </p>
            )}
            {hasSaved && !justSaved && !state?.error && (
              <p className="text-xs" style={{ color: "var(--wc-fg3)" }}>
                ניחוש קיים: {existingHome}:{existingAway}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="wc-button-primary px-4 py-2 text-xs font-bold flex-shrink-0 disabled:opacity-50"
          >
            {isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                שומר
              </span>
            ) : (
              "שמור ניחוש"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

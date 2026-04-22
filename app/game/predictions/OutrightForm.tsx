"use client";

import { useActionState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import type { TeamOption, TournamentPredRow } from "./PredictionsClient";

interface Props {
  teams: TeamOption[];
  existing: TournamentPredRow | null;
}

export default function OutrightForm({ teams, existing }: Props) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null
  );

  const justSaved = state?.success === true;

  return (
    <form
      action={formAction}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl mt-0.5">🏆</span>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--wc-fg1)" }}>
            ניחושי טורניר
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--wc-fg2)" }}>
            מי יזכה ומי יהיה מלך השערים?
          </p>
        </div>
      </div>

      {/* Winner team */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          אלוף הטורניר
        </label>
        <select
          name="winner_team_id"
          className="wc-input text-sm"
          defaultValue={existing?.predicted_winner_team_id ?? ""}
        >
          <option value="">— בחר קבוצה —</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Top scorer */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold" style={{ color: "var(--wc-fg2)" }}>
          מלך השערים (שם מלא)
        </label>
        <input
          name="top_scorer"
          type="text"
          maxLength={100}
          placeholder="למשל: Erling Haaland"
          className="wc-input text-sm"
          defaultValue={existing?.predicted_top_scorer_name ?? ""}
        />
      </div>

      {/* Feedback */}
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{ background: "var(--wc-danger-bg)", color: "var(--wc-danger)" }}
        >
          {state.error}
        </p>
      )}
      {justSaved && (
        <p className="text-sm font-semibold" style={{ color: "var(--wc-neon)" }}>
          ✓ ניחושי הטורניר נשמרו
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="wc-button-primary px-4 py-3 text-sm font-bold disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            שומר...
          </span>
        ) : (
          "שמור ניחושי טורניר"
        )}
      </button>
    </form>
  );
}

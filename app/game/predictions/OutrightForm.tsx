"use client";

import { useActionState, useMemo, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";

export type PickerTeam = {
  id: string;
  name: string;
  name_he: string | null;
  logo_url: string | null;
};

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

export default function OutrightForm({
  teams,
  players,
  existing,
}: {
  teams: PickerTeam[];
  players: PickerPlayer[];
  existing: {
    predicted_winner_team_id: string | null;
    predicted_top_scorer_name: string | null;
  } | null;
}) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null,
  );

  const initialWinnerId = existing?.predicted_winner_team_id ?? "";
  const initialTopScorer = existing?.predicted_top_scorer_name ?? "";
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [topScorerName, setTopScorerName] = useState(initialTopScorer);
  const pickerResetKey = state?.success ? state.savedAt ?? "saved" : "stable";

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((left, right) =>
        (left.name_he ?? left.name).localeCompare(right.name_he ?? right.name, "he"),
      ),
    [teams],
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((left, right) => {
      const leftWinner = left.team_id === winnerId;
      const rightWinner = right.team_id === winnerId;

      if (leftWinner && !rightWinner) return -1;
      if (!leftWinner && rightWinner) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [players, winnerId]);

  const hasExistingTopScorerOption = sortedPlayers.some((player) => player.name === topScorerName);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/8 bg-[rgba(6,13,26,0.3)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">ניחושי הטורניר</p>
        <p className="mt-1 text-xs text-wc-fg2">
          הזוכה ומלך השערים נשמרים יחד, אבל כל שדה נשאר יציב מקומית גם כשמעדכנים את השדה השני.
        </p>
      </div>

      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerName} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="winner-select" className="text-xs font-semibold text-wc-fg2">
            זוכת הטורניר
          </label>
          <select
            key={`winner-${pickerResetKey}`}
            id="winner-select"
            value={winnerId}
            onChange={(event) => setWinnerId(event.target.value)}
            className="wc-input text-sm"
          >
            <option value="">-- בחר נבחרת --</option>
            {sortedTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name_he ?? team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="top-scorer-select" className="text-xs font-semibold text-wc-fg2">
            מלך השערים
          </label>
          <select
            key={`scorer-${pickerResetKey}-${winnerId || "none"}`}
            id="top-scorer-select"
            value={hasExistingTopScorerOption ? topScorerName : ""}
            onChange={(event) => setTopScorerName(event.target.value)}
            className="wc-input text-sm"
          >
            <option value="">-- בחר שחקן --</option>
            {!hasExistingTopScorerOption && topScorerName ? (
              <option value={topScorerName}>{`שמור: ${topScorerName}`}</option>
            ) : null}
            {sortedPlayers.map((player) => {
              const prefix = player.team_id === winnerId && winnerId ? "★ " : "";
              return (
                <option key={player.id} value={player.name}>
                  {`${prefix}${player.name}`}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-wc-fg3">שחקני הנבחרת שבחרת לזכייה מופיעים בראש הרשימה.</p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="wc-button-primary h-fit px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {isPending ? "שומר..." : "שמור"}
        </button>
      </div>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-wc-danger">
          {state.error}
        </p>
      ) : state?.success ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-wc-neon">
          <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-xs">✓</span>
          ניחושי הטורניר נשמרו.
        </p>
      ) : null}
    </form>
  );
}

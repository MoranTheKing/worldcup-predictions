"use client";

import { useActionState, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import TeamPicker, { type PickerTeam } from "@/components/pickers/TeamPicker";
import PlayerPicker, { type PickerPlayer } from "@/components/pickers/PlayerPicker";

// Types exported for use by PredictionsClient
export type { PickerTeam, PickerPlayer };

interface Props {
  teams: PickerTeam[];
  players: PickerPlayer[];
  existing: {
    predicted_winner_team_id: number | null;
    predicted_top_scorer_name: string | null;
  } | null;
}

export default function OutrightForm({ teams, players, existing }: Props) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null
  );

  const justSaved = state?.success === true;
  const hasPlayerData = players.length > 0;

  // Resolve initial winner label from teams list
  const initialWinnerId = existing?.predicted_winner_team_id
    ? String(existing.predicted_winner_team_id)
    : "";
  const initialWinnerLabel = (() => {
    if (!initialWinnerId) return "";
    const t = teams.find((t) => String(t.id) === initialWinnerId);
    return t ? (t.name_he ?? t.name) : "";
  })();

  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [winnerLabel, setWinnerLabel] = useState(initialWinnerLabel);
  const [selectedPlayer, setSelectedPlayer] = useState<PickerPlayer | null>(null);
  const [topScorerText, setTopScorerText] = useState(
    existing?.predicted_top_scorer_name ?? ""
  );

  // Sort teams alphabetically by Hebrew name
  const sortedTeams = [...teams].sort((a, b) =>
    (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he")
  );

  // Sort players: winner team's players first, then alphabetical
  const sortedPlayers = [...players].sort((a, b) => {
    const aWin = String(a.team_id) === winnerId;
    const bWin = String(b.team_id) === winnerId;
    if (aWin && !bWin) return -1;
    if (!aWin && bWin) return 1;
    return a.name.localeCompare(b.name);
  });

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

      {/* Hidden inputs carry the controlled state to the server action */}
      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input
        type="hidden"
        name="top_scorer"
        value={hasPlayerData ? (selectedPlayer?.name ?? "") : topScorerText}
      />

      {/* Winner team — premium searchable picker */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium" style={{ color: "var(--wc-fg2)" }}>
          🏆 זוכה הטורניר
        </p>
        <TeamPicker
          teams={sortedTeams}
          value={winnerId}
          label={winnerLabel}
          onChange={(id, label) => {
            setWinnerId(id);
            setWinnerLabel(label);
            setSelectedPlayer(null);
          }}
          placeholder="-- בחר קבוצה --"
        />
      </div>

      {/* Top scorer — PlayerPicker if data exists, plain input otherwise */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium" style={{ color: "var(--wc-fg2)" }}>
          ⚽ מלך השערים
        </p>
        {hasPlayerData ? (
          <PlayerPicker
            players={sortedPlayers}
            winnerId={winnerId}
            value={selectedPlayer}
            onChange={setSelectedPlayer}
          />
        ) : (
          <input
            type="text"
            value={topScorerText}
            onChange={(e) => setTopScorerText(e.target.value)}
            placeholder="שם השחקן (לדוגמה: Erling Haaland)"
            className="w-full text-sm"
            style={{
              background: "var(--wc-raised)",
              border: "1.5px solid var(--wc-border)",
              borderRadius: 12,
              color: "var(--wc-fg1)",
              padding: "10px 14px",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--wc-neon)";
              e.target.style.boxShadow = "0 0 0 3px var(--wc-neon-glow)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--wc-border)";
              e.target.style.boxShadow = "none";
            }}
          />
        )}
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
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
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

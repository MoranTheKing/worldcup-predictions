"use client";

import { useActionState, useMemo, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import TeamPicker from "@/components/pickers/TeamPicker";
import PlayerPicker from "@/components/pickers/PlayerPicker";

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
  const initialWinner = teams.find((team) => team.id === initialWinnerId) ?? null;
  const initialTopScorer = existing?.predicted_top_scorer_name ?? "";
  const initialPlayer =
    players.find((player) => player.name === initialTopScorer) ?? null;

  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [winnerLabel, setWinnerLabel] = useState(
    initialWinner ? (initialWinner.name_he ?? initialWinner.name) : "",
  );
  const [topScorerText, setTopScorerText] = useState(initialTopScorer);
  const [selectedPlayer, setSelectedPlayer] = useState<PickerPlayer | null>(initialPlayer);

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((a, b) =>
        (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he"),
      ),
    [teams],
  );

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aWinner = a.team_id === winnerId;
      const bWinner = b.team_id === winnerId;

      if (aWinner && !bWinner) return -1;
      if (!aWinner && bWinner) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [players, winnerId]);

  const topScorerValue = selectedPlayer?.name ?? topScorerText;

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/8 bg-[rgba(6,13,26,0.3)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">ניחושי הטורניר</p>
        <p className="mt-1 text-xs text-wc-fg2">
          הזוכה ומלך השערים נשמרים יחד, אבל כל שדה נשאר יציב מקומית גם כשאתה משנה את השני.
        </p>
      </div>

      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerValue} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-wc-fg2">זוכת הטורניר</label>
          <TeamPicker
            teams={sortedTeams}
            value={winnerId}
            label={winnerLabel}
            placeholder="-- בחר נבחרת --"
            onChange={(id, label) => {
              setWinnerId(id);
              setWinnerLabel(label);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-wc-fg2">מלך השערים</label>
          {sortedPlayers.length > 0 ? (
            <PlayerPicker
              players={sortedPlayers}
              winnerId={winnerId}
              value={selectedPlayer}
              onChange={(player) => {
                setSelectedPlayer(player);
                if (player) {
                  setTopScorerText(player.name);
                }
              }}
            />
          ) : (
            <input
              type="text"
              value={topScorerText}
              onChange={(event) => {
                setSelectedPlayer(null);
                setTopScorerText(event.target.value);
              }}
              placeholder="שם השחקן"
              className="wc-input text-sm"
            />
          )}

          {sortedPlayers.length > 0 ? (
            <input
              type="text"
              value={topScorerText}
              onChange={(event) => {
                setSelectedPlayer(null);
                setTopScorerText(event.target.value);
              }}
              placeholder="או כתוב שם חופשי"
              className="wc-input text-sm"
            />
          ) : null}
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

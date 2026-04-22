"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import TeamPicker, { type PickerTeam } from "@/components/pickers/TeamPicker";
import PlayerPicker, { type PickerPlayer } from "@/components/pickers/PlayerPicker";

export type { PickerPlayer, PickerTeam };

interface Props {
  teams: PickerTeam[];
  players: PickerPlayer[];
  existing: {
    predicted_winner_team_id: string | null;
    predicted_top_scorer_name: string | null;
  } | null;
}

export default function OutrightForm({ teams, players, existing }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null,
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!state?.success) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition, state?.savedAt, state?.success]);

  const hasPlayerData = players.length > 0;
  const initialWinnerId = existing?.predicted_winner_team_id ?? "";
  const initialWinnerLabel = (() => {
    if (!initialWinnerId) {
      return "";
    }

    const team = teams.find((row) => row.id === initialWinnerId);
    return team ? (team.name_he ?? team.name) : "";
  })();

  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [winnerLabel, setWinnerLabel] = useState(initialWinnerLabel);
  const [selectedPlayer, setSelectedPlayer] = useState<PickerPlayer | null>(null);
  const [topScorerText, setTopScorerText] = useState(
    existing?.predicted_top_scorer_name ?? "",
  );

  const sortedTeams = [...teams].sort((a, b) =>
    (a.name_he ?? a.name).localeCompare(b.name_he ?? b.name, "he"),
  );

  const sortedPlayers = [...players].sort((a, b) => {
    const aWinner = a.team_id === winnerId;
    const bWinner = b.team_id === winnerId;

    if (aWinner && !bWinner) return -1;
    if (!aWinner && bWinner) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/8 bg-[rgba(6,13,26,0.3)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">ניחושי הטורניר</p>
        <p className="mt-1 text-xs text-wc-fg2">
          בחר זוכה לטורניר והגדר טקסט חופשי או שחקן למלך השערים.
        </p>
      </div>

      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input
        type="hidden"
        name="top_scorer"
        value={hasPlayerData ? (selectedPlayer?.name ?? topScorerText) : topScorerText}
      />

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
              setSelectedPlayer(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-wc-fg2">מלך השערים</label>
          {hasPlayerData ? (
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
              onChange={(event) => setTopScorerText(event.target.value)}
              placeholder="שם השחקן"
              className="wc-input text-sm"
            />
          )}
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
        <p className="mt-3 text-sm font-semibold text-wc-neon">ניחושי הטורניר נשמרו.</p>
      ) : null}
    </form>
  );
}

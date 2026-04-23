"use client";

import { useActionState, useMemo, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import OutrightChoiceBadge from "@/components/game/OutrightChoiceBadge";
import PlayerPicker from "@/components/pickers/PlayerPicker";
import TeamPicker from "@/components/pickers/TeamPicker";

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
  isLocked = false,
}: {
  teams: PickerTeam[];
  players: PickerPlayer[];
  existing: {
    predicted_winner_team_id: string | null;
    predicted_top_scorer_name: string | null;
  } | null;
  isLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null,
  );

  const initialWinnerId = existing?.predicted_winner_team_id ?? "";
  const initialTopScorer = existing?.predicted_top_scorer_name ?? "";
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [topScorerName, setTopScorerName] = useState(initialTopScorer);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === winnerId) ?? null,
    [teams, winnerId],
  );
  const selectedPlayer = useMemo(
    () => players.find((player) => player.name === topScorerName) ?? null,
    [players, topScorerName],
  );

  const sortedTeams = useMemo(
    () =>
      [...teams].sort((left, right) =>
        (left.name_he ?? left.name).localeCompare(right.name_he ?? right.name, "he"),
      ),
    [teams],
  );

  const sortedPlayers = useMemo(
    () =>
      [...players].sort((left, right) => {
        const leftWinner = left.team_id === winnerId;
        const rightWinner = right.team_id === winnerId;

        if (leftWinner && !rightWinner) return -1;
        if (!leftWinner && rightWinner) return 1;
        return left.name.localeCompare(right.name);
      }),
    [players, winnerId],
  );

  if (isLocked) {
    return (
      <div className="space-y-3">
        <div className="grid gap-4 lg:grid-cols-2">
          <OutrightChoiceBadge
            kind="winner"
            label="זוכת הטורניר"
            value={selectedTeam ? selectedTeam.name_he ?? selectedTeam.name : null}
            logoUrl={selectedTeam?.logo_url ?? null}
            locked
            size="hero"
          />
          <OutrightChoiceBadge
            kind="topScorer"
            label="מלך השערים"
            value={selectedPlayer?.name ?? (topScorerName || null)}
            locked
            size="hero"
          />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerName} />

      <div className="grid gap-4 xl:grid-cols-[1fr,auto] xl:items-end">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
              זוכת הטורניר
            </label>
            <TeamPicker teams={sortedTeams} value={winnerId} onChange={setWinnerId} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
              מלך השערים
            </label>
            <PlayerPicker
              players={sortedPlayers}
              winnerId={winnerId}
              value={selectedPlayer}
              fallbackLabel={selectedPlayer ? undefined : topScorerName || undefined}
              onChange={(player) => setTopScorerName(player?.name ?? "")}
            />
          </div>
        </div>

        <div className="flex justify-start xl:justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="wc-button-primary h-fit min-w-28 px-5 py-3 text-sm font-bold disabled:opacity-50"
          >
            {isPending ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-1.5">
          {selectedTeam ? (
            <OutrightChoiceBadge
              kind="winner"
              label="זוכת הטורניר"
              value={selectedTeam.name_he ?? selectedTeam.name}
              logoUrl={selectedTeam.logo_url}
              size="hero"
            />
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-wc-fg3">
              עדיין לא נבחרה זוכת טורניר.
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          {selectedPlayer || topScorerName ? (
            <OutrightChoiceBadge
              kind="topScorer"
              label="מלך השערים"
              value={selectedPlayer?.name ?? topScorerName}
              size="hero"
            />
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-wc-fg3">
              עדיין לא נבחר מלך שערים.
            </div>
          )}
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm font-semibold text-wc-danger">
          {state.error}
        </p>
      ) : state?.success ? (
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-wc-neon">
          <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-2 py-0.5 text-xs">✓</span>
          ניחושי הטורניר נשמרו.
        </p>
      ) : null}
    </form>
  );
}

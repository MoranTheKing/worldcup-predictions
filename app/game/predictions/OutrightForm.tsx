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
      <div className="rounded-2xl border border-white/8 bg-[rgba(6,13,26,0.3)] p-5">
        <div className="mb-4">
          <p className="text-sm font-bold text-wc-fg1">ניחושי הטורניר</p>
          <p className="mt-1 text-xs text-wc-fg2">
            הבחירות שלך ננעלו עם פתיחת הטורניר ואינן ניתנות לעריכה.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <OutrightChoiceBadge
            kind="winner"
            label="זוכת הטורניר"
            value={selectedTeam ? selectedTeam.name_he ?? selectedTeam.name : null}
            logoUrl={selectedTeam?.logo_url ?? null}
            locked
          />
          <OutrightChoiceBadge
            kind="topScorer"
            label="מלך השערים"
            value={selectedPlayer?.name ?? (topScorerName || null)}
            locked
          />
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-white/8 bg-[rgba(6,13,26,0.3)] p-5"
    >
      <div className="mb-4">
        <p className="text-sm font-bold text-wc-fg1">ניחושי הטורניר</p>
        <p className="mt-1 text-xs text-wc-fg2">
          זוכת הטורניר ומלך השערים נשמרים בנפרד, כך שכל בחירה מתעדכנת בלי למחוק את השנייה.
        </p>
      </div>

      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerName} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-wc-fg2">זוכת הטורניר</label>
          <TeamPicker teams={sortedTeams} value={winnerId} onChange={setWinnerId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-wc-fg2">מלך השערים</label>
          <PlayerPicker
            players={sortedPlayers}
            winnerId={winnerId}
            value={selectedPlayer}
            fallbackLabel={selectedPlayer ? undefined : topScorerName || undefined}
            onChange={(player) => setTopScorerName(player?.name ?? "")}
          />
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

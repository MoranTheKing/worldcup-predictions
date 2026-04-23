"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
              זוכת הטורניר
            </div>
            <div className="mt-3 flex items-center gap-3">
              {selectedTeam?.logo_url ? (
                <Image
                  src={selectedTeam.logo_url}
                  alt=""
                  width={40}
                  height={28}
                  className="h-7 w-10 rounded-[6px] object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-7 w-10 rounded-[6px] bg-white/8" />
              )}
              <div className="text-2xl font-black text-wc-fg1">
                {selectedTeam ? selectedTeam.name_he ?? selectedTeam.name : "לא נבחרה"}
              </div>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
              מלך השערים
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-wc-fg2">
                <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 1.5c-3.05 0-5.75 1.54-6.77 3.86-.19.44.13.94.61.94h12.32c.48 0 .8-.5.61-.94C15.75 13.04 13.05 11.5 10 11.5Z" />
                </svg>
              </span>
              <div className="text-2xl font-black text-wc-fg1">
                {selectedPlayer?.name || topScorerName || "לא נבחר"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerName} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wc-fg3">
            לפני שריקת הפתיחה
          </div>
          <div className="mt-1 text-sm text-wc-fg2">
            בוחרים פעם אחת, שומרים, וממשיכים ישר ללוח המשחקים.
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="wc-button-primary h-fit min-w-28 px-5 py-3 text-sm font-bold disabled:opacity-50"
        >
          {isPending ? "שומר..." : "שמור"}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
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

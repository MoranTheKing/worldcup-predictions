"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import {
  upsertTournamentPrediction,
  type PredictionActionState,
} from "@/app/actions/predictions";
import PlayerPicker from "@/components/pickers/PlayerPicker";
import TeamPicker from "@/components/pickers/TeamPicker";
import TeamLink from "@/components/TeamLink";
import { calculateOutrightPoints, type OutrightPredictionType } from "@/lib/game/scoring";

export type PickerTeam = {
  id: string;
  name: string;
  name_he: string | null;
  logo_url: string | null;
  outright_odds?: number | string | null;
};

export type PickerPlayer = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
  top_scorer_odds?: number | string | null;
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
    predicted_winner_odds?: number | string | null;
    predicted_scorer_odds?: number | string | null;
    winner_points_earned?: number | null;
    scorer_points_earned?: number | null;
  } | null;
  isLocked?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<PredictionActionState, FormData>(
    upsertTournamentPrediction,
    null,
  );

  const initialWinnerId = existing?.predicted_winner_team_id ?? "";
  const initialTopScorer = existing?.predicted_top_scorer_name ?? "";
  const initialTopScorerPlayer =
    players.find((player) => player.name === initialTopScorer)?.id ?? null;
  const [winnerId, setWinnerId] = useState(initialWinnerId);
  const [topScorerName, setTopScorerName] = useState(initialTopScorer);
  const [topScorerPlayerId, setTopScorerPlayerId] = useState<number | null>(
    initialTopScorerPlayer,
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === winnerId) ?? null,
    [teams, winnerId],
  );
  const selectedPlayer = useMemo(
    () =>
      players.find((player) => player.id === topScorerPlayerId) ??
      players.find((player) => player.name === topScorerName) ??
      null,
    [players, topScorerName, topScorerPlayerId],
  );
  const winnerReward = getOutrightReward(
    "winner",
    selectedTeam?.outright_odds ?? existing?.predicted_winner_odds,
  );
  const scorerReward = getOutrightReward(
    "scorer",
    selectedPlayer?.top_scorer_odds ?? existing?.predicted_scorer_odds,
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
                  style={{ height: 28, width: 40 }}
                  unoptimized
                />
              ) : (
                <div className="h-7 w-10 rounded-[6px] bg-white/8" />
              )}
              {selectedTeam ? (
                <TeamLink
                  team={selectedTeam}
                  className="min-w-0 truncate text-2xl font-black text-wc-fg1 transition hover:text-wc-neon"
                >
                  {selectedTeam.name_he ?? selectedTeam.name}
                </TeamLink>
              ) : (
                <div className="text-2xl font-black text-wc-fg1">לא נבחרה</div>
              )}
            </div>
            <OutrightRewardChip reward={winnerReward} settledPoints={existing?.winner_points_earned} />
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
            <OutrightRewardChip reward={scorerReward} settledPoints={existing?.scorer_points_earned} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="winner_team_id" value={winnerId} />
      <input type="hidden" name="top_scorer" value={topScorerName} />
      <input type="hidden" name="top_scorer_player_id" value={topScorerPlayerId ?? ""} />

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
            onChange={(player) => {
              setTopScorerName(player?.name ?? "");
              setTopScorerPlayerId(player?.id ?? null);
            }}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OutrightRewardPreview
          title="ניקוד לזוכה"
          reward={winnerReward}
          emptyLabel="בחר נבחרת כדי לראות את הפרס"
        />
        <OutrightRewardPreview
          title="ניקוד למלך השערים"
          reward={scorerReward}
          emptyLabel="בחר שחקן כדי לראות את הפרס"
        />
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

type OutrightReward = {
  odds: number;
  points: number;
} | null;

function OutrightRewardPreview({
  title,
  reward,
  emptyLabel,
}: {
  title: string;
  reward: OutrightReward;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-black/18 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-wc-fg3">
        {title}
      </div>
      {reward ? (
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-sans text-3xl font-black tracking-normal text-wc-neon">
              +{reward.points}
            </p>
            <p className="mt-1 text-xs text-wc-fg3">נקודות אם הפגיעה נכונה</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-wc-fg2">
            יחס {reward.odds.toFixed(2)}
          </span>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white/[0.045] px-3 py-3 text-sm font-semibold text-wc-fg3">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

function OutrightRewardChip({
  reward,
  settledPoints,
}: {
  reward: OutrightReward;
  settledPoints?: number | null;
}) {
  if (!reward && !settledPoints) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black">
      {reward ? (
        <span className="rounded-full bg-[rgba(95,255,123,0.14)] px-3 py-1 text-wc-neon">
          פרס אפשרי +{reward.points}
        </span>
      ) : null}
      {reward ? (
        <span className="rounded-full bg-white/8 px-3 py-1 text-wc-fg3">
          יחס {reward.odds.toFixed(2)}
        </span>
      ) : null}
      {settledPoints ? (
        <span className="rounded-full bg-[rgba(245,197,24,0.14)] px-3 py-1 text-[#F5D56B]">
          מומש +{settledPoints}
        </span>
      ) : null}
    </div>
  );
}

function getOutrightReward(
  type: OutrightPredictionType,
  odds: number | string | null | undefined,
): OutrightReward {
  const normalized = normalizeOdds(odds);
  if (normalized === null) return null;
  return {
    odds: normalized,
    points: calculateOutrightPoints(type, normalized),
  };
}

function normalizeOdds(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

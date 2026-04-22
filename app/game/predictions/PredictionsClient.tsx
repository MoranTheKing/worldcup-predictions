"use client";

import Link from "next/link";
import type { MatchWithTeams } from "@/lib/tournament/matches";
import MatchPredictionCard from "./MatchPredictionCard";
import OutrightForm from "./OutrightForm";
import type { PickerPlayer, PickerTeam } from "./OutrightForm";

export type MatchPredictionRow = {
  match_id: number;
  home_score_guess: number | null;
  away_score_guess: number | null;
  is_joker_applied: boolean | null;
};

export type TournamentPredRow = {
  predicted_winner_team_id: string | null;
  predicted_top_scorer_name: string | null;
};

interface Props {
  matches: MatchWithTeams[];
  teams: PickerTeam[];
  players: PickerPlayer[];
  existingPredictions: MatchPredictionRow[];
  tournamentPrediction: TournamentPredRow | null;
  isAuthenticated: boolean;
  groupJokerUsed: boolean;
  knockoutJokerUsed: boolean;
}

export default function PredictionsClient({
  matches,
  teams,
  players,
  existingPredictions,
  tournamentPrediction,
  isAuthenticated,
  groupJokerUsed,
  knockoutJokerUsed,
}: Props) {
  const predictionMap = new Map(
    existingPredictions.map((prediction) => [prediction.match_id, prediction]),
  );

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-10 text-center"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <div className="text-5xl">🔐</div>
        <p className="mt-3 text-base font-semibold text-wc-fg2">
          צריך להתחבר כדי לנהל ניחושים וג&apos;וקרים.
        </p>
        <Link
          href="/login?next=/game/predictions"
          className="wc-button-primary mt-5 inline-flex px-6 py-3 text-sm font-bold"
        >
          התחבר עכשיו
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-white/8 bg-[rgba(13,27,46,0.82)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
              הניחושים שלי
            </p>
            <p className="mt-2 text-sm text-wc-fg2">
              כל משחק פתוח שומר כברירת מחדל תוצאה של 0:0, ואת הג&apos;וקר מפעילים רק פעם אחת לכל מסלול.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label="ג'וקר בתים" used={groupJokerUsed} />
            <StatusPill label="ג'וקר נוקאאוט" used={knockoutJokerUsed} />
          </div>
        </div>

        <OutrightForm
          teams={teams}
          players={players}
          existing={tournamentPrediction}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-wc-neon">
            ניחושי משחקים
          </p>
          <p className="text-xs font-semibold text-wc-fg3">
            {matches.length} משחקים פתוחים
          </p>
        </div>

        {matches.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-white/10 bg-[rgba(13,27,46,0.82)] p-10 text-center"
          >
            <div className="text-5xl">🗓️</div>
            <p className="mt-3 text-base font-semibold text-wc-fg2">
              אין כרגע משחקים פתוחים לניחוש.
            </p>
            <p className="mt-2 text-sm text-wc-fg3">
              המשחקים יופיעו כאן אוטומטית ברגע שהם יישארו במצב scheduled.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => {
              const existing = predictionMap.get(match.match_number);

              return (
                <MatchPredictionCard
                  key={match.match_number}
                  match={match}
                  existingHome={existing?.home_score_guess ?? null}
                  existingAway={existing?.away_score_guess ?? null}
                  existingIsJoker={existing?.is_joker_applied ?? false}
                  groupJokerUsed={groupJokerUsed}
                  knockoutJokerUsed={knockoutJokerUsed}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({
  label,
  used,
}: {
  label: string;
  used: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        used ? "bg-white/6 text-wc-fg3" : "bg-[rgba(95,255,123,0.14)] text-wc-neon"
      }`}
    >
      {label}: {used ? "נוצל" : "זמין"}
    </span>
  );
}

"use client";

import type { MatchWithTeams } from "@/lib/tournament/matches";
import MatchPredictionCard from "./MatchPredictionCard";
import OutrightForm from "./OutrightForm";
import Link from "next/link";

export type MatchPredictionRow = {
  match_id: number;
  home_score_guess: number | null;
  away_score_guess: number | null;
};

export type TeamOption = {
  id: string;
  name: string;
};

export type TournamentPredRow = {
  predicted_winner_team_id: number | null;
  predicted_top_scorer_name: string | null;
};

interface Props {
  matches: MatchWithTeams[];
  teams: TeamOption[];
  existingPredictions: MatchPredictionRow[];
  tournamentPrediction: TournamentPredRow | null;
  isAuthenticated: boolean;
}

export default function PredictionsClient({
  matches,
  teams,
  existingPredictions,
  tournamentPrediction,
  isAuthenticated,
}: Props) {
  const predMap = new Map(
    existingPredictions.map((p) => [p.match_id, p])
  );

  if (!isAuthenticated) {
    return (
      <div
        className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
        style={{ background: "var(--wc-surface)", border: "1px solid var(--wc-border)" }}
      >
        <span className="text-5xl">🔐</span>
        <p className="text-base font-semibold" style={{ color: "var(--wc-fg2)" }}>
          עליך להתחבר כדי לשמור ניחושים
        </p>
        <Link href="/login?next=/game/predictions" className="wc-button-primary px-6 py-2.5 text-sm font-bold">
          התחבר עכשיו
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tournament Outrights */}
      <section>
        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--wc-neon)" }}
        >
          ניחושי טורניר
        </p>
        <OutrightForm teams={teams} existing={tournamentPrediction} />
      </section>

      {/* Match Predictions */}
      <section>
        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--wc-neon)" }}
        >
          ניחושי משחקים ({matches.length} משחקים קרובים)
        </p>

        {matches.length === 0 ? (
          <div
            className="rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "var(--wc-surface)", border: "1.5px dashed var(--wc-border)" }}
          >
            <span className="text-5xl">✅</span>
            <p className="text-base font-semibold" style={{ color: "var(--wc-fg2)" }}>
              אין משחקים פתוחים לניחוש כרגע
            </p>
            <p className="text-sm" style={{ color: "var(--wc-fg3)" }}>
              כל המשחקים הקרובים מוצגים כאן
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => {
              const pred = predMap.get(match.match_number);
              return (
                <MatchPredictionCard
                  key={match.match_number}
                  match={match}
                  existingHome={pred?.home_score_guess ?? null}
                  existingAway={pred?.away_score_guess ?? null}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

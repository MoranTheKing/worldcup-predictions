-- Lock outright odds at prediction time and store final outright rewards.

ALTER TABLE public.tournament_predictions
  ADD COLUMN IF NOT EXISTS predicted_winner_odds NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS predicted_scorer_odds NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS winner_points_earned INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scorer_points_earned INT NOT NULL DEFAULT 0;

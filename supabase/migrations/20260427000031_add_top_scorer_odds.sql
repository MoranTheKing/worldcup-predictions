-- API-ready top-scorer odds for player/tournament stat tables.

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS top_scorer_odds NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS top_scorer_odds_updated_at TIMESTAMPTZ;

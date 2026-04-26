-- Store 1X2 betting odds used by the TypeScript scoring engine.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_odds NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS draw_odds NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS away_odds NUMERIC(6,2);

COMMENT ON COLUMN public.matches.home_odds IS
  'Decimal odds for a home-team win, used by odds-based prediction scoring.';
COMMENT ON COLUMN public.matches.draw_odds IS
  'Decimal odds for a draw, used by odds-based prediction scoring.';
COMMENT ON COLUMN public.matches.away_odds IS
  'Decimal odds for an away-team win, used by odds-based prediction scoring.';

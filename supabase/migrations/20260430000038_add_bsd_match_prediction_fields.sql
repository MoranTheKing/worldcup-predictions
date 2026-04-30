-- Store BSD model predictions separately from user predictions.
-- These fields are informational and must not overwrite public user picks.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS bsd_prediction_id TEXT,
  ADD COLUMN IF NOT EXISTS bsd_prediction_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bsd_prob_home_win NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_prob_draw NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_prob_away_win NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_predicted_result TEXT,
  ADD COLUMN IF NOT EXISTS bsd_expected_home_goals NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_expected_away_goals NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_prediction_confidence NUMERIC(8, 4),
  ADD COLUMN IF NOT EXISTS bsd_most_likely_score TEXT,
  ADD COLUMN IF NOT EXISTS bsd_prediction_model_version TEXT,
  ADD COLUMN IF NOT EXISTS bsd_prediction_raw JSONB,
  ADD COLUMN IF NOT EXISTS bsd_prediction_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.matches.bsd_prediction_id IS
  'BSD /api/predictions row id for this event, stored separately from user predictions.';

COMMENT ON COLUMN public.matches.bsd_prob_home_win IS
  'BSD model home-win probability, as returned by BSD. Usually a percentage from 0 to 100.';

COMMENT ON COLUMN public.matches.bsd_prob_draw IS
  'BSD model draw probability, as returned by BSD. Usually a percentage from 0 to 100.';

COMMENT ON COLUMN public.matches.bsd_prob_away_win IS
  'BSD model away-win probability, as returned by BSD. Usually a percentage from 0 to 100.';

COMMENT ON COLUMN public.matches.bsd_prediction_raw IS
  'Raw BSD prediction payload for future display fields without touching user prediction tables.';

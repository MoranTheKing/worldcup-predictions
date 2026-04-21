ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS is_extra_time BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS home_penalty_score INT,
  ADD COLUMN IF NOT EXISTS away_penalty_score INT;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_penalty_scores_non_negative;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_penalty_scores_non_negative CHECK (
    (home_penalty_score IS NULL OR home_penalty_score >= 0)
    AND (away_penalty_score IS NULL OR away_penalty_score >= 0)
  );

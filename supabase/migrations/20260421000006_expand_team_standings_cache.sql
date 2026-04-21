-- ============================================================
-- Migration 6: Expand cached tournament standings fields on teams
-- ============================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS fifa_ranking INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_for INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_against INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fair_play_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS played_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_eliminated BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.teams
  ALTER COLUMN fifa_ranking SET DEFAULT 0,
  ALTER COLUMN points SET DEFAULT 0,
  ALTER COLUMN goals_for SET DEFAULT 0,
  ALTER COLUMN goals_against SET DEFAULT 0,
  ALTER COLUMN fair_play_score SET DEFAULT 0,
  ALTER COLUMN played_count SET DEFAULT 0,
  ALTER COLUMN is_eliminated SET DEFAULT FALSE;

UPDATE public.teams
SET
  fifa_ranking = COALESCE(fifa_ranking, 0),
  points = COALESCE(points, 0),
  goals_for = COALESCE(goals_for, 0),
  goals_against = COALESCE(goals_against, 0),
  fair_play_score = COALESCE(fair_play_score, 0),
  played_count = COALESCE(played_count, 0),
  is_eliminated = COALESCE(is_eliminated, FALSE);

ALTER TABLE public.teams
  ALTER COLUMN fifa_ranking SET NOT NULL,
  ALTER COLUMN points SET NOT NULL,
  ALTER COLUMN goals_for SET NOT NULL,
  ALTER COLUMN goals_against SET NOT NULL,
  ALTER COLUMN fair_play_score SET NOT NULL,
  ALTER COLUMN played_count SET NOT NULL,
  ALTER COLUMN is_eliminated SET NOT NULL;

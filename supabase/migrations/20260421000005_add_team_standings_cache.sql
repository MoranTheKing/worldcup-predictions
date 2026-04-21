-- ============================================================
-- Migration 5: Add cached tournament standings fields to teams
-- ============================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_for INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS goals_against INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fair_play_score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fifa_ranking INT NOT NULL DEFAULT 0;

ALTER TABLE public.teams
  ALTER COLUMN is_eliminated SET DEFAULT FALSE;

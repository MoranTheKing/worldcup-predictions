-- Team hub API-ready profile fields.
-- These columns let the app display live outright odds, coach data,
-- pre-tournament form, and richer player statistics as soon as the API sync fills them.

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS outright_odds NUMERIC(8, 2),
  ADD COLUMN IF NOT EXISTS outright_odds_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coach_name TEXT,
  ADD COLUMN IF NOT EXISTS coach_updated_at TIMESTAMPTZ;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS appearances INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.team_recent_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  opponent_logo_url TEXT,
  played_at TIMESTAMPTZ NOT NULL,
  competition TEXT,
  team_score INTEGER NOT NULL DEFAULT 0,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  result TEXT NOT NULL CHECK (result IN ('win', 'draw', 'loss')),
  source TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_recent_matches_team_played_idx
  ON public.team_recent_matches(team_id, played_at DESC);

ALTER TABLE public.team_recent_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read team recent matches" ON public.team_recent_matches;
CREATE POLICY "Public can read team recent matches"
  ON public.team_recent_matches
  FOR SELECT
  TO anon, authenticated
  USING (true);

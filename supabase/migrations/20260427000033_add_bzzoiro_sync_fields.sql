ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS bzzoiro_team_id TEXT,
  ADD COLUMN IF NOT EXISTS coach_bzzoiro_id TEXT,
  ADD COLUMN IF NOT EXISTS coach_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS bzzoiro_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS teams_bzzoiro_team_id_unique
  ON public.teams(bzzoiro_team_id)
  WHERE bzzoiro_team_id IS NOT NULL;

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS bzzoiro_player_id TEXT,
  ADD COLUMN IF NOT EXISTS bzzoiro_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS players_bzzoiro_player_id_unique
  ON public.players(bzzoiro_player_id)
  WHERE bzzoiro_player_id IS NOT NULL;


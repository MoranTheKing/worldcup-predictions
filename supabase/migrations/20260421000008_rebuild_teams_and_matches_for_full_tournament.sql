-- ============================================================
-- Migration 8: UUID teams + tournament-ready matches table
-- ============================================================

DO $$
DECLARE
  teams_id_type text;
BEGIN
  SELECT data_type
  INTO teams_id_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'teams'
    AND column_name = 'id';

  IF teams_id_type IS DISTINCT FROM 'uuid' THEN
    ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_team_id_fkey;
    ALTER TABLE public.outright_bets DROP CONSTRAINT IF EXISTS outright_bets_predicted_winner_team_id_fkey;
    ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_home_team_id_fkey;
    ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_away_team_id_fkey;

    DROP TABLE IF EXISTS public.teams_legacy_20260421;
    ALTER TABLE public.teams RENAME TO teams_legacy_20260421;

    CREATE TABLE public.teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      legacy_id BIGINT UNIQUE,
      name TEXT NOT NULL UNIQUE,
      name_he TEXT,
      flag TEXT,
      logo_url TEXT,
      group_letter TEXT,
      is_eliminated BOOLEAN NOT NULL DEFAULT FALSE,
      api_id INT UNIQUE,
      points INT NOT NULL DEFAULT 0,
      goals_for INT NOT NULL DEFAULT 0,
      goals_against INT NOT NULL DEFAULT 0,
      fair_play_score INT NOT NULL DEFAULT 0,
      fifa_ranking INT NOT NULL DEFAULT 0,
      played_count INT NOT NULL DEFAULT 0
    );

    INSERT INTO public.teams (
      legacy_id,
      name,
      name_he,
      flag,
      logo_url,
      group_letter,
      is_eliminated,
      api_id,
      points,
      goals_for,
      goals_against,
      fair_play_score,
      fifa_ranking,
      played_count
    )
    SELECT
      legacy.id,
      legacy.name,
      legacy.name_he,
      legacy.flag,
      legacy.logo_url,
      legacy.group_letter,
      COALESCE(legacy.is_eliminated, FALSE),
      legacy.api_id,
      COALESCE(legacy.points, 0),
      COALESCE(legacy.goals_for, 0),
      COALESCE(legacy.goals_against, 0),
      COALESCE(legacy.fair_play_score, 0),
      COALESCE(legacy.fifa_ranking, 0),
      COALESCE(legacy.played_count, 0)
    FROM public.teams_legacy_20260421 AS legacy;

    ALTER TABLE public.players ADD COLUMN team_id_uuid UUID;
    UPDATE public.players AS player
    SET team_id_uuid = team.id
    FROM public.teams AS team
    WHERE team.legacy_id = player.team_id;

    ALTER TABLE public.players DROP COLUMN team_id;
    ALTER TABLE public.players RENAME COLUMN team_id_uuid TO team_id;
    ALTER TABLE public.players
      ADD CONSTRAINT players_team_id_fkey
      FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

    ALTER TABLE public.outright_bets ADD COLUMN predicted_winner_team_uuid UUID;
    UPDATE public.outright_bets AS outright
    SET predicted_winner_team_uuid = team.id
    FROM public.teams AS team
    WHERE team.legacy_id = outright.predicted_winner_team_id;

    ALTER TABLE public.outright_bets DROP COLUMN predicted_winner_team_id;
    ALTER TABLE public.outright_bets RENAME COLUMN predicted_winner_team_uuid TO predicted_winner_team_id;
    ALTER TABLE public.outright_bets
      ADD CONSTRAINT outright_bets_predicted_winner_team_id_fkey
      FOREIGN KEY (predicted_winner_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

    ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS teams_select_all ON public.teams;
    CREATE POLICY teams_select_all
      ON public.teams
      FOR SELECT
      TO authenticated
      USING (true);

    DROP TABLE public.teams_legacy_20260421;
  END IF;
END $$;

ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_match_id_fkey;
DROP TRIGGER IF EXISTS matches_set_updated_at ON public.matches;
DROP TABLE IF EXISTS public.matches;

CREATE TABLE public.matches (
  match_number INT PRIMARY KEY,
  stage TEXT NOT NULL,
  home_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  home_placeholder TEXT,
  away_placeholder TEXT,
  date_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  minute INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_number_range CHECK (match_number BETWEEN 1 AND 104),
  CONSTRAINT matches_status_check CHECK (status IN ('scheduled', 'live', 'finished')),
  CONSTRAINT matches_minute_range CHECK (minute IS NULL OR minute BETWEEN 0 AND 130),
  CONSTRAINT matches_placeholder_presence CHECK (
    home_team_id IS NOT NULL
    OR away_team_id IS NOT NULL
    OR home_placeholder IS NOT NULL
    OR away_placeholder IS NOT NULL
    OR status = 'scheduled'
  ),
  CONSTRAINT matches_scores_non_negative CHECK (home_score >= 0 AND away_score >= 0)
);

CREATE INDEX matches_date_time_idx ON public.matches(date_time);
CREATE INDEX matches_status_date_idx ON public.matches(status, date_time);

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS matches_select_all ON public.matches;
CREATE POLICY matches_select_all
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE public.bets
  ADD CONSTRAINT bets_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.matches(match_number)
  ON DELETE CASCADE
  NOT VALID;

-- Adds an explicit live phase for match-clock display.
-- Minute remains numeric, while match_phase lets the UI represent halftime,
-- stoppage time context, extra time and penalties without overloading minute.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS match_phase TEXT;

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_match_phase_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_match_phase_check
  CHECK (
    match_phase IS NULL
    OR match_phase IN ('first_half', 'halftime', 'second_half', 'extra_time', 'penalties')
  );

UPDATE public.matches
SET match_phase = NULL
WHERE status IS DISTINCT FROM 'live';

UPDATE public.matches
SET minute = NULL
WHERE match_phase IN ('halftime', 'penalties');

UPDATE public.matches
SET match_phase = NULL
WHERE match_number < 73
  AND match_phase IN ('extra_time', 'penalties');

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_match_phase_live_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_match_phase_live_check
  CHECK (match_phase IS NULL OR status = 'live');

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_match_phase_minute_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_match_phase_minute_check
  CHECK (
    match_phase IS NULL
    OR match_phase NOT IN ('halftime', 'penalties')
    OR minute IS NULL
  );

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_match_phase_knockout_check;

ALTER TABLE public.matches
  ADD CONSTRAINT matches_match_phase_knockout_check
  CHECK (
    match_phase IS NULL
    OR match_phase NOT IN ('extra_time', 'penalties')
    OR match_number >= 73
  );

-- Recreate the view instead of CREATE OR REPLACE: Postgres does not allow
-- inserting a new view column in the middle of an existing column order.
DROP VIEW IF EXISTS public.public_tournament_matches;

CREATE VIEW public.public_tournament_matches AS
SELECT
  match_number,
  stage,
  home_team_id,
  away_team_id,
  home_placeholder,
  away_placeholder,
  home_score,
  away_score,
  status,
  minute,
  date_time,
  is_extra_time,
  home_penalty_score,
  away_penalty_score,
  match_phase
FROM public.matches;

REVOKE ALL ON public.public_tournament_matches FROM PUBLIC;
GRANT SELECT ON public.public_tournament_matches TO anon, authenticated;

COMMENT ON COLUMN public.matches.match_phase IS
  'Optional live phase used for display and API sync: first_half, halftime, second_half, extra_time or penalties.';

COMMENT ON VIEW public.public_tournament_matches IS
  'Public read-only projection used by the tournament page. Contains match schedule, scores, live status, phase, minute and penalty fields only.';

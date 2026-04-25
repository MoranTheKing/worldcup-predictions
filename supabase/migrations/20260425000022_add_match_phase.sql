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

CREATE OR REPLACE VIEW public.public_tournament_matches AS
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
  match_phase,
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

-- Public, read-only projection for the tournament page.
-- This intentionally exposes only non-user tournament data to anon/authenticated
-- clients, so the app can render /dashboard/tournament without a service-role key.

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
  minute,
  date_time,
  is_extra_time,
  home_penalty_score,
  away_penalty_score
FROM public.matches;

CREATE OR REPLACE VIEW public.public_tournament_teams AS
SELECT
  id,
  name,
  name_he,
  logo_url,
  group_letter,
  points,
  goals_for,
  goals_against,
  fair_play_score,
  fifa_ranking,
  played_count,
  is_eliminated
FROM public.teams;

REVOKE ALL ON public.public_tournament_matches FROM PUBLIC;
REVOKE ALL ON public.public_tournament_teams FROM PUBLIC;

GRANT SELECT ON public.public_tournament_matches TO anon, authenticated;
GRANT SELECT ON public.public_tournament_teams TO anon, authenticated;

COMMENT ON VIEW public.public_tournament_matches IS
  'Public read-only projection used by the tournament page. Contains match schedule, scores, live status, minute and penalty fields only.';

COMMENT ON VIEW public.public_tournament_teams IS
  'Public read-only projection used by the tournament page. Contains team metadata and public standings fields only.';

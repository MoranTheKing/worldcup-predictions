CREATE TABLE IF NOT EXISTS public.dev_match_player_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number integer NOT NULL REFERENCES public.matches(match_number) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id integer REFERENCES public.players(id) ON DELETE SET NULL,
  related_player_id integer REFERENCES public.players(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('goal', 'yellow_card', 'red_card')),
  minute integer NOT NULL CHECK (minute >= 0 AND minute <= 135),
  is_home boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dev_match_player_events_match_idx
  ON public.dev_match_player_events(match_number, minute, event_type);

CREATE INDEX IF NOT EXISTS dev_match_player_events_player_idx
  ON public.dev_match_player_events(player_id);

ALTER TABLE public.dev_match_player_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read dev match player events"
  ON public.dev_match_player_events;

CREATE POLICY "Authenticated users can read dev match player events"
  ON public.dev_match_player_events
  FOR SELECT
  TO authenticated
  USING (true);

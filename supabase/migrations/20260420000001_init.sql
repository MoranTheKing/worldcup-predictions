-- ============================================================
-- World Cup 2026 Predictions PWA — Initial Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- ── Users (extends auth.users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                    TEXT UNIQUE,
  avatar_url                  TEXT,
  current_streak              INT DEFAULT 0,
  jokers_groups_remaining     INT DEFAULT 1,
  jokers_knockouts_remaining  INT DEFAULT 1,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Teams ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  group_letter  TEXT,
  is_eliminated BOOLEAN DEFAULT FALSE,
  api_id        INT UNIQUE  -- populated later by cron worker
);

-- ── Players ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.players (
  id       INT PRIMARY KEY,          -- ID from api-football.com
  name     TEXT NOT NULL,
  team_id  BIGINT REFERENCES public.teams(id),
  goals    INT DEFAULT 0,
  assists  INT DEFAULT 0
);

-- ── Leagues ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  join_code   TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── League Participants ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.league_participants (
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  league_id  UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, league_id)
);

-- ── Matches ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id               INT PRIMARY KEY,
  fixture_id       INT UNIQUE NOT NULL,
  date_time        TIMESTAMPTZ NOT NULL,
  stage            TEXT NOT NULL CHECK (stage IN (
                     'group','round_of_16','quarter_final',
                     'semi_final','third_place','final')),
  home_team_id     BIGINT REFERENCES public.teams(id),
  away_team_id     BIGINT REFERENCES public.teams(id),
  home_team_name   TEXT NOT NULL,
  away_team_name   TEXT NOT NULL,
  home_team_logo   TEXT,
  away_team_logo   TEXT,
  home_team_score  INT,
  away_team_score  INT,
  status           TEXT DEFAULT 'Not Started',
  odds_home_win    DECIMAL(6,2),
  odds_draw        DECIMAL(6,2),
  odds_away_win    DECIMAL(6,2),
  odds_multiplier  DECIMAL(4,2) DEFAULT 1.0,
  referee          TEXT,
  venue            TEXT,
  last_updated     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bets (global per user per match — counts across all leagues) ─
CREATE TABLE IF NOT EXISTS public.bets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES public.users(id) ON DELETE CASCADE,
  match_id              INT REFERENCES public.matches(id),
  predicted_home_score  INT NOT NULL,
  predicted_away_score  INT NOT NULL,
  is_joker_applied      BOOLEAN DEFAULT FALSE,
  points_awarded        INT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

-- ── Outright Bets (global per user — no league scope) ────────
-- Locked at kickoff of the first tournament match.
-- predicted_top_scorer_player_id is the tie-breaker (#5) across leagues.
CREATE TABLE IF NOT EXISTS public.outright_bets (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  predicted_winner_team_id        BIGINT REFERENCES public.teams(id),
  predicted_top_scorer_player_id  INT REFERENCES public.players(id),
  predicted_top_scorer_name       TEXT,  -- free-text fallback until players are seeded
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on outright_bets
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER outright_bets_updated_at
  BEFORE UPDATE ON public.outright_bets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outright_bets      ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own"  ON public.users FOR SELECT  USING (auth.uid() = id);
CREATE POLICY "users_update_own"  ON public.users FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "users_insert_own"  ON public.users FOR INSERT  WITH CHECK (auth.uid() = id);

-- teams & players & matches — readable by all authenticated users
CREATE POLICY "teams_select_all"    ON public.teams   FOR SELECT TO authenticated USING (true);
CREATE POLICY "players_select_all"  ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY "matches_select_all"  ON public.matches FOR SELECT TO authenticated USING (true);

-- leagues — owner or participant can read
CREATE POLICY "leagues_select"   ON public.leagues FOR SELECT TO authenticated USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.league_participants lp
          WHERE lp.league_id = leagues.id AND lp.user_id = auth.uid())
);
CREATE POLICY "leagues_insert"   ON public.leagues FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "leagues_update"   ON public.leagues FOR UPDATE USING (owner_id = auth.uid());

-- league_participants
CREATE POLICY "lp_select" ON public.league_participants FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.league_participants lp2
          WHERE lp2.league_id = league_participants.league_id AND lp2.user_id = auth.uid())
);
CREATE POLICY "lp_insert" ON public.league_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "lp_delete" ON public.league_participants FOR DELETE USING (user_id = auth.uid());

-- bets — own CRUD + league-mates can read
CREATE POLICY "bets_own_all"  ON public.bets FOR ALL  USING (user_id = auth.uid());
CREATE POLICY "bets_league_read" ON public.bets FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.league_participants a
    JOIN   public.league_participants b ON a.league_id = b.league_id
    WHERE  a.user_id = auth.uid() AND b.user_id = bets.user_id
  )
);

-- outright_bets — own CRUD + league-mates can read
CREATE POLICY "ob_own_all"  ON public.outright_bets FOR ALL  USING (user_id = auth.uid());
CREATE POLICY "ob_league_read" ON public.outright_bets FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.league_participants a
    JOIN   public.league_participants b ON a.league_id = b.league_id
    WHERE  a.user_id = auth.uid() AND b.user_id = outright_bets.user_id
  )
);

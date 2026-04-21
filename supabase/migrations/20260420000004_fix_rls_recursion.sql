-- ============================================================
-- Migration 4: Fix infinite recursion in RLS policies
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- Root cause:
--   "lp_select" policy on league_participants did a self-join:
--     EXISTS (SELECT 1 FROM league_participants lp2 WHERE ...)
--   PostgreSQL evaluates this by running lp_select again → infinite loop (42P17).
--   Any table that references league_participants in its own policies
--   (outright_bets, bets) inherits the same crash.
--
-- Fix:
--   Create a SECURITY DEFINER helper function that reads league_participants
--   without going through RLS (runs as the DB owner, bypasses the policy).
--   All cross-table policies use this function instead of a raw self-join.
-- ============================================================

-- ── Helper function (breaks the recursion) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_league_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER        -- runs as DB owner, bypasses RLS
STABLE                  -- same result within one transaction
SET search_path = public
AS $$
  SELECT league_id
  FROM   public.league_participants
  WHERE  user_id = auth.uid();
$$;

-- ── league_participants: drop the self-referential policy, replace it ─────────
DROP POLICY IF EXISTS "lp_select" ON public.league_participants;

CREATE POLICY "lp_select" ON public.league_participants
  FOR SELECT TO authenticated
  USING (
    -- own rows always visible
    user_id = auth.uid()
    OR
    -- rows from leagues the user belongs to (via security-definer fn, no recursion)
    league_id IN (SELECT public.get_my_league_ids())
  );

-- ── bets: replace the cross-table policy that triggered lp_select ─────────────
DROP POLICY IF EXISTS "bets_league_read" ON public.bets;

CREATE POLICY "bets_league_read" ON public.bets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM   public.league_participants lp
      WHERE  lp.league_id IN (SELECT public.get_my_league_ids())
        AND  lp.user_id   = bets.user_id
    )
  );

-- ── outright_bets: same fix ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "ob_league_read" ON public.outright_bets;

CREATE POLICY "ob_league_read" ON public.outright_bets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM   public.league_participants lp
      WHERE  lp.league_id IN (SELECT public.get_my_league_ids())
        AND  lp.user_id   = outright_bets.user_id
    )
  );

-- ============================================================
-- Migration 3: Fix RLS policies + add position column to players
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Fix: make FOR ALL policies explicit about INSERT (WITH CHECK) ─────────────
-- PostgreSQL uses USING as a fallback for INSERT when WITH CHECK is absent,
-- but the combination of upsert + RLS can silently reject the INSERT path.
-- Being explicit removes any ambiguity.

DROP POLICY IF EXISTS "ob_own_all" ON public.outright_bets;
CREATE POLICY "ob_own_all" ON public.outright_bets
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "bets_own_all" ON public.bets;
CREATE POLICY "bets_own_all" ON public.bets
  FOR ALL
  USING     (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Add position column to players (Attacker / Midfielder / Defender / Goalkeeper) ─
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS position TEXT;

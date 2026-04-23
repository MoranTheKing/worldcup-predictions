-- ============================================================
-- Migration 14: Lock outright_bets writes after tournament kickoff
-- ============================================================

DROP POLICY IF EXISTS "ob_own_all" ON public.outright_bets;
DROP POLICY IF EXISTS "ob_own_select" ON public.outright_bets;
DROP POLICY IF EXISTS "ob_own_insert_before_kickoff" ON public.outright_bets;
DROP POLICY IF EXISTS "ob_own_update_before_kickoff" ON public.outright_bets;
DROP POLICY IF EXISTS "ob_own_delete_before_kickoff" ON public.outright_bets;

CREATE POLICY "ob_own_select" ON public.outright_bets
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ob_own_insert_before_kickoff" ON public.outright_bets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND NOT COALESCE((
      SELECT (
        kickoff.status <> 'scheduled'
        OR (kickoff.date_time IS NOT NULL AND kickoff.date_time <= NOW())
      )
      FROM public.matches AS kickoff
      ORDER BY kickoff.match_number ASC
      LIMIT 1
    ), FALSE)
  );

CREATE POLICY "ob_own_update_before_kickoff" ON public.outright_bets
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND NOT COALESCE((
      SELECT (
        kickoff.status <> 'scheduled'
        OR (kickoff.date_time IS NOT NULL AND kickoff.date_time <= NOW())
      )
      FROM public.matches AS kickoff
      ORDER BY kickoff.match_number ASC
      LIMIT 1
    ), FALSE)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND NOT COALESCE((
      SELECT (
        kickoff.status <> 'scheduled'
        OR (kickoff.date_time IS NOT NULL AND kickoff.date_time <= NOW())
      )
      FROM public.matches AS kickoff
      ORDER BY kickoff.match_number ASC
      LIMIT 1
    ), FALSE)
  );

CREATE POLICY "ob_own_delete_before_kickoff" ON public.outright_bets
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND NOT COALESCE((
      SELECT (
        kickoff.status <> 'scheduled'
        OR (kickoff.date_time IS NOT NULL AND kickoff.date_time <= NOW())
      )
      FROM public.matches AS kickoff
      ORDER BY kickoff.match_number ASC
      LIMIT 1
    ), FALSE)
  );

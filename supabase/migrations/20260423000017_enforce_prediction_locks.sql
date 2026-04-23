-- ============================================================
-- Enforce kickoff locks for bets and outright_bets at the DB/RLS layer
-- ============================================================

-- Replace permissive owner CRUD policies.
drop policy if exists "bets_own_all" on public.bets;
drop policy if exists "ob_own_all" on public.outright_bets;

-- Bets: users can only write their own predictions before the match kickoff.
create policy "bets_own_insert_before_kickoff"
  on public.bets
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and now() < m.date_time
    )
  );

create policy "bets_own_update_before_kickoff"
  on public.bets
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and now() < m.date_time
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and now() < m.date_time
    )
  );

create policy "bets_own_delete_before_kickoff"
  on public.bets
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.matches m
      where m.id = bets.match_id
        and now() < m.date_time
    )
  );

-- Outright bets: lock once the first tournament match starts.
create policy "ob_own_insert_before_tournament_kickoff"
  on public.outright_bets
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and now() < coalesce(
      (select min(m.date_time) from public.matches m),
      'infinity'::timestamptz
    )
  );

create policy "ob_own_update_before_tournament_kickoff"
  on public.outright_bets
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and now() < coalesce(
      (select min(m.date_time) from public.matches m),
      'infinity'::timestamptz
    )
  )
  with check (
    user_id = auth.uid()
    and now() < coalesce(
      (select min(m.date_time) from public.matches m),
      'infinity'::timestamptz
    )
  );

create policy "ob_own_delete_before_tournament_kickoff"
  on public.outright_bets
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and now() < coalesce(
      (select min(m.date_time) from public.matches m),
      'infinity'::timestamptz
    )
  );

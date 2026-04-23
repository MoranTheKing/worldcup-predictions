-- ============================================================
-- Enforce kickoff-based prediction locks at the database layer.
-- Applies to both social tables and legacy dashboard tables.
-- ============================================================

create or replace function public.match_predictions_open(target_match_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      m.status = 'scheduled'
      and (m.date_time is null or now() < m.date_time)
    from public.matches m
    where m.match_number = target_match_id
    limit 1
  ), false);
$$;

create or replace function public.tournament_predictions_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      kickoff.status = 'scheduled'
      and (kickoff.date_time is null or now() < kickoff.date_time)
    from public.matches kickoff
    order by kickoff.date_time asc nulls last, kickoff.match_number asc
    limit 1
  ), true);
$$;

revoke all on function public.match_predictions_open(integer) from public;
revoke all on function public.tournament_predictions_open() from public;

grant execute on function public.match_predictions_open(integer) to authenticated;
grant execute on function public.tournament_predictions_open() to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'predictions'
  ) then
    drop policy if exists predictions_insert on public.predictions;
    drop policy if exists predictions_update on public.predictions;
    drop policy if exists predictions_delete on public.predictions;
    drop policy if exists predictions_insert_own on public.predictions;
    drop policy if exists predictions_update_own on public.predictions;
    drop policy if exists predictions_delete_own on public.predictions;
    drop policy if exists predictions_insert_own_before_kickoff on public.predictions;
    drop policy if exists predictions_update_own_before_kickoff on public.predictions;
    drop policy if exists predictions_delete_own_before_kickoff on public.predictions;

    create policy predictions_insert_own_before_kickoff
      on public.predictions
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and public.match_predictions_open(match_id)
      );

    create policy predictions_update_own_before_kickoff
      on public.predictions
      for update
      to authenticated
      using (
        auth.uid() = user_id
        and public.match_predictions_open(match_id)
      )
      with check (
        auth.uid() = user_id
        and public.match_predictions_open(match_id)
      );

    create policy predictions_delete_own_before_kickoff
      on public.predictions
      for delete
      to authenticated
      using (
        auth.uid() = user_id
        and public.match_predictions_open(match_id)
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tournament_predictions'
  ) then
    drop policy if exists tournament_predictions_insert on public.tournament_predictions;
    drop policy if exists tournament_predictions_update on public.tournament_predictions;
    drop policy if exists tournament_predictions_delete on public.tournament_predictions;
    drop policy if exists tournament_predictions_insert_own on public.tournament_predictions;
    drop policy if exists tournament_predictions_update_own on public.tournament_predictions;
    drop policy if exists tournament_predictions_delete_own on public.tournament_predictions;
    drop policy if exists tournament_predictions_insert_own_before_kickoff on public.tournament_predictions;
    drop policy if exists tournament_predictions_update_own_before_kickoff on public.tournament_predictions;
    drop policy if exists tournament_predictions_delete_own_before_kickoff on public.tournament_predictions;

    create policy tournament_predictions_insert_own_before_kickoff
      on public.tournament_predictions
      for insert
      to authenticated
      with check (
        auth.uid() = user_id
        and public.tournament_predictions_open()
      );

    create policy tournament_predictions_update_own_before_kickoff
      on public.tournament_predictions
      for update
      to authenticated
      using (
        auth.uid() = user_id
        and public.tournament_predictions_open()
      )
      with check (
        auth.uid() = user_id
        and public.tournament_predictions_open()
      );

    create policy tournament_predictions_delete_own_before_kickoff
      on public.tournament_predictions
      for delete
      to authenticated
      using (
        auth.uid() = user_id
        and public.tournament_predictions_open()
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'outright_bets'
  ) then
    drop policy if exists ob_own_all on public.outright_bets;
    drop policy if exists ob_own_select on public.outright_bets;
    drop policy if exists ob_own_insert_before_kickoff on public.outright_bets;
    drop policy if exists ob_own_update_before_kickoff on public.outright_bets;
    drop policy if exists ob_own_delete_before_kickoff on public.outright_bets;
    drop policy if exists ob_own_insert_before_tournament_kickoff on public.outright_bets;
    drop policy if exists ob_own_update_before_tournament_kickoff on public.outright_bets;
    drop policy if exists ob_own_delete_before_tournament_kickoff on public.outright_bets;

    create policy ob_own_select
      on public.outright_bets
      for select
      to authenticated
      using (user_id = auth.uid());

    create policy ob_own_insert_before_tournament_kickoff
      on public.outright_bets
      for insert
      to authenticated
      with check (
        user_id = auth.uid()
        and public.tournament_predictions_open()
      );

    create policy ob_own_update_before_tournament_kickoff
      on public.outright_bets
      for update
      to authenticated
      using (
        user_id = auth.uid()
        and public.tournament_predictions_open()
      )
      with check (
        user_id = auth.uid()
        and public.tournament_predictions_open()
      );

    create policy ob_own_delete_before_tournament_kickoff
      on public.outright_bets
      for delete
      to authenticated
      using (
        user_id = auth.uid()
        and public.tournament_predictions_open()
      );
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'bets'
  ) then
    drop policy if exists bets_own_all on public.bets;
    drop policy if exists bets_own_select on public.bets;
    drop policy if exists bets_own_insert_before_kickoff on public.bets;
    drop policy if exists bets_own_update_before_kickoff on public.bets;
    drop policy if exists bets_own_delete_before_kickoff on public.bets;

    create policy bets_own_select
      on public.bets
      for select
      to authenticated
      using (user_id = auth.uid());

    create policy bets_own_insert_before_kickoff
      on public.bets
      for insert
      to authenticated
      with check (
        user_id = auth.uid()
        and public.match_predictions_open(match_id)
      );

    create policy bets_own_update_before_kickoff
      on public.bets
      for update
      to authenticated
      using (
        user_id = auth.uid()
        and public.match_predictions_open(match_id)
      )
      with check (
        user_id = auth.uid()
        and public.match_predictions_open(match_id)
      );

    create policy bets_own_delete_before_kickoff
      on public.bets
      for delete
      to authenticated
      using (
        user_id = auth.uid()
        and public.match_predictions_open(match_id)
      );
  end if;
end
$$;

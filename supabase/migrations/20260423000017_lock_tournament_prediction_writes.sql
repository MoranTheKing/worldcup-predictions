-- ============================================================
-- Enforce tournament-prediction lock at the database layer.
-- Prevent direct client writes after tournament kickoff.
-- ============================================================

create or replace function public.tournament_predictions_open()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  kickoff record;
begin
  select status, date_time
    into kickoff
    from public.matches
   order by date_time asc nulls last
   limit 1;

  if kickoff is null then
    return true;
  end if;

  if kickoff.status is not null and kickoff.status <> 'scheduled' then
    return false;
  end if;

  if kickoff.date_time is not null and kickoff.date_time <= now() then
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.tournament_predictions_open() to authenticated;

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

    create policy tournament_predictions_insert_own
      on public.tournament_predictions
      for insert
      to authenticated
      with check (auth.uid() = user_id and public.tournament_predictions_open());

    create policy tournament_predictions_update_own
      on public.tournament_predictions
      for update
      to authenticated
      using (auth.uid() = user_id and public.tournament_predictions_open())
      with check (auth.uid() = user_id and public.tournament_predictions_open());

    create policy tournament_predictions_delete_own
      on public.tournament_predictions
      for delete
      to authenticated
      using (auth.uid() = user_id and public.tournament_predictions_open());
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

    create policy ob_own_all
      on public.outright_bets
      for all
      to authenticated
      using (user_id = auth.uid() and public.tournament_predictions_open())
      with check (user_id = auth.uid() and public.tournament_predictions_open());
  end if;
end
$$;

-- ============================================================
-- Emergency RLS repair for social game tables.
-- Some environments still carry legacy recursive policies with
-- unknown names, so we drop every policy on the affected tables
-- and recreate the flat authenticated rules from scratch.
-- ============================================================

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('league_members', 'predictions', 'tournament_predictions')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'league_members'
  ) then
    alter table public.league_members enable row level security;

    create policy league_members_select
      on public.league_members
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy league_members_insert
      on public.league_members
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy league_members_update
      on public.league_members
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy league_members_delete
      on public.league_members
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'predictions'
  ) then
    alter table public.predictions enable row level security;

    create policy predictions_select
      on public.predictions
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy predictions_insert
      on public.predictions
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy predictions_update
      on public.predictions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy predictions_delete
      on public.predictions
      for delete
      to authenticated
      using (auth.uid() = user_id);
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
    alter table public.tournament_predictions enable row level security;

    create policy tournament_predictions_select
      on public.tournament_predictions
      for select
      to authenticated
      using (auth.uid() = user_id);

    create policy tournament_predictions_insert
      on public.tournament_predictions
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy tournament_predictions_update
      on public.tournament_predictions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy tournament_predictions_delete
      on public.tournament_predictions
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

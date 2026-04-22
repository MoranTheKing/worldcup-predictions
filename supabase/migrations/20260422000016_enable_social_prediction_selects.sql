-- ============================================================
-- Phase 2.2 social viewing RLS alignment
-- Open authenticated SELECT access for profiles / predictions /
-- tournament_predictions while keeping all write policies self-only.
-- ============================================================

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'predictions', 'tournament_predictions')
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
      and table_name = 'profiles'
  ) then
    alter table public.profiles enable row level security;

    create policy profiles_select_all
      on public.profiles
      for select
      to authenticated
      using (true);

    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);

    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);

    create policy profiles_delete_own
      on public.profiles
      for delete
      to authenticated
      using (auth.uid() = id);
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

    create policy predictions_select_all
      on public.predictions
      for select
      to authenticated
      using (true);

    create policy predictions_insert_own
      on public.predictions
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy predictions_update_own
      on public.predictions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy predictions_delete_own
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

    create policy tournament_predictions_select_all
      on public.tournament_predictions
      for select
      to authenticated
      using (true);

    create policy tournament_predictions_insert_own
      on public.tournament_predictions
      for insert
      to authenticated
      with check (auth.uid() = user_id);

    create policy tournament_predictions_update_own
      on public.tournament_predictions
      for update
      to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy tournament_predictions_delete_own
      on public.tournament_predictions
      for delete
      to authenticated
      using (auth.uid() = user_id);
  end if;
end
$$;

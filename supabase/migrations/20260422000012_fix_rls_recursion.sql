-- ============================================================
-- Phase 2 fixups:
-- 1. Flatten recursive SELECT policies that caused 42P17 on league_members
-- 2. Ensure predictions has is_joker_applied
-- 3. Repair tournament_predictions.predicted_winner_team_id to UUID
--    for DBs that were created from an older/broken draft
-- ============================================================

create table if not exists public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  predicted_winner_team_id uuid references public.teams(id) on delete set null,
  predicted_top_scorer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.predictions
  add column if not exists is_joker_applied boolean not null default false;

do $$
declare
  winner_column_type text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_predictions'
      and column_name = 'predicted_winner_team_id'
  ) then
    select data_type
    into winner_column_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_predictions'
      and column_name = 'predicted_winner_team_id';

    if winner_column_type = 'bigint' then
      alter table public.tournament_predictions
        drop constraint if exists tournament_predictions_predicted_winner_team_id_fkey;

      alter table public.tournament_predictions
        add column if not exists predicted_winner_team_id_uuid uuid;

      update public.tournament_predictions tp
      set predicted_winner_team_id_uuid = team.id
      from public.teams team
      where team.legacy_id = tp.predicted_winner_team_id;

      alter table public.tournament_predictions
        drop column predicted_winner_team_id;

      alter table public.tournament_predictions
        rename column predicted_winner_team_id_uuid to predicted_winner_team_id;
    end if;

    alter table public.tournament_predictions
      drop constraint if exists tournament_predictions_predicted_winner_team_id_fkey;

    alter table public.tournament_predictions
      add constraint tournament_predictions_predicted_winner_team_id_fkey
      foreign key (predicted_winner_team_id)
      references public.teams(id)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'league_members'
  ) then
    alter table public.league_members enable row level security;

    drop policy if exists league_members_select on public.league_members;
    drop policy if exists league_members_insert on public.league_members;
    drop policy if exists league_members_update on public.league_members;
    drop policy if exists league_members_delete on public.league_members;

    create policy league_members_select
      on public.league_members
      for select
      to authenticated
      using (true);

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
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'predictions'
  ) then
    alter table public.predictions enable row level security;

    drop policy if exists predictions_select on public.predictions;
    drop policy if exists predictions_insert on public.predictions;
    drop policy if exists predictions_update on public.predictions;
    drop policy if exists predictions_delete on public.predictions;

    create policy predictions_select
      on public.predictions
      for select
      to authenticated
      using (true);

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
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tournament_predictions'
  ) then
    alter table public.tournament_predictions enable row level security;

    drop policy if exists tournament_predictions_select on public.tournament_predictions;
    drop policy if exists tournament_predictions_insert on public.tournament_predictions;
    drop policy if exists tournament_predictions_update on public.tournament_predictions;
    drop policy if exists tournament_predictions_delete on public.tournament_predictions;

    create policy tournament_predictions_select
      on public.tournament_predictions
      for select
      to authenticated
      using (true);

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

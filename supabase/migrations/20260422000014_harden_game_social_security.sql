-- ============================================================
-- Harden social game security:
-- 1. Flat SELECT RLS for league_members / predictions / tournament_predictions
-- 2. 4-char invite codes for leagues
-- 3. Basic per-user join-league rate limiting support
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate :=
      substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) ||
      substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) ||
      substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1) ||
      substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);

    exit when not exists (
      select 1
      from public.leagues
      where invite_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

do $$
declare
  league_row record;
begin
  for league_row in
    select id
    from public.leagues
    where invite_code is null
       or invite_code !~ '^[A-Z0-9]{4}$'
  loop
    update public.leagues
    set invite_code = public.generate_invite_code()
    where id = league_row.id;
  end loop;
end
$$;

alter table public.leagues
  alter column invite_code set default public.generate_invite_code();

create table if not exists public.league_join_attempts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  blocked_until timestamptz
);

alter table public.league_join_attempts
  add column if not exists attempt_count integer not null default 0;

alter table public.league_join_attempts
  add column if not exists window_started_at timestamptz not null default now();

alter table public.league_join_attempts
  add column if not exists last_attempt_at timestamptz not null default now();

alter table public.league_join_attempts
  add column if not exists blocked_until timestamptz;

create index if not exists league_join_attempts_blocked_until_idx
  on public.league_join_attempts (blocked_until);

alter table public.league_join_attempts enable row level security;

drop policy if exists league_join_attempts_select on public.league_join_attempts;
drop policy if exists league_join_attempts_insert on public.league_join_attempts;
drop policy if exists league_join_attempts_update on public.league_join_attempts;
drop policy if exists league_join_attempts_delete on public.league_join_attempts;

create policy league_join_attempts_select
  on public.league_join_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy league_join_attempts_insert
  on public.league_join_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy league_join_attempts_update
  on public.league_join_attempts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy league_join_attempts_delete
  on public.league_join_attempts
  for delete
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'league_members'
  ) then
    alter table public.league_members enable row level security;

    drop policy if exists league_members_select on public.league_members;

    create policy league_members_select
      on public.league_members
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.league_members lm
          where lm.league_id = league_members.league_id
            and lm.user_id = auth.uid()
        )
      );
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

    create policy predictions_select
      on public.predictions
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.league_members mine
          join public.league_members theirs
            on theirs.league_id = mine.league_id
          where mine.user_id = auth.uid()
            and theirs.user_id = predictions.user_id
        )
      );
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

    create policy tournament_predictions_select
      on public.tournament_predictions
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or exists (
          select 1
          from public.league_members mine
          join public.league_members theirs
            on theirs.league_id = mine.league_id
          where mine.user_id = auth.uid()
            and theirs.user_id = tournament_predictions.user_id
        )
      );
  end if;
end
$$;

-- ============================================================
-- Phase 1: Global Auth + Social Predictions Schema
-- Safe migration: creates missing tables and appends columns
-- without dropping any existing data.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  total_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists total_score integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

insert into public.profiles (id, display_name, avatar_url)
select
  u.id,
  coalesce(u.username, au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'full_name'),
  coalesce(u.avatar_url, au.raw_user_meta_data ->> 'avatar_url')
from public.users u
join auth.users au on au.id = u.id
on conflict (id) do update
set
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

insert into public.profiles (id, display_name, avatar_url)
select
  au.id,
  coalesce(au.raw_user_meta_data ->> 'display_name', au.raw_user_meta_data ->> 'full_name'),
  au.raw_user_meta_data ->> 'avatar_url'
from auth.users au
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.leagues add column if not exists invite_code text;
alter table public.leagues add column if not exists created_at timestamptz not null default now();

update public.leagues
set invite_code = coalesce(invite_code, join_code, public.generate_invite_code())
where invite_code is null;

alter table public.leagues alter column invite_code set default public.generate_invite_code();

create unique index if not exists leagues_invite_code_key on public.leagues (invite_code);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leagues_owner_id_profiles_fkey'
  ) then
    alter table public.leagues
      add constraint leagues_owner_id_profiles_fkey
      foreign key (owner_id) references public.profiles(id) on delete set null;
  end if;
end
$$;

create table if not exists public.league_members (
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, league_id)
);

alter table public.league_members add column if not exists joined_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'league_members_pkey'
  ) then
    alter table public.league_members
      add constraint league_members_pkey primary key (user_id, league_id);
  end if;
end
$$;

insert into public.league_members (user_id, league_id, joined_at)
select lp.user_id, lp.league_id, lp.joined_at
from public.league_participants lp
on conflict (user_id, league_id) do nothing;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id integer not null references public.matches(match_number) on delete cascade,
  home_score_guess integer not null,
  away_score_guess integer not null,
  points_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, match_id)
);

alter table public.predictions add column if not exists home_score_guess integer;
alter table public.predictions add column if not exists away_score_guess integer;
alter table public.predictions add column if not exists points_earned integer not null default 0;
alter table public.predictions add column if not exists created_at timestamptz not null default now();
alter table public.predictions add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'predictions_user_id_match_id_key'
  ) then
    alter table public.predictions
      add constraint predictions_user_id_match_id_key unique (user_id, match_id);
  end if;
end
$$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
  before update on public.predictions
  for each row execute function public.set_updated_at();

insert into public.predictions (user_id, match_id, home_score_guess, away_score_guess, points_earned, created_at)
select
  b.user_id,
  b.match_id,
  b.predicted_home_score,
  b.predicted_away_score,
  coalesce(b.points_awarded, 0),
  coalesce(b.created_at, now())
from public.bets b
on conflict (user_id, match_id) do nothing;

create table if not exists public.tournament_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  predicted_winner_team_id bigint references public.teams(id) on delete set null,
  predicted_top_scorer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.tournament_predictions add column if not exists predicted_winner_team_id bigint references public.teams(id) on delete set null;
alter table public.tournament_predictions add column if not exists predicted_top_scorer_name text;
alter table public.tournament_predictions add column if not exists created_at timestamptz not null default now();
alter table public.tournament_predictions add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tournament_predictions_user_id_key'
  ) then
    alter table public.tournament_predictions
      add constraint tournament_predictions_user_id_key unique (user_id);
  end if;
end
$$;

drop trigger if exists tournament_predictions_set_updated_at on public.tournament_predictions;
create trigger tournament_predictions_set_updated_at
  before update on public.tournament_predictions
  for each row execute function public.set_updated_at();

insert into public.tournament_predictions (user_id, predicted_winner_team_id, predicted_top_scorer_name, created_at, updated_at)
select
  ob.user_id,
  ob.predicted_winner_team_id,
  ob.predicted_top_scorer_name,
  coalesce(ob.created_at, now()),
  coalesce(ob.updated_at, now())
from public.outright_bets ob
on conflict (user_id) do update
set
  predicted_winner_team_id = excluded.predicted_winner_team_id,
  predicted_top_scorer_name = excluded.predicted_top_scorer_name,
  updated_at = excluded.updated_at;

alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.tournament_predictions enable row level security;

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

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

drop policy if exists leagues_select_v2 on public.leagues;
drop policy if exists leagues_insert_v2 on public.leagues;
drop policy if exists leagues_update_v2 on public.leagues;

create policy leagues_select_v2
  on public.leagues
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.league_members lm
      where lm.league_id = leagues.id
        and lm.user_id = auth.uid()
    )
  );

create policy leagues_insert_v2
  on public.leagues
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy leagues_update_v2
  on public.leagues
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists league_members_select on public.league_members;
drop policy if exists league_members_insert on public.league_members;
drop policy if exists league_members_delete on public.league_members;

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

create policy league_members_insert
  on public.league_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy league_members_delete
  on public.league_members
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists predictions_select on public.predictions;
drop policy if exists predictions_insert on public.predictions;
drop policy if exists predictions_update on public.predictions;
drop policy if exists predictions_delete on public.predictions;

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

create policy predictions_insert
  on public.predictions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy predictions_update
  on public.predictions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy predictions_delete
  on public.predictions
  for delete
  to authenticated
  using (user_id = auth.uid());

drop policy if exists tournament_predictions_select on public.tournament_predictions;
drop policy if exists tournament_predictions_insert on public.tournament_predictions;
drop policy if exists tournament_predictions_update on public.tournament_predictions;
drop policy if exists tournament_predictions_delete on public.tournament_predictions;

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

create policy tournament_predictions_insert
  on public.tournament_predictions
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy tournament_predictions_update
  on public.tournament_predictions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy tournament_predictions_delete
  on public.tournament_predictions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Fix leagues.owner_id foreign key
-- The original init created leagues.owner_id -> users(id).
-- Phase 1 added a second FK -> profiles(id).
-- If a user exists in auth.users + profiles but NOT in public.users
-- the insert will violate the old FK and fail silently.
-- This migration drops the stale FK to users and keeps only profiles.
-- ============================================================

-- Ensure every auth user has a row in public.users (backfill gaps)
insert into public.users (id)
select au.id
from auth.users au
where not exists (select 1 from public.users u where u.id = au.id)
on conflict (id) do nothing;

-- Drop the original FK from leagues.owner_id -> users(id) if it exists
alter table public.leagues
  drop constraint if exists leagues_owner_id_fkey;

-- The Phase-1 constraint (leagues_owner_id_profiles_fkey -> profiles.id) is kept.
-- Sanity: if the profiles FK does not yet exist, add it now.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leagues_owner_id_profiles_fkey'
  ) then
    alter table public.leagues
      add constraint leagues_owner_id_profiles_fkey
      foreign key (owner_id) references public.profiles(id) on delete set null;
  end if;
end $$;

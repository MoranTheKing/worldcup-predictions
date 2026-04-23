-- ============================================================
-- Enforce case-insensitive uniqueness for public-facing nicknames.
-- Applies to both legacy users.username and profiles.display_name.
-- ============================================================

create or replace function public.ensure_unique_profile_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_handle text;
begin
  if tg_table_name = 'users' then
    normalized_handle := lower(trim(coalesce(new.username, '')));

    if normalized_handle = '' then
      return new;
    end if;

    perform pg_advisory_xact_lock(hashtext(normalized_handle)::bigint);

    if exists (
      select 1
      from public.users u
      where u.id <> new.id
        and lower(trim(coalesce(u.username, ''))) = normalized_handle
    ) then
      raise exception 'username already exists'
        using errcode = '23505';
    end if;

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(trim(coalesce(p.display_name, ''))) = normalized_handle
    ) then
      raise exception 'display name already exists'
        using errcode = '23505';
    end if;
  elsif tg_table_name = 'profiles' then
    normalized_handle := lower(trim(coalesce(new.display_name, '')));

    if normalized_handle = '' then
      return new;
    end if;

    perform pg_advisory_xact_lock(hashtext(normalized_handle)::bigint);

    if exists (
      select 1
      from public.profiles p
      where p.id <> new.id
        and lower(trim(coalesce(p.display_name, ''))) = normalized_handle
    ) then
      raise exception 'display name already exists'
        using errcode = '23505';
    end if;

    if exists (
      select 1
      from public.users u
      where u.id <> new.id
        and lower(trim(coalesce(u.username, ''))) = normalized_handle
    ) then
      raise exception 'username already exists'
        using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_unique_handle_guard on public.users;
create trigger users_unique_handle_guard
  before insert or update of username
  on public.users
  for each row
  execute function public.ensure_unique_profile_handle();

drop trigger if exists profiles_unique_handle_guard on public.profiles;
create trigger profiles_unique_handle_guard
  before insert or update of display_name
  on public.profiles
  for each row
  execute function public.ensure_unique_profile_handle();

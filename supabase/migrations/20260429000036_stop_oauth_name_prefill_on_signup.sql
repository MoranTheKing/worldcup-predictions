-- Keep OAuth full names out of the public unique display_name field during Auth signup.
-- Google can return common or previously-used names; inserting them here can make
-- auth.users creation fail with "Database error saving new user" when profile
-- nickname uniqueness guards run. Onboarding remains responsible for choosing a
-- unique public nickname.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oauth_avatar_url text := new.raw_user_meta_data ->> 'avatar_url';
begin
  insert into public.users (id, avatar_url)
  values (new.id, oauth_avatar_url)
  on conflict (id) do update
  set avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url);

  insert into public.profiles (id, avatar_url)
  values (new.id, oauth_avatar_url)
  on conflict (id) do update
  set avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Restore league-scoped read privacy for social prediction data.
-- Uses SECURITY DEFINER helpers to avoid recursive RLS evaluation
-- on public.league_members while preserving expected visibility.
-- ============================================================

create or replace function public.is_member_of_league(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.can_view_user_predictions(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = target_user_id
    or exists (
      select 1
      from public.league_members mine
      join public.league_members theirs
        on theirs.league_id = mine.league_id
      where mine.user_id = auth.uid()
        and theirs.user_id = target_user_id
    );
$$;

revoke all on function public.is_member_of_league(uuid) from public;
revoke all on function public.can_view_user_predictions(uuid) from public;
grant execute on function public.is_member_of_league(uuid) to authenticated;
grant execute on function public.can_view_user_predictions(uuid) to authenticated;

drop policy if exists league_members_select on public.league_members;
drop policy if exists league_members_select_all on public.league_members;
create policy league_members_select
  on public.league_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_member_of_league(league_id)
  );

drop policy if exists predictions_select on public.predictions;
drop policy if exists predictions_select_all on public.predictions;
create policy predictions_select
  on public.predictions
  for select
  to authenticated
  using (public.can_view_user_predictions(user_id));

drop policy if exists tournament_predictions_select on public.tournament_predictions;
drop policy if exists tournament_predictions_select_all on public.tournament_predictions;
create policy tournament_predictions_select
  on public.tournament_predictions
  for select
  to authenticated
  using (public.can_view_user_predictions(user_id));

-- ============================================================
-- Restore league-scoped privacy for social prediction data.
-- Reverts permissive SELECT policies introduced in phase 2.x.
-- ============================================================

create or replace function public.viewer_is_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.user_id = auth.uid()
      and lm.league_id = target_league_id
  );
$$;

create or replace function public.viewer_can_read_prediction_owner(target_user_id uuid)
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

revoke all on function public.viewer_is_league_member(uuid) from public;
revoke all on function public.viewer_can_read_prediction_owner(uuid) from public;

grant execute on function public.viewer_is_league_member(uuid) to authenticated;
grant execute on function public.viewer_can_read_prediction_owner(uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'league_members'
  ) then
    drop policy if exists league_members_select on public.league_members;
    drop policy if exists league_members_select_all on public.league_members;

    create policy league_members_select
      on public.league_members
      for select
      to authenticated
      using (
        user_id = auth.uid()
        or public.viewer_is_league_member(league_id)
      );
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
    drop policy if exists predictions_select on public.predictions;
    drop policy if exists predictions_select_all on public.predictions;

    create policy predictions_select
      on public.predictions
      for select
      to authenticated
      using (public.viewer_can_read_prediction_owner(user_id));
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
    drop policy if exists tournament_predictions_select on public.tournament_predictions;
    drop policy if exists tournament_predictions_select_all on public.tournament_predictions;

    create policy tournament_predictions_select
      on public.tournament_predictions
      for select
      to authenticated
      using (public.viewer_can_read_prediction_owner(user_id));
  end if;
end
$$;

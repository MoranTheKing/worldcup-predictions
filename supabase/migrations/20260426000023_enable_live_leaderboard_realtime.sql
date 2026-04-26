-- Enable production realtime refreshes for live league leaderboards.
-- The app subscribes to scoped postgres_changes events instead of polling.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.matches;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.predictions;
    exception
      when duplicate_object then null;
    end;

    begin
      alter publication supabase_realtime add table public.league_members;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;

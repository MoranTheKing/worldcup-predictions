-- Enable production realtime refreshes for the global leaderboard totals.
-- Private league refreshes use league_members; the global leaderboard is profile-based.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.profiles;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;

alter table public.community_members replica identity full;
alter table public.reports replica identity full;
alter table public.profiles replica identity full;
alter publication supabase_realtime add table public.community_members;
alter publication supabase_realtime add table public.reports;
alter publication supabase_realtime add table public.profiles;
-- 1. Explicit grants. Newer Supabase projects do not auto-grant API roles on tables created
--    by migrations, so state the access model instead of relying on project defaults.
--    Row level security still decides which rows each role can touch.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- anon gets nothing: candidates never talk to the database directly.
revoke all on all tables in schema public from anon;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

-- 2. Staff must be approved. Signing up (the Auth API is public) only creates an inactive
--    reviewer profile; it grants no access until an admin activates it.
alter table profiles add column if not exists active boolean not null default false;

-- Everyone who exists when this runs was added deliberately by a developer or admin.
update profiles set active = true where active = false;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and active) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and active and role = 'admin') $$;

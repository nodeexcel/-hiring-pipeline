-- Interview pipeline schema
create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'reviewer');
create type candidate_status as enum
  ('Invited', 'R1 done', 'R2 done', 'R3 sent', 'R3 submitted', 'Selected', 'Rejected');
create type difficulty as enum ('easy', 'medium', 'hard');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  role app_role not null default 'reviewer',
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid()) $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create table round_config (
  round int primary key check (round in (1, 2, 3)),
  cutoff numeric not null default 50,
  auto_advance boolean not null default true,
  weight numeric not null,
  settings jsonb not null default '{}'::jsonb
);
insert into round_config (round, cutoff, auto_advance, weight, settings) values
  (1, 50, true, 20, '{"questions": 20, "duration_minutes": 30}'),
  (2, 50, true, 40, '{"duration_minutes": 60, "enforce_seb": false, "auto_share": 0.7}'),
  (3, 50, true, 40, '{"deadline_days": 3}');

create table candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  invite_code text not null unique default upper(encode(gen_random_bytes(5), 'hex')),
  status candidate_status not null default 'Invited',
  awaiting_approval int check (awaiting_approval in (1, 2, 3)),
  final_score numeric,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table aptitude_questions (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  difficulty difficulty not null default 'medium',
  body text not null,
  options jsonb not null,
  answer_index int not null,
  created_at timestamptz not null default now()
);

create table coding_problems (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  statement text not null,
  starter_code jsonb not null default '{}'::jsonb,
  time_limit_s numeric not null default 2,
  memory_limit_mb int not null default 256,
  created_at timestamptz not null default now()
);

create table coding_testcases (
  id uuid primary key default gen_random_uuid(),
  problem_id uuid not null references coding_problems on delete cascade,
  input text not null,
  expected_output text not null,
  hidden boolean not null default true
);

create table machine_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  brief text not null,
  rubric jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

create table r1_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates on delete cascade,
  question_ids uuid[] not null,
  seed bigint not null,
  secret text not null default encode(gen_random_bytes(32), 'hex'),
  issued_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb,
  elapsed_ms bigint,
  score numeric
);

create table r2_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates on delete cascade,
  problem_id uuid not null references coding_problems,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  language text,
  code text,
  tests_passed int,
  tests_total int,
  auto_score numeric,
  reviewer_score numeric,
  score numeric
);

create table r2_snapshots (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references r2_attempts on delete cascade,
  at timestamptz not null default now(),
  language text,
  code text not null
);
create index on r2_snapshots (attempt_id, at);

create table r2_similarity (
  attempt_id uuid not null references r2_attempts on delete cascade,
  other_attempt_id uuid not null references r2_attempts on delete cascade,
  score numeric not null,
  primary key (attempt_id, other_attempt_id)
);

create table r3_assignments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique references candidates on delete cascade,
  task_id uuid not null references machine_tasks,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  sent_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  is_late boolean,
  github_url text,
  file_path text,
  walkthrough_at timestamptz,
  walkthrough_notes text,
  score numeric
);

create table proctoring_events (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references candidates on delete cascade,
  round int not null check (round in (1, 2, 3)),
  type text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create index on proctoring_events (candidate_id, at);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates on delete cascade,
  round int not null check (round in (2, 3)),
  reviewer_id uuid not null references profiles,
  rubric_scores jsonb not null default '{}'::jsonb,
  score numeric not null check (score between 0 and 100),
  comment text,
  created_at timestamptz not null default now(),
  unique (candidate_id, round, reviewer_id)
);

create table email_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates on delete set null,
  template text not null,
  to_email text not null,
  subject text not null,
  status text not null default 'queued',
  provider_id text,
  error text,
  click_token text unique default encode(gen_random_bytes(12), 'hex'),
  target_url text,
  clicks int not null default 0,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(), tg_table_name,
    coalesce((to_jsonb(new)->>'id'), (to_jsonb(old)->>'id')),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_candidates after insert or update or delete on candidates
  for each row execute function audit_trigger();
create trigger audit_reviews after insert or update or delete on reviews
  for each row execute function audit_trigger();
create trigger audit_r2_attempts after update on r2_attempts
  for each row execute function audit_trigger();
create trigger audit_r3_assignments after update on r3_assignments
  for each row execute function audit_trigger();
create trigger audit_round_config after update on round_config
  for each row execute function audit_trigger();

-- Row level security: staff only. Candidates never touch the DB directly;
-- candidate-facing API routes use the service-role key.
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','round_config','candidates','aptitude_questions','coding_problems',
    'coding_testcases','machine_tasks','r1_attempts','r2_attempts','r2_snapshots',
    'r2_similarity','r3_assignments','proctoring_events','reviews','email_log','audit_log'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "staff read" on %I for select using (public.is_staff())', t);
  end loop;
end $$;

-- Admin-only writes on everything except reviews.
do $$
declare t text;
begin
  foreach t in array array[
    'round_config','candidates','aptitude_questions','coding_problems',
    'coding_testcases','machine_tasks','r2_attempts','r3_assignments'
  ] loop
    execute format('create policy "admin write" on %I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

create policy "admin manage profiles" on profiles for all
  using (public.is_admin()) with check (public.is_admin());
create policy "reviewer writes own review" on reviews for insert
  with check (public.is_staff() and reviewer_id = auth.uid());
create policy "reviewer updates own review" on reviews for update
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());

-- Auto-create a profile for every new auth user. Always a reviewer: privileges are never
-- granted by signup order, because the Auth API is reachable with the public key.
-- Promote an admin explicitly:  update public.profiles set role = 'admin' where email = '...';
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role) values (new.id, new.email, 'reviewer');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

insert into storage.buckets (id, name, public) values ('r3-submissions', 'r3-submissions', false)
  on conflict do nothing;

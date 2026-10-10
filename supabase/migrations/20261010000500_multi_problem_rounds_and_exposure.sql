-- 1. Exposure counters: how many papers each item has been served in, so selection can
--    rotate through the bank instead of repeating the same items.
alter table aptitude_questions add column if not exists served_count integer not null default 0;
alter table coding_problems    add column if not exists served_count integer not null default 0;

create or replace function public.bump_question_served(p_ids uuid[]) returns void
language sql security definer set search_path = public as
$$ update aptitude_questions set served_count = served_count + 1 where id = any(p_ids) $$;

create or replace function public.bump_problem_served(p_ids uuid[]) returns void
language sql security definer set search_path = public as
$$ update coding_problems set served_count = served_count + 1 where id = any(p_ids) $$;

revoke all on function public.bump_question_served(uuid[]) from public, anon, authenticated;
revoke all on function public.bump_problem_served(uuid[])  from public, anon, authenticated;
grant execute on function public.bump_question_served(uuid[]) to service_role;
grant execute on function public.bump_problem_served(uuid[])  to service_role;

-- 2. Round 2 gives each candidate several problems. One row per problem in an attempt.
alter table r2_attempts alter column problem_id drop not null;

create table if not exists r2_attempt_problems (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references r2_attempts on delete cascade,
  problem_id    uuid not null references coding_problems,
  position      int  not null,
  language      text,
  code          text,
  tests_passed  int,
  tests_total   int,
  auto_score    numeric,
  submitted_at  timestamptz,
  unique (attempt_id, problem_id),
  unique (attempt_id, position)
);
create index if not exists r2_attempt_problems_problem_idx on r2_attempt_problems (problem_id);

alter table r2_snapshots add column if not exists attempt_problem_id uuid references r2_attempt_problems on delete cascade;
create index if not exists r2_snapshots_problem_idx on r2_snapshots (attempt_problem_id, at);

create table if not exists r2_problem_similarity (
  attempt_problem_id       uuid not null references r2_attempt_problems on delete cascade,
  other_attempt_problem_id uuid not null references r2_attempt_problems on delete cascade,
  score                    numeric not null,
  primary key (attempt_problem_id, other_attempt_problem_id)
);

alter table r2_attempt_problems enable row level security;
alter table r2_problem_similarity enable row level security;
create policy "staff read" on r2_attempt_problems for select using (public.is_staff());
create policy "staff read" on r2_problem_similarity for select using (public.is_staff());
create policy "admin write" on r2_attempt_problems for all using (public.is_admin()) with check (public.is_admin());

-- 3. Carry existing single-problem attempts into the new shape.
insert into r2_attempt_problems (attempt_id, problem_id, position, language, code, tests_passed, tests_total, auto_score, submitted_at)
select a.id, a.problem_id, 1, a.language, a.code, a.tests_passed, a.tests_total, a.auto_score, a.submitted_at
from r2_attempts a
where a.problem_id is not null
  and not exists (select 1 from r2_attempt_problems p where p.attempt_id = a.id);

update r2_snapshots s
set attempt_problem_id = p.id
from r2_attempt_problems p
where s.attempt_problem_id is null and p.attempt_id = s.attempt_id and p.position = 1;

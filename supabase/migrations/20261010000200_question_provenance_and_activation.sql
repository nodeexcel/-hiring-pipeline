-- Imported content must record where it came from and stay out of scored rounds until reviewed.
alter table aptitude_questions
  add column if not exists active boolean not null default true,
  add column if not exists source text,
  add column if not exists license text,
  add column if not exists external_id text,
  add column if not exists source_url text;

alter table coding_problems
  add column if not exists active boolean not null default true,
  add column if not exists source text,
  add column if not exists license text,
  add column if not exists external_id text,
  add column if not exists source_url text,
  add column if not exists difficulty text;

-- The same upstream item cannot be imported twice.
create unique index if not exists aptitude_questions_source_key
  on aptitude_questions (source, external_id) where external_id is not null;
create unique index if not exists coding_problems_source_key
  on coding_problems (source, external_id) where external_id is not null;

create index if not exists aptitude_questions_active_idx on aptitude_questions (active);
create index if not exists coding_problems_active_idx on coding_problems (active);

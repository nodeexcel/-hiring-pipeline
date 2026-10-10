-- Per-topic counts computed in the database, so the admin overview stays correct and fast
-- no matter how large the bank grows (the API caps a plain select at 1000 rows).
-- security_invoker makes the views obey the caller's row level security.

create or replace view aptitude_topic_counts with (security_invoker = true) as
select
  coalesce(nullif(trim(section), ''), 'Uncategorised') as section,
  coalesce(nullif(trim(topic), ''), 'Uncategorised')   as topic,
  count(*) filter (where active)     as live,
  count(*) filter (where not active) as drafts
from aptitude_questions
group by 1, 2;

create or replace view dsa_topic_counts with (security_invoker = true) as
select
  t.topic                            as topic,
  count(*) filter (where p.active)     as live,
  count(*) filter (where not p.active) as drafts
from coding_problems p
cross join lateral unnest(
  case when cardinality(p.topics) = 0 then array['Uncategorised'] else p.topics end
) as t(topic)
group by 1;

grant select on aptitude_topic_counts, dsa_topic_counts to authenticated, service_role;

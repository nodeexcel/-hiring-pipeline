-- Questions are organised by topic: aptitude by section and topic, DSA problems by topic tags.

alter table aptitude_questions add column if not exists section text;
alter table coding_problems add column if not exists topics text[] not null default '{}';

-- Aptitude: split the earlier "Section: Topic" text into two proper columns.
update aptitude_questions
set section = split_part(topic, ': ', 1),
    topic   = substr(topic, strpos(topic, ': ') + 2)
where section is null and topic like '%: %';

-- Older seed rows used a single word as the topic.
update aptitude_questions set section = case topic
    when 'Arithmetic' then 'Quantitative'
    when 'Logic'      then 'Logical reasoning'
    when 'Verbal'     then 'Verbal ability'
    when 'Data'       then 'Data interpretation'
  end
where section is null and topic in ('Arithmetic', 'Logic', 'Verbal', 'Data');

-- DSA: tag the starter problems by title (a no-op where the titles do not exist).
update coding_problems set topics = case title
    when 'Sum of even numbers'    then array['Arrays', 'Math']
    when 'Palindrome check'       then array['Strings', 'Two pointers']
    when 'Pair with target sum'   then array['Arrays', 'Hash maps']
    when 'Balanced brackets'      then array['Stacks', 'Strings']
    when 'Most frequent number'   then array['Arrays', 'Hash maps']
    when 'Longest run of ones'    then array['Strings', 'Arrays']
  end
where topics = '{}' and title in (
  'Sum of even numbers', 'Palindrome check', 'Pair with target sum',
  'Balanced brackets', 'Most frequent number', 'Longest run of ones');

create index if not exists aptitude_questions_section_topic_idx on aptitude_questions (section, topic);
create index if not exists coding_problems_topics_idx on coding_problems using gin (topics);

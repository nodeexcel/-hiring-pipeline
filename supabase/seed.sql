insert into aptitude_questions (topic, difficulty, body, options, answer_index) values
  ('Arithmetic', 'easy', 'What is 15% of 240?', '["24","30","36","40"]', 2),
  ('Arithmetic', 'easy', 'A train travels 120 km in 2 hours. What is its speed in km/h?', '["50","60","70","80"]', 1),
  ('Logic', 'medium', 'Find the next number: 2, 6, 12, 20, 30, ?', '["38","40","42","44"]', 2),
  ('Logic', 'medium', 'All roses are flowers. Some flowers fade quickly. Which must be true?', '["All roses fade quickly","Some roses fade quickly","No rose fades quickly","None of these must be true"]', 3),
  ('Verbal', 'easy', 'Choose the synonym of "abundant".', '["Scarce","Plentiful","Weak","Rapid"]', 1),
  ('Data', 'medium', 'The average of 5 numbers is 18. If one number (28) is removed, what is the new average?', '["15.5","16","16.5","17"]', 2),
  ('Arithmetic', 'medium', 'If x + 1/x = 3, what is x^2 + 1/x^2?', '["5","7","9","11"]', 1),
  ('Logic', 'hard', 'In a code, CAT = 24 and DOG = 26. Using the sum of letter positions, what is BAT?', '["21","22","23","24"]', 0),
  ('Verbal', 'medium', 'Pick the odd one out.', '["Python","Java","Cobra","Ruby"]', 2),
  ('Data', 'easy', 'A shirt costs 800 after a 20% discount. What was the original price?', '["900","1000","1100","1200"]', 1);

with p as (
  insert into coding_problems (title, statement, starter_code, time_limit_s)
  values (
    'Sum of even numbers',
    E'Read an integer n, then n space-separated integers on the next line. Print the sum of the even numbers.',
    jsonb_build_object(
      'javascript', E'const lines = require("fs").readFileSync(0, "utf8").split("\\n");\n// your code\n',
      'python', E'import sys\ndata = sys.stdin.read().split()\n# your code\n',
      'java', E'import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // your code\n  }\n}\n',
      'cpp', E'#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n  // your code\n  return 0;\n}\n'
    ),
    2
  ) returning id
)
insert into coding_testcases (problem_id, input, expected_output, hidden)
select p.id, t.i, t.o, t.h from p, (values
  (E'5\n1 2 3 4 5', '6', false),
  (E'3\n2 4 6', '12', false),
  (E'4\n1 3 5 7', '0', true),
  (E'1\n10', '10', true),
  (E'6\n-2 -4 1 0 8 9', '2', true)
) as t(i, o, h);

insert into machine_tasks (title, brief, rubric) values
  ('REST API for a task manager',
   'Build a small REST API (any language) with CRUD for tasks, validation, persistence, and a README with run instructions. Include at least 5 tests.',
   '["Correctness","Code quality","Testing","Error handling","Documentation"]'),
  ('CLI log analyzer',
   'Write a CLI that parses an access log file and prints top endpoints, error rates and p95 latency. Include sample input and tests.',
   '["Correctness","Code quality","Testing","Performance","Documentation"]'),
  ('React todo with filters',
   'Build a todo app with add, edit, delete, filters and localStorage persistence. Keep it accessible and include component tests.',
   '["Correctness","Code quality","Testing","UX and accessibility","Documentation"]');

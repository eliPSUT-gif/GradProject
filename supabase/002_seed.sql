insert into public.departments (code, name, head_name)
values
  ('CS', 'Computer Science', 'Prof. Layla Hamdan'),
  ('ENG', 'Engineering', 'Dr. Mona Issa'),
  ('ADM', 'Administration', 'Dr. Anas Abu Taleb')
on conflict (code) do update
set
  name = excluded.name,
  head_name = excluded.head_name;

insert into public.app_settings (key, value_json)
values
  ('max_semester_credits', '{"value": 18}'::jsonb),
  ('difficulty_threshold', '{"value": 70}'::jsonb),
  ('model_version', '{"value": "internet-weighted-v2.0.0"}'::jsonb)
on conflict (key) do update
set
  value_json = excluded.value_json,
  updated_at = timezone('utc', now());

insert into public.app_users (
  university_id,
  role,
  full_name,
  initials,
  email,
  subtitle,
  status,
  last_login_at
)
values
  ('20231001', 'student', 'Ahmad Hassan', 'AH', 'ahmad.hassan@example.edu', 'Student | Computer Science', 'active', '2026-03-13T07:55:00Z'),
  ('20221045', 'student', 'Omar Al-Rashid', 'OR', 'omar.alrashid@example.edu', 'Student | Computer Science', 'active', '2026-03-12T10:22:00Z'),
  ('20221188', 'student', 'Sara Khalil', 'SK', 'sara.khalil@example.edu', 'Student | Computer Science', 'active', '2026-03-12T08:18:00Z'),
  ('20220877', 'student', 'Lina Nasser', 'LN', 'lina.nasser@example.edu', 'Student | Computer Science', 'active', '2026-03-11T11:10:00Z'),
  ('20220432', 'student', 'Karim Haddad', 'KH', 'karim.haddad@example.edu', 'Student | Computer Science', 'active', '2026-03-10T09:12:00Z'),
  ('20221302', 'student', 'Nour Saleh', 'NS', 'nour.saleh@example.edu', 'Student | Computer Science', 'active', '2026-03-11T15:05:00Z'),
  ('20220665', 'student', 'Yousef Barakat', 'YB', 'yousef.barakat@example.edu', 'Student | Computer Science', 'active', '2026-03-10T13:50:00Z'),
  ('ADV-1001', 'advisor', 'Prof. Layla Hamdan', 'LH', 'layla.hamdan@example.edu', 'Academic Advisor | CS Department', 'active', '2026-03-13T08:50:00Z'),
  ('ADV-1002', 'advisor', 'Dr. Mona Issa', 'MI', 'mona.issa@example.edu', 'Academic Advisor | CS Department', 'active', '2026-03-12T13:32:00Z'),
  ('ADM-1001', 'admin', 'Dr. Anas Abu Taleb', 'AT', 'anas.abutaleb@example.edu', 'System Administrator', 'active', '2026-03-13T09:14:00Z'),
  ('ADM-1002', 'admin', 'Eng. Rana Shoman', 'RS', 'rana.shoman@example.edu', 'Registrar Operations Admin', 'active', '2026-03-12T14:08:00Z')
on conflict (university_id) do update
set
  role = excluded.role,
  full_name = excluded.full_name,
  initials = excluded.initials,
  email = excluded.email,
  subtitle = excluded.subtitle,
  status = excluded.status,
  last_login_at = excluded.last_login_at,
  updated_at = timezone('utc', now());

insert into public.advisor_profiles (user_id, department_id, office_location)
select u.id, d.id, v.office_location
from (
  values
    ('ADV-1001', 'CS', 'KHCS-210'),
    ('ADV-1002', 'CS', 'KHCS-214')
) as v(university_id, department_code, office_location)
join public.app_users u on u.university_id = v.university_id
join public.departments d on d.code = v.department_code
on conflict (user_id) do update
set
  department_id = excluded.department_id,
  office_location = excluded.office_location,
  updated_at = timezone('utc', now());

insert into public.admin_profiles (user_id)
select u.id
from public.app_users u
where u.university_id in ('ADM-1001', 'ADM-1002')
on conflict (user_id) do nothing;

insert into public.student_profiles (user_id, department_id, advisor_id, gpa, year_level, completed_credits)
select
  student_u.id,
  d.id,
  advisor_u.id,
  v.gpa,
  v.year_level,
  v.completed_credits
from (
  values
    ('20231001', 'CS', 'ADV-1001', 3.42, 3, 74),
    ('20221045', 'CS', 'ADV-1001', 2.90, 4, 88),
    ('20221188', 'CS', 'ADV-1001', 3.05, 4, 84),
    ('20220877', 'CS', 'ADV-1001', 3.20, 4, 92),
    ('20220432', 'CS', 'ADV-1002', 3.58, 4, 101),
    ('20221302', 'CS', 'ADV-1002', 3.81, 3, 76),
    ('20220665', 'CS', 'ADV-1002', 3.12, 4, 82)
) as v(student_university_id, department_code, advisor_university_id, gpa, year_level, completed_credits)
join public.app_users student_u on student_u.university_id = v.student_university_id
join public.app_users advisor_u on advisor_u.university_id = v.advisor_university_id
join public.departments d on d.code = v.department_code
on conflict (user_id) do update
set
  department_id = excluded.department_id,
  advisor_id = excluded.advisor_id,
  gpa = excluded.gpa,
  year_level = excluded.year_level,
  completed_credits = excluded.completed_credits,
  updated_at = timezone('utc', now());

insert into public.courses (
  course_code,
  title,
  department_id,
  credits,
  course_type,
  is_plannable,
  is_active,
  internet_difficulty,
  difficulty_score,
  difficulty_basis
)
select
  v.course_code,
  v.title,
  d.id,
  v.credits,
  v.course_type,
  v.is_plannable,
  true,
  v.internet_difficulty,
  v.difficulty_score,
  v.difficulty_basis
from (
  values
    ('11103', 'Structured Programming', 3, 'theoretical', false, 48, 48, 'Foundational programming prerequisite.'),
    ('20133', 'Calculus (2)', 3, 'theoretical', false, 70, 70, 'Core math prerequisite for advanced analytics courses.'),
    ('20134', 'Discrete Mathematics (1)', 3, 'theoretical', false, 65, 65, 'Foundational logic and proof skills.'),
    ('20233', 'Statistical Methods', 3, 'theoretical', false, 64, 64, 'Statistics prerequisite for probability.'),
    ('11206', 'Object Oriented Programming', 3, 'theoretical', true, 52, 52, 'Moderate OOP abstraction.'),
    ('11212', 'Data Structures and Introduction to Algorithms', 3, 'theoretical', true, 78, 78, 'Common CS gatekeeper course.'),
    ('11253', 'Object Oriented Programming Lab', 1, 'practical', true, 34, 34, 'Hands-on lab.'),
    ('11313', 'Algorithms Design and Analysis', 3, 'theoretical', true, 88, 88, 'Very hard algorithmic reasoning.'),
    ('11316', 'Theory of Computation', 3, 'theoretical', true, 91, 91, 'Highly abstract and proof-heavy.'),
    ('11323', 'Database Systems', 3, 'theoretical', true, 62, 62, 'Medium database theory.'),
    ('11335', 'Operating Systems', 3, 'theoretical', true, 93, 93, 'One of the hardest core CS courses.'),
    ('11354', 'Database Systems Lab', 1, 'practical', true, 41, 41, 'Focused practical lab.'),
    ('11355', 'Operating Systems Lab', 1, 'practical', true, 72, 72, 'OS implementation load.'),
    ('11391', 'Practical Training', 3, 'practical', true, 18, 18, 'Experience-based.'),
    ('11435', 'Data Communications & Computer Networks', 3, 'theoretical', true, 67, 67, 'Medium-hard networking.'),
    ('11449', 'Computer and Society', 1, 'theoretical', true, 22, 22, 'Lighter than technical courses.'),
    ('11464', 'Information Systems Security', 3, 'theoretical', true, 73, 73, 'Moderately hard security concepts.'),
    ('11493', 'Graduation Project 1', 1, 'project', true, 57, 57, 'Project planning load.'),
    ('11494', 'Graduation Project 2', 2, 'project', true, 68, 68, 'Delivery and integration pressure.'),
    ('12242', 'Webpage Design and Internet programming LAB', 1, 'practical', true, 37, 37, 'Implementation-focused web lab.'),
    ('12243', 'Webpage Design and Internet programming', 3, 'hybrid', true, 49, 49, 'Conceptual plus practical web course.'),
    ('12343', 'Visual Programming', 3, 'hybrid', true, 56, 56, 'Moderate UI and implementation work.'),
    ('13477', 'Software Engineering', 3, 'hybrid', true, 64, 64, 'Process and design overhead.'),
    ('14330', 'Artificial Intelligence', 3, 'hybrid', true, 82, 82, 'Search, logic, and probability make it hard.'),
    ('20135', 'Discrete Mathematics (2)', 3, 'theoretical', true, 74, 74, 'Proof and logic heavy.'),
    ('20141', 'Physics (1)', 3, 'theoretical', true, 61, 61, 'Moderate problem-solving science course.'),
    ('20142', 'Physics (2)', 3, 'theoretical', true, 68, 68, 'Harder continuation of Physics 1.'),
    ('20147', 'Physics Lab', 0, 'practical', true, 24, 24, 'Procedural science lab.'),
    ('20333', 'Numerical Analysis', 3, 'theoretical', true, 72, 72, 'Applied math and approximation.'),
    ('20336', 'Principles of Probability', 3, 'theoretical', true, 76, 76, 'Symbolic probability is often hard.'),
    ('22241', 'Digital Logic Design', 3, 'hybrid', true, 66, 66, 'Binary and hardware reasoning.'),
    ('22342', 'Computer Organization and Assembly Language', 3, 'hybrid', true, 84, 84, 'Low-level systems thinking and assembly.'),
    ('22541', 'Computer Architecture', 3, 'theoretical', true, 89, 89, 'Deep hardware and performance reasoning.')
) as v(course_code, title, credits, course_type, is_plannable, internet_difficulty, difficulty_score, difficulty_basis)
join public.departments d on d.code = 'CS'
on conflict (course_code) do update
set
  title = excluded.title,
  department_id = excluded.department_id,
  credits = excluded.credits,
  course_type = excluded.course_type,
  is_plannable = excluded.is_plannable,
  is_active = excluded.is_active,
  internet_difficulty = excluded.internet_difficulty,
  difficulty_score = excluded.difficulty_score,
  difficulty_basis = excluded.difficulty_basis,
  updated_at = timezone('utc', now());

insert into public.course_prerequisites (course_id, prerequisite_course_id)
select c.id, p.id
from (
  values
    ('11206', '11103'),
    ('11212', '20134'),
    ('11212', '11206'),
    ('11313', '11212'),
    ('11316', '20135'),
    ('11316', '11206'),
    ('11323', '11212'),
    ('11335', '22342'),
    ('11335', '11212'),
    ('11435', '11212'),
    ('11464', '11435'),
    ('11494', '11493'),
    ('12243', '11206'),
    ('12343', '11206'),
    ('13477', '11323'),
    ('14330', '11212'),
    ('20135', '20134'),
    ('20142', '20141'),
    ('20333', '20133'),
    ('20336', '20133'),
    ('20336', '20233'),
    ('22342', '22241'),
    ('22541', '22342')
) as v(course_code, prerequisite_code)
join public.courses c on c.course_code = v.course_code
join public.courses p on p.course_code = v.prerequisite_code
on conflict do nothing;

insert into public.course_corequisites (course_id, corequisite_course_id)
select c.id, p.id
from (
  values
    ('11253', '11206'),
    ('11354', '11323'),
    ('11355', '11335'),
    ('12242', '12243'),
    ('20147', '20141')
) as v(course_code, corequisite_code)
join public.courses c on c.course_code = v.course_code
join public.courses p on p.course_code = v.corequisite_code
on conflict do nothing;

insert into public.course_rules (course_id, rule_type, rule_value_int, rule_value_text)
select c.id, v.rule_type, v.rule_value_int, v.rule_value_text
from (
  values
    ('11391', 'minimum_completed_credits', 90, null),
    ('11449', 'minimum_completed_credits', 70, null),
    ('11493', 'minimum_completed_credits', 90, null)
) as v(course_code, rule_type, rule_value_int, rule_value_text)
join public.courses c on c.course_code = v.course_code;

insert into public.historical_course_stats (
  course_id,
  term_code,
  avg_grade,
  pass_rate,
  fail_rate,
  enrollment_count,
  withdrawals
)
select
  c.id,
  term.term_code,
  round(greatest(52, least(95, 94 - (c.internet_difficulty * 0.34) + term.grade_shift))::numeric, 2),
  round(greatest(44, least(98, 97 - (c.internet_difficulty * 0.44) + term.pass_shift))::numeric, 2),
  round(
    greatest(
      2,
      least(
        34,
        100
        - greatest(44, least(98, 97 - (c.internet_difficulty * 0.44) + term.pass_shift))
        - case when c.course_type = 'practical' then 7 else 9 end
      )
    )::numeric,
    2
  ),
  case
    when c.course_type = 'theoretical' then 120 + term.enrollment_shift
    when c.course_type = 'hybrid' then 96 + term.enrollment_shift
    else 78 + term.enrollment_shift
  end,
  greatest(0, least(18, floor(c.internet_difficulty / 12.0)::int + term.withdrawal_shift))
from public.courses c
cross join (
  values
    ('2024-Fall', -2, -2, 0, -1),
    ('2025-Spring', 2, 2, 3, 1)
) as term(term_code, grade_shift, pass_shift, enrollment_shift, withdrawal_shift)
where not exists (
  select 1
  from public.historical_course_stats h
  where h.course_id = c.id
    and h.term_code = term.term_code
);

insert into public.student_completed_courses (student_id, course_id, completed_term_code, final_grade)
select s.id, c.id, '2025-Fall', 75
from (
  values
    ('20231001', '11103'), ('20231001', '20134'), ('20231001', '11206'), ('20231001', '11253'),
    ('20231001', '11212'), ('20231001', '20135'), ('20231001', '20141'), ('20231001', '20147'),
    ('20231001', '20333'), ('20231001', '20336'), ('20231001', '22241'), ('20231001', '22342'),
    ('20221045', '11103'), ('20221045', '20134'), ('20221045', '11206'), ('20221045', '11253'),
    ('20221045', '11212'), ('20221045', '11313'), ('20221045', '11316'), ('20221045', '11323'),
    ('20221045', '11354'), ('20221045', '11435'), ('20221045', '12243'), ('20221045', '12242'),
    ('20221045', '12343'), ('20221045', '14330'), ('20221045', '20135'), ('20221045', '20141'),
    ('20221045', '20142'), ('20221045', '20147'), ('20221045', '20333'), ('20221045', '22241'),
    ('20221045', '22342'), ('20221045', '22541'),
    ('20221188', '11103'), ('20221188', '20134'), ('20221188', '11206'), ('20221188', '11253'),
    ('20221188', '11212'), ('20221188', '11323'), ('20221188', '11435'), ('20221188', '12243'),
    ('20221188', '20135'), ('20221188', '20141'), ('20221188', '20142'), ('20221188', '20147'),
    ('20221188', '20333'), ('20221188', '22241'), ('20221188', '22342'),
    ('20220877', '11103'), ('20220877', '20134'), ('20220877', '11206'), ('20220877', '11253'),
    ('20220877', '11212'), ('20220877', '11313'), ('20220877', '11316'), ('20220877', '11323'),
    ('20220877', '11335'), ('20220877', '11354'), ('20220877', '11355'), ('20220877', '11435'),
    ('20220877', '11449'), ('20220877', '12243'), ('20220877', '12242'), ('20220877', '12343'),
    ('20220877', '13477'), ('20220877', '14330'), ('20220877', '20135'), ('20220877', '20141'),
    ('20220877', '20142'), ('20220877', '20147'), ('20220877', '20333'), ('20220877', '20336'),
    ('20220877', '22241'), ('20220877', '22342'), ('20220877', '22541'),
    ('20220432', '11103'), ('20220432', '20134'), ('20220432', '11206'), ('20220432', '11253'),
    ('20220432', '11212'), ('20220432', '11313'), ('20220432', '11316'), ('20220432', '11323'),
    ('20220432', '11335'), ('20220432', '11354'), ('20220432', '11355'), ('20220432', '11391'),
    ('20220432', '11435'), ('20220432', '11449'), ('20220432', '11464'), ('20220432', '11493'),
    ('20220432', '12243'), ('20220432', '12242'), ('20220432', '12343'), ('20220432', '13477'),
    ('20220432', '14330'), ('20220432', '20135'), ('20220432', '20141'), ('20220432', '20142'),
    ('20220432', '20147'), ('20220432', '20333'), ('20220432', '20336'), ('20220432', '22241'),
    ('20220432', '22342'), ('20220432', '22541'),
    ('20221302', '11103'), ('20221302', '20134'), ('20221302', '11206'), ('20221302', '11253'),
    ('20221302', '11212'), ('20221302', '11323'), ('20221302', '11435'), ('20221302', '12243'),
    ('20221302', '20135'), ('20221302', '20141'), ('20221302', '20147'), ('20221302', '22241'),
    ('20221302', '22342'),
    ('20220665', '11103'), ('20220665', '20134'), ('20220665', '11206'), ('20220665', '11253'),
    ('20220665', '11212'), ('20220665', '11313'), ('20220665', '11323'), ('20220665', '11435'),
    ('20220665', '12243'), ('20220665', '20135'), ('20220665', '20141'), ('20220665', '20142'),
    ('20220665', '20147'), ('20220665', '20333'), ('20220665', '22241'), ('20220665', '22342')
) as v(student_code, course_code)
join public.app_users s on s.university_id = v.student_code
join public.courses c on c.course_code = v.course_code
on conflict do nothing;

insert into public.schedule_drafts (student_id, name, term_code, status, saved_at)
select s.id, v.name, '2026-Spring', 'draft', v.saved_at
from (
  values
    ('20231001', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20221045', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20221188', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20220877', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20220432', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20221302', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z'),
    ('20220665', 'Spring 2026 Forecast', '2026-03-12T10:05:00Z')
) as v(student_code, name, saved_at)
join public.app_users s on s.university_id = v.student_code
where not exists (
  select 1
  from public.schedule_drafts d
  where d.student_id = s.id
    and d.name = v.name
    and d.term_code = '2026-Spring'
);

insert into public.schedule_draft_courses (schedule_id, course_id)
select d.id, c.id
from (
  values
    ('20231001', '11323'), ('20231001', '11435'), ('20231001', '12243'), ('20231001', '12242'), ('20231001', '22541'), ('20231001', '11449'),
    ('20221045', '11335'), ('20221045', '11355'), ('20221045', '11464'), ('20221045', '13477'), ('20221045', '22541'), ('20221045', '20336'),
    ('20221188', '11313'), ('20221188', '11316'), ('20221188', '14330'), ('20221188', '22541'), ('20221188', '20336'), ('20221188', '11435'),
    ('20220877', '11391'), ('20220877', '11493'), ('20220877', '13477'), ('20220877', '11464'), ('20220877', '12343'),
    ('20220432', '11494'), ('20220432', '11464'), ('20220432', '13477'), ('20220432', '11449'),
    ('20221302', '12243'), ('20221302', '12242'), ('20221302', '12343'), ('20221302', '11449'), ('20221302', '22541'),
    ('20220665', '11335'), ('20220665', '11435'), ('20220665', '14330'), ('20220665', '20336'), ('20220665', '22541')
) as v(student_code, course_code)
join public.app_users s on s.university_id = v.student_code
join public.schedule_drafts d on d.student_id = s.id and d.name = 'Spring 2026 Forecast' and d.term_code = '2026-Spring'
join public.courses c on c.course_code = v.course_code
on conflict (schedule_id, course_id) do nothing;

insert into public.schedule_evaluations (
  schedule_id,
  student_id,
  total_score,
  risk_label,
  total_credits,
  model_version,
  explanation,
  factors,
  recommendations,
  top_courses,
  evaluated_at
)
select
  d.id,
  s.id,
  v.total_score,
  v.risk_label,
  v.total_credits,
  'internet-weighted-v2.0.0',
  v.explanation::jsonb,
  v.factors::jsonb,
  v.recommendations::jsonb,
  v.top_courses::jsonb,
  v.evaluated_at::timestamptz
from (
  values
    ('20231001', 72, 'Hard', 16, '["2 course(s) in this draft have high internet-weighted difficulty scores.","The schedule carries 16 credits, close to the 18-credit cap.","The draft keeps a healthier mix of course types.","No configured hard course combinations were detected."]', '[{"label":"Internet difficulty baseline","score":58,"detail":"2 hard course(s) selected"},{"label":"Credit load","score":19,"detail":"16 credits selected out of 18"},{"label":"Course-type balance","score":3,"detail":"4 theory, 1 hybrid, 1 practical, 0 project"},{"label":"Known hard combinations","score":0,"detail":"No flagged combinations"}]', '[{"title":"Reduce total credits","action":"Move one 3-credit course to the next term if possible."},{"title":"Consider lower-difficulty eligible options","action":"Examples: 12343 Visual Programming, 12242 Webpage Design and Internet programming LAB."}]', '["22541 Computer Architecture","11435 Data Communications & Computer Networks","11323 Database Systems"]', '2026-03-12T10:00:00Z'),
    ('20221045', 90, 'Hard', 18, '["4 course(s) in this draft have high internet-weighted difficulty scores.","The schedule carries 18 credits, close to the 18-credit cap.","The draft is theory-heavy, which increases exam and proof pressure.","Known hard combinations were detected."]', '[{"label":"Internet difficulty baseline","score":81,"detail":"4 hard course(s) selected"},{"label":"Credit load","score":26,"detail":"18 credits selected out of 18"},{"label":"Course-type balance","score":9,"detail":"4 theory, 1 hybrid, 1 practical, 0 project"},{"label":"Known hard combinations","score":6,"detail":"11335 + 22541"}]', '[{"title":"Swap 11335 for a lighter eligible course","action":"Replace it with 11449 Computer and Society."},{"title":"Reduce total credits","action":"Move one 3-credit course to the next term if possible."}]', '["11335 Operating Systems","22541 Computer Architecture","20336 Principles of Probability"]', '2026-03-12T10:00:00Z')
) as v(student_code, total_score, risk_label, total_credits, explanation, factors, recommendations, top_courses, evaluated_at)
join public.app_users s on s.university_id = v.student_code
join public.schedule_drafts d on d.student_id = s.id and d.name = 'Spring 2026 Forecast' and d.term_code = '2026-Spring'
where not exists (
  select 1
  from public.schedule_evaluations e
  where e.schedule_id = d.id
);

insert into public.messages (sender_id, recipient_id, body, sent_at, read_at)
select sender_u.id, recipient_u.id, v.body, v.sent_at::timestamptz, v.read_at::timestamptz
from (
  values
    ('20231001', 'ADV-1001', 'I am considering Database Systems and Networks together. Could you review that workload?', '2026-03-12T08:15:00Z', '2026-03-12T08:32:00Z'),
    ('ADV-1001', '20231001', 'Yes. That combination is manageable if you avoid pairing it with another high-difficulty theory course.', '2026-03-12T08:32:00Z', '2026-03-12T09:02:00Z'),
    ('ADV-1001', '20221188', 'Your latest draft looks theory-heavy. Please consider replacing one hard course before registration closes.', '2026-03-13T07:45:00Z', null),
    ('20221302', 'ADV-1002', 'I can take Visual Programming and Webpage Design now. Do you recommend keeping both together?', '2026-03-13T08:05:00Z', '2026-03-13T08:16:00Z'),
    ('ADV-1002', '20221302', 'Yes, that pairing is reasonable. Keep the rest of the term lighter because Computer Architecture will raise the total load quickly.', '2026-03-13T08:16:00Z', '2026-03-13T08:34:00Z'),
    ('ADV-1002', '20220665', 'Your current draft still looks systems-heavy. Please consider swapping one theory course before saving your final registration plan.', '2026-03-13T09:10:00Z', null)
) as v(sender_code, recipient_code, body, sent_at, read_at)
join public.app_users sender_u on sender_u.university_id = v.sender_code
join public.app_users recipient_u on recipient_u.university_id = v.recipient_code
where not exists (
  select 1
  from public.messages m
  where m.sender_id = sender_u.id
    and m.recipient_id = recipient_u.id
    and m.body = v.body
    and m.sent_at = v.sent_at::timestamptz
);

insert into public.import_jobs (
  created_by,
  file_name,
  format,
  imported_rows,
  rejected_rows,
  status,
  validation_messages,
  errors,
  created_at
)
select
  admin_u.id,
  'seed-historical-data.json',
  'json',
  (select count(*) from public.historical_course_stats),
  0,
  'completed',
  '["Seed dataset loaded for MVP demo coverage."]'::jsonb,
  '[]'::jsonb,
  '2026-03-12T09:45:00Z'::timestamptz
from public.app_users admin_u
where admin_u.university_id = 'ADM-1001'
and not exists (
  select 1
  from public.import_jobs j
  where j.file_name = 'seed-historical-data.json'
);




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
    ('11102', 'Introduction to Computer Science', 3, 'theoretical', true, 24, 24, 'PSUT introduces numbering systems, data storage, computer organization, problem-solving, and basic programming here, so it is a light but essential foundation course.'),
    ('11103', 'Structured Programming', 3, 'theoretical', true, 48, 48, 'PSUT covers core structured-programming concepts, control structures, functions, recursion, arrays, and structures, giving it a moderate foundational coding workload.'),
    ('11151', 'Structured Programming Lab', 1, 'practical', true, 26, 26, 'PSUT frames this as the hands-on lab companion to Structured Programming, so it is practical and lighter than the lecture course.'),
    ('20132', 'Calculus (1)', 3, 'theoretical', true, 66, 66, 'PSUT describes limits, continuity, derivatives, trigonometric, logarithmic, exponential, hyperbolic functions, and integrals, making it a foundational but demanding math course.'),
    ('20133', 'Calculus (2)', 3, 'theoretical', true, 70, 70, 'PSUT covers methods and applications of integration plus analytic geometry and series, making it a harder continuation of Calculus (1).'),
    ('20134', 'Discrete Mathematics (1)', 3, 'theoretical', true, 65, 65, 'Foundational logic and proof skills.'),
    ('20200', 'Technical Writing and Communication Skills', 3, 'theoretical', true, 24, 24, 'PSUT positions this as a communication-focused university requirement, so the workload is generally lighter than core technical and math courses.'),
    ('20233', 'Statistical Methods', 3, 'theoretical', true, 64, 64, 'PSUT uses this as the statistics foundation before probability, so it carries moderate mathematical reasoning but less abstraction than the harder upper-level math courses.'),
    ('20234', 'Linear Algebra', 3, 'theoretical', true, 63, 63, 'PSUT lists systems of linear equations, Gaussian elimination, Gauss-Jordan method, and matrix operations, giving it a solid mathematical reasoning load.'),
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
    ('22541', 'Computer Architecture', 3, 'theoretical', true, 89, 89, 'Deep hardware and performance reasoning.'),
    ('31112', 'Arabic Language Communication Skills', 3, 'theoretical', true, 22, 22, 'PSUT describes this as a communication-skills course in reading, writing, listening, and speaking, which is lighter than the major technical sequence.'),
    ('31122', 'English Language Communication Skills', 3, 'theoretical', true, 28, 28, 'PSUT focuses this course on reading, writing, speaking, and listening for academic communication, so it carries moderate language-practice work but low technical difficulty.'),
    ('31151', 'National Education', 3, 'theoretical', true, 18, 18, 'PSUT frames this as a civic and national-awareness course, making it substantially lighter than the core CS and mathematics requirements.'),
    ('31160', 'Leadership and Societal Responsibility', 0, 'theoretical', true, 8, 8, 'PSUT presents leadership frameworks, ethics, and social responsibility here, and the study plan lists it as a zero-credit requirement with minimal academic load.'),
    ('31251', 'Military Science', 3, 'theoretical', true, 16, 16, 'PSUT treats Military Science as a general university requirement rather than a technical course, so it is lighter than the major sequence.'),
    ('31254', 'Entrepreneurship and Innovation', 3, 'theoretical', true, 26, 26, 'PSUT describes entrepreneurship, competitive environments, and venture creation concepts, giving it moderate conceptual work but low mathematical or systems complexity.'),
    ('31374', 'Life Skills', 3, 'theoretical', true, 15, 15, 'PSUT frames Life Skills as a practical personal-development requirement, which makes it lighter than the program core.'),
    ('EUNI-01', 'Elective University Requirement', 3, 'theoretical', true, 35, 35, 'Placeholder study-plan slot for a university elective; actual difficulty depends on the chosen elective course.'),
    ('EUNI-02', 'Elective University Requirement', 3, 'theoretical', true, 35, 35, 'Placeholder study-plan slot for a university elective; actual difficulty depends on the chosen elective course.'),
    ('EUNI-03', 'Elective University Requirement', 3, 'theoretical', true, 35, 35, 'Placeholder study-plan slot for a university elective; actual difficulty depends on the chosen elective course.'),
    ('EPRG-01', 'Elective Program Requirement', 3, 'theoretical', true, 45, 45, 'Placeholder study-plan slot for a program elective; actual difficulty depends on the chosen elective course.'),
    ('EPRG-02', 'Elective Program Requirement', 3, 'theoretical', true, 45, 45, 'Placeholder study-plan slot for a program elective; actual difficulty depends on the chosen elective course.'),
    ('EPRG-03', 'Elective Program Requirement', 3, 'theoretical', true, 45, 45, 'Placeholder study-plan slot for a program elective; actual difficulty depends on the chosen elective course.')
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
    ('11103', '11102'),
    ('20133', '20132'),
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
    ('11151', '11103'),
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

create temporary table tmp_seed_transcript_entries (
  student_code text not null,
  term_code text not null,
  course_code text not null,
  final_grade numeric(5,2) not null,
  status text not null,
  attempt_no integer not null
) on commit drop;

insert into tmp_seed_transcript_entries (student_code, term_code, course_code, final_grade, status, attempt_no)
values
  ('20231001', '2023-Fall', '11103', 88, 'passed', 1),
  ('20231001', '2023-Fall', '20134', 83, 'passed', 1),
  ('20231001', '2023-Fall', '11206', 82, 'passed', 1),
  ('20231001', '2023-Fall', '11253', 88, 'passed', 1),
  ('20231001', '2023-Fall', '11212', 77, 'passed', 1),
  ('20231001', '2023-Fall', '11313', 72, 'passed', 1),
  ('20231001', '2024-Spring', '11316', 70, 'passed', 1),
  ('20231001', '2024-Spring', '11323', 76, 'passed', 1),
  ('20231001', '2024-Spring', '11354', 88, 'passed', 1),
  ('20231001', '2024-Spring', '12242', 90, 'passed', 1),
  ('20231001', '2024-Spring', '12243', 83, 'passed', 1),
  ('20231001', '2024-Spring', '12343', 79, 'passed', 1),
  ('20231001', '2024-Spring', '20135', 77, 'passed', 1),
  ('20231001', '2024-Summer', '20141', 77, 'passed', 1),
  ('20231001', '2024-Summer', '20142', 78, 'passed', 1),
  ('20231001', '2024-Summer', '20147', 87, 'passed', 1),
  ('20231001', '2024-Summer', '20233', 77, 'passed', 1),
  ('20231001', '2024-Fall', '22241', 78, 'passed', 1),
  ('20231001', '2024-Fall', '22342', 77, 'passed', 1),
  ('20231001', '2024-Fall', '31374', 96, 'passed', 1),
  ('20231001', '2024-Fall', '31251', 91, 'passed', 1),
  ('20231001', '2024-Fall', '31151', 90, 'passed', 1),
  ('20231001', '2024-Fall', '31112', 89, 'passed', 1),
  ('20231001', '2025-Spring', '31254', 92, 'passed', 1),
  ('20231001', '2025-Spring', '31122', 94, 'passed', 1),
  ('20231001', '2025-Spring', 'EUNI-01', 91, 'passed', 1),
  ('20231001', '2025-Spring', 'EUNI-02', 92, 'passed', 1),
  ('20231001', '2025-Spring', '11494', 77, 'passed', 1),
  ('20221045', '2022-Fall', '11103', 80, 'passed', 1),
  ('20221045', '2022-Fall', '20134', 73, 'passed', 1),
  ('20221045', '2022-Fall', '11206', 69, 'passed', 1),
  ('20221045', '2022-Fall', '11253', 83, 'passed', 1),
  ('20221045', '2022-Fall', '11212', 73, 'passed', 1),
  ('20221045', '2022-Fall', '11313', 71, 'passed', 1),
  ('20221045', '2023-Spring', '11316', 71, 'passed', 1),
  ('20221045', '2023-Spring', '11323', 80, 'passed', 1),
  ('20221045', '2023-Spring', '11354', 80, 'passed', 1),
  ('20221045', '2023-Spring', '11435', 74, 'passed', 1),
  ('20221045', '2023-Spring', '12243', 80, 'passed', 1),
  ('20221045', '2023-Spring', '12242', 76, 'passed', 1),
  ('20221045', '2023-Spring', '12343', 74, 'passed', 1),
  ('20221045', '2023-Summer', '14330', 64, 'passed', 1),
  ('20221045', '2023-Summer', '20135', 71, 'passed', 1),
  ('20221045', '2023-Summer', '20141', 71, 'passed', 1),
  ('20221045', '2023-Fall', '20142', 77, 'passed', 1),
  ('20221045', '2023-Fall', '20147', 86, 'passed', 1),
  ('20221045', '2023-Fall', '20333', 70, 'passed', 1),
  ('20221045', '2023-Fall', '22241', 69, 'passed', 1),
  ('20221045', '2023-Fall', '22342', 67, 'passed', 1),
  ('20221045', '2023-Fall', '22541', 73, 'passed', 1),
  ('20221045', '2023-Fall', '31374', 91, 'passed', 1),
  ('20221045', '2024-Spring', '31251', 82, 'passed', 1),
  ('20221045', '2024-Spring', '31151', 81, 'passed', 1),
  ('20221045', '2024-Spring', '31112', 83, 'passed', 1),
  ('20221045', '2024-Spring', '31254', 79, 'passed', 1),
  ('20221045', '2024-Spring', '31122', 79, 'passed', 1),
  ('20221045', '2024-Spring', 'EUNI-01', 86, 'passed', 1),
  ('20221045', '2024-Summer', 'EUNI-02', 77, 'passed', 1),
  ('20221045', '2024-Summer', 'EUNI-03', 82, 'passed', 1),
  ('20221045', '2024-Summer', '11102', 90, 'passed', 1),
  ('20221045', '2024-Fall', '11151', 89, 'passed', 1),
  ('20221188', '2022-Fall', '11103', 77, 'passed', 1),
  ('20221188', '2022-Fall', '20134', 73, 'passed', 1),
  ('20221188', '2022-Fall', '11206', 75, 'passed', 1),
  ('20221188', '2022-Fall', '11253', 76, 'passed', 1),
  ('20221188', '2022-Fall', '11212', 67, 'passed', 1),
  ('20221188', '2022-Fall', '11323', 79, 'passed', 1),
  ('20221188', '2023-Spring', '11435', 69, 'passed', 1),
  ('20221188', '2023-Spring', '12243', 77, 'passed', 1),
  ('20221188', '2023-Spring', '20135', 72, 'passed', 1),
  ('20221188', '2023-Spring', '20141', 73, 'passed', 1),
  ('20221188', '2023-Spring', '20142', 80, 'passed', 1),
  ('20221188', '2023-Spring', '20147', 86, 'passed', 1),
  ('20221188', '2023-Spring', '20333', 69, 'passed', 1),
  ('20221188', '2023-Summer', '22241', 71, 'passed', 1),
  ('20221188', '2023-Summer', '22342', 71, 'passed', 1),
  ('20221188', '2023-Summer', '31374', 83, 'passed', 1),
  ('20221188', '2023-Fall', '31251', 87, 'passed', 1),
  ('20221188', '2023-Fall', '31151', 83, 'passed', 1),
  ('20221188', '2023-Fall', '31112', 90, 'passed', 1),
  ('20221188', '2023-Fall', '31254', 90, 'passed', 1),
  ('20221188', '2023-Fall', '31122', 85, 'passed', 1),
  ('20221188', '2023-Fall', 'EUNI-01', 84, 'passed', 1),
  ('20221188', '2024-Spring', 'EUNI-02', 90, 'passed', 1),
  ('20221188', '2024-Spring', 'EUNI-03', 83, 'passed', 1),
  ('20221188', '2024-Spring', '11102', 91, 'passed', 1),
  ('20221188', '2024-Spring', '20200', 87, 'passed', 1),
  ('20221188', '2024-Spring', '20234', 76, 'passed', 1),
  ('20221188', '2024-Spring', '20233', 81, 'passed', 1),
  ('20221188', '2024-Summer', '20132', 77, 'passed', 1),
  ('20221188', '2024-Summer', '11494', 74, 'passed', 1),
  ('20220877', '2022-Fall', '11103', 82, 'passed', 1),
  ('20220877', '2022-Fall', '20134', 81, 'passed', 1),
  ('20220877', '2022-Fall', '11206', 80, 'passed', 1),
  ('20220877', '2022-Fall', '11253', 79, 'passed', 1),
  ('20220877', '2022-Fall', '11212', 68, 'passed', 1),
  ('20220877', '2022-Fall', '11313', 74, 'passed', 1),
  ('20220877', '2023-Spring', '11316', 76, 'passed', 1),
  ('20220877', '2023-Spring', '11323', 81, 'passed', 1),
  ('20220877', '2023-Spring', '11335', 73, 'passed', 1),
  ('20220877', '2023-Spring', '11354', 79, 'passed', 1),
  ('20220877', '2023-Spring', '11355', 72, 'passed', 1),
  ('20220877', '2023-Spring', '11435', 73, 'passed', 1),
  ('20220877', '2023-Spring', '11449', 94, 'passed', 1),
  ('20220877', '2023-Spring', '12243', 82, 'passed', 1),
  ('20220877', '2023-Summer', '12242', 85, 'passed', 1),
  ('20220877', '2023-Summer', '12343', 80, 'passed', 1),
  ('20220877', '2023-Summer', '13477', 77, 'passed', 1),
  ('20220877', '2023-Fall', '14330', 74, 'passed', 1),
  ('20220877', '2023-Fall', '20135', 80, 'passed', 1),
  ('20220877', '2023-Fall', '20141', 80, 'passed', 1),
  ('20220877', '2023-Fall', '20142', 81, 'passed', 1),
  ('20220877', '2023-Fall', '20147', 87, 'passed', 1),
  ('20220877', '2023-Fall', '20333', 80, 'passed', 1),
  ('20220877', '2023-Fall', '20336', 82, 'passed', 1),
  ('20220877', '2024-Spring', '22241', 77, 'passed', 1),
  ('20220877', '2024-Spring', '22342', 71, 'passed', 1),
  ('20220877', '2024-Spring', '22541', 73, 'passed', 1),
  ('20220877', '2024-Spring', '31374', 93, 'passed', 1),
  ('20220877', '2024-Spring', '31251', 95, 'passed', 1),
  ('20220877', '2024-Spring', '31151', 89, 'passed', 1),
  ('20220877', '2024-Summer', '31112', 86, 'passed', 1),
  ('20220877', '2024-Summer', '31254', 87, 'passed', 1),
  ('20220877', '2024-Summer', '31122', 87, 'passed', 1),
  ('20220877', '2024-Fall', 'EUNI-01', 85, 'passed', 1),
  ('20220877', '2024-Fall', 'EUNI-02', 89, 'passed', 1),
  ('20220432', '2022-Fall', '11103', 90, 'passed', 1),
  ('20220432', '2022-Fall', '20134', 80, 'passed', 1),
  ('20220432', '2022-Fall', '11206', 82, 'passed', 1),
  ('20220432', '2022-Fall', '11253', 92, 'passed', 1),
  ('20220432', '2022-Fall', '11212', 81, 'passed', 1),
  ('20220432', '2022-Fall', '11313', 77, 'passed', 1),
  ('20220432', '2023-Spring', '11316', 77, 'passed', 1),
  ('20220432', '2023-Spring', '11323', 83, 'passed', 1),
  ('20220432', '2023-Spring', '11335', 80, 'passed', 1),
  ('20220432', '2023-Spring', '11354', 82, 'passed', 1),
  ('20220432', '2023-Spring', '11355', 82, 'passed', 1),
  ('20220432', '2023-Spring', '11391', 96, 'passed', 1),
  ('20220432', '2023-Spring', '11435', 76, 'passed', 1),
  ('20220432', '2023-Spring', '11449', 90, 'passed', 1),
  ('20220432', '2023-Summer', '11464', 78, 'passed', 1),
  ('20220432', '2023-Summer', '11493', 85, 'passed', 1),
  ('20220432', '2023-Summer', '12243', 92, 'passed', 1),
  ('20220432', '2023-Summer', '12242', 92, 'passed', 1),
  ('20220432', '2023-Fall', '12343', 88, 'passed', 1),
  ('20220432', '2023-Fall', '13477', 89, 'passed', 1),
  ('20220432', '2023-Fall', '14330', 76, 'passed', 1),
  ('20220432', '2023-Fall', '20135', 75, 'passed', 1),
  ('20220432', '2023-Fall', '20141', 89, 'passed', 1),
  ('20220432', '2023-Fall', '20142', 84, 'passed', 1),
  ('20220432', '2023-Fall', '20147', 96, 'passed', 1),
  ('20220432', '2024-Spring', '20333', 88, 'passed', 1),
  ('20220432', '2024-Spring', '20336', 87, 'passed', 1),
  ('20220432', '2024-Spring', '22241', 81, 'passed', 1),
  ('20220432', '2024-Spring', '22342', 85, 'passed', 1),
  ('20220432', '2024-Spring', '22541', 76, 'passed', 1),
  ('20220432', '2024-Spring', '31374', 95, 'passed', 1),
  ('20220432', '2024-Summer', '31251', 91, 'passed', 1),
  ('20220432', '2024-Summer', '31151', 93, 'passed', 1),
  ('20220432', '2024-Summer', '31112', 96, 'passed', 1),
  ('20220432', '2024-Fall', '31254', 90, 'passed', 1),
  ('20220432', '2024-Fall', '31122', 92, 'passed', 1),
  ('20220432', '2024-Fall', 'EUNI-01', 90, 'passed', 1),
  ('20220432', '2024-Fall', 'EUNI-02', 89, 'passed', 1),
  ('20220432', '2024-Fall', '11494', 85, 'passed', 1),
  ('20221302', '2022-Fall', '11103', 83, 'passed', 1),
  ('20221302', '2022-Fall', '20134', 84, 'passed', 1),
  ('20221302', '2022-Fall', '11206', 83, 'passed', 1),
  ('20221302', '2022-Fall', '11253', 91, 'passed', 1),
  ('20221302', '2022-Fall', '11212', 80, 'passed', 1),
  ('20221302', '2022-Fall', '11323', 88, 'passed', 1),
  ('20221302', '2023-Spring', '11435', 77, 'passed', 1),
  ('20221302', '2023-Spring', '12243', 86, 'passed', 1),
  ('20221302', '2023-Spring', '20135', 75, 'passed', 1),
  ('20221302', '2023-Spring', '20141', 80, 'passed', 1),
  ('20221302', '2023-Spring', '20147', 96, 'passed', 1),
  ('20221302', '2023-Spring', '22241', 79, 'passed', 1),
  ('20221302', '2023-Spring', '22342', 81, 'passed', 1),
  ('20221302', '2023-Summer', '31374', 90, 'passed', 1),
  ('20221302', '2023-Summer', '31251', 96, 'passed', 1),
  ('20221302', '2023-Summer', '31151', 91, 'passed', 1),
  ('20221302', '2023-Fall', '31112', 91, 'passed', 1),
  ('20221302', '2023-Fall', '31254', 96, 'passed', 1),
  ('20221302', '2023-Fall', '31122', 92, 'passed', 1),
  ('20221302', '2023-Fall', 'EUNI-01', 93, 'passed', 1),
  ('20221302', '2023-Fall', 'EUNI-02', 93, 'passed', 1),
  ('20221302', '2023-Fall', 'EUNI-03', 90, 'passed', 1),
  ('20221302', '2024-Spring', '11102', 92, 'passed', 1),
  ('20221302', '2024-Spring', '20200', 96, 'passed', 1),
  ('20221302', '2024-Spring', '20234', 92, 'passed', 1),
  ('20221302', '2024-Spring', '20233', 90, 'passed', 1),
  ('20221302', '2024-Spring', '20132', 83, 'passed', 1),
  ('20220665', '2022-Fall', '11103', 76, 'passed', 1),
  ('20220665', '2022-Fall', '20134', 72, 'passed', 1),
  ('20220665', '2022-Fall', '11206', 74, 'passed', 1),
  ('20220665', '2022-Fall', '11253', 81, 'passed', 1),
  ('20220665', '2022-Fall', '11212', 77, 'passed', 1),
  ('20220665', '2022-Fall', '11313', 69, 'passed', 1),
  ('20220665', '2023-Spring', '11323', 82, 'passed', 1),
  ('20220665', '2023-Spring', '11435', 80, 'passed', 1),
  ('20220665', '2023-Spring', '12243', 75, 'passed', 1),
  ('20220665', '2023-Spring', '20135', 68, 'passed', 1),
  ('20220665', '2023-Spring', '20141', 73, 'passed', 1),
  ('20220665', '2023-Spring', '20142', 75, 'passed', 1),
  ('20220665', '2023-Spring', '20147', 88, 'passed', 1),
  ('20220665', '2023-Summer', '20333', 77, 'passed', 1),
  ('20220665', '2023-Summer', '22241', 72, 'passed', 1),
  ('20220665', '2023-Summer', '22342', 77, 'passed', 1),
  ('20220665', '2023-Fall', '31374', 84, 'passed', 1),
  ('20220665', '2023-Fall', '31251', 84, 'passed', 1),
  ('20220665', '2023-Fall', '31151', 84, 'passed', 1),
  ('20220665', '2023-Fall', '31112', 94, 'passed', 1),
  ('20220665', '2023-Fall', '31254', 82, 'passed', 1),
  ('20220665', '2023-Fall', '31122', 90, 'passed', 1),
  ('20220665', '2024-Spring', 'EUNI-01', 82, 'passed', 1),
  ('20220665', '2024-Spring', 'EUNI-02', 91, 'passed', 1),
  ('20220665', '2024-Spring', 'EUNI-03', 81, 'passed', 1),
  ('20220665', '2024-Spring', '11102', 84, 'passed', 1),
  ('20220665', '2024-Spring', '20200', 94, 'passed', 1),
  ('20220665', '2024-Spring', '20234', 74, 'passed', 1),
  ('20220665', '2024-Summer', '20233', 84, 'passed', 1);

delete from public.student_transcript_entries ste
using public.app_users s
where ste.student_id = s.id
  and s.university_id in (
    '20231001',
    '20221045',
    '20221188',
    '20220877',
    '20220432',
    '20221302',
    '20220665'
  );

insert into public.student_transcript_entries (
  student_id,
  term_code,
  course_id,
  final_grade,
  status,
  attempt_no,
  created_at,
  updated_at
)
select
  s.id,
  t.term_code,
  c.id,
  t.final_grade,
  t.status,
  t.attempt_no,
  timezone('utc', now()),
  timezone('utc', now())
from tmp_seed_transcript_entries t
join public.app_users s on s.university_id = t.student_code
join public.courses c on c.course_code = t.course_code
on conflict (student_id, course_id, term_code, attempt_no) do update
set
  final_grade = excluded.final_grade,
  status = excluded.status,
  updated_at = timezone('utc', now());

delete from public.schedule_drafts
where name = 'Spring 2026 Forecast'
  and term_code = '2026-Spring';

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

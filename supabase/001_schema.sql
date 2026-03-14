create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  head_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  university_id text not null unique,
  role text not null check (role in ('student', 'advisor', 'admin')),
  full_name text not null,
  initials text not null,
  email text unique,
  subtitle text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete restrict,
  advisor_id uuid references public.app_users(id) on delete set null,
  gpa numeric(3,2) not null check (gpa >= 0 and gpa <= 4),
  year_level smallint check (year_level >= 1 and year_level <= 6),
  completed_credits integer not null default 0 check (completed_credits >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.advisor_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete restrict,
  office_location text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.app_users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  title text not null,
  department_id uuid not null references public.departments(id) on delete restrict,
  credits smallint not null check (credits >= 0 and credits <= 6),
  course_type text not null check (course_type in ('theoretical', 'practical', 'hybrid', 'project')),
  is_plannable boolean not null default true,
  is_active boolean not null default true,
  internet_difficulty integer not null default 50 check (internet_difficulty >= 0 and internet_difficulty <= 100),
  difficulty_score numeric(5,2) not null default 0 check (difficulty_score >= 0 and difficulty_score <= 100),
  difficulty_basis text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create table if not exists public.course_corequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  corequisite_course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (course_id, corequisite_course_id),
  check (course_id <> corequisite_course_id)
);

create table if not exists public.course_rules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  rule_type text not null check (rule_type in ('minimum_completed_credits', 'maximum_semester_credits', 'note')),
  rule_value_int integer,
  rule_value_text text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.historical_course_stats (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  term_code text not null,
  avg_grade numeric(5,2) not null check (avg_grade >= 0 and avg_grade <= 100),
  pass_rate numeric(5,2) not null check (pass_rate >= 0 and pass_rate <= 100),
  fail_rate numeric(5,2) not null check (fail_rate >= 0 and fail_rate <= 100),
  enrollment_count integer not null check (enrollment_count > 0),
  withdrawals integer not null check (withdrawals >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (course_id, term_code)
);

create table if not exists public.student_completed_courses (
  student_id uuid not null references public.app_users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  completed_term_code text,
  final_grade numeric(5,2),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, course_id)
);

create table if not exists public.schedule_drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  term_code text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'archived')),
  saved_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_draft_courses (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_drafts(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  unique (schedule_id, course_id)
);

create table if not exists public.schedule_evaluations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedule_drafts(id) on delete cascade,
  student_id uuid not null references public.app_users(id) on delete cascade,
  total_score numeric(5,2) not null check (total_score >= 0 and total_score <= 100),
  risk_label text not null check (risk_label in ('Easy', 'Balanced', 'Hard')),
  total_credits integer not null check (total_credits >= 0),
  model_version text not null,
  explanation jsonb not null default '[]'::jsonb,
  factors jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  top_courses jsonb not null default '[]'::jsonb,
  evaluated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.app_users(id) on delete cascade,
  recipient_id uuid not null references public.app_users(id) on delete cascade,
  body text not null,
  sent_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.app_users(id) on delete set null,
  file_name text not null,
  format text not null check (format in ('csv', 'json')),
  imported_rows integer not null default 0,
  rejected_rows integer not null default 0,
  status text not null check (status in ('completed', 'completed_with_errors', 'failed')),
  validation_messages jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_app_users_role on public.app_users(role);
create index if not exists idx_student_profiles_advisor_id on public.student_profiles(advisor_id);
create index if not exists idx_courses_department_id on public.courses(department_id);
create index if not exists idx_historical_course_stats_course_id on public.historical_course_stats(course_id);
create index if not exists idx_historical_course_stats_term_code on public.historical_course_stats(term_code);
create index if not exists idx_schedule_drafts_student_id on public.schedule_drafts(student_id);
create index if not exists idx_schedule_evaluations_schedule_id on public.schedule_evaluations(schedule_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);
create index if not exists idx_messages_sent_at on public.messages(sent_at desc);

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

drop trigger if exists trg_student_profiles_updated_at on public.student_profiles;
create trigger trg_student_profiles_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_advisor_profiles_updated_at on public.advisor_profiles;
create trigger trg_advisor_profiles_updated_at
before update on public.advisor_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_courses_updated_at on public.courses;
create trigger trg_courses_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

drop trigger if exists trg_schedule_drafts_updated_at on public.schedule_drafts;
create trigger trg_schedule_drafts_updated_at
before update on public.schedule_drafts
for each row execute function public.set_updated_at();

begin;

alter table public.student_profiles
  add column if not exists admission_year integer,
  add column if not exists admission_term text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_profiles_admission_term_check'
  ) then
    alter table public.student_profiles
      add constraint student_profiles_admission_term_check
      check (admission_term in ('fall', 'spring', 'summer'));
  end if;
end $$;

create table if not exists public.academic_terms (
  term_code text primary key,
  academic_year integer not null,
  term_name text not null check (term_name in ('fall', 'spring', 'summer')),
  term_type text not null check (term_type in ('regular', 'summer')),
  max_credits integer not null check (max_credits > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.student_transcript_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.app_users(id) on delete cascade,
  term_code text not null,
  course_id uuid not null references public.courses(id) on delete restrict,
  final_grade numeric(5,2),
  status text not null check (status in ('passed', 'failed', 'withdrawn', 'in_progress')),
  attempt_no integer not null default 1 check (attempt_no >= 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, course_id, term_code, attempt_no)
);

create index if not exists idx_academic_terms_year_name
  on public.academic_terms(academic_year, term_name);

create index if not exists idx_student_transcript_entries_student_term
  on public.student_transcript_entries(student_id, term_code);

create index if not exists idx_student_transcript_entries_student_course
  on public.student_transcript_entries(student_id, course_id, attempt_no desc, term_code desc);

drop trigger if exists trg_student_transcript_entries_updated_at on public.student_transcript_entries;
create trigger trg_student_transcript_entries_updated_at
before update on public.student_transcript_entries
for each row execute function public.set_updated_at();

create or replace function public.normalize_transcript_mark(input_mark numeric)
returns numeric
language sql
immutable
as $$
  select case
    when input_mark is null then null
    when input_mark < 35 then 35
    else input_mark
  end
$$;

create or replace function public.term_type_from_term_name(term_name text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(term_name, '')) = 'summer' then 'summer'
    else 'regular'
  end
$$;

create or replace function public.term_name_from_code(term_code text)
returns text
language sql
immutable
as $$
  select case lower(split_part(coalesce(term_code, ''), '-', 2))
    when 'fall' then 'fall'
    when 'spring' then 'spring'
    when 'summer' then 'summer'
    else 'fall'
  end
$$;

create or replace function public.infer_student_admission_year(student_user_id uuid)
returns integer
language sql
stable
as $$
  select case
    when u.university_id ~ '^[0-9]{4}' then substring(u.university_id from 1 for 4)::integer
    else extract(year from timezone('utc', now()))::integer
  end
  from public.app_users u
  where u.id = student_user_id
$$;

drop view if exists public.advisor_advisee_summary_v;
drop view if exists public.student_dashboard_summary_v;
drop view if exists public.student_transcript_v;
drop view if exists public.student_term_metrics_v;

do $$
begin
  if to_regclass('public.student_completed_courses') is not null then
    execute 'drop trigger if exists trg_student_completed_courses_refresh_dashboard on public.student_completed_courses';
  end if;
end
$$;
drop function if exists public.refresh_dashboard_student_data();
drop function if exists public.refresh_student_term_metrics(uuid);
drop function if exists public.refresh_student_profile_metrics(uuid);

drop table if exists public.student_term_metrics;

do $$
declare
  start_year integer;
  end_year integer;
begin
  start_year := coalesce(
    (
      select min(substring(university_id from 1 for 4)::integer)
      from public.app_users
      where role = 'student'
        and university_id ~ '^[0-9]{4}'
    ),
    extract(year from timezone('utc', now()))::integer
  );

  end_year := greatest(start_year + 4, extract(year from timezone('utc', now()))::integer + 2);

  insert into public.academic_terms (term_code, academic_year, term_name, term_type, max_credits)
  select
    format('%s-%s', academic_year, initcap(term_name)),
    academic_year,
    term_name,
    public.term_type_from_term_name(term_name),
    case when term_name = 'summer' then 9 else 18 end
  from generate_series(start_year, end_year) as academic_year
  cross join (values ('spring'), ('summer'), ('fall')) as terms(term_name)
  on conflict (term_code) do update
  set
    academic_year = excluded.academic_year,
    term_name = excluded.term_name,
    term_type = excluded.term_type,
    max_credits = excluded.max_credits;
end $$;

insert into public.academic_terms (term_code, academic_year, term_name, term_type, max_credits)
select distinct
  source.term_code,
  coalesce(nullif(split_part(source.term_code, '-', 1), '')::integer, extract(year from timezone('utc', now()))::integer),
  public.term_name_from_code(source.term_code),
  public.term_type_from_term_name(public.term_name_from_code(source.term_code)),
  case
    when public.term_name_from_code(source.term_code) = 'summer' then 9
    else 18
  end
from (
  select term_code
  from public.schedule_drafts
  where term_code is not null
) source
where source.term_code is not null
on conflict (term_code) do nothing;

do $$
begin
  if to_regclass('public.student_completed_courses') is not null then
    execute $sql$
      insert into public.academic_terms (term_code, academic_year, term_name, term_type, max_credits)
      select distinct
        source.term_code,
        coalesce(nullif(split_part(source.term_code, '-', 1), '')::integer, extract(year from timezone('utc', now()))::integer),
        public.term_name_from_code(source.term_code),
        public.term_type_from_term_name(public.term_name_from_code(source.term_code)),
        case
          when public.term_name_from_code(source.term_code) = 'summer' then 9
          else 18
        end
      from (
        select completed_term_code as term_code
        from public.student_completed_courses
        where completed_term_code is not null
      ) source
      where source.term_code is not null
      on conflict (term_code) do nothing
    $sql$;
  end if;

  if to_regclass('public.student_transcript_entries') is not null then
    execute $sql$
      insert into public.academic_terms (term_code, academic_year, term_name, term_type, max_credits)
      select distinct
        source.term_code,
        coalesce(nullif(split_part(source.term_code, '-', 1), '')::integer, extract(year from timezone('utc', now()))::integer),
        public.term_name_from_code(source.term_code),
        public.term_type_from_term_name(public.term_name_from_code(source.term_code)),
        case
          when public.term_name_from_code(source.term_code) = 'summer' then 9
          else 18
        end
      from (
        select term_code
        from public.student_transcript_entries
        where term_code is not null
      ) source
      where source.term_code is not null
      on conflict (term_code) do nothing
    $sql$;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.student_completed_courses') is not null then
    execute $sql$
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
        scc.student_id,
        coalesce(scc.completed_term_code, format('%s-Fall', public.infer_student_admission_year(scc.student_id))),
        scc.course_id,
        scc.final_grade,
        case
          when scc.final_grade is null then 'in_progress'
          when scc.final_grade >= 60 then 'passed'
          else 'failed'
        end,
        1,
        scc.created_at,
        timezone('utc', now())
      from public.student_completed_courses scc
      on conflict (student_id, course_id, term_code, attempt_no) do nothing
    $sql$;
  end if;
end
$$;

update public.student_profiles sp
set
  admission_year = coalesce(sp.admission_year, public.infer_student_admission_year(sp.user_id)),
  admission_term = coalesce(sp.admission_term, 'fall'),
  updated_at = timezone('utc', now());

create or replace function public.get_dashboard_risk_status(total_score numeric, gpa numeric)
returns text
language sql
immutable
as $$
  select case
    when coalesce(total_score, 0) >= 75 or (coalesce(total_score, 0) >= 68 and coalesce(gpa, 0) < 3.10) then 'at-risk'
    when coalesce(total_score, 0) >= 50 or (coalesce(total_score, 0) >= 42 and coalesce(gpa, 0) < 3.25) then 'monitor'
    else 'good'
  end
$$;

create or replace view public.student_transcript_v as
select
  ste.id,
  ste.student_id,
  ste.term_code,
  coalesce(at.term_type, public.term_type_from_term_name(public.term_name_from_code(ste.term_code))) as term_type,
  c.course_code,
  c.title as course_name,
  c.credits,
  ste.final_grade,
  ste.status,
  ste.attempt_no
from public.student_transcript_entries ste
join public.courses c on c.id = ste.course_id
left join public.academic_terms at on at.term_code = ste.term_code;

create or replace view public.student_term_metrics_v as
select
  ste.student_id,
  ste.term_code,
  coalesce(at.term_type, public.term_type_from_term_name(public.term_name_from_code(ste.term_code))) as term_type,
  count(*)::integer as course_count,
  coalesce(sum(case when ste.status = 'passed' then c.credits else 0 end), 0)::integer as completed_credits,
  round((avg(public.normalize_transcript_mark(ste.final_grade)) * 4 / 100.0)::numeric, 2) as gpa
from public.student_transcript_entries ste
join public.courses c on c.id = ste.course_id
left join public.academic_terms at on at.term_code = ste.term_code
group by
  ste.student_id,
  ste.term_code,
  coalesce(at.term_type, public.term_type_from_term_name(public.term_name_from_code(ste.term_code)));

create or replace view public.student_dashboard_summary_v as
with transcript_marks as (
  select
    ste.student_id,
    round((avg(public.normalize_transcript_mark(ste.final_grade)) * 4 / 100.0)::numeric, 2) as gpa
  from public.student_transcript_entries ste
  where ste.final_grade is not null
  group by ste.student_id
),
completed_credit_totals as (
  select
    passed.student_id,
    coalesce(sum(c.credits), 0)::integer as completed_credits
  from (
    select distinct student_id, course_id
    from public.student_transcript_entries
    where status = 'passed'
  ) passed
  join public.courses c on c.id = passed.course_id
  group by passed.student_id
),
latest_draft as (
  select distinct on (student_id)
    id,
    student_id,
    name,
    term_code,
    status,
    saved_at
  from public.schedule_drafts
  order by student_id, saved_at desc
),
latest_evaluation as (
  select distinct on (student_id)
    id,
    schedule_id,
    student_id,
    total_score,
    risk_label,
    total_credits,
    recommendations,
    explanation,
    evaluated_at
  from public.schedule_evaluations
  order by student_id, evaluated_at desc
)
select
  student_user.id as student_id,
  student_user.university_id,
  student_user.full_name as student_name,
  coalesce(transcript_marks.gpa, 0) as gpa,
  coalesce(completed_credit_totals.completed_credits, 0) as completed_credits,
  sp.admission_year,
  sp.admission_term,
  d.name as department_name,
  advisor_user.id as advisor_id,
  advisor_user.full_name as advisor_name,
  latest_draft.id as latest_draft_id,
  latest_draft.name as latest_draft_name,
  latest_draft.term_code as latest_draft_term_code,
  latest_draft.status as latest_draft_status,
  latest_draft.saved_at as latest_draft_saved_at,
  latest_evaluation.id as latest_evaluation_id,
  latest_evaluation.total_score as latest_total_score,
  latest_evaluation.risk_label as latest_risk_label,
  latest_evaluation.total_credits as latest_total_credits,
  latest_evaluation.recommendations as latest_recommendations,
  latest_evaluation.explanation as latest_explanation,
  latest_evaluation.evaluated_at as latest_evaluated_at
from public.student_profiles sp
join public.app_users student_user on student_user.id = sp.user_id
join public.departments d on d.id = sp.department_id
left join public.app_users advisor_user on advisor_user.id = sp.advisor_id
left join transcript_marks on transcript_marks.student_id = sp.user_id
left join completed_credit_totals on completed_credit_totals.student_id = sp.user_id
left join latest_draft on latest_draft.student_id = sp.user_id
left join latest_evaluation on latest_evaluation.student_id = sp.user_id;

create or replace view public.advisor_advisee_summary_v as
select
  summary.*,
  public.get_dashboard_risk_status(summary.latest_total_score, summary.gpa) as risk_status
from public.student_dashboard_summary_v summary
where summary.advisor_id is not null;

alter table public.student_profiles
  drop column if exists average_mark;

drop table if exists public.student_completed_courses;

commit;

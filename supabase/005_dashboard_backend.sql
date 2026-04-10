begin;

alter table public.student_profiles
  add column if not exists average_mark numeric(5,2),
  add column if not exists admission_year integer,
  add column if not exists admission_term text;

alter table public.student_profiles
  alter column gpa type numeric(5,2);

alter table public.student_profiles
  drop constraint if exists student_profiles_gpa_check;

alter table public.student_profiles
  add constraint student_profiles_gpa_check
  check (gpa >= 0 and gpa <= 100);

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

create table if not exists public.student_term_metrics (
  student_id uuid not null references public.app_users(id) on delete cascade,
  term_code text not null,
  term_type text not null check (term_type in ('regular', 'summer')),
  course_count integer not null default 0,
  completed_credits integer not null default 0,
  average_mark numeric(5,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (student_id, term_code)
);

create index if not exists idx_student_completed_courses_student_term
  on public.student_completed_courses(student_id, completed_term_code);

create index if not exists idx_schedule_drafts_student_saved_at
  on public.schedule_drafts(student_id, saved_at desc);

create index if not exists idx_schedule_evaluations_student_evaluated_at
  on public.schedule_evaluations(student_id, evaluated_at desc);

create index if not exists idx_student_term_metrics_student_term
  on public.student_term_metrics(student_id, term_code desc);

create or replace function public.normalize_dashboard_mark(input_mark numeric)
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

create or replace function public.term_type_from_code(term_code text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(term_code, '') ilike '%summer%' then 'summer'
    else 'regular'
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

create or replace function public.refresh_student_profile_metrics(target_student_id uuid)
returns void
language plpgsql
as $$
declare
  inferred_admission_year integer;
begin
  inferred_admission_year := public.infer_student_admission_year(target_student_id);

  update public.student_profiles sp
  set
    gpa = marks.average_mark,
    average_mark = marks.average_mark,
    completed_credits = coalesce(marks.completed_credits, 0),
    admission_year = coalesce(sp.admission_year, inferred_admission_year),
    admission_term = coalesce(sp.admission_term, 'fall'),
    updated_at = timezone('utc', now())
  from (
    select
      scc.student_id,
      round(avg(public.normalize_dashboard_mark(scc.final_grade))::numeric, 2) as average_mark,
      coalesce(sum(c.credits), 0) as completed_credits
    from public.student_completed_courses scc
    join public.courses c on c.id = scc.course_id
    where scc.student_id = target_student_id
    group by scc.student_id
  ) marks
  where sp.user_id = marks.student_id;

  update public.student_profiles sp
  set
    gpa = coalesce(sp.average_mark, sp.gpa, 0),
    average_mark = coalesce(sp.average_mark, 0),
    completed_credits = coalesce(sp.completed_credits, 0),
    admission_year = coalesce(sp.admission_year, inferred_admission_year),
    admission_term = coalesce(sp.admission_term, 'fall'),
    updated_at = timezone('utc', now())
  where sp.user_id = target_student_id
    and not exists (
      select 1
      from public.student_completed_courses scc
      where scc.student_id = target_student_id
    );
end;
$$;

create or replace function public.refresh_student_term_metrics(target_student_id uuid)
returns void
language plpgsql
as $$
begin
  delete from public.student_term_metrics
  where student_id = target_student_id;

  insert into public.student_term_metrics (
    student_id,
    term_code,
    term_type,
    course_count,
    completed_credits,
    average_mark
  )
  select
    scc.student_id,
    coalesce(scc.completed_term_code, 'Unspecified') as term_code,
    public.term_type_from_code(scc.completed_term_code),
    count(*) as course_count,
    coalesce(sum(c.credits), 0) as completed_credits,
    round(avg(public.normalize_dashboard_mark(scc.final_grade))::numeric, 2) as average_mark
  from public.student_completed_courses scc
  join public.courses c on c.id = scc.course_id
  where scc.student_id = target_student_id
  group by scc.student_id, coalesce(scc.completed_term_code, 'Unspecified'), public.term_type_from_code(scc.completed_term_code);
end;
$$;

create or replace function public.refresh_dashboard_student_data()
returns trigger
language plpgsql
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_student_profile_metrics(new.student_id);
    perform public.refresh_student_term_metrics(new.student_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_student_profile_metrics(old.student_id);
    perform public.refresh_student_term_metrics(old.student_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_student_completed_courses_refresh_dashboard on public.student_completed_courses;
create trigger trg_student_completed_courses_refresh_dashboard
after insert or update or delete on public.student_completed_courses
for each row execute function public.refresh_dashboard_student_data();

create or replace function public.get_dashboard_risk_status(total_score numeric, gpa numeric)
returns text
language sql
immutable
as $$
  select case
    when coalesce(total_score, 0) >= 75 or (coalesce(total_score, 0) >= 68 and coalesce(gpa, 0) < 3.1) then 'at-risk'
    when coalesce(total_score, 0) >= 50 or (coalesce(total_score, 0) >= 42 and coalesce(gpa, 0) < 3.25) then 'monitor'
    else 'good'
  end
$$;

create or replace view public.student_dashboard_summary_v as
with latest_draft as (
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
  sp.gpa,
  sp.average_mark,
  sp.completed_credits,
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
left join latest_draft on latest_draft.student_id = sp.user_id
left join latest_evaluation on latest_evaluation.student_id = sp.user_id;

create or replace view public.advisor_advisee_summary_v as
select
  summary.*,
  public.get_dashboard_risk_status(summary.latest_total_score, summary.gpa) as risk_status
from public.student_dashboard_summary_v summary
where summary.advisor_id is not null;

create or replace view public.student_transcript_v as
select
  scc.student_id,
  coalesce(scc.completed_term_code, 'Unspecified') as term_code,
  public.term_type_from_code(scc.completed_term_code) as term_type,
  c.course_code,
  c.title as course_name,
  c.credits,
  scc.final_grade
from public.student_completed_courses scc
join public.courses c on c.id = scc.course_id;

update public.student_profiles sp
set
  gpa = coalesce(sp.average_mark, sp.gpa),
  admission_year = coalesce(sp.admission_year, public.infer_student_admission_year(sp.user_id)),
  admission_term = coalesce(sp.admission_term, 'fall'),
  updated_at = timezone('utc', now());

do $$
declare
  student_record record;
begin
  for student_record in
    select user_id
    from public.student_profiles
  loop
    perform public.refresh_student_profile_metrics(student_record.user_id);
    perform public.refresh_student_term_metrics(student_record.user_id);
  end loop;
end;
$$;

commit;

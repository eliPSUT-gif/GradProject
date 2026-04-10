begin;

alter table public.student_profiles
  alter column gpa type numeric(5,2);

alter table public.student_profiles
  drop constraint if exists student_profiles_gpa_check;

alter table public.student_profiles
  add constraint student_profiles_gpa_check
  check (gpa >= 0 and gpa <= 100);

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

update public.student_profiles
set
  gpa = coalesce(average_mark, gpa, 0),
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
  end loop;
end;
$$;

commit;

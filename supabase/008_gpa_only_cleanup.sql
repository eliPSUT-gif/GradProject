begin;

drop view if exists public.advisor_advisee_summary_v;
drop view if exists public.student_dashboard_summary_v;
drop view if exists public.student_term_metrics_v;

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

commit;

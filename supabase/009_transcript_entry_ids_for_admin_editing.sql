begin;

create or replace view public.student_transcript_v as
select
  ste.id as entry_id,
  ste.student_id,
  ste.term_code,
  coalesce(at.term_type, public.term_type_from_term_name(public.term_name_from_code(ste.term_code))) as term_type,
  ste.course_id,
  c.course_code,
  c.title as course_name,
  c.credits,
  ste.final_grade,
  ste.status,
  ste.attempt_no
from public.student_transcript_entries ste
join public.courses c on c.id = ste.course_id
left join public.academic_terms at on at.term_code = ste.term_code;

commit;

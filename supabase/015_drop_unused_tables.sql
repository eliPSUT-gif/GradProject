begin;

-- Conservative cleanup for legacy tables superseded by the active transcript
-- and message-based password inquiry flows. Role profile tables are retained.
drop table if exists public.import_jobs cascade;
drop table if exists public.password_reset_inquiries cascade;
drop table if exists public.student_completed_courses cascade;
drop table if exists public.student_term_metrics cascade;

commit;

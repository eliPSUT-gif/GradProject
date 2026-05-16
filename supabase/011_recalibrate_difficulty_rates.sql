begin;

update public.historical_course_stats h
set
  avg_grade = round(greatest(48, least(95, 96 - (c.internet_difficulty * 0.50) + case
    when h.term_code = '2024-Fall' then -2
    when h.term_code = '2025-Spring' then 2
    else 0
  end))::numeric, 2),
  pass_rate = round(greatest(38, least(98, 99 - (c.internet_difficulty * 0.62) + case
    when h.term_code = '2024-Fall' then -2
    when h.term_code = '2025-Spring' then 2
    else 0
  end))::numeric, 2),
  fail_rate = round(
    greatest(
      2,
      least(
        55,
        100
        - greatest(38, least(98, 99 - (c.internet_difficulty * 0.62) + case
          when h.term_code = '2024-Fall' then -2
          when h.term_code = '2025-Spring' then 2
          else 0
        end))
        - case when c.course_type = 'practical' then 7 else 9 end
      )
    )::numeric,
    2
  )
from public.courses c
where h.course_id = c.id;

commit;

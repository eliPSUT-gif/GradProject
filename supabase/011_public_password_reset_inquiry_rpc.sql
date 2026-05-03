create or replace function public.submit_password_reset_inquiry(
  p_university_id text,
  p_requester_role text
)
returns table (
  id uuid,
  requester_id text,
  requester_name text,
  requester_role text,
  status text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester public.app_users%rowtype;
begin
  if trim(coalesce(p_university_id, '')) = '' then
    raise exception 'Enter a valid student or advisor ID.';
  end if;

  if p_requester_role not in ('student', 'advisor') then
    raise exception 'Password inquiries are available for student and advisor accounts only.';
  end if;

  select *
  into v_requester
  from public.app_users
  where university_id = trim(p_university_id)
    and role = p_requester_role
  limit 1;

  if not found then
    raise exception 'No % account was found for that ID.', p_requester_role;
  end if;

  return query
  with existing_open as (
    select pri.id, pri.requester_role, pri.status, pri.created_at, pri.resolved_at
    from public.password_reset_inquiries pri
    where pri.requester_id = v_requester.id
      and pri.status = 'open'
    order by pri.created_at desc
    limit 1
  ),
  inserted as (
    insert into public.password_reset_inquiries (
      requester_id,
      requester_role,
      status
    )
    select
      v_requester.id,
      p_requester_role,
      'open'
    where not exists (select 1 from existing_open)
    returning password_reset_inquiries.id, password_reset_inquiries.requester_role, password_reset_inquiries.status, password_reset_inquiries.created_at, password_reset_inquiries.resolved_at
  )
  select
    coalesce(existing_open.id, inserted.id) as id,
    v_requester.university_id as requester_id,
    v_requester.full_name as requester_name,
    coalesce(existing_open.requester_role, inserted.requester_role) as requester_role,
    coalesce(existing_open.status, inserted.status) as status,
    coalesce(existing_open.created_at, inserted.created_at) as created_at,
    coalesce(existing_open.resolved_at, inserted.resolved_at) as resolved_at
  from existing_open
  full outer join inserted on true;
end;
$$;

grant execute on function public.submit_password_reset_inquiry(text, text) to anon;
grant execute on function public.submit_password_reset_inquiry(text, text) to authenticated;

begin;

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
  v_admin public.app_users%rowtype;
  v_message public.messages%rowtype;
  v_prefix constant text := '[PASSWORD_RESET_INQUIRY]';
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
  where app_users.university_id = trim(p_university_id)
    and app_users.role = p_requester_role
    and app_users.status = 'active'
  limit 1;

  if not found then
    raise exception 'No active % account was found for that ID.', p_requester_role;
  end if;

  select *
  into v_admin
  from public.app_users
  where app_users.role = 'admin'
    and app_users.status = 'active'
  order by app_users.created_at asc
  limit 1;

  if not found then
    raise exception 'No active admin account is available to receive this request.';
  end if;

  select *
  into v_message
  from public.messages
  where messages.sender_id = v_requester.id
    and messages.recipient_id = v_admin.id
    and messages.read_at is null
    and messages.body like v_prefix || '%'
  order by messages.sent_at desc
  limit 1;

  if not found then
    insert into public.messages (
      sender_id,
      recipient_id,
      body,
      sent_at,
      client_message_id
    )
    values (
      v_requester.id,
      v_admin.id,
      v_prefix || ' ' || v_requester.full_name || ' (' || v_requester.university_id || ') requested admin password help.',
      timezone('utc', now()),
      gen_random_uuid()
    )
    returning * into v_message;
  end if;

  return query
  select
    v_message.id,
    v_requester.university_id,
    v_requester.full_name,
    v_requester.role,
    case when v_message.read_at is null then 'open' else 'resolved' end,
    v_message.sent_at,
    v_message.read_at;
end;
$$;

create or replace function public.resolve_password_reset_inquiry_message(
  p_message_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_now timestamptz;
  v_updated_count integer;
  v_prefix constant text := '[PASSWORD_RESET_INQUIRY]';
begin
  v_app_user_id := public.current_app_user_id();
  v_now := timezone('utc', now());

  if v_app_user_id is null then
    raise exception 'No app user is linked to the current auth user';
  end if;

  update public.messages
  set read_at = coalesce(messages.read_at, v_now)
  where messages.id = p_message_id
    and messages.recipient_id = v_app_user_id
    and messages.body like v_prefix || '%';

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception 'Password inquiry message was not found.';
  end if;

  return v_now;
end;
$$;

grant execute on function public.submit_password_reset_inquiry(text, text) to anon;
grant execute on function public.submit_password_reset_inquiry(text, text) to authenticated;
grant execute on function public.resolve_password_reset_inquiry_message(uuid) to authenticated;

commit;

begin;

create index if not exists idx_messages_recipient_read_sent_at
  on public.messages (recipient_id, read_at, sent_at desc);

create or replace function public.mark_conversation_read(other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_now timestamptz;
  v_updated_count integer;
begin
  v_app_user_id := public.current_app_user_id();
  v_now := timezone('utc', now());

  if v_app_user_id is null then
    raise exception 'No app user is linked to the current auth user';
  end if;

  update public.messages
  set read_at = coalesce(read_at, v_now)
  where recipient_id = v_app_user_id
    and sender_id = other_user_id
    and read_at is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

create or replace function public.can_current_user_access_chat_topic(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid;
  v_topic_match text[];
  v_left_user_id uuid;
  v_right_user_id uuid;
begin
  v_current_user_id := public.current_app_user_id();

  if v_current_user_id is null then
    return false;
  end if;

  v_topic_match := regexp_match(topic, '^chat:pair:([0-9a-fA-F-]{36}):([0-9a-fA-F-]{36})$');

  if v_topic_match is null then
    return false;
  end if;

  v_left_user_id := v_topic_match[1]::uuid;
  v_right_user_id := v_topic_match[2]::uuid;

  if v_current_user_id <> v_left_user_id and v_current_user_id <> v_right_user_id then
    return false;
  end if;

  return public.can_users_message(v_left_user_id, v_right_user_id);
exception
  when others then
    return false;
end;
$$;

grant execute on function public.can_current_user_access_chat_topic(text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists "authenticated_users_can_receive" on realtime.messages;
drop policy if exists "authenticated_users_can_send" on realtime.messages;
drop policy if exists "authenticated_users_can_receive_chat_broadcasts" on realtime.messages;
drop policy if exists "authenticated_users_can_send_chat_broadcasts" on realtime.messages;

create policy "authenticated_users_can_receive_chat_broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and public.can_current_user_access_chat_topic(realtime.topic())
);

create policy "authenticated_users_can_send_chat_broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and public.can_current_user_access_chat_topic(realtime.topic())
);

commit;

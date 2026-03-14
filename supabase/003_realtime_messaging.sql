begin;

create extension if not exists pgcrypto;

alter table public.app_users
  add column if not exists last_seen_at timestamptz;

alter table public.messages
  add column if not exists delivered_at timestamptz,
  add column if not exists client_message_id uuid;

create unique index if not exists idx_messages_client_message_id
  on public.messages (client_message_id)
  where client_message_id is not null;

create index if not exists idx_messages_recipient_sent_at
  on public.messages (recipient_id, sent_at desc);

create index if not exists idx_messages_sender_recipient_sent_at
  on public.messages (sender_id, recipient_id, sent_at desc);

grant select on public.app_users to authenticated;
grant select on public.student_profiles to authenticated;
grant select, insert on public.messages to authenticated;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select id
  from public.app_users
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.can_users_message(left_user uuid, right_user uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.student_profiles sp
    where (sp.user_id = left_user and sp.advisor_id = right_user)
       or (sp.user_id = right_user and sp.advisor_id = left_user)
  )
$$;

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
begin
  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    raise exception 'No app user is linked to the current auth user';
  end if;

  update public.app_users
  set last_seen_at = timezone('utc', now())
  where id = v_app_user_id;
end;
$$;

create or replace function public.mark_conversation_delivered(other_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_user_id uuid;
  v_updated_count integer;
begin
  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    raise exception 'No app user is linked to the current auth user';
  end if;

  update public.messages
  set delivered_at = coalesce(delivered_at, timezone('utc', now()))
  where recipient_id = v_app_user_id
    and sender_id = other_user_id
    and delivered_at is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

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
  set delivered_at = coalesce(delivered_at, v_now),
      read_at = coalesce(read_at, v_now)
  where recipient_id = v_app_user_id
    and sender_id = other_user_id
    and read_at is null;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

alter table public.messages enable row level security;

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
on public.messages
for select
to authenticated
using (
  sender_id = public.current_app_user_id()
  or recipient_id = public.current_app_user_id()
);

drop policy if exists "messages_insert_allowed_pair" on public.messages;
create policy "messages_insert_allowed_pair"
on public.messages
for insert
to authenticated
with check (
  sender_id = public.current_app_user_id()
  and sender_id <> recipient_id
  and public.can_users_message(sender_id, recipient_id)
);

grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.mark_conversation_delivered(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'app_users'
  ) then
    alter publication supabase_realtime add table public.app_users;
  end if;
end
$$;

commit;

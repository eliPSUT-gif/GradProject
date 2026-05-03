begin;

create extension if not exists pgcrypto with schema extensions;

drop function if exists public.admin_reset_user_password(text, text);

create or replace function public.admin_reset_user_password(
  p_university_id text,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_admin_user_id uuid;
  v_target public.app_users%rowtype;
  v_auth_user_id uuid;
begin
  v_admin_user_id := public.current_app_user_id();

  if v_admin_user_id is null then
    raise exception 'No app user is linked to the current auth user.';
  end if;

  if not exists (
    select 1
    from public.app_users admin_user
    where admin_user.id = v_admin_user_id
      and admin_user.role = 'admin'
      and admin_user.status = 'active'
  ) then
    raise exception 'Only active admins can reset passwords.';
  end if;

  if trim(coalesce(p_university_id, '')) = '' then
    raise exception 'Missing user ID.';
  end if;

  if length(coalesce(p_password, '')) < 10 then
    raise exception 'Password must be at least 10 characters.';
  end if;

  select *
  into v_target
  from public.app_users target_user
  where target_user.university_id = trim(p_university_id)
  limit 1;

  if not found then
    raise exception 'User account was not found.';
  end if;

  v_auth_user_id := v_target.auth_user_id;

  if v_auth_user_id is null and v_target.email is not null then
    select auth_user.id
    into v_auth_user_id
    from auth.users auth_user
    where lower(auth_user.email) = lower(v_target.email)
    limit 1;

    if v_auth_user_id is not null then
      update public.app_users
      set auth_user_id = v_auth_user_id
      where app_users.id = v_target.id;
    end if;
  end if;

  if v_auth_user_id is null then
    raise exception 'Supabase auth user was not found for this account.';
  end if;

  update auth.users
  set encrypted_password = crypt(p_password, gen_salt('bf'::text)),
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      confirmation_sent_at = null,
      recovery_sent_at = null,
      updated_at = timezone('utc', now())
  where users.id = v_auth_user_id;

  if not found then
    raise exception 'Supabase auth user was not found for this account.';
  end if;
end;
$$;

grant execute on function public.admin_reset_user_password(text, text) to authenticated;

commit;

notify pgrst, 'reload schema';

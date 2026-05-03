create table if not exists public.password_reset_inquiries (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.app_users(id) on delete cascade,
  requester_role text not null check (requester_role in ('student', 'advisor')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_password_reset_inquiries_status_created
  on public.password_reset_inquiries(status, created_at desc);

create index if not exists idx_password_reset_inquiries_requester
  on public.password_reset_inquiries(requester_id, status);

drop trigger if exists trg_password_reset_inquiries_updated_at on public.password_reset_inquiries;
create trigger trg_password_reset_inquiries_updated_at
before update on public.password_reset_inquiries
for each row execute function public.set_updated_at();

grant select, update on public.password_reset_inquiries to authenticated;
grant select on public.app_users to authenticated;

comment on table public.password_reset_inquiries is
  'Shared registrar inbox for student/advisor password-help requests. Created from the public forgot-password flow and resolved by admins.';

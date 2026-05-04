# Smart Academic Advisor

This project runs a Smart Academic Advisor app with role-based dashboards, planner analytics, Supabase-backed data, and Vercel deployment.

Deployment note: normal commits to `main` should trigger a fresh Vercel deployment.

## Environment Variables

Create a local `.env.local` from `.env.example` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (same value as `VITE_SUPABASE_URL`, used by serverless API routes)
- `SUPABASE_ANON_KEY` (same value as `VITE_SUPABASE_ANON_KEY`, used by serverless API routes)
- `VITE_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (optional, defaults to `openrouter/free`)
- `SMTP_HOST` (defaults to `mail.spacemail.com`)
- `SMTP_PORT` (defaults to `465`)
- `SMTP_SECURE` (defaults to `true` for port `465`)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `PASSWORD_EMAIL_FROM`
- `PASSWORD_EMAIL_TO` (defaults to `eli20220677@std.psut.edu.jo`)

`VITE_RECAPTCHA_SITE_KEY` is safe for the browser. `RECAPTCHA_SECRET_KEY` must only be configured on the server, such as in Vercel project environment variables.

`SUPABASE_SERVICE_ROLE_KEY` must only be configured on the server, such as in Vercel project environment variables. It is required for production-safe admin account creation and is the preferred path for admin password resets.

`OPENROUTER_API_KEY` must only be configured on the server, such as in Vercel project environment variables. `OPENROUTER_MODEL` can stay server-side too so you can switch between `openrouter/free` and a pinned `:free` model without editing client code.

The SMTP variables and `PASSWORD_EMAIL_FROM` / `PASSWORD_EMAIL_TO` must only be configured on the server. They are used by admin user creation and generated password reset emails. For SpaceMail, use `mail.spacemail.com`, port `465`, SSL enabled, and the mailbox credentials for `admin@psut.site`.

## reCAPTCHA v3 Login Protection

The login page executes reCAPTCHA v3 client-side and verifies the token through `api/verify-recaptcha.ts`.

To enable it:

1. Create a Google reCAPTCHA v3 site for your app domains.
2. Put the site key in `VITE_RECAPTCHA_SITE_KEY`.
3. Put the secret key in Vercel as `RECAPTCHA_SECRET_KEY`.
4. Redeploy the project.

If either key is missing, login protection will block sign-in and show a configuration error.

## Supabase Setup

Apply the SQL files in `supabase/` in numeric order from `001_schema.sql` through `014_admin_password_reset_rpc.sql`.

Important final migrations:

- `013_password_inquiries_via_messages.sql` is the active forgot-password inquiry flow. It routes student/advisor password-help requests through the `messages` table so admins receive them in the dashboard and notification bell.
- `014_admin_password_reset_rpc.sql` enables the admin password-reset fallback when the service-role endpoint is unavailable. Rerun it after changes because it recreates the RPC and reloads the PostgREST schema cache.

## Final Verification

Before submitting or releasing, run:

```bash
npm run build
node ./node_modules/typescript/bin/tsc -b
```

Then smoke test student, advisor, and admin flows on the deployed Vercel URL.

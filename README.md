# React + TypeScript + Vite

This project runs a Smart Academic Advisor app with role-based dashboards, planner analytics, Supabase-backed data, and Vercel deployment.

Deployment note: normal commits to `main` should trigger a fresh Vercel deployment.

## Environment Variables

Create a local `.env.local` from [.env.example](C:\Users\Elias\Desktop\GP2\.env.example) and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_RECAPTCHA_SITE_KEY`
- `RECAPTCHA_SECRET_KEY`

`VITE_RECAPTCHA_SITE_KEY` is safe for the browser. `RECAPTCHA_SECRET_KEY` must only be configured on the server, such as in Vercel project environment variables.

## reCAPTCHA v3 Login Protection

The login page executes reCAPTCHA v3 client-side and verifies the token through [api/verify-recaptcha.ts](C:\Users\Elias\Desktop\GP2\api\verify-recaptcha.ts).

To enable it:

1. Create a Google reCAPTCHA v3 site for your app domains.
2. Put the site key in `VITE_RECAPTCHA_SITE_KEY`.
3. Put the secret key in Vercel as `RECAPTCHA_SECRET_KEY`.
4. Redeploy the project.

If either key is missing, login protection will block sign-in and show a configuration error..

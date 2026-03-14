# Supabase Database Package

This folder contains an import-ready PostgreSQL/Supabase setup for the Smart Academic Advisor project.

## Recommended Choice

Use `Supabase`, not `Convex`, for this project.

Why:
- the system is strongly relational
- prerequisites and co-requisites are easiest in SQL
- schedules, schedule items, evaluations, and messages all fit PostgreSQL well
- reporting and advisor queries benefit from joins and views

## Files

- `001_schema.sql`: core tables, constraints, indexes, helper trigger, and app settings
- `002_seed.sql`: demo departments, users, profiles, courses, prerequisite rules, historical stats, completed courses, drafts, evaluations, and messages

## Import Order

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run `supabase/001_schema.sql`.
4. Run `supabase/002_seed.sql`.

## What To Send Me After Import

Once the database is ready, send:

- Supabase project URL
- Supabase anon key
- Supabase service role key

Then I can replace the current `localStorage` demo state with real Supabase reads/writes.

## Notes

- This schema is implementation-first, so it is slightly richer than the original project report.
- The current app logic maps cleanly to these tables.
- If you want, I can also generate:
  - Supabase Auth signup/login wiring
  - Row Level Security policies for production
  - TypeScript types and data-access layer

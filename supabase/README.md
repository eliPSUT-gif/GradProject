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

- `001_schema.sql`: original core schema
- `002_seed.sql`: demo seed data
- `003_realtime_messaging.sql`: messaging auth/read state helpers
- `004_broadcast_messaging.sql`: broadcast-based chat authorization
- `005_dashboard_backend.sql`: first dashboard/transcript backend pass
- `006_sync_gpa_with_average_mark.sql`: no-op compatibility migration
- `007_transcript_first_academic_schema.sql`: transcript-first academic cleanup and new derived views
- `008_gpa_only_cleanup.sql`: GPA-only cleanup for transcript-derived 4.00-scale GPA
- `009_transcript_entry_ids_for_admin_editing.sql`: exposes transcript entry IDs/course IDs for admin transcript editing

## Import Order

1. Create a new Supabase project.
2. Open the SQL Editor.
3. Run `supabase/001_schema.sql`.
4. Run `supabase/002_seed.sql`.
5. Run `supabase/003_realtime_messaging.sql`.
6. Run `supabase/004_broadcast_messaging.sql`.
7. Run `supabase/005_dashboard_backend.sql`.
8. Run `supabase/006_sync_gpa_with_average_mark.sql`.
9. Run `supabase/007_transcript_first_academic_schema.sql`.
10. Run `supabase/008_gpa_only_cleanup.sql`.
11. Run `supabase/009_transcript_entry_ids_for_admin_editing.sql`.

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


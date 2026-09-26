-- V1 — additive, safe to auto-run in every environment (dev, test, and prod).
-- Adds the two tables the backend owns. The 11 planner tables already exist (Flyway is
-- baselined at version 0), so this migration does NOT touch them.

-- ---------- public.users: the backend's own identity table ----------
-- id intentionally equals the existing Supabase auth.users id for migrated users, so their
-- planner rows stay linked after the FK repoint (see the manual V2 migration + CUTOVER.md).
create table if not exists public.users (
  id            uuid primary key,
  email         text unique not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ---------- public.advisor_reports: AI-advisor cache + rate-limit backing ----------
create table if not exists public.advisor_reports (
  id            uuid primary key,
  user_id       uuid not null,
  created_at    timestamptz not null default now(),
  snapshot_hash text not null,
  report_json   jsonb not null
);

-- Cache lookups by (user, snapshot hash); rate-limit counts by (user, created_at).
create index if not exists advisor_reports_user_hash
  on public.advisor_reports (user_id, snapshot_hash);
create index if not exists advisor_reports_user_created
  on public.advisor_reports (user_id, created_at);

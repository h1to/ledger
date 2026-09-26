-- V2 — MANUAL migration. NOT on the default Flyway classpath location, so it does NOT auto-run.
-- Run it BY HAND only after public.users has been seeded from auth.users (see CUTOVER.md).
--
-- Purpose: the 11 planner tables currently FK their user_id to auth.users. Backend-created users
-- live in public.users, so those FKs must be repointed to public.users for new users to own rows.
--
-- This script:
--   1) drops the existing user_id FK to auth.users on each planner table (if present),
--   2) adds an equivalent FK to public.users(id) ON DELETE CASCADE.
-- It is written to be idempotent: dropping "if exists" and guarding the add so re-runs are safe.
--
-- The RLS policies on these tables (tied to auth.uid()) become irrelevant once the backend is the
-- only writer and enforces access with WHERE user_id = :currentUser. You may keep or drop them;
-- see CUTOVER.md. This script does not change RLS.

do $$
declare
  t   text;
  fk  text;
begin
  foreach t in array array[
    'settings','currency_rates','months','incomes','expenses',
    'rec_actuals','recurring','loans','goals','contributions','assets'
  ] loop
    -- 1) drop every FK on this table whose referenced table is auth.users
    for fk in
      select con.conname
      from pg_constraint con
      join pg_class rel      on rel.oid = con.conrelid
      join pg_namespace nsp  on nsp.oid = rel.relnamespace
      join pg_class frel     on frel.oid = con.confrelid
      join pg_namespace fnsp on fnsp.oid = frel.relnamespace
      where con.contype = 'f'
        and nsp.nspname = 'public'
        and rel.relname = t
        and fnsp.nspname = 'auth'
        and frel.relname = 'users'
    loop
      execute format('alter table public.%I drop constraint %I;', t, fk);
    end loop;

    -- 2) add a FK to public.users(id) if one does not already exist
    if not exists (
      select 1
      from pg_constraint con
      join pg_class rel      on rel.oid = con.conrelid
      join pg_namespace nsp  on nsp.oid = rel.relnamespace
      join pg_class frel     on frel.oid = con.confrelid
      join pg_namespace fnsp on fnsp.oid = frel.relnamespace
      where con.contype = 'f'
        and nsp.nspname = 'public'
        and rel.relname = t
        and fnsp.nspname = 'public'
        and frel.relname = 'users'
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (user_id)
           references public.users (id) on delete cascade;',
        t, t || '_user_id_fkey_public');
    end if;
  end loop;
end $$;

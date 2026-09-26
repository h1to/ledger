# Production cutover runbook

How to move the production **Supabase Postgres** onto this backend. **Perform this by hand.** The
application does **not** run any of the destructive/repointing steps automatically — Flyway only runs
the additive `V1` migration (creates `public.users` and `public.advisor_reports`).

Do a full backup / point-in-time-recovery checkpoint before starting.

---

## 0. Preconditions
- The 11 planner tables already exist in Supabase (settings, currency_rates, months, incomes,
  expenses, rec_actuals, recurring, loans, goals, contributions, assets), each with a `user_id uuid`
  FK to `auth.users`.
- You have the DB connection string and can run SQL (Supabase SQL editor or `psql`).

## 1. Let the app create the new tables (additive, safe)
Point the backend at the Supabase DB and start it once (or run Flyway). `V1` runs and creates
`public.users` and `public.advisor_reports`. This touches nothing else. Flyway is baselined at
version 0, so it will not attempt to recreate the existing tables.

```
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=<user>
SPRING_DATASOURCE_PASSWORD=<pass>
```

Verify: `select * from flyway_schema_history;` shows the baseline + `V1`.

## 2. Seed public.users from auth.users
Backend logins must map to the **same** ids the planner rows already reference. Copy every existing
auth user into `public.users`, preserving `id`. Passwords cannot be copied (Supabase stores its own
hashes) — existing users set a password on first backend login (see step 5), so seed a placeholder
hash that never matches a real BCrypt verify:

```sql
insert into public.users (id, email, password_hash, created_at)
select u.id,
       u.email,
       'NEEDS_RESET',            -- not a valid BCrypt hash; matches() always fails until reset
       coalesce(u.created_at, now())
from auth.users u
on conflict (id) do nothing;
```

Verify counts match:
```sql
select (select count(*) from auth.users)   as auth_users,
       (select count(*) from public.users) as public_users;
```

## 3. Repoint the data-table foreign keys to public.users
Run the **manual** migration `src/main/resources/db/migration_manual/V2__repoint_data_fks_to_public_users.sql`.
It drops each planner table's FK to `auth.users` and adds an equivalent FK to `public.users(id)`
`ON DELETE CASCADE`. It is idempotent (guarded drops/adds) and safe to re-run.

Apply it with `psql`:
```bash
psql "$SUPABASE_DB_URL" -f src/main/resources/db/migration_manual/V2__repoint_data_fks_to_public_users.sql
```
or paste it into the Supabase SQL editor.

> This runs **only after** step 2 — otherwise the new FK would reject rows whose `user_id` is not yet
> in `public.users`. Because `id`s were preserved, all existing rows validate immediately.

Verify a couple of tables now reference `public.users`:
```sql
select conrelid::regclass as tbl, confrelid::regclass as refs
from pg_constraint
where contype = 'f' and conrelid::regclass::text in ('public.settings','public.contributions');
```

## 4. (Optional) Row-Level Security
The old RLS policies are tied to `auth.uid()`. Once this backend is the **only** writer and enforces
access with `WHERE user_id = :currentUser`, those policies are redundant. You may leave them (the
backend connects as a role for which they apply — ensure that role can read/write, or connect as the
table owner / a `bypassrls` role) or drop them:

```sql
-- Example: drop the per-table policy created by the original setup.
-- do this per table if you choose to remove RLS entirely.
-- alter table public.settings disable row level security;
```
Recommended: connect the backend with a role that owns the tables (RLS does not apply to the owner),
and keep the policies in place as defense-in-depth. Confirm reads/writes work end-to-end after
choosing.

## 5. Existing users' passwords
Because Supabase auth hashes cannot be migrated, existing users authenticate to the backend for the
first time via a password (re)set. Options:
- Ship a "set a password" flow (register-like) that updates `public.users.password_hash` for a
  known email; or
- Pre-seed a temporary password hash and communicate it.

New users created via `POST /auth/register` get a fresh `public.users` row with a BCrypt hash and a
freshly generated `id`.

## 6. Point the backend at Supabase and the frontend at the backend
- Set the backend env (`SPRING_DATASOURCE_*`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ALLOWED_ORIGIN`)
  and deploy (Render — see `render.yaml`).
- Rewire `react-app/` to call this API instead of Supabase (separate frontend task; out of scope
  for this deliverable).

## 7. Smoke test
- `GET /health` → `{"status":"ok"}`.
- Register a new user → `PUT /api/state` a small state → `GET /api/state` returns it.
- For a migrated user (after password set): login → `GET /api/state` returns their existing data.
- `POST /api/advisor/analyze` with a sample snapshot returns a report (and a second identical call
  is served from cache).

## Rollback
Steps 1 and 2 are additive and harmless. If step 3 causes trouble, re-add the original FKs to
`auth.users` (or restore from backup). The new tables can be dropped if abandoning the cutover:
```sql
drop table if exists public.advisor_reports;
drop table if exists public.users cascade;   -- only if no data-table FK references it
```

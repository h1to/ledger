# Backend Spec — Ledger API (Java 21 + Spring Boot)

Build a new backend that becomes the app's single gateway. The React frontend will stop
talking to Supabase directly and call this API instead. **This spec is for the backend only —
do not modify `react-app/`.** Deliver a compiling, tested, Render-deployable service in `backend/`.

## Decisions (fixed — do not revisit)
- **Java 21**, **Spring Boot (latest stable 3.5.x)**, **Gradle**.
- **Auth: the backend owns it fully** — Spring Security 6, stateless **JWT** (HS256), **BCrypt** password hashing. No Supabase Auth.
- **Database: the EXISTING Supabase Postgres, via JDBC** (Spring Data JPA). All current data is preserved. Access control is enforced in the backend (the old row-level-security model is replaced by `WHERE user_id = :currentUser`).
- **Deploy target: Render** (provide `render.yaml` or a `Dockerfile` building a Java 21 jar).
- **Migration style: strangler** — this first deliverable is auth + the planner state load/save API + the AI-advisor proxy. Frontend rewiring and prod cutover are done later by the human reviewer.
- **AI model: `claude-sonnet-5`** via the official **Anthropic Java SDK** (`com.anthropic:anthropic-java`). Consult the `claude-api` skill (Java section) for exact SDK usage, structured outputs, and adaptive thinking. Read `ANTHROPIC_API_KEY` from env.

## Read these repo files first (port their logic faithfully to Java)
- `react-app/db/relational-schema.sql` — the 11 existing tables (settings, currency_rates, months, incomes, expenses, rec_actuals, recurring, loans, goals, contributions, assets), all keyed by `user_id uuid`.
- `react-app/src/types.ts` — the `PlannerState` shape (and Loan/Recurring/Goal/etc.). The API's JSON must match this shape exactly so the frontend consumes it unchanged.
- `react-app/src/lib/repo/rows.ts`, `mapper.ts`, `diff.ts` — the RowSet ↔ PlannerState mapping and diff logic. Port these.
- `react-app/src/store/cloud/relationalDriver.ts` — how state is assembled from / written to the tables (parents before children on write, children before parents on delete). Your `GET/PUT /api/state` must reproduce this behavior.

## Data model additions (Flyway migrations, in `backend/`)
Write Flyway migrations for the **new** tables only; the 11 existing tables already exist (use `baselineOnMigrate=true`). Migrations run against your **test/local** DB during development — **do NOT run them against the production Supabase DB**; the human reviewer performs the prod cutover.
- `public.users` — `id uuid primary key, email text unique not null, password_hash text not null, created_at timestamptz default now()`. **`id` intentionally equals the existing Supabase `auth.users` id** for current users, so existing data stays linked.
- `public.advisor_reports` — `user_id uuid, created_at timestamptz, snapshot_hash text, report_json jsonb` (cache + rate-limit backing). PK/index as you see fit.
- A migration that **drops the data tables' foreign keys to `auth.users` and repoints them to `public.users`** (needed so backend-created users can own rows). Provide this as a migration but document in `CUTOVER.md` that it runs only after `public.users` is seeded from `auth.users`.

## REST API (this deliverable)
All under `/api` except auth; JSON; JWT in `Authorization: Bearer`. CORS allows the frontend origin (env `ALLOWED_ORIGIN`).
- `POST /auth/register` `{email,password}` → creates user, returns `{token}`. Validate email/password (min 6).
- `POST /auth/login` `{email,password}` → `{token}` or 401.
- `GET /api/state` → the authed user's full `PlannerState` (assembled from the 11 tables), plus `updatedAt` (from `settings.updated_at`). Shape must match `react-app/src/types.ts`.
- `PUT /api/state` → body is a full `PlannerState`; persist it transactionally (upsert all collections, delete rows no longer present), scoped to the current user. Correctness over cleverness — a transactional full reconcile per user is fine at this scale.
- `POST /api/advisor/analyze` → body is a **de-identified snapshot JSON** computed by the frontend (amounts/categories/rates/dates only — no identifiers). Call `claude-sonnet-5` with a system prompt + a JSON-schema **structured output** and return the report JSON. **Cache** by `snapshot_hash` in `advisor_reports`; **rate-limit** to 10/day/user. The model only narrates the numbers it is given — the prompt must forbid inventing figures. (The exact snapshot & report schemas will be finalized with the reviewer; define reasonable DTOs now and keep them in `API.md`.)
- `GET /health` (or Actuator health) for Render.

## Config (all via env — never hardcode secrets)
`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `ALLOWED_ORIGIN`. Provide `application.yml` with env placeholders and a `.env.example`. Do not commit real values.

## Testing
- JUnit 5 + Spring Boot Test. Use **Testcontainers Postgres** for repository/integration tests (not H2 — we rely on Postgres types/`jsonb`).
- Cover: auth (register/login/JWT filter), the `PlannerState` assemble+persist round-trip (mirror the mapper round-trip test — save a state, read it back, assert equality), and the advisor endpoint with the **Anthropic client mocked** (assert request shaping, schema, caching, rate-limit — no real API calls in tests).
- `./gradlew build` must pass (compile + tests).

## Deliverables
- `backend/` — the Spring Boot project, compiling, `./gradlew build` green.
- `backend/README.md` — how to run locally and configure env.
- `backend/API.md` — the REST contract (endpoints, request/response DTOs) so the frontend can be wired.
- `backend/CUTOVER.md` — the prod-migration runbook (seed `public.users` from `auth.users`, then repoint FKs, then point the backend at Supabase), for the human to execute.
- `backend/render.yaml` or `Dockerfile` for Render (Java 21).

## Guardrails
- Do NOT touch `react-app/`. Do NOT run migrations against the production Supabase DB. Do NOT deploy. Do NOT commit secrets. Do NOT push to any remote.
- End with a short report: what you built, how to run/test it, and anything you were unsure about for the reviewer.

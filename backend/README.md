# Ledger API

Backend for the **Ledger — Money Planner** app. It becomes the app's single gateway: the React
frontend (`react-app/`) stops talking to Supabase directly and calls this API instead.

This first deliverable (strangler step 1) provides:

- **Auth** owned by the backend — Spring Security 6, stateless **JWT (HS256)**, **BCrypt** hashes.
- **Planner state** load/save — `GET/PUT /api/state`, assembled from / persisted to the existing
  11 relational tables, matching `react-app/src/types.ts` exactly.
- **AI advisor proxy** — `POST /api/advisor/analyze`, calling **`claude-sonnet-5`** via the official
  Anthropic Java SDK with a structured (JSON-schema) output, cached by snapshot hash and
  rate-limited per user.

Frontend rewiring and the production database cutover are done later by a human (see `CUTOVER.md`).

## Stack

- Java 21, Spring Boot 3.5.x, **Maven**
- Spring Web, Spring Data JPA, Spring Security, Bean Validation, Actuator
- PostgreSQL (the existing Supabase Postgres) via JDBC
- Flyway (baselined) for the new tables
- JJWT for tokens; `com.anthropic:anthropic-java` for the advisor
- Tests: JUnit 5 + Spring Boot Test + **Testcontainers Postgres**

## Layout

```
backend/
  pom.xml, mvnw, mvnw.cmd, .mvn/           Maven build + wrapper
  Dockerfile, render.yaml, .env.example    deploy + config
  src/main/java/com/ledger/api/
    auth/         register/login + JWT issuance
    security/     JWT service, filter, security config, CurrentUser
    user/         public.users entity + repository
    state/        PlannerState DTOs, JPA entities, repos, assemble/persist service, controller
    advisor/      snapshot/report DTOs, Anthropic client, cache+rate-limit service, controller
    common/       error handling
    health/       /health
  src/main/resources/
    application.yml
    db/migration/V1__users_and_advisor_reports.sql          (auto-run, additive)
    db/migration_manual/V2__repoint_data_fks_to_public_users.sql  (manual — see CUTOVER.md)
  src/test/...    Testcontainers integration + unit tests; db/base-schema.sql (the 11 tables)
```

## Configuration (all via environment)

Copy `.env.example` to `.env` and fill in. Nothing is hardcoded.

| Variable | Meaning |
|---|---|
| `SPRING_DATASOURCE_URL` | JDBC URL, e.g. `jdbc:postgresql://host:5432/postgres?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` | DB credentials |
| `JWT_SECRET` | HS256 signing secret, **≥ 32 bytes** (fails fast otherwise) |
| `JWT_TTL_MILLIS` | token lifetime (default 30 days) |
| `ALLOWED_ORIGIN` | frontend origin(s) for CORS, comma-separated |
| `ANTHROPIC_API_KEY` | Anthropic key for the advisor (advisor returns 503 if unset) |
| `ANTHROPIC_MODEL` | override the model (default `claude-sonnet-5`) |
| `ADVISOR_DAILY_LIMIT` | analyses per user per day (default 10) |
| `PORT` | server port (Render sets this; default 8080) |

## Run locally

You need a Postgres with the 11 planner tables present (the backend does **not** create them — it
treats them as pre-existing, and Flyway is baselined). For a throwaway local DB you can apply
`src/test/resources/db/base-schema.sql` (the auth-free form of the 11 tables), then start:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ledger
export SPRING_DATASOURCE_USERNAME=ledger SPRING_DATASOURCE_PASSWORD=ledger
export JWT_SECRET=$(openssl rand -base64 48)
export ALLOWED_ORIGIN=http://localhost:5173
export ANTHROPIC_API_KEY=sk-ant-...   # optional; advisor is 503 without it
./mvnw spring-boot:run
```

On startup Flyway baselines the schema at version 0 and applies `V1` (creates `public.users` and
`public.advisor_reports`). It does **not** touch the 11 existing tables.

## Build & test

```bash
./mvnw clean package            # compile + run tests + build the executable jar
./mvnw test                     # tests only
```

Tests use **Testcontainers**, so a running **Docker** daemon is required. The suite:

- boots one Postgres container, pre-creates the 11 tables from `db/base-schema.sql`, then lets
  Flyway add the new tables;
- covers **auth** (register/login/JWT filter/validation), the **PlannerState assemble+persist
  round-trip** (save → read → assert-equal, mirroring the frontend mapper round-trip test, plus a
  full HTTP round-trip and a delete-removed-rows check), and the **advisor** endpoint with the
  **Anthropic client mocked** (request shaping, cache hit, per-day rate limit, hash determinism).

> **Docker Engine 28+ note (incl. Docker Desktop on Windows).** Engine 28+/29 removed the old
> Docker API versions that `docker-java` negotiates by default, so Testcontainers can fail with
> `BadRequestException (Status 400 …)`. If you hit that, force the API version and (on Windows
> Docker Desktop) point at the engine pipe:
> ```bash
> export DOCKER_HOST=npipe:////./pipe/dockerDesktopLinuxEngine   # Windows Docker Desktop only
> ./mvnw test -DargLine="-Dapi.version=1.51"
> ```
> On standard Linux Docker (unix socket) neither is needed. This is the exact command used to get
> the suite green in the development environment.

## Deploy (Render)

`render.yaml` defines a Docker web service with `healthCheckPath: /health`. Set the env vars in the
Render dashboard (secrets are `sync:false`; `JWT_SECRET` is generated). See `CUTOVER.md` before
pointing it at the production Supabase database.

See `API.md` for the full REST contract and DTOs.

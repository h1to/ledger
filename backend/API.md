# Ledger API — REST contract

Base URL: the deployed service root. All bodies are JSON. Authenticated endpoints require
`Authorization: Bearer <jwt>`. CORS allows the origin(s) in `ALLOWED_ORIGIN`.

Error bodies are `{ "status": <int>, "error": "<message>" }`.

---

## Auth

### POST /auth/register
Create a user and return a token.

Request:
```json
{ "email": "user@example.com", "password": "atleast6" }
```
- `email` — valid email, required.
- `password` — required, **min 6 characters**.

Response `200`:
```json
{ "token": "<jwt>" }
```
Errors: `400` invalid email / short password, `409` email already registered.

### POST /auth/login
```json
{ "email": "user@example.com", "password": "atleast6" }
```
Response `200`: `{ "token": "<jwt>" }`. Error: `401` invalid credentials.

The JWT is HS256, subject = user id (uuid), with an `email` claim, expiring per `JWT_TTL_MILLIS`.

---

## Planner state

The state JSON mirrors `react-app/src/types.ts` `PlannerState` exactly, plus an API-only
`updatedAt` field (ISO-8601, from `settings.updated_at`).

### GET /api/state
Returns the authenticated user's full state, or **`204 No Content`** when the user has no data yet.

Response `200` (shape):
```json
{
  "year": 2026,
  "baseCur": "KZT",
  "rates": { "USD": 540.0, "EUR": 590.0 },
  "ratesUpdated": 1700000000000,
  "months": {
    "2026-08": {
      "incomes":  [ { "id": "i1", "name": "Freelance", "amount": 500.0, "cur": "USD" } ],
      "expenses": [ { "id": "e1", "name": "Food", "category": "Groceries",
                      "planned": 150000.0, "actual": 120000.0, "cur": "KZT" } ],
      "recActuals": { "r1": 210000.0 }
    },
    "2026-05": {
      "incomes": [], "expenses": [], "recActuals": {},
      "closed": true, "leftover": 40000.0
    }
  },
  "recurring": [
    { "id": "r1", "name": "Rent", "type": "expense", "category": "Housing",
      "amount": 200000.0, "cur": "KZT", "start": "2026-01", "end": null }
  ],
  "loans": [
    { "id": "l1", "name": "Car loan", "payment": 80000.0, "cur": "KZT",
      "start": "2026-01", "end": "2027-12", "rate": 18.0, "overpayment": 300000.0,
      "bank": null, "debt": null, "contract": null, "kind": null, "source": "manual" }
  ],
  "goals": [
    { "id": "g1", "name": "Apartment", "target": 5000000.0, "deadline": "2027-06",
      "contribs": { "2026-07": 100000.0, "2026-08": 50000.0 } }
  ],
  "assets": [
    { "id": "a1", "name": "Deposit", "kind": "asset", "value": 1000000.0, "cur": "KZT", "liquid": true }
  ],
  "tourDone": true,
  "lastModified": 1234,
  "updatedAt": "2026-09-26T12:00:00Z"
}
```

Shape notes (kept faithful to the frontend's `rowSetToState`):
- `Month.closed` and `Month.leftover` are **omitted** when unset; `recActuals` is always present
  (may be `{}`).
- `Recurring.end`, `Goal.deadline`, and the loan info fields (`rate`, `overpayment`, `bank`,
  `debt`, `contract`, `kind`) are **present with `null`** when empty.
- Id-keyed collections (incomes, expenses, recurring, loans, goals, assets) come back sorted by id
  for deterministic output.

### PUT /api/state
Body: a full `PlannerState` (same shape, `updatedAt` ignored on input). Persists it
**transactionally** for the current user: existing rows are deleted (children before parents) and
the new rows inserted (parents before children), reproducing `relationalDriver.ts` ordering. Rows no
longer present are removed.

Response `200`:
```json
{ "updatedAt": "2026-09-26T12:34:56Z" }
```

---

## AI advisor

### POST /api/advisor/analyze
Body: a **de-identified** snapshot computed by the frontend — amounts, categories, rates, dates and
pre-computed metrics only, **no identifiers**. Reasonable DTO (to be finalized with the reviewer):

```json
{
  "lang": "en",
  "baseCur": "KZT",
  "asOfMonth": "2026-08",
  "metrics": {
    "monthlyIncome": 500000.0,
    "monthlyEssentialSpend": 300000.0,
    "savingsRate": 0.2,
    "runwayMonths": 2.0,
    "fixedCostRatio": 0.4,
    "netWorth": 8000000.0
  },
  "debts": [
    { "label": "Loan 1", "balance": 300000.0, "payment": 80000.0, "rate": 18.0, "payoffMonths": 4 }
  ],
  "goals": [
    { "label": "Goal 1", "target": 5000000.0, "saved": 150000.0,
      "deadline": "2027-06", "neededPerMonth": 300000.0 }
  ],
  "totalDebt": 300000.0,
  "debtFreeMonth": "2027-01"
}
```

Response `200` — a structured, schema-validated report:
```json
{
  "summary": "…2-3 sentence health read…",
  "actions": [
    { "title": "Pay off Loan 1", "why": "Highest rate",
      "figure": "18%", "projectedEffect": "debt-free ~4 months out" }
  ],
  "debtStrategy": "avalanche — target the highest-rate loan first",
  "savingsGuidance": "…emergency fund + goal pacing + debt-vs-savings…",
  "warnings": ["debt load high"],
  "encouragements": ["good savings rate"]
}
```

Behavior:
- The model is **`claude-sonnet-5`** via the official Anthropic Java SDK, with adaptive thinking and
  a **structured (JSON-schema) output** derived from the report DTO. The system prompt forbids the
  model from inventing, estimating, or recomputing any number — it may only narrate the figures in
  the snapshot.
- **Cache**: results are cached by SHA-256 of the canonical snapshot JSON in `advisor_reports`; an
  identical snapshot returns the cached report without another model call (and without consuming the
  rate limit).
- **Rate limit**: `ADVISOR_DAILY_LIMIT` analyses per user per UTC day (default 10). Exceeding it
  returns `429`.
- `503` if `ANTHROPIC_API_KEY` is not configured.

---

## Health

### GET /health
`{ "status": "ok" }`. Actuator health is also exposed at `/actuator/health`. Both are public.

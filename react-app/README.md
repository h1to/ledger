# Ledger — Money Planner (React)

A faithful React + TypeScript port of the single-file `index.html` Money Planner. Same
design, same UX, same behaviour and financial rules — restructured into a typed,
tested, component architecture with a real build.

> The plan-first idea is unchanged: you don't log transactions one by one. You write
> income and a spending plan for each month, set recurring payments once, and the app
> tells you what's free to spend, tracks net worth, savings rate, safety runway and more.

## Stack

- **Vite** + **React 18** + **TypeScript** (strict)
- **Zustand** for the state store
- **@supabase/supabase-js** for auth + cloud sync
- **Vitest** + **React Testing Library** for tests
- Charts are hand-rolled SVG (no chart library). The stylesheet is the original's CSS,
  reused verbatim, so the design is pixel-identical.

## Scripts

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # typecheck + production build to dist/
npm run preview    # preview the production build
npm run test       # run the test suite once
npm run test:watch # watch mode
npm run typecheck  # tsc --noEmit
```

### Configuration (optional)

Supabase credentials are embedded (the publishable key is safe to expose — Row-Level
Security protects data). To point at your own project, create `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_WEB3FORMS_KEY=            # optional: also email feedback submissions
```

Run `supabase-setup.sql` (in the repo root) once in the Supabase SQL editor to create
the `planner_data` and `feedback` tables with RLS.

## Architecture

```
src/
  types.ts              domain types (PlannerState, Month, Recurring, Goal, Asset, …)
  constants.ts          currencies, categories, month names, colors, keys, env config
  i18n/                 tt() translation, RU dictionary, category labels, info-tip texts
  lib/                  pure, framework-agnostic, fully unit-tested logic:
    format.ts             fmt / fmtCur / fmtNum / parseAmt / uid
    dates.ts              month-key math (mk, nowKey, shiftKey, monthsBetween, …)
    money.ts              monthTotals, netWorth, yearTotals, category breakdowns, …
    metrics.ts            savings rate, safety runway, fixed-cost ratio, net-worth trend, next-best-action
    migrate.ts            normalizeState() — the load() migrations as a pure function
    reconcile.ts          stateForCompare() — jsonb-stable equality for sync
    csv.ts                buildCSV() + downloadFile()
    fit.ts                fitNumbers() — shrink long numbers to fit
  store/
    useStore.ts           Zustand store: planner state + UI state + commit() primitive
    sync.ts               Supabase client, pull/push reconciliation, auth, boot, rates, feedback
  components/            presentational components, charts, form fields, modals, tour, layout
  views/                 Dashboard, MonthEditor, Savings, Recurring, Gate
  App.tsx / main.tsx     shell + entry
```

### Key design decisions

- **Pure core, thin UI.** All money math, metrics, migrations and sync-reconciliation
  live in `lib/` as pure functions taking `state` — so they are trivially testable and
  match the original's semantics exactly.
- **`commit(mutator)`** is the single write primitive: it applies an in-place edit,
  bumps `lastModified`, persists to `localStorage`, and schedules a cloud push.
  Loading from the cloud/import uses **`hydrate()`**, which never bumps the clock or
  pushes — this is what keeps the sync reconciliation honest.
- **Local-first.** The app is fully usable offline; the cloud is a sync layer on top of
  `localStorage`. Reconciliation is last-write-wins by `lastModified`, with a **push
  gate**: a device never pushes over the cloud until its first pull has reconciled, and
  the on-open currency-rates refresh runs only after that pull — guarding the startup
  race where a stale tab could clobber a newer cloud copy.

## Tests

`npm run test` runs 57 assertions across:

- **Financial math** with multi-currency, recurring payments, and closed/past-month rules
- **Health metrics** (savings rate, runway, fixed-cost ratio, net-worth trend)
- **Migrations** and **jsonb-stable sync comparison**
- **Sync reconciliation** with a mocked Supabase client — including the stale-device /
  push-gate regression
- **A render sweep**: every screen and the key modals render in **both English and
  Russian** without throwing (the test that catches missing helpers and i18n gaps)

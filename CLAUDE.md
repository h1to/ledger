# CLAUDE.md — Money Planner

Guidance for Claude Code when working in this repository.

## What this is

A personal budget planner. The core idea: **you don't log transactions one by one**. You write down income and a spending plan for the month, and the app tells you what's free to spend. Recurring payments are set up once and appear in every month automatically until their end date.

Single-user-per-account, local-first, cloud-synced. Currently used daily by its author, in production.

## Repository layout

```
index.html            the entire app — UI, logic, styles, i18n (~3,000 lines)
supabase-setup.sql    one-time DB setup: tables + row-level security
```

That's it. There is **no build step, no bundler, no package.json, no dependencies to install**. `index.html` is a static file that is deployed as-is.

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Deployment = upload `index.html` to any static host (Netlify/Vercel/Cloudflare Pages). Nothing to compile.

The only runtime dependency is the Supabase JS client, loaded from a CDN `<script>` tag.

## Non-negotiable constraints

Respect these unless the user explicitly asks to change them:

1. **Single file.** Everything lives in `index.html`. Do not split into modules, do not add a build step, do not introduce a framework. The single-file property is the point: it can be emailed, hosted anywhere, and opened offline.
2. **No dependencies** beyond the Supabase CDN script. No React, no lodash, no chart library. Charts are hand-rolled SVG.
3. **ES5-style JavaScript.** `var`, `function`, string concatenation for HTML. No arrow functions, no template literals, no `const`/`let`, no optional chaining. The existing code is consistent about this — match it.
4. **Everything is inside one IIFE** at the bottom of the file. No globals leak.
5. **Local-first.** The app must remain fully usable offline. The cloud is a sync layer on top of `localStorage`, never a prerequisite.

## Architecture

### Rendering

There is no virtual DOM. Rendering is: build an HTML string, assign to `innerHTML`, then re-attach event handlers by querying the freshly written DOM.

```
render()
  ├─ renderSidebar()        also renders the mobile bottom tab bar
  └─ one of:
     renderDashboard() | renderMonthEditor() | renderSavings() | renderRecurring()
```

`view` (`"dashboard" | "month" | "savings" | "recurring"`) and `openMonthKey` are the only routing state.

Inside the month editor, `refreshMonthEditor()` re-renders just the panels after an edit — call that rather than a full `render()` when only month data changed.

### State

One object, `state`, persisted as JSON:

```js
state = {
  year,                  // dashboard year selector
  rates:{USD:540,...},   // 1 unit of currency = N KZT
  ratesUpdated,          // timestamp
  months:{               // "YYYY-MM" ->
    incomes:  [{id,name,amount,cur}],
    expenses: [{id,name,category,planned,actual,cur}],
    recActuals:{recurringId: amount},   // per-month override for a recurring payment
    closed, leftover                    // set when a month is closed
  },
  recurring:[{id,name,type:"expense"|"income",category,amount,cur,start,end}],  // end may be null
  goals:[{id,name,target,deadline,contribs:{"YYYY-MM": amountKZT}}],
  assets:[{id,name,kind:"asset"|"liability",value,cur,liquid}],  // liquid (assets only) = counts toward the safety-runway metric
  tourDone
}
```

Month keys are `"YYYY-MM"` strings throughout — they sort and compare lexicographically, which the code relies on (e.g. `r.start <= k && k <= r.end`).

### Financial invariants

These encode deliberate product decisions. **Do not "simplify" them without asking** — each one was a considered choice:

- **Everything converts to KZT** via `toKZT(amount, cur)` before any total, chart, or comparison. Amounts are stored in their original currency; conversion happens at calculation time, never at storage time.
- **Savings contributions are expenses.** `monthTotals()` adds `savedInMonth(k)` to both `planned` and `actual`. Money sent to a goal left the month; free-to-spend is simply `income − planned`.
- **Recurring expenses count as spent automatically** for the current and past months at their defined amount — see `recEffectiveActual()`. A typed actual overrides it. Future months count as 0 spent so the year total isn't inflated.
- **Past months show 0 free** until closed — see `displayFree()`. Closing a month banks a confirmed leftover into net worth.
- **Net worth** = assets − liabilities + all goal contributions + banked leftovers from closed months.

### Dashboard health metrics

The dashboard leads with a **free-to-spend hero** (current real month, `nowKey()`) + a **next-best-action** banner (`nextBestAction()`/`renderNBA()`), then four vital-sign cards and a net-worth trend line. Their helpers live next to `yearTotals()`:

- **Savings rate** = `savingsRate(y)` → year `saved / income`.
- **Safety runway** = `runwayMonths()` → `liquidAssetsTotal() / avgMonthlySpend(3, essential)`. Essential = categories in `ESSENTIAL_CATEGORIES`; falls back to total spend if nothing is tagged essential. Only assets with `liquid !== false` count.
- **Fixed-cost ratio** = `fixedCostsMonthly() / income` (recurring expense commitments vs. current-month income, falling back to the year's monthly average).
- **Net-worth trend** = `netWorthSeries(y)` / `netWorthAt(k)`. Assets have no per-month history, so they're a constant baseline; goal contributions and banked leftovers carry dates and are walked back from today, so the latest point equals `netWorth()`. MoM change is `netWorthDeltaThisMonth()`.

### Money formatting

`fmt(n)` → KZT with symbol. `fmtCur(n, cur)` → any currency. `fmtNum(n)` → grouped number, always 2 decimals. `parseAmt(str)` → strips grouping separators back to a float.

Amount inputs are **text fields, not `type="number"`** (no spinners), formatted on `change` via `attachAmtFormat()`. Number formatting stays `en-US`-style (`1,234,567.00`) in **both languages** — a Russian-style comma decimal would break `parseAmt`.

Numbers never wrap: `fitNumbers()` shrinks the font until a value fits its box, down to a readable floor. It runs after renders and on resize.

## Internationalization — read this before touching any UI string

The app ships English and Russian.

**Always call `tt("English string")`, never `t(...)`.** The translation function is `trans()`, exposed as `tt()`. This exists because several render functions declare a local `var t = monthTotals(k)` which shadows any function named `t` — that bug once broke half the Russian UI at runtime. `tt()` is defined at IIFE top level and cannot be shadowed.

Adding a user-facing string:

1. Write it in English at the call site, wrapped: `tt("Total saved")`.
2. Add the exact same English string as a key in the `RU` dictionary with its translation.
3. Category names go through `catLabel()` (dictionary `RU_CAT`), not `tt()`.
4. Info-tip texts live in `INFO` (English) and `INFO_RU` — both must have the key.

Missing keys fall back to English rather than crashing, so a forgotten translation degrades gracefully but silently. `covtest.js`-style auditing (below) catches them.

Month names swap by mutating `MONTH_FULL` / `MONTH_SHORT` in place (`applyLangArrays()`), so the ~10 call sites that index those arrays need no changes.

## Cloud sync (Supabase, no custom backend)

- Auth: email + password. The full-page gate (`showGate` / `renderGateAuth`) blocks the app until there's a session.
- Storage: one row per user in `planner_data`, whole state as `jsonb`. Row-Level Security ties `auth.uid()` to `user_id` — that's the entire authorization model.
- Project URL and publishable key are **embedded in the file on purpose**. The publishable key is designed to be public; RLS is what protects data. Never embed a `sb_secret_` key.
- Local cache is namespaced per user: `storageKey()` → `ledger_planner_v1::<uid>`.
- Reconciliation is **last-write-wins by `lastModified`**, never a prompt. Ties keep the local copy and push.
- **A device must not push before it has pulled.** `syncReady` starts `false` on `enterApp()`; `pushRemote()` defers (sets `pendingPush`) until the first `pullRemote()` reconciles, then flushes. This prevents the startup race where a device opened with stale data overwrites a newer cloud copy. For the same reason, the on-open **currency-rates refresh runs only in `pullRemote()`'s completion callback** — `refreshRates()` calls `save()`, and a save on open must not bump `lastModified` or push before reconciling. Do not move it back before the pull.
- **`jsonb` re-sorts object keys.** Comparing the cloud copy to local state must go through `stateForCompare()`, which canonicalizes key order first. Naive `JSON.stringify` comparison always reports a difference and causes a sync loop. This has bitten the project once already.

Feedback is inserted into a `feedback` table that is insert-only via RLS (readable only from the Supabase dashboard). Setting `WEB3FORMS_KEY` additionally emails submissions.

## Testing

There is no test framework. Tests are standalone Node scripts that **stub the DOM, `localStorage`, `fetch`, and the Supabase client**, then `eval()` the app's script block and assert against internals exposed via a string-replace injection hook.

Extract the script and check syntax first — this catches most breakage instantly:

```bash
python3 -c "
import re
c=open('index.html',encoding='utf-8').read()
s=re.findall(r'<script>(.*?)</script>', c, re.S)
open('app.js','w',encoding='utf-8').write(s[0])
"
node --check app.js
```

The suites that exist (~106 assertions total) cover: financial math with multi-currency and recurring payments, closed/past month rules, net worth composition, goal contribution editing, sync reconciliation under `jsonb` key reordering, the auth gate flow, mobile navigation, font auto-shrink, and **rendering every screen and modal in both languages**.

That last one matters most: the render sweep is what caught the `t`/`tt` shadowing bug. **After any change touching rendering or i18n, render every view in both languages and assert no exception is thrown.** Syntax checks alone will not catch shadowing or a missing helper.

When adding a feature, add assertions for its arithmetic and include it in the render sweep.

## Editing style

The file is large, so prefer **surgical, verified edits over rewrites**. The established workflow: apply replacements via a script that asserts each search string matches **exactly once**, and reports any that miss. Silent partial application on a 3,000-line file is the main failure mode here.

Match the surrounding conventions: two-space indent, compact CSS with custom properties under `:root`, HTML built by string concatenation, `esc()` on every interpolated user value.

## Design language

Near-black background, card-based layout, a single green accent (pink for over-budget, amber for closed), monospace tabular numbers, generous border radii, pill-shaped buttons. The primary metric on each screen is an inverted white card.

Mobile (≤860px): a fixed bottom bar (`.bottom-nav`, `z-index:1100`) with five icon-only tabs — the four views plus a rightmost "More" gear that opens `openMoreModal()`, a sheet holding every secondary action (Sync, Guide, Feedback, Language, Rates, Export). The sidebar and its old slide-in drawer are `display:none` on mobile. Modal overlays sit at `z-index:1300` so the bottom bar never covers their actions. Inputs are 16px on mobile to prevent iOS zoom-on-focus. Do not reintroduce horizontal scrolling in the navigation.

## Common tasks

- **New metric card** → add it to the relevant `render*` function, wrap labels in `tt()`, add an `infoBtn("key")` plus `INFO`/`INFO_RU` entries, and confirm `fitNumbers()` covers its CSS class.
- **New expense category** → append to `REC_CATEGORIES` and add a `RU_CAT` translation. Categories are stored in English; only display is translated.
- **New currency** → append to `CURRENCIES`, add a symbol in `CUR_SYMBOLS` and a fallback rate in `DEFAULT_RATES`.
- **New tour step** → append to `TOUR` with a CSS selector to highlight; add both `title` and `text` to `RU`.
- **Schema change** → add a migration in `load()` that fills defaults for older saved data. Users have live data in the cloud; loading must never throw on an older shape.

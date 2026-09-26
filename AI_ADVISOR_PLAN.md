# AI Financial Advisor — Implementation Plan

Plan for review. **No code will be written until you approve.** Target: the React app (`react-app/`), production on `db/relational-model`.

---

## 1. The core idea (and the one principle that keeps it safe)

Two layers, deliberately separated:

1. **Deterministic analysis engine** (pure TypeScript, in the browser) — computes *every number*: debt totals, payoff dates, extra-payment scenarios, interest saved, savings rate, runway, category overspend, net-worth trajectory. This is the source of truth.
2. **AI narrative layer** (Claude, via a small backend) — takes the *already-computed* figures and turns them into a prioritized, personalized, plain-language report: what to do first, why, and the projected effect.

> **Principle: the AI never invents numbers.** All figures come from the deterministic engine and are passed to the model. The model ranks, explains, weighs trade-offs, and writes the narrative — it does not do the arithmetic. This is what prevents an LLM from confidently stating a wrong payoff date or interest figure.

A useful consequence: the whole loan-payoff optimization ("which loan, how much extra, debt-free by when") is **deterministic and exact** — it doesn't actually need AI. So we can ship it first, for free, and layer AI narrative on top.

---

## 2. Architecture & where the AI runs

The app has **no backend today** (static site + Supabase). Calling Claude requires the Anthropic API key to stay **server-side** — it must never ship in the browser bundle. Supabase (already in use) provides **Edge Functions** (Deno), which is the natural home.

```
Browser (React)                         Supabase Edge Function            Anthropic API
─────────────────                       ──────────────────────            ─────────────
build deterministic snapshot  ──POST──▶ verify user JWT                   
(amounts, rates, dates,                 rate-limit (N/day)
 NO identifiers)                        build prompt + JSON schema ──────▶ claude-* (structured output)
                                        validate response ◀────────────── recommendations JSON
render report ◀──────────────────────── return report JSON
```

- **Auth:** the function verifies the caller's Supabase JWT (same project); no separate login.
- **Secret:** `ANTHROPIC_API_KEY` stored as a Supabase Function secret — never in the repo or client.
- **Privacy:** the snapshot sent to Claude is **aggregated and de-identified** — amounts, categories, rates, month keys only. **No IIN, no contract numbers, no bank account numbers, no names.** (Contrast with PDF import, which stays fully on-device.) We'll surface a one-time consent note: "AI analysis sends your financial *figures* (not your identity) to Anthropic."
- **Model:** default **`claude-opus-5`** ($5 / $25 per 1M tokens). The snapshot is tiny (~1–3K in, ~1–2K out) → **≈ $0.05–0.08 per analysis**. Since the model only narrates over pre-computed numbers, **`claude-sonnet-5`** ($2 / $10, ~$0.02/run) is a legitimate cheaper choice with likely equal quality here — **your call** (§9, Q1). Structured output via `output_config.format` (JSON schema) so the report is always valid JSON; adaptive thinking on.

---

## 3. The deterministic engine — what it computes

New pure modules under `react-app/src/lib/analysis/`. All framework-free and unit-tested, matching the existing `lib/` style.

### 3a. Debt plan (`debtPlan.ts`) — the headline feature
- **Per loan:** remaining debt, monthly payment, payoff months = `ceil(debt / payment)` (0%-approx) or a proper **amortization schedule when the interest rate is known**.
- **Strategies:**
  - **Avalanche** — target the highest interest rate first (mathematically optimal). Needs rates; where rates are missing (certificates omit them), fall back to snowball and flag it.
  - **Snowball** — target the smallest balance first (fastest first win / motivation).
- **Extra-payment "what-if":** given an extra monthly budget `E`, apply it to the target loan until cleared, then **roll that freed payment into the next loan** (debt rollover), repeating. Produces:
  - new **debt-free date** vs baseline,
  - **months saved**,
  - **interest saved** *(only when rates are known)*,
  - a **month-by-month total-debt projection** (baseline curve vs with-extra curve).
- This directly answers your ask: *"which loans to repay earlier, in which month, how much extra → your total debt will be X by this date, and here's how much sooner you're debt-free."*
- **Honest limitation:** the imported certificates have **no interest rate**, so interest-saved can't be computed until you add rates per loan. Without rates we still give exact **debt-free dates and months-saved** (treating principal-only, which is directionally right and slightly conservative on time). The report will nudge: "add your rates for precise interest savings."

### 3b. Savings plan (`savingsPlan.ts`)
- **Emergency fund:** runway months (existing `runwayMonths`) vs a 3–6 month target → build-to-target recommendation.
- **Savings rate:** `saved / income` vs a target (default 20%, configurable).
- **Goal pacing:** per goal with a deadline — needed/month vs actual contribution → on track / behind / ahead, with the adjustment needed.
- **Debt-vs-savings trade-off:** when high-rate debt coexists with low-yield saving, recommend prioritizing debt (keeping a minimum emergency buffer). The AI weighs this per situation.
- **Freed-cashflow routing:** when a loan finishes, recommend redirecting its payment to the next loan or to goals.

### 3c. Budget & cashflow health (`budgetHealth.ts`)
- **Fixed-cost ratio** (recurring + loans ÷ income) — flag when high (>50%).
- **Category overspend** — trailing-months actual vs planned per category; flag chronic overspending.
- **Free-to-spend trend** and any months running negative.
- **Net-worth trajectory** (reuse existing `netWorthSeries`).

### 3d. Snapshot builder (`snapshot.ts`)
Assembles a compact, **de-identified** JSON of the above (inputs + computed metrics) to send to the edge function. This is the *only* thing that leaves the device for AI.

---

## 4. The AI layer — what it produces

Input: the snapshot. Output: a **structured JSON report** (schema-validated), in the user's language (EN/RU):

- **Health summary** — 2–3 sentence plain-language read on overall financial state.
- **Prioritized actions** — ranked by impact, each: `title`, `why`, the concrete `figure` (from the engine), and `projectedEffect` (e.g. "debt-free 7 months sooner, ≈ ₸120,000 less interest").
- **Debt strategy** — recommended strategy (avalanche/snowball) + a specific suggested extra amount, referencing the engine's projection.
- **Savings guidance** — emergency-fund and goal-pacing advice, and the debt-vs-savings call.
- **Warnings** (e.g. debt load high, no emergency fund) and **encouragements** (progress made).

The engine's projections render as **charts and an interactive what-if** regardless of AI; the AI text references those same numbers.

---

## 5. Report presentation (UI)

- **Entry point:** a **"Analyze my finances"** action (a card on the Dashboard and/or a button on the Loans tab). Avoids adding a 7th nav tab.
- **The report** opens as a full-screen view/modal with sections: Health → Debt plan → Savings → Budget → Prioritized actions.
- **Interactive what-if (deterministic, instant, no AI call):** a slider for "extra per month" that live-updates the debt-payoff projection chart (baseline vs accelerated curves, debt-free date). The AI recommends a specific number; the slider lets you explore around it.
- Follows existing design language (dark, green accent, mono numbers); charts hand-rolled SVG like the rest of the app. Full EN/RU.

---

## 6. Files to add / change

**Client (React):**
- `src/lib/analysis/debtPlan.ts`, `savingsPlan.ts`, `budgetHealth.ts`, `snapshot.ts`, `advisorTypes.ts` — engine (+ tests).
- `src/store/cloud/advisor.ts` — calls the edge function, caches result.
- `src/views/Insights.tsx` (+ report components, projection chart) — the report UI.
- Dashboard/Loans entry button; `store/useStore.ts` modal/view wiring; `i18n/ru.ts`, `i18n/info.ts` strings.

**Backend (new):**
- `supabase/functions/advisor/index.ts` — Deno edge function: JWT verify → rate-limit → prompt + JSON schema → Claude (`@anthropic-ai/sdk` via `npm:`) → validate → return. Uses the `ANTHROPIC_API_KEY` function secret.

**Database:**
- `advisor_reports` table (`user_id`, `created_at`, `snapshot_hash`, `report_json`) + RLS — caches the last report so re-opening is free, and backs per-day rate-limiting. Applied as a migration.

**Tests:**
- Engine unit tests: amortization, avalanche/snowball ordering, extra-payment rollover projection, months/interest saved, savings pacing, fixed-cost ratio. The AI layer gets schema-contract validation, not content assertions.

---

## 7. Cost, privacy, failure modes

- **Cost:** ~$0.02–0.08 per analysis depending on model; cached, so re-opening the report costs nothing. Rate-limited (default 10/day/user) in the edge function.
- **Privacy:** de-identified snapshot only; explicit one-time consent note. Raw PDFs and identifiers never leave the device.
- **Graceful degradation:** if the AI/edge function is unavailable, the **deterministic report still renders in full** (numbers, charts, what-if) — only the narrative is missing.

---

## 8. Suggested phasing

- **Phase 1 — deterministic, no AI, no backend:** the debt plan + interactive payoff what-if + savings/budget health, all computed and charted. Delivers the exact "which loan, how much extra, debt-free by when, total-debt-by-date" you described. Free, offline, shippable on its own.
- **Phase 2 — AI narrative:** add the edge function + `advisor_reports` + the recommendation/narrative layer on top.

Shipping Phase 1 first de-risks the feature and gives you the highest-value part immediately.

---

## 9. Decisions I need from you

1. **Model:** `claude-opus-5` (best, ~$0.05–0.08/run) or `claude-sonnet-5` (~$0.02/run, likely equal quality for this structured task)?
2. **Phasing:** ship **Phase 1 (deterministic) first**, then Phase 2 (AI) — recommended — or build both together?
3. **Backend:** OK to introduce a **Supabase Edge Function** (first backend code in the project) + the `ANTHROPIC_API_KEY` secret? Required for the AI layer.
4. **Entry point:** a button on the **Dashboard/Loans** (recommended) vs. a new **nav tab**.
5. **Savings targets:** default assumptions OK — emergency fund **3–6 months**, savings-rate target **20%**? (Adjustable.)

Once you answer these, I'll implement (starting with Phase 1 unless you say otherwise).

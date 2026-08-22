# Money Management App — Recommendations

*Written as if I were your personal financial consultant, tailored to this plan-first planner (income + a spending plan per month, recurring payments, goals, net worth, multi-currency → KZT).*

---

## 1. The philosophy: an app should answer three questions, instantly

Every good money app, stripped to its core, answers three questions in order of how often a person asks them:

1. **"Can I spend right now?"** — cash-flow / liquidity. Asked daily.
2. **"Am I getting wealthier?"** — net worth trajectory. Asked monthly.
3. **"Am I on track for what I want?"** — goals & runway. Asked when planning.

If a screen doesn't move one of these three forward, it's clutter. This app already nails #1 with **free-to-spend** — that's the right hero. The gap is that #2 and #3 are shown as *static numbers* instead of *trajectories*, and two of the most predictive metrics in all of personal finance are missing (savings rate and emergency-fund runway). More on that below.

### Guiding principles I'd hold the whole product to

- **One hero number per screen.** The inverted white card is perfect for this — never let a screen have two "loudest" numbers.
- **Flows vs. stocks must never be mixed.** *Flows* are per-month (income, spending, saved). *Stocks* are balances at a point in time (net worth, emergency fund). Confusing them is the #1 way finance apps mislead people.
- **Favor leading indicators over lagging ones.** Net worth is a *lagging* scoreboard — it tells you the game you already played. Savings rate and free-to-spend are *leading* — they're the steering wheel. Show both, but make the leading ones actionable.
- **Compare people to their own past, never to others.** No benchmarks against "average users." The only honest comparison is you-vs-you over time.
- **Honest math, always.** This app's decision that *savings contributions count as expenses* is exactly right — money sent to a goal has left your spendable pool. Never inflate free-to-spend by hiding commitments. Keep this discipline everywhere.
- **Positive framing.** Over-budget is information, not a verdict. Guide, don't shame.

---

## 2. Information hierarchy — how I'd organize the whole app

Think in four layers, from "glance" to "deep":

| Layer | Question | Where it lives | Cadence |
|---|---|---|---|
| **Pulse** | Can I spend? Am I okay? | Dashboard hero + 3 vital signs | Daily |
| **Plan** | What's the month's shape? | Month editor | Weekly |
| **Build** | Am I growing wealth & reserves? | Net-worth + savings trends | Monthly |
| **Aim** | Am I on pace for goals? | Savings / goals | Quarterly |

The current structure (Dashboard / Month / Savings / Recurring) maps cleanly onto this. The main change I'd make is **promoting two "Build" metrics — savings rate and emergency-fund runway — up into the Pulse layer on the dashboard**, because they're the truest one-glance health signals a person can have.

---

## 3. The dashboard: which metrics, and why

I'd structure the dashboard as **one hero + four vital signs + three trends + one action.**

### The hero (the loudest number)
**Free to spend — this month.**
`income − planned (incl. savings contributions)`
This is the single most behaviorally useful number a budgeter can see, because it's the only one that changes a decision *today*. Keep it as the inverted card. Add a thin sub-line: *"of [income] this month"* and a small pace hint (see §4).

> A defensible alternative hero is **Net worth** if you want the app to feel wealth-focused rather than spending-focused. My recommendation: keep free-to-spend as the everyday hero and give net worth its own prominent trend card. Free-to-spend is asked 30× more often.

### The four vital signs (the row under the hero)
These four, together, are a genuine financial check-up. If someone could see only four numbers about their money, I'd choose these:

1. **Savings rate (%)** — `saved ÷ income` for the period.
   *The single best predictor of long-term financial outcome.* More than income, more than returns. Someone earning modestly at a 25% savings rate outbuilds a high earner at 5%. This app already tracks "saved to goals" — turn it into a **rate**, and this becomes the most valuable number on the screen. Target bands: <10% amber, 10–20% neutral, 20%+ green.

2. **Net worth** — `assets − liabilities + goal contributions + banked leftovers`.
   Already computed. The critical upgrade: show it **with a month-over-month delta and a trend**, not as a lone figure. "₸ 4.2M  ▲ +180k this month" tells a story; "₸ 4.2M" is trivia.

3. **Emergency-fund runway (months)** — `liquid assets ÷ average monthly essential spending`.
   *The most under-rated metric in personal finance.* It answers "how long could I survive with zero income?" The universally recommended floor is **3–6 months**. This is missing today and I'd add it before anything else. Colour it: <1 month pink, 1–3 amber, 3–6 green, 6+ deep green.

4. **Fixed-cost ratio (%)** — `recurring commitments ÷ income`.
   How much of your income is spoken for before you decide anything. This app *already knows* every recurring payment — it's sitting right there. A high fixed ratio (>60%) means fragility: little room to absorb a shock or seize an opportunity. This is a metric almost no consumer app shows, and it's genuinely diagnostic.

### The three trends (below the vital signs)
Numbers lie about direction; trends don't. Show these as your hand-rolled SVG charts:

5. **Income vs. spending — 12 months.** *(already present — keep it)*
6. **Net-worth line — trailing 12+ months.** *(missing — add it)* A single rising line is the most motivating visual in the whole app. It's the "scoreboard" that makes the discipline feel worth it.
7. **Top spending categories.** *(already present — keep it)* Add a subtle "vs. last month" so it becomes a change signal, not just a snapshot.

### The one action (bottom of the dashboard)
A single, contextual **"next best action"** prompt driven by the metrics above. Examples:
- Runway < 3 months → *"Build your safety net: send this month's free ₸X to an Emergency Fund goal."*
- Free-to-spend positive and runway healthy → *"You have ₸X free and a solid cushion — push it toward [nearest goal]?"*
- A past month left open → *"Close [Month] to bank ₸X into your net worth."*

One prompt, never a list. This is what turns a dashboard from a *report* into a *coach*.

---

## 4. Metric definitions worth getting exactly right

- **Essential vs. discretionary spending.** Runway and a true "needs vs. wants" view both require tagging each expense/category as *essential* or not. I'd add one boolean to categories (Housing, Groceries, Utilities, Loan payments = essential by default). Small change, unlocks two high-value metrics.
- **Liquid vs. illiquid assets.** Runway should count only *liquid* assets (cash, deposits) — not an apartment. Add a `liquid: true/false` flag on assets. Your car and home shouldn't make your emergency runway look 40 months long.
- **Pace, not just position.** For both free-to-spend and goals, show *pace*: "you're 12 days into the month and 55% spent" or "goal is 3% behind the pace needed to hit the deadline." Position without pace is half the picture.
- **Rolling averages for anything volatile.** "Average monthly essential spending" should be a trailing 3-month average, not last month, or one big month wrecks the runway number.

---

## 5. What I would deliberately NOT show

- **Per-transaction feeds.** This app's whole thesis is *don't log every transaction* — honor it. A live transaction ledger would betray the product.
- **Vanity precision.** Net worth to the tenth of a tenge is noise. Round big numbers; precision implies false certainty.
- **Comparison to other users / "you rank in the top X%".** Financially meaningless and quietly toxic.
- **Gamified streaks and badges with no substance.** Fine to celebrate a closed month or a hit goal; don't manufacture dopamine loops around trivia.
- **More than ~5 primary numbers on one screen.** Past that, nothing is the hero and everything is ignored.

---

## 6. Behavioral & UX design (this is 80% of whether a money app works)

Money apps don't fail on math — they fail on psychology. What actually changes behavior:

- **Default to *now*.** Open on the current month. Reduce every "what am I looking at" tax.
- **Make the honest choice the easy one.** Because contributions already reduce free-to-spend, "pay yourself first" is the path of least resistance here. Lean into that — a one-tap *"send free-to-spend to a goal"* button is the highest-leverage button you could add.
- **Frame around agency, not restriction.** "₸X free to spend" (permission) beats "₸X remaining budget" (deprivation). The current wording is already good.
- **Close the loop.** Closing a month → banking the leftover → watching net worth tick up is a beautiful reinforcement cycle. Make that moment feel rewarding (a small animation on the net-worth number).
- **Explain every number.** The "i" info-tips are excellent and rare — keep the discipline of adding one for every new metric.
- **Never surprise, never shame.** Over-budget shows in amber/pink as *information*. Pair any red number with a constructive next step, never a bare judgment.

---

## 7. Concrete proposed dashboard layout for *this* app

```
┌─────────────────────────────────────────────────────────┐
│  FREE TO SPEND · September            ₸ 214,000          │  ← hero (inverted card)
│  of ₸ 900,000 income · 11 days in, on pace               │
└─────────────────────────────────────────────────────────┘

┌───────────┬───────────┬───────────┬───────────┐
│ Savings   │ Net worth │ Safety    │ Fixed     │            ← 4 vital signs
│ rate      │           │ runway    │ costs     │
│  23%  ▲   │ ₸4.2M ▲180k│ 4.1 mo    │  48%      │
└───────────┴───────────┴───────────┴───────────┘

┌─────────────────────────┬───────────────────────┐
│ Net worth — 12 mo (line)│ Income vs spending    │            ← trends
├─────────────────────────┴───────────────────────┤
│ Top spending categories · Sep   (Δ vs Aug)       │
└──────────────────────────────────────────────────┘

▸ Next best action: "You have ₸214,000 free and 4 months
  of runway — send ₸100,000 to Apartment goal?"                ← one coached action
```

Everything above is buildable within the app's constraints — hand-rolled SVG for the net-worth line, existing `netWorth()` / `monthTotals()` / `recurring` data for the new ratios, one boolean each on categories (`essential`) and assets (`liquid`).

---

## 8. Priority order if you build this

1. **Savings rate** on the dashboard — biggest insight-per-effort; data already exists.
2. **Net-worth trend line + MoM delta** — turns a static number into motivation.
3. **Emergency-fund runway** — add `liquid` flag on assets + `essential` flag on categories; then the single most important safety metric appears.
4. **Fixed-cost ratio** — free, given recurring data already exists.
5. **"Next best action" prompt** — turns the dashboard from a report into a coach.
6. **Pace hints** on free-to-spend and goals — cheap, high clarity.

Do these six and the dashboard stops being a *statement of the past* and becomes a *steering wheel for the future* — which, tagline aside, is the entire point of planning your future and spending free.

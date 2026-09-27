import { DEFAULT_RATES } from '../constants';
import type { Currency, PlannerState } from '../types';

// Pivot table in KZT terms: 1 unit of currency = N KZT (KZT is the pivot, rate 1).
// Used only to seed sensible defaults and cross-rates; live rates come from state/the internet.
const PIVOT_KZT: Record<string, number> = { KZT: 1, ...DEFAULT_RATES };

/** Default rate of `cur` expressed in `base` (how many `base` units per 1 `cur`). */
export function defaultRate(cur: Currency, base: Currency): number {
  const c = PIVOT_KZT[cur] || 1;
  const b = PIVOT_KZT[base] || 1;
  return c / b;
}

/** How many current-base units 1 unit of `cur` is worth, per state.rates (base itself = 1). */
function rateOf(state: PlannerState, cur: Currency): number {
  if (cur === state.baseCur) return 1;
  const r = Number(state.rates[cur]);
  return r > 0 ? r : defaultRate(cur, state.baseCur);
}

/**
 * Re-express everything held in base-currency units so it is relative to `newBase`, in place.
 * This rewrites: state.rates (dropping the new base, adding the old), goal contributions and
 * banked month leftovers (which are stored as raw base-currency numbers). Per-currency amounts
 * (income/expense/asset values carry their own `cur`) are NOT touched — they convert at read time.
 */
export function rebaseRates(state: PlannerState, newBase: Currency): void {
  const oldBase = state.baseCur;
  if (newBase === oldBase) return;
  const denom = rateOf(state, newBase); // old-base units per 1 new-base unit
  if (!(denom > 0)) return;

  // rates: for every currency except the new base, value = (oldBase per cur) / (oldBase per newBase)
  const next: Partial<Record<Currency, number>> = {};
  (Object.keys(PIVOT_KZT) as Currency[]).forEach((cur) => {
    if (cur === newBase) return;
    next[cur] = rateOf(state, cur) / denom;
  });
  state.rates = next;

  // base-denominated stored figures are converted into the new base (value / oldBasePerNewBase)
  state.goals.forEach((g) => {
    Object.keys(g.contribs).forEach((k) => {
      g.contribs[k] = (Number(g.contribs[k]) || 0) / denom;
    });
  });
  Object.keys(state.months).forEach((k) => {
    const m = state.months[k];
    if (m && m.leftover != null) m.leftover = (Number(m.leftover) || 0) / denom;
  });

  state.baseCur = newBase;
}

import type { PlannerState, Currency } from '../types';
import { CURRENCIES, REC_CATEGORIES } from '../constants';
import { defaultRate } from './currency';

/** A fresh, empty planner state. */
export function emptyState(): PlannerState {
  return {
    year: new Date().getFullYear(),
    baseCur: 'KZT',
    rates: {},
    ratesUpdated: null,
    months: {},
    recurring: [],
    loans: [],
    goals: [],
    assets: [],
    tourDone: false,
    lastModified: null,
  };
}

/**
 * Normalize a parsed/raw object into a valid PlannerState, filling defaults for
 * older saved shapes. Mirrors the original load() migration and must never throw
 * on an older shape. Returns a brand-new object (does not mutate the input).
 */
export function normalizeState(raw: unknown): PlannerState {
  const base = emptyState();
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<PlannerState>;

  const baseCur: Currency = p.baseCur && CURRENCIES.indexOf(p.baseCur) >= 0 ? p.baseCur : 'KZT';
  const state: PlannerState = {
    year: p.year || base.year,
    baseCur,
    months: (p.months as PlannerState['months']) || {},
    recurring: (p.recurring as PlannerState['recurring']) || [],
    loans: (p.loans as PlannerState['loans']) || [],
    goals: (p.goals as PlannerState['goals']) || [],
    assets: (p.assets as PlannerState['assets']) || [],
    tourDone: !!p.tourDone,
    // clone: the base-currency delete + default fill below must not mutate the caller's object
    rates: { ...(p.rates as PlannerState['rates']) },
    ratesUpdated: p.ratesUpdated || null,
    lastModified: p.lastModified || null,
  };

  // rates hold every currency except the base; fill any missing/invalid with a default cross-rate.
  delete state.rates[baseCur];
  CURRENCIES.forEach((c) => {
    if (c !== baseCur && !((state.rates[c] || 0) > 0)) state.rates[c] = defaultRate(c, baseCur);
  });

  Object.keys(state.months).forEach((k) => {
    const m = state.months[k];
    if (!m.recActuals) m.recActuals = {};
    (m.incomes || (m.incomes = [])).forEach((i) => {
      if (!i.cur) i.cur = 'KZT';
    });
    (m.expenses || (m.expenses = [])).forEach((e) => {
      if (!e.cur) e.cur = 'KZT';
      if (e.name == null) {
        e.name = e.category || '';
        e.category = REC_CATEGORIES.indexOf(e.category) >= 0 ? e.category : 'Other';
      }
      if (!e.category) e.category = 'Other';
    });
  });

  state.recurring.forEach((r) => {
    if (!r.cur) r.cur = 'KZT';
    if (!r.category) r.category = r.type === 'income' ? 'Income' : 'Other';
  });

  state.loans.forEach((l) => {
    if (!l.cur) l.cur = baseCur;
    if (!l.start) l.start = base.year + '-01';
    if (!l.end) l.end = l.start;
    if (l.rate === undefined) l.rate = null;
    if (l.overpayment === undefined) l.overpayment = null;
    if (l.bank === undefined) l.bank = null;
    if (l.debt === undefined) l.debt = null;
    if (l.contract === undefined) l.contract = null;
    if (l.kind === undefined) l.kind = null;
    if (!l.source) l.source = 'manual';
    if (l.end < l.start) l.end = l.start; // heal any rows saved with an inverted window
  });

  state.goals.forEach((g) => {
    if (!g.contribs) g.contribs = {};
  });

  state.assets.forEach((a) => {
    if (!a.cur) a.cur = 'KZT';
    if (!a.kind) a.kind = 'asset';
    if (a.kind !== 'liability' && a.liquid === undefined) a.liquid = true;
  });

  return state;
}

/** True if a parsed object looks like planner data (for import validation). */
export function looksLikePlannerData(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const o = p as Record<string, unknown>;
  return !!(o.months || o.recurring || o.goals || o.assets);
}

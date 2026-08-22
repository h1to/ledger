import type {
  PlannerState,
  Month,
  Recurring,
  Goal,
  MonthKey,
  Currency,
  MonthTotals,
  YearTotals,
  DisplayFree,
  CategoryAggregate,
} from '../types';
import { mk, nowKey, isPast, monthsBetween } from './dates';

/** Convert an amount in `cur` to KZT using the state's rates. */
export function toKZT(state: PlannerState, amount: number, cur: Currency | string | undefined): number {
  const n = Number(amount) || 0;
  if (!cur || cur === 'KZT') return n;
  return n * (Number(state.rates[cur as Currency]) || 1);
}

export function recurringForMonth(state: PlannerState, k: MonthKey): Recurring[] {
  return state.recurring.filter((r) => r.start <= k && (!r.end || k <= r.end));
}

/**
 * What a recurring expense actually cost in month k: an explicitly recorded
 * actual always wins; otherwise assume the payment happened at its defined
 * amount once the month is current or past (future months count as 0).
 */
export function recEffectiveActual(k: MonthKey, m: Month | undefined, r: Recurring): number {
  if (m && m.recActuals && m.recActuals[r.id] != null) return Number(m.recActuals[r.id]) || 0;
  return k <= nowKey() ? Number(r.amount) || 0 : 0;
}

export function savedInMonth(state: PlannerState, k: MonthKey): number {
  let s = 0;
  state.goals.forEach((g) => {
    s += Number(g.contribs[k]) || 0;
  });
  return s;
}

export function goalSaved(g: Goal): number {
  let s = 0;
  Object.keys(g.contribs).forEach((k) => {
    s += Number(g.contribs[k]) || 0;
  });
  return s;
}

export function totalGoalsSaved(state: PlannerState): number {
  return state.goals.reduce((s, g) => s + goalSaved(g), 0);
}

/** Monthly amount still needed to hit a goal by its deadline, or null if no deadline. */
export function goalNeededPerMonth(g: Goal): number | null {
  const remaining = Math.max(0, (Number(g.target) || 0) - goalSaved(g));
  if (!g.deadline) return null;
  const left = monthsBetween(nowKey(), g.deadline);
  if (left <= 0) return remaining;
  return remaining / left;
}

export function hasData(state: PlannerState, k: MonthKey): boolean {
  const m = state.months[k];
  if (m && (m.incomes.length || m.expenses.length)) return true;
  if (m && m.recActuals && Object.keys(m.recActuals).length) return true;
  if (m && m.closed) return true;
  if (savedInMonth(state, k) > 0) return true;
  return recurringForMonth(state, k).length > 0;
}

/** Savings contributions count as expenses of the month (planned & actual). */
export function monthTotals(state: PlannerState, k: MonthKey): MonthTotals {
  const m = state.months[k];
  const recs = recurringForMonth(state, k);
  let income = 0;
  let planned = 0;
  let actual = 0;
  recs.forEach((r) => {
    const amt = toKZT(state, r.amount, r.cur);
    if (r.type === 'income') {
      income += amt;
    } else {
      planned += amt;
      actual += toKZT(state, recEffectiveActual(k, m, r), r.cur);
    }
  });
  if (m) {
    m.incomes.forEach((i) => {
      income += toKZT(state, i.amount, i.cur);
    });
    m.expenses.forEach((e) => {
      planned += toKZT(state, e.planned, e.cur);
      actual += toKZT(state, e.actual, e.cur);
    });
  }
  const saved = savedInMonth(state, k);
  planned += saved;
  actual += saved;
  const free = income - planned;
  const spentPct = income > 0 ? Math.round((actual / income) * 100) : 0;
  return { income, planned, actual, saved, free, deviation: actual - planned, spentPct };
}

/** What the widgets/aggregates treat as "free" for a month. */
export function displayFree(state: PlannerState, k: MonthKey): DisplayFree {
  const m = state.months[k];
  if (m && m.closed) return { val: Number(m.leftover) || 0, state: 'closed' };
  if (isPast(k)) return { val: 0, state: 'past' };
  return { val: monthTotals(state, k).free, state: 'open' };
}

export function bankedTotal(state: PlannerState): number {
  let s = 0;
  Object.keys(state.months).forEach((k) => {
    const m = state.months[k];
    if (m && m.closed) s += Number(m.leftover) || 0;
  });
  return s;
}

export function assetsTotal(state: PlannerState): number {
  return state.assets.reduce((s, a) => {
    const v = toKZT(state, a.value, a.cur);
    return s + (a.kind === 'liability' ? -v : v);
  }, 0);
}

export function netWorth(state: PlannerState): number {
  return assetsTotal(state) + totalGoalsSaved(state) + bankedTotal(state);
}

export function yearTotals(state: PlannerState, y: number): YearTotals {
  const t: YearTotals = { income: 0, planned: 0, actual: 0, saved: 0, deviation: 0, monthsWithData: 0 };
  for (let m = 1; m <= 12; m++) {
    const k = mk(y, m);
    if (!hasData(state, k)) continue;
    const mt = monthTotals(state, k);
    t.income += mt.income;
    t.planned += mt.planned;
    t.actual += mt.actual;
    t.saved += mt.saved;
    t.deviation += mt.deviation;
    t.monthsWithData++;
  }
  return t;
}

export function monthCategoryBreakdown(
  state: PlannerState,
  k: MonthKey,
  mode: 'planned' | 'actual',
): CategoryAggregate[] {
  const m = state.months[k];
  const map: Record<string, number> = {};
  function add(name: string, val: number) {
    if (val > 0) {
      name = name || 'Unnamed';
      map[name] = (map[name] || 0) + val;
    }
  }
  recurringForMonth(state, k).forEach((r) => {
    if (r.type !== 'expense') return;
    if (mode === 'planned') add(r.category, toKZT(state, r.amount, r.cur));
    else add(r.category, toKZT(state, recEffectiveActual(k, m, r), r.cur));
  });
  if (m)
    m.expenses.forEach((e) => {
      add(e.category, toKZT(state, mode === 'planned' ? e.planned : e.actual, e.cur));
    });
  const sv = savedInMonth(state, k);
  if (sv > 0) add('Savings', sv);
  const arr = Object.keys(map).map((n) => ({ name: n, val: map[n] }));
  arr.sort((a, b) => b.val - a.val);
  return arr;
}

export function yearCategoryAggregates(state: PlannerState, y: number): CategoryAggregate[] {
  const map: Record<string, number> = {};
  for (let mo = 1; mo <= 12; mo++) {
    monthCategoryBreakdown(state, mk(y, mo), 'actual').forEach((c) => {
      map[c.name] = (map[c.name] || 0) + c.val;
    });
  }
  const arr = Object.keys(map).map((n) => ({ name: n, val: map[n] }));
  arr.sort((a, b) => b.val - a.val);
  return arr;
}

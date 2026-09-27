import type { PlannerState, Asset, MonthKey } from '../types';
import { ESSENTIAL_CATEGORIES } from '../constants';
import { mk, nowKey, shiftKey } from './dates';
import {
  toKZT,
  recurringForMonth,
  recEffectiveActual,
  loansForMonth,
  loanEffectiveActual,
  hasData,
  monthTotals,
  netWorth,
  yearTotals,
} from './money';

export function isLiquidAsset(a: Asset): boolean {
  return a.kind !== 'liability' && a.liquid !== false;
}

export function liquidAssetsTotal(state: PlannerState): number {
  return state.assets.reduce((s, a) => s + (isLiquidAsset(a) ? toKZT(state, a.value, a.cur) : 0), 0);
}

/** Essential actual spending for a month, in KZT. */
export function essentialSpendInMonth(state: PlannerState, k: MonthKey): number {
  const m = state.months[k];
  let total = 0;
  recurringForMonth(state, k).forEach((r) => {
    if (r.type === 'expense' && ESSENTIAL_CATEGORIES[r.category]) total += toKZT(state, recEffectiveActual(k, m, r), r.cur);
  });
  if (m)
    m.expenses.forEach((e) => {
      if (ESSENTIAL_CATEGORIES[e.category]) total += toKZT(state, e.actual, e.cur);
    });
  // loan payments are essential debt service ("Debts & loans")
  loansForMonth(state, k).forEach((l) => {
    total += toKZT(state, loanEffectiveActual(k, l), l.cur);
  });
  return total;
}

/** Trailing average monthly spend over up to n months with data (ending at the current month). */
export function avgMonthlySpend(state: PlannerState, n = 3, essentialOnly = false): number {
  const k = nowKey();
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    const kk = shiftKey(k, -i);
    if (!hasData(state, kk)) continue;
    sum += essentialOnly ? essentialSpendInMonth(state, kk) : monthTotals(state, kk).actual;
    cnt++;
  }
  return cnt ? sum / cnt : 0;
}

/** Months of liquid runway. Prefers essential spend; falls back to total spend. Null if unknowable. */
export function runwayMonths(state: PlannerState): number | null {
  let burn = avgMonthlySpend(state, 3, true);
  if (burn <= 0) burn = avgMonthlySpend(state, 3, false);
  if (burn <= 0) return null;
  return liquidAssetsTotal(state) / burn;
}

/** Recurring expense commitments effective in a month, in KZT (the "fixed" cost floor). */
export function fixedCostsMonthly(state: PlannerState, k: MonthKey = nowKey()): number {
  let total = 0;
  recurringForMonth(state, k).forEach((r) => {
    if (r.type === 'expense') total += toKZT(state, r.amount, r.cur);
  });
  loansForMonth(state, k).forEach((l) => {
    total += toKZT(state, l.payment, l.cur);
  });
  return total;
}

/** Savings rate for a year: saved / income. Null if no income. */
export function savingsRate(state: PlannerState, y: number): number | null {
  const t = yearTotals(state, y);
  return t.income > 0 ? t.saved / t.income : null;
}

/**
 * Net worth at the end of month k. Assets are treated as a constant baseline (no
 * per-month history exists for them); goal contributions and banked leftovers carry
 * real dates, so we walk them back from today. The latest point equals netWorth().
 */
export function netWorthAt(state: PlannerState, k: MonthKey): number {
  let nw = netWorth(state);
  state.goals.forEach((g) => {
    Object.keys(g.contribs).forEach((ck) => {
      if (ck > k) nw -= Number(g.contribs[ck]) || 0;
    });
  });
  Object.keys(state.months).forEach((mkey) => {
    const m = state.months[mkey];
    if (m && m.closed && mkey > k) nw -= Number(m.leftover) || 0;
  });
  return nw;
}

export function netWorthSeries(state: PlannerState, y: number): number[] {
  const arr: number[] = [];
  for (let mo = 1; mo <= 12; mo++) arr.push(netWorthAt(state, mk(y, mo)));
  return arr;
}

/** This month's net-worth change (contributions + anything banked this month). */
export function netWorthDeltaThisMonth(state: PlannerState): number {
  return netWorth(state) - netWorthAt(state, shiftKey(nowKey(), -1));
}

/** A contextual "next best action", as a language-agnostic descriptor. */
export type NextBestAction =
  | { kind: 'closeMonth'; key: MonthKey }
  | { kind: 'buildRunway'; months: number }
  | { kind: 'pushToGoal'; free: number }
  | { kind: 'firstGoal' }
  | { kind: 'onTrack' };

export function nextBestAction(state: PlannerState): NextBestAction {
  const cur = nowKey();
  let openPast: MonthKey | null = null;
  Object.keys(state.months).forEach((k) => {
    const m = state.months[k];
    if (k < cur && m && !m.closed && hasData(state, k) && (!openPast || k > openPast)) openPast = k;
  });
  if (openPast) return { kind: 'closeMonth', key: openPast };
  const rw = runwayMonths(state);
  if (rw !== null && rw < 3) return { kind: 'buildRunway', months: rw };
  const free = monthTotals(state, cur).free;
  if (free > 0 && state.goals.length) return { kind: 'pushToGoal', free };
  if (!state.goals.length) return { kind: 'firstGoal' };
  return { kind: 'onTrack' };
}

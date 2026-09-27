import type { PlannerState, MonthKey } from '../../types';
import { monthTotals, monthCategoryBreakdown } from '../money';
import { fixedCostsMonthly, netWorthDeltaThisMonth } from '../metrics';
import { nowKey, shiftKey, isPast } from '../dates';

/** Deterministic budget / cashflow health analysis (exact figures for the advisor). */

export type FixedCostStatus = 'ok' | 'high' | 'severe';

export interface CategoryOverspend {
  category: string;
  planned: number; // base currency, trailing window
  actual: number;
  overBy: number; // actual - planned
}

export interface BudgetInsight {
  income: number; // current month, base currency
  fixedCostRatio: number | null; // fixed monthly commitments / income
  fixedCostStatus: FixedCostStatus;
  overspendCategories: CategoryOverspend[]; // chronic over-plan categories, worst first
  negativeMonths: number; // trailing 6 months (past, with data) that ran negative free
  netWorthDelta: number; // this month's change
}

function fixedCostStatus(ratio: number | null): FixedCostStatus {
  if (ratio == null) return 'ok';
  if (ratio > 0.6) return 'severe';
  if (ratio > 0.5) return 'high';
  return 'ok';
}

export function computeBudgetInsight(state: PlannerState, window = 3): BudgetInsight {
  const cur = nowKey();
  const t = monthTotals(state, cur);
  const fixed = fixedCostsMonthly(state, cur);
  const ratio = t.income > 0 ? fixed / t.income : null;

  // chronic overspend: aggregate planned vs actual per category over the trailing window
  const plannedByCat: Record<string, number> = {};
  const actualByCat: Record<string, number> = {};
  for (let i = 0; i < window; i++) {
    const k: MonthKey = shiftKey(cur, -i);
    monthCategoryBreakdown(state, k, 'planned').forEach((c) => (plannedByCat[c.name] = (plannedByCat[c.name] || 0) + c.val));
    monthCategoryBreakdown(state, k, 'actual').forEach((c) => (actualByCat[c.name] = (actualByCat[c.name] || 0) + c.val));
  }
  const overspendCategories: CategoryOverspend[] = Object.keys(actualByCat)
    .map((category) => ({ category, planned: plannedByCat[category] || 0, actual: actualByCat[category], overBy: actualByCat[category] - (plannedByCat[category] || 0) }))
    .filter((c) => c.planned > 0 && c.overBy > 0)
    .sort((a, b) => b.overBy - a.overBy);

  // trailing 6 past months that ran a negative free-to-spend
  let negativeMonths = 0;
  for (let i = 1; i <= 6; i++) {
    const k = shiftKey(cur, -i);
    if (isPast(k) && monthTotals(state, k).free < 0) negativeMonths++;
  }

  return {
    income: t.income,
    fixedCostRatio: ratio,
    fixedCostStatus: fixedCostStatus(ratio),
    overspendCategories,
    negativeMonths,
    netWorthDelta: netWorthDeltaThisMonth(state),
  };
}

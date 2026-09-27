import type { PlannerState, MonthKey } from '../../types';
import { monthTotals } from '../money';
import { debtSummary } from '../debt';
import { nextBestAction } from '../metrics';
import { nowKey } from '../dates';
import { computeDebtPlan } from './debtPlan';
import { computeSavingsInsight } from './savingsPlan';
import { computeBudgetInsight } from './budgetHealth';

/**
 * Deterministic, ranked recommendations built purely from the analysis engine — no AI. Every
 * figure is exact. (The Phase-2 AI advisor produces a richer narrative over the same numbers;
 * this list stands on its own and is what ships first.) Descriptors are language-agnostic; the
 * UI translates them.
 */
export type Recommendation =
  | { kind: 'closeMonth'; impact: number; monthKey: MonthKey }
  | { kind: 'setLoanPayment'; impact: number; count: number }
  | { kind: 'extraToDebt'; impact: number; bank: string; extra: number; monthsSaved: number; interestSaved: number; hasRates: boolean }
  | { kind: 'buildEmergency'; impact: number; runway: number | null; targetMonths: number }
  | { kind: 'curbOverspend'; impact: number; category: string; overBy: number }
  | { kind: 'raiseSavingsRate'; impact: number; rate: number | null; target: number }
  | { kind: 'trimFixedCosts'; impact: number; ratio: number };

/** A sensible default monthly extra for the debt what-if: ~10% of scheduled repayments, rounded, but
 *  not more than this month's free-to-spend when that's positive. Min 10,000 when there's any debt. */
export function suggestedExtra(state: PlannerState): number {
  const plan = computeDebtPlan(state, { extra: 0 });
  if (plan.monthlyBase <= 0) return 0;
  const free = Math.max(0, monthTotals(state, nowKey()).free);
  let x = Math.round((plan.monthlyBase * 0.1) / 10000) * 10000;
  if (x <= 0) x = 10000;
  if (free > 0) x = Math.min(x, Math.round(free / 10000) * 10000 || 10000);
  return Math.max(10000, x);
}

export function recommendations(state: PlannerState): Recommendation[] {
  const out: Recommendation[] = [];

  // close a finished month (banks a real leftover)
  const nba = nextBestAction(state);
  if (nba.kind === 'closeMonth') out.push({ kind: 'closeMonth', impact: 100, monthKey: nba.key });

  const ds = debtSummary(state);

  // imported debts still missing a monthly payment → unlock the whole plan
  if (ds.loansWithoutPayment > 0) out.push({ kind: 'setLoanPayment', impact: 90, count: ds.loansWithoutPayment });

  // emergency fund below the 3-month floor
  const sv = computeSavingsInsight(state);
  if (sv.runway != null && sv.runway < sv.runwayTargetMin) {
    out.push({ kind: 'buildEmergency', impact: 82, runway: sv.runway, targetMonths: sv.runwayTargetMin });
  }

  // extra toward debt (avalanche) — the headline lever
  if (ds.totalDebt > 0) {
    const extra = suggestedExtra(state);
    if (extra > 0) {
      const plan = computeDebtPlan(state, { extra, strategy: 'avalanche' });
      if (plan.monthsSaved > 0) {
        out.push({
          kind: 'extraToDebt', impact: 72, bank: plan.order[0]?.bank || 'Other',
          extra, monthsSaved: plan.monthsSaved, interestSaved: plan.interestSaved, hasRates: plan.hasRates,
        });
      }
    }
  }

  // chronic category overspend (worst one)
  const bud = computeBudgetInsight(state);
  if (bud.overspendCategories.length > 0) {
    const w = bud.overspendCategories[0];
    out.push({ kind: 'curbOverspend', impact: 50, category: w.category, overBy: w.overBy });
  }

  // savings rate below target (lower priority than clearing high-interest debt)
  if (sv.savingsRate != null && !sv.savingsRateOnTrack) {
    out.push({ kind: 'raiseSavingsRate', impact: 40, rate: sv.savingsRate, target: sv.savingsRateTarget });
  }

  // fixed costs eating too much of income
  if (bud.fixedCostRatio != null && bud.fixedCostStatus !== 'ok') {
    out.push({ kind: 'trimFixedCosts', impact: bud.fixedCostStatus === 'severe' ? 45 : 30, ratio: bud.fixedCostRatio });
  }

  return out.sort((a, b) => b.impact - a.impact);
}

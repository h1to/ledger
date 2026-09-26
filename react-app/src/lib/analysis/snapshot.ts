import type { PlannerState, Currency } from '../../types';
import { netWorth, monthTotals } from '../money';
import { debtSummary } from '../debt';
import { nowKey } from '../dates';
import { computeDebtPlan } from './debtPlan';
import { computeSavingsInsight, type SavingsInsight } from './savingsPlan';
import { computeBudgetInsight, type BudgetInsight } from './budgetHealth';

/**
 * A compact, DE-IDENTIFIED financial snapshot for the AI advisor. It carries figures only —
 * amounts, currencies, categories, bank names, rates, month keys — and deliberately excludes
 * personal identifiers: no IIN, no contract numbers, no account numbers, and no loan display
 * names (Halyk/Kaspi names embed contract ids). This is the only thing sent off-device.
 */
export interface AdvisorSnapshot {
  baseCurrency: Currency;
  asOf: string; // month key
  netWorth: number;
  monthlyIncome: number;
  monthlyFree: number;
  debt: {
    total: number;
    monthlyRepayment: number;
    hasRates: boolean;
    loansWithoutPayment: number;
    byBank: { bank: string; debt: number; monthly: number; rate: number | null }[];
    baselineMonthsToDebtFree: number | null;
    baselineDebtFree: string | null;
  };
  savings: SavingsInsight;
  budget: BudgetInsight;
}

export function buildAdvisorSnapshot(state: PlannerState): AdvisorSnapshot {
  const cur = nowKey();
  const t = monthTotals(state, cur);
  const ds = debtSummary(state);
  const plan = computeDebtPlan(state, { extra: 0, strategy: 'avalanche' });

  // average rate per bank (only over loans that carry one), for context — no identifiers
  const rateByBank = new Map<string, { sum: number; n: number }>();
  (state.loans || []).forEach((l) => {
    if (l.rate != null && l.rate > 0) {
      const k = l.bank && l.bank.trim() ? l.bank.trim() : 'Other';
      const e = rateByBank.get(k) || { sum: 0, n: 0 };
      e.sum += l.rate; e.n += 1; rateByBank.set(k, e);
    }
  });

  return {
    baseCurrency: state.baseCur,
    asOf: cur,
    netWorth: netWorth(state),
    monthlyIncome: t.income,
    monthlyFree: t.free,
    debt: {
      total: ds.totalDebt,
      monthlyRepayment: ds.monthlyTotal,
      hasRates: plan.hasRates,
      loansWithoutPayment: ds.loansWithoutPayment,
      byBank: ds.byBank.map((b) => {
        const r = rateByBank.get(b.bank);
        return { bank: b.bank, debt: b.debt, monthly: b.monthly, rate: r ? Math.round((r.sum / r.n) * 100) / 100 : null };
      }),
      baselineMonthsToDebtFree: plan.baseline.cleared ? plan.baseline.months : null,
      baselineDebtFree: plan.baseline.debtFreeKey,
    },
    savings: computeSavingsInsight(state),
    budget: computeBudgetInsight(state),
  };
}

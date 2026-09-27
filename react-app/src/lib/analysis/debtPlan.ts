import type { PlannerState, MonthKey } from '../../types';
import { toKZT } from '../money';
import { loanCurrentDebt } from '../debt';
import { nowKey, shiftKey } from '../dates';

/**
 * Deterministic debt-payoff engine. Everything here is exact arithmetic in the base currency —
 * the AI layer only narrates these numbers, it never computes them.
 *
 * Model: each loan is simulated month by month. A "baseline" keeps every loan at its own monthly
 * payment with no redirection (when a loan clears, that money simply stops). An "accelerated" plan
 * adds an extra monthly amount to the strategy's target loan AND rolls a cleared loan's freed
 * payment onto the next target (the debt-snowball/avalanche rollover). Comparing the two gives
 * months saved, interest saved, and the two total-debt curves.
 */

export type DebtStrategy = 'avalanche' | 'snowball';

interface SimLoan {
  id: string;
  name: string;
  bank: string;
  balance: number; // base currency
  payment: number; // base currency, monthly
  rate: number; // annual %, 0 if unknown
}

export interface PayoffResult {
  months: number; // payments until debt-free (capped)
  debtFreeKey: MonthKey | null; // month of the final payment, null if not payable within the cap
  totalInterest: number; // base currency (0 when no rates are known)
  curve: number[]; // total remaining debt at the end of each month, base currency
  cleared: boolean; // whether all loans were paid off within the cap
}

export interface DebtPlan {
  strategy: DebtStrategy;
  extra: number; // base currency, monthly
  hasRates: boolean; // any loan carries an interest rate (else interest figures are 0/approx)
  totalDebt: number; // base currency
  monthlyBase: number; // sum of scheduled payments, base currency
  order: { id: string; name: string; bank: string; balance: number }[]; // payoff priority
  baseline: PayoffResult;
  accelerated: PayoffResult;
  monthsSaved: number;
  interestSaved: number;
  loansWithoutPayment: number; // debts excluded from the projection (no payment set yet)
}

const CAP = 1200; // 100 years — guards against a loan whose payment never beats its interest

function simLoans(state: PlannerState): SimLoan[] {
  return (state.loans || [])
    .filter((l) => (Number(l.payment) || 0) > 0 && loanCurrentDebt(l) > 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      bank: l.bank && l.bank.trim() ? l.bank.trim() : 'Other',
      balance: toKZT(state, loanCurrentDebt(l), l.cur),
      payment: toKZT(state, Number(l.payment) || 0, l.cur),
      rate: l.rate != null && l.rate > 0 ? Number(l.rate) : 0,
    }));
}

function orderIds(loans: SimLoan[], strategy: DebtStrategy): string[] {
  const sorted = loans.slice().sort((a, b) => {
    if (strategy === 'avalanche') {
      if (b.rate !== a.rate) return b.rate - a.rate; // highest rate first
      return a.balance - b.balance; // tie → smaller balance first
    }
    return a.balance - b.balance; // snowball: smallest balance first
  });
  return sorted.map((l) => l.id);
}

/** Simulate payoff. `accelerate` adds `extra`/mo and rolls freed payments onto the next target. */
function simulate(loans: SimLoan[], order: string[], extra: number, accelerate: boolean): PayoffResult {
  const bal = new Map<string, number>();
  const pay = new Map<string, number>();
  const rate = new Map<string, number>();
  loans.forEach((l) => { bal.set(l.id, l.balance); pay.set(l.id, l.payment); rate.set(l.id, l.rate); });

  const curve: number[] = [];
  let totalInterest = 0;
  let month = 0;
  const remaining = () => order.reduce((s, id) => s + Math.max(0, bal.get(id) || 0), 0);

  while (remaining() > 0.005 && month < CAP) {
    month++;
    // 1. accrue interest on outstanding balances
    for (const id of order) {
      const b = bal.get(id) || 0;
      if (b <= 0) continue;
      const i = (rate.get(id) || 0) > 0 ? b * (rate.get(id)! / 1200) : 0;
      if (i > 0) { bal.set(id, b + i); totalInterest += i; }
    }
    // 2. scheduled payments
    for (const id of order) {
      const b = bal.get(id) || 0;
      if (b <= 0) continue;
      bal.set(id, Math.max(0, b - Math.min(pay.get(id)!, b)));
    }
    // 3. accelerated: extra + freed payments from cleared loans, applied in priority order
    if (accelerate) {
      let pool = extra;
      for (const id of order) if ((bal.get(id) || 0) <= 0) pool += pay.get(id)!; // freed
      for (const id of order) {
        if (pool <= 0) break;
        const b = bal.get(id) || 0;
        if (b <= 0) continue;
        const p = Math.min(pool, b);
        bal.set(id, b - p);
        pool -= p;
      }
    }
    curve.push(remaining());
  }

  const cleared = remaining() <= 0.005;
  return {
    months: month,
    debtFreeKey: cleared && month > 0 ? shiftKey(nowKey(), month - 1) : null,
    totalInterest,
    curve,
    cleared,
  };
}

/** Compute the full debt plan for a given monthly `extra` and payoff `strategy`. */
export function computeDebtPlan(state: PlannerState, opts: { extra?: number; strategy?: DebtStrategy } = {}): DebtPlan {
  const extra = Math.max(0, opts.extra || 0);
  const strategy = opts.strategy || 'avalanche';
  const loans = simLoans(state);
  const order = orderIds(loans, strategy);
  const byId = new Map(loans.map((l) => [l.id, l]));

  const baseline = simulate(loans, order, 0, false);
  const accelerated = simulate(loans, order, extra, true);

  return {
    strategy,
    extra,
    hasRates: loans.some((l) => l.rate > 0),
    totalDebt: loans.reduce((s, l) => s + l.balance, 0),
    monthlyBase: loans.reduce((s, l) => s + l.payment, 0),
    order: order.map((id) => { const l = byId.get(id)!; return { id, name: l.name, bank: l.bank, balance: l.balance }; }),
    baseline,
    accelerated,
    monthsSaved: Math.max(0, baseline.months - accelerated.months),
    interestSaved: Math.max(0, baseline.totalInterest - accelerated.totalInterest),
    loansWithoutPayment: (state.loans || []).filter((l) => (Number(l.payment) || 0) <= 0 && loanCurrentDebt(l) > 0).length,
  };
}

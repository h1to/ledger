import type { PlannerState, Loan } from '../types';
import { toKZT, loanStats } from './money';
import { nowKey, shiftKey } from './dates';

/** The amount still owed on a loan right now, in the loan's own currency. */
export function loanCurrentDebt(l: Loan): number {
  if (l.debt != null) return Number(l.debt) || 0;
  // a manual loan with no explicit debt figure: fall back to its remaining scheduled payments
  return loanStats(l).remaining;
}

/** Months of payments still needed to clear a loan, or null when the payment is unknown. */
export function loanPayoffMonths(l: Loan): number | null {
  const pay = Number(l.payment) || 0;
  if (pay <= 0) return null;
  const debt = loanCurrentDebt(l);
  if (debt <= 0) return 0;
  return Math.ceil(debt / pay);
}

/** Bank bucket for grouping; loans with no bank fall under a single "Other" group. */
export function bankKey(l: Loan): string {
  return l.bank && l.bank.trim() ? l.bank.trim() : 'Other';
}

export interface BankDebt {
  bank: string;
  debt: number; // base currency
  monthly: number; // base currency, sum of known payments
  count: number;
  payoffMonths: number | null;
}

export interface DebtSummary {
  totalDebt: number; // base currency
  monthlyTotal: number; // base currency (loans with a payment set)
  payoffMonths: number | null; // months to clear everything (max across loans); null if no payments set
  loansWithoutPayment: number;
  byBank: BankDebt[];
}

/** Aggregate debt analytics across all loans, converted to the base currency. */
export function debtSummary(state: PlannerState): DebtSummary {
  const loans = state.loans || [];
  let totalDebt = 0;
  let monthlyTotal = 0;
  let payoffMonths: number | null = null;
  let loansWithoutPayment = 0;
  const banks = new Map<string, { debt: number; monthly: number; count: number; payoff: number | null }>();

  loans.forEach((l) => {
    const debtBase = toKZT(state, loanCurrentDebt(l), l.cur);
    const pay = Number(l.payment) || 0;
    const payBase = pay > 0 ? toKZT(state, pay, l.cur) : 0;
    const pm = loanPayoffMonths(l);
    totalDebt += debtBase;
    monthlyTotal += payBase;
    if (pay <= 0) loansWithoutPayment++;
    if (pm != null) payoffMonths = Math.max(payoffMonths ?? 0, pm);

    const key = bankKey(l);
    const b = banks.get(key) || { debt: 0, monthly: 0, count: 0, payoff: null };
    b.debt += debtBase;
    b.monthly += payBase;
    b.count++;
    if (pm != null) b.payoff = Math.max(b.payoff ?? 0, pm);
    banks.set(key, b);
  });

  const byBank: BankDebt[] = Array.from(banks.entries())
    .map(([bank, v]) => ({ bank, debt: v.debt, monthly: v.monthly, count: v.count, payoffMonths: v.payoff }))
    .sort((a, b) => b.debt - a.debt);

  return { totalDebt, monthlyTotal, payoffMonths, loansWithoutPayment, byBank };
}

/** The month key of the final payment if a loan/plan takes `months` more payments from now. */
export function payoffDateKey(months: number): string {
  return shiftKey(nowKey(), Math.max(0, months - 1));
}

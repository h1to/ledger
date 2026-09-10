import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { monthTotals, monthCategoryBreakdown, loanStats, loansForMonth } from '../money';
import { fixedCostsMonthly } from '../metrics';
import { stateToRowSet, rowSetToState } from '../repo/mapper';
import { makeState } from '../../test/factory';
import type { Loan } from '../../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z')); // "now" = 2026-09
});
afterAll(() => vi.useRealTimers());

const loan: Loan = { id: 'l1', name: 'Mortgage', payment: 100000, cur: 'KZT', start: '2026-01', end: '2026-12', rate: 12, overpayment: 200000 };

describe('loans in monthly expenses', () => {
  it('adds the payment to planned every active month, and to actual only once due', () => {
    const s = makeState({
      loans: [loan],
      months: {
        '2026-03': { incomes: [{ id: 'i', name: 'Pay', amount: 500000, cur: 'KZT' }], expenses: [], recActuals: {} },
        '2026-12': { incomes: [{ id: 'i2', name: 'Pay', amount: 500000, cur: 'KZT' }], expenses: [], recActuals: {} },
      },
    });
    const past = monthTotals(s, '2026-03'); // before "now" → payment is due
    expect(past.planned).toBe(100000);
    expect(past.actual).toBe(100000);
    expect(past.free).toBe(400000); // 500000 income − 100000 planned

    const future = monthTotals(s, '2026-12'); // after "now" → planned yes, actual no
    expect(future.planned).toBe(100000);
    expect(future.actual).toBe(0);
  });

  it('does not count a loan outside its window', () => {
    const s = makeState({ loans: [loan] });
    expect(loansForMonth(s, '2025-12')).toHaveLength(0);
    expect(monthTotals(s, '2025-12').planned).toBe(0);
  });

  it('shows up under "Debts & loans" in the category breakdown and in fixed costs', () => {
    const s = makeState({ loans: [loan] });
    const cats = monthCategoryBreakdown(s, '2026-03', 'planned');
    expect(cats.find((c) => c.name === 'Debts & loans')?.val).toBe(100000);
    expect(fixedCostsMonthly(s, '2026-06')).toBe(100000);
  });

  it('computes loan stats (term, paid, remaining) from the current month', () => {
    const st = loanStats(loan);
    expect(st.term).toBe(12);
    expect(st.paid).toBe(9); // Jan..Sep inclusive
    expect(st.remainingMonths).toBe(3);
    expect(st.totalToPay).toBe(1200000);
    expect(st.paidToDate).toBe(900000);
    expect(st.remaining).toBe(300000);
    expect(st.active).toBe(true);
  });

  it('round-trips through the relational mapper', () => {
    const s = makeState({ loans: [loan] });
    expect(rowSetToState(stateToRowSet(s))).toEqual(s);
  });
});

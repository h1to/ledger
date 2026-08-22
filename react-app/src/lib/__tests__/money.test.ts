import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { makeState } from '../../test/factory';
import {
  toKZT,
  monthTotals,
  displayFree,
  netWorth,
  yearTotals,
  monthCategoryBreakdown,
  recEffectiveActual,
} from '../money';
import type { PlannerState } from '../../types';

// Freeze "now" to 2026-08 so recurring/effective-actual/past-month rules are deterministic.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

function seed(): PlannerState {
  return makeState({
    recurring: [
      { id: 'r1', name: 'Rent', type: 'expense', category: 'Housing', amount: 200000, cur: 'KZT', start: '2026-08', end: '2026-08' },
      { id: 'r2', name: 'Salary', type: 'income', category: 'Income', amount: 2000, cur: 'USD', start: '2026-08', end: '2026-08' },
    ],
    goals: [{ id: 'g1', name: 'Fund', target: 5000000, deadline: null, contribs: { '2026-08': 50000 } }],
    assets: [
      { id: 'a1', name: 'Deposit', kind: 'asset', value: 1000000, cur: 'KZT', liquid: true },
      { id: 'a3', name: 'Loan', kind: 'liability', value: 300, cur: 'USD' },
    ],
    months: {
      '2026-08': {
        incomes: [{ id: 'i1', name: 'Freelance', amount: 500, cur: 'USD' }],
        expenses: [{ id: 'e1', name: 'Food', category: 'Groceries', planned: 150000, actual: 120000, cur: 'KZT' }],
        recActuals: {},
      },
      '2026-05': { incomes: [], expenses: [], recActuals: {}, closed: true, leftover: 40000 },
    },
  });
}

describe('toKZT', () => {
  it('returns the amount unchanged for KZT', () => {
    expect(toKZT(seed(), 1000, 'KZT')).toBe(1000);
  });
  it('converts using the rate', () => {
    expect(toKZT(seed(), 100, 'USD')).toBe(54000);
  });
  it('falls back to 1 for an unknown rate', () => {
    const st = makeState({ rates: {} });
    expect(toKZT(st, 100, 'USD')).toBe(100);
  });
});

describe('monthTotals', () => {
  it('adds recurring + manual + savings and computes free', () => {
    const t = monthTotals(seed(), '2026-08');
    // income = salary 2000*540 + freelance 500*540
    expect(t.income).toBe(1350000);
    // planned/actual include recurring rent (200k), groceries, and the 50k savings contribution
    expect(t.planned).toBe(200000 + 150000 + 50000);
    expect(t.actual).toBe(200000 + 120000 + 50000);
    expect(t.saved).toBe(50000);
    expect(t.free).toBe(t.income - t.planned);
  });
});

describe('recEffectiveActual', () => {
  it('uses a typed override when present', () => {
    const st = seed();
    st.months['2026-08'].recActuals['r1'] = 210000;
    expect(recEffectiveActual('2026-08', st.months['2026-08'], st.recurring[0])).toBe(210000);
  });
  it('assumes the defined amount for the current/past month', () => {
    const st = seed();
    expect(recEffectiveActual('2026-08', st.months['2026-08'], st.recurring[0])).toBe(200000);
  });
  it('counts 0 for a future month', () => {
    const st = seed();
    const future = { ...st.recurring[0], start: '2026-12', end: null };
    expect(recEffectiveActual('2026-12', undefined, future)).toBe(0);
  });
});

describe('displayFree', () => {
  it('reports the banked leftover for a closed month', () => {
    expect(displayFree(seed(), '2026-05')).toEqual({ val: 40000, state: 'closed' });
  });
  it('reports 0 free for an un-closed past month', () => {
    const st = makeState({ months: { '2026-03': { incomes: [{ id: 'x', name: 'a', amount: 100, cur: 'KZT' }], expenses: [], recActuals: {} } } });
    expect(displayFree(st, '2026-03')).toEqual({ val: 0, state: 'past' });
  });
});

describe('netWorth & yearTotals', () => {
  it('composes net worth from assets, goals and banked leftovers', () => {
    // deposit 1,000,000 − loan (300*540=162,000) + goals 50,000 + banked 40,000
    expect(netWorth(seed())).toBe(928000);
  });
  it('sums the year across months with data', () => {
    const t = yearTotals(seed(), 2026);
    expect(t.income).toBe(1350000);
    expect(t.saved).toBe(50000);
    expect(t.monthsWithData).toBe(2); // 2026-08 and closed 2026-05
  });
});

describe('monthCategoryBreakdown', () => {
  it('includes savings as its own category and sorts by value', () => {
    const arr = monthCategoryBreakdown(seed(), '2026-08', 'actual');
    const names = arr.map((a) => a.name);
    expect(names).toContain('Savings');
    expect(names).toContain('Housing');
    // sorted descending
    for (let i = 1; i < arr.length; i++) expect(arr[i - 1].val).toBeGreaterThanOrEqual(arr[i].val);
  });
});

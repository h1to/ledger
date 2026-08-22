import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { makeState } from '../../test/factory';
import {
  liquidAssetsTotal,
  essentialSpendInMonth,
  runwayMonths,
  fixedCostsMonthly,
  savingsRate,
  netWorthAt,
  netWorthDeltaThisMonth,
  nextBestAction,
} from '../metrics';
import type { PlannerState } from '../../types';

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
      { id: 'a2', name: 'Apartment', kind: 'asset', value: 5000000, cur: 'KZT', liquid: false },
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

describe('health metrics', () => {
  it('counts only liquid assets toward runway funds', () => {
    expect(liquidAssetsTotal(seed())).toBe(1000000); // apartment (illiquid) excluded
  });
  it('sums essential spend (recurring Housing + Groceries)', () => {
    expect(essentialSpendInMonth(seed(), '2026-08')).toBe(320000);
  });
  it('computes runway = liquid / avg essential spend', () => {
    expect(runwayMonths(seed())).toBeCloseTo(1000000 / 320000, 9); // 3.125
  });
  it('fixed costs = recurring expense commitments', () => {
    expect(fixedCostsMonthly(seed(), '2026-08')).toBe(200000);
  });
  it('savings rate = saved / income for the year', () => {
    expect(savingsRate(seed(), 2026)).toBeCloseTo(50000 / 1350000, 9);
  });
  it('runway is 0 when there are no liquid assets but spending exists', () => {
    const st = seed();
    st.assets = st.assets.map((a) => (a.kind === 'asset' ? { ...a, liquid: false } : a));
    expect(runwayMonths(st)).toBe(0);
  });
  it('null runway when there is no spending data at all', () => {
    const st = makeState({ assets: [{ id: 'a', name: 'Cash', kind: 'asset', value: 10, cur: 'KZT', liquid: true }] });
    expect(runwayMonths(st)).toBeNull();
  });
});

describe('net worth trend', () => {
  it('walks contributions & banked leftovers back from today', () => {
    expect(netWorthAt(seed(), '2026-04')).toBe(5838000); // minus 50k contrib & 40k banked
    expect(netWorthAt(seed(), '2026-06')).toBe(5878000); // minus 50k contrib only
  });
  it("computes this month's delta", () => {
    expect(netWorthDeltaThisMonth(seed())).toBe(50000);
  });
});

describe('nextBestAction', () => {
  it('suggests closing a finished, un-closed past month first', () => {
    const st = seed();
    st.months['2026-06'] = { incomes: [{ id: 'z', name: 'x', amount: 1, cur: 'KZT' }], expenses: [], recActuals: {} };
    const nba = nextBestAction(st);
    expect(nba).toEqual({ kind: 'closeMonth', key: '2026-06' });
  });
  it('suggests a first goal when none exist', () => {
    const st = makeState({ assets: [{ id: 'a', name: 'Cash', kind: 'asset', value: 10, cur: 'KZT', liquid: true }] });
    expect(nextBestAction(st).kind).toBe('firstGoal');
  });
});

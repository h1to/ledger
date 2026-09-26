import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeDebtPlan } from '../debtPlan';
import { makeState } from '../../../test/factory';
import type { Loan } from '../../../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z')); // now = 2026-09
});
afterAll(() => vi.useRealTimers());

const loan = (over: Partial<Loan>): Loan => ({
  id: 'l', name: 'L', bank: 'Bank', payment: 0, cur: 'KZT', start: '2026-09', end: '2026-09',
  rate: null, overpayment: null, debt: null, contract: null, kind: null, source: 'import', ...over,
});

describe('computeDebtPlan', () => {
  it('baseline pays a single loan off in balance/payment months with an exact curve', () => {
    const s = makeState({ loans: [loan({ id: 'a', debt: 100000, payment: 25000 })] });
    const plan = computeDebtPlan(s, { extra: 0 });
    expect(plan.baseline.months).toBe(4);
    expect(plan.baseline.curve).toEqual([75000, 50000, 25000, 0]);
    expect(plan.baseline.debtFreeKey).toBe('2026-12'); // Sep + 3
    expect(plan.baseline.totalInterest).toBe(0); // no rate
    expect(plan.totalDebt).toBe(100000);
  });

  it('an extra payment shortens payoff and reports months saved', () => {
    const s = makeState({ loans: [loan({ id: 'a', debt: 100000, payment: 25000 })] });
    const plan = computeDebtPlan(s, { extra: 25000 });
    expect(plan.accelerated.months).toBe(2); // 50000/mo → 2 months
    expect(plan.accelerated.curve).toEqual([50000, 0]);
    expect(plan.monthsSaved).toBe(2);
  });

  it('rolls a cleared loan’s payment onto the next (snowball) even with no extra', () => {
    const s = makeState({ loans: [
      loan({ id: 'a', debt: 100000, payment: 50000 }), // clears fast
      loan({ id: 'b', debt: 300000, payment: 60000 }),
    ] });
    const plan = computeDebtPlan(s, { extra: 0, strategy: 'snowball' });
    // baseline: A done in 2 mo, B done in 5 mo → debt-free in 5
    expect(plan.baseline.months).toBe(5);
    // accelerated rolls A's freed 50000 onto B → strictly faster
    expect(plan.accelerated.months).toBeLessThan(plan.baseline.months);
    expect(plan.monthsSaved).toBeGreaterThan(0);
    expect(plan.order[0].id).toBe('a'); // snowball targets the smaller balance first
  });

  it('avalanche targets the highest rate first and accrues interest', () => {
    const s = makeState({ loans: [
      loan({ id: 'lo', debt: 100000, payment: 30000, rate: 10 }),
      loan({ id: 'hi', debt: 100000, payment: 30000, rate: 40 }),
    ] });
    const plan = computeDebtPlan(s, { extra: 20000, strategy: 'avalanche' });
    expect(plan.order[0].id).toBe('hi'); // highest rate first
    expect(plan.hasRates).toBe(true);
    expect(plan.accelerated.totalInterest).toBeGreaterThan(0);
    expect(plan.interestSaved).toBeGreaterThan(0); // paying faster accrues less interest
    expect(plan.accelerated.months).toBeLessThan(plan.baseline.months);
  });

  it('excludes debts with no payment set but counts them', () => {
    const s = makeState({ loans: [
      loan({ id: 'a', debt: 100000, payment: 25000 }),
      loan({ id: 'b', debt: 500000, payment: 0 }), // no payment yet
    ] });
    const plan = computeDebtPlan(s);
    expect(plan.loansWithoutPayment).toBe(1);
    expect(plan.order.map((o) => o.id)).toEqual(['a']); // only the payable loan is simulated
  });

  it('converts foreign-currency loans to the base currency', () => {
    const s = makeState({ baseCur: 'KZT', rates: { USD: 500 }, loans: [loan({ id: 'a', cur: 'USD', debt: 200, payment: 100 })] });
    const plan = computeDebtPlan(s);
    expect(plan.totalDebt).toBe(100000); // 200 USD * 500
    expect(plan.baseline.months).toBe(2); // 100000 / 50000
  });
});

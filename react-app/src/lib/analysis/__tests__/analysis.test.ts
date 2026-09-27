import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { computeSavingsInsight } from '../savingsPlan';
import { computeBudgetInsight } from '../budgetHealth';
import { buildAdvisorSnapshot } from '../snapshot';
import { makeState } from '../../../test/factory';
import type { Loan } from '../../../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z')); // now = 2026-09
});
afterAll(() => vi.useRealTimers());

const M = () => ({ incomes: [], expenses: [], recActuals: {} });
const loan = (over: Partial<Loan>): Loan => ({
  id: 'l', name: 'Halyk · EKP123', bank: 'Halyk', payment: 50000, cur: 'KZT', start: '2026-09', end: '2027-09',
  rate: 18, overpayment: null, debt: 300000, contract: 'EKP123', kind: null, source: 'import', ...over,
});

describe('computeSavingsInsight', () => {
  it('scores the emergency fund and savings rate against targets', () => {
    const s = makeState({
      assets: [{ id: 'a', name: 'Cash', kind: 'asset', value: 300000, cur: 'KZT', liquid: true }],
      months: { '2026-08': { incomes: [{ id: 'i', name: 'Pay', amount: 500000, cur: 'KZT' }], expenses: [{ id: 'e', name: 'Rent', category: 'Housing', planned: 100000, actual: 100000, cur: 'KZT' }], recActuals: {} } },
      goals: [{ id: 'g', name: 'Apartment', target: 1200000, deadline: '2027-09', contribs: { '2026-09': 50000 } }],
    });
    const r = computeSavingsInsight(s);
    expect(r.runwayTargetMin).toBe(3);
    expect(['unknown', 'none', 'building', 'ok', 'strong']).toContain(r.emergencyStatus);
    expect(r.goals).toHaveLength(1);
    expect(r.goals[0].pctToTarget).toBeCloseTo(50000 / 1200000, 5);
    expect(r.goals[0].neededPerMonth).not.toBeNull(); // has a deadline
  });
});

describe('computeBudgetInsight', () => {
  it('flags a high fixed-cost ratio and chronic overspend', () => {
    const s = makeState({
      recurring: [{ id: 'r', name: 'Rent', type: 'expense', category: 'Housing', amount: 400000, cur: 'KZT', start: '2026-01', end: null }],
      months: { '2026-09': { incomes: [{ id: 'i', name: 'Pay', amount: 600000, cur: 'KZT' }], expenses: [{ id: 'e', name: 'Food', category: 'Groceries', planned: 50000, actual: 90000, cur: 'KZT' }], recActuals: {} } },
    });
    const r = computeBudgetInsight(s);
    expect(r.fixedCostRatio).toBeCloseTo(400000 / 600000, 4);
    expect(r.fixedCostStatus).toBe('severe'); // > 0.6
    expect(r.overspendCategories.some((c) => c.category === 'Groceries' && c.overBy === 40000)).toBe(true);
  });
});

describe('buildAdvisorSnapshot', () => {
  it('is de-identified: no contract numbers or loan names, but keeps bank + amounts', () => {
    const s = makeState({ loans: [loan({})], months: { '2026-09': M() } });
    const snap = buildAdvisorSnapshot(s);
    const json = JSON.stringify(snap);
    expect(json).not.toContain('EKP123'); // contract number excluded
    expect(json).not.toContain('Halyk · EKP123'); // loan display name excluded
    expect(snap.debt.byBank[0].bank).toBe('Halyk'); // bank name kept
    expect(snap.debt.total).toBe(300000);
    expect(snap.debt.byBank[0].rate).toBe(18);
    expect(snap.baseCurrency).toBe('KZT');
    expect(snap.savings).toBeDefined();
    expect(snap.budget).toBeDefined();
  });
});

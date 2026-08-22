import { describe, it, expect } from 'vitest';
import { normalizeState, looksLikePlannerData, emptyState } from '../migrate';

describe('normalizeState', () => {
  it('never throws on an older / partial shape and fills defaults', () => {
    const p = normalizeState({ months: { '2026-01': { incomes: [{ name: 'x', amount: 5 }], expenses: [{ category: 'Housing', planned: 1, actual: 0 }] } } });
    expect(p.months['2026-01'].recActuals).toEqual({});
    // legacy expense without a name adopts its category as the name
    expect(p.months['2026-01'].expenses[0].name).toBe('Housing');
    expect(p.months['2026-01'].incomes[0].cur).toBe('KZT');
    // default currency rates present
    expect(p.rates.USD).toBeGreaterThan(0);
  });

  it('defaults assets to liquid and recurring income category to Income', () => {
    const p = normalizeState({
      assets: [{ id: 'a', name: 'Cash', kind: 'asset', value: 1, cur: 'KZT' }],
      recurring: [{ id: 'r', name: 'Salary', type: 'income', amount: 1, cur: 'KZT', start: '2026-01', end: null }],
    });
    expect(p.assets[0].liquid).toBe(true);
    expect(p.recurring[0].category).toBe('Income');
  });

  it('returns a fresh empty state for junk input', () => {
    const p = normalizeState(null);
    expect(p).toMatchObject({ months: {}, recurring: [], goals: [], assets: [] });
  });

  it('emptyState is a valid blank planner', () => {
    expect(emptyState().tourDone).toBe(false);
  });
});

describe('looksLikePlannerData', () => {
  it('accepts anything with a planner collection', () => {
    expect(looksLikePlannerData({ months: {} })).toBe(true);
    expect(looksLikePlannerData({ goals: [] })).toBe(true);
  });
  it('rejects non-planner objects', () => {
    expect(looksLikePlannerData({ foo: 1 })).toBe(false);
    expect(looksLikePlannerData(null)).toBe(false);
    expect(looksLikePlannerData('hi')).toBe(false);
  });
});

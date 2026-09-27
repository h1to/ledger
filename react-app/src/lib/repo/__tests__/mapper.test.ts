import { describe, it, expect } from 'vitest';
import { makeState } from '../../../test/factory';
import { stateToRowSet, rowSetToState } from '../mapper';
import { diffRowSets, isEmptyDiff, diffColl } from '../diff';
import { emptyRowSet } from '../rows';
import type { PlannerState } from '../../../types';

function rich(): PlannerState {
  return makeState({
    lastModified: 1234,
    recurring: [
      { id: 'r1', name: 'Rent', type: 'expense', category: 'Housing', amount: 200000, cur: 'KZT', start: '2026-01', end: null },
      { id: 'r2', name: 'Salary', type: 'income', category: 'Income', amount: 2000, cur: 'USD', start: '2026-01', end: '2026-12' },
    ],
    goals: [
      { id: 'g1', name: 'Apartment', target: 5000000, deadline: '2027-06', contribs: { '2026-07': 100000, '2026-08': 50000 } },
      { id: 'g2', name: 'Trip', target: 300000, deadline: null, contribs: {} },
    ],
    assets: [
      { id: 'a1', name: 'Deposit', kind: 'asset', value: 1000000, cur: 'KZT', liquid: true },
      { id: 'a2', name: 'Apartment', kind: 'asset', value: 5000000, cur: 'KZT', liquid: false },
      { id: 'a3', name: 'Loan', kind: 'liability', value: 300, cur: 'USD', liquid: true },
    ],
    months: {
      '2026-08': {
        incomes: [{ id: 'i1', name: 'Freelance', amount: 500, cur: 'USD' }],
        expenses: [{ id: 'e1', name: 'Food', category: 'Groceries', planned: 150000, actual: 120000, cur: 'KZT' }],
        recActuals: { r1: 210000 },
      },
      '2026-05': { incomes: [], expenses: [{ id: 'e2', name: 'Old', category: 'Other', planned: 50000, actual: 60000, cur: 'KZT' }], recActuals: {}, closed: true, leftover: 40000 },
      '2026-09': { incomes: [], expenses: [], recActuals: {} }, // opened-but-empty month survives
    },
  });
}

describe('mapper round-trip', () => {
  it('rowSetToState(stateToRowSet(x)) deep-equals x', () => {
    const s = rich();
    expect(rowSetToState(stateToRowSet(s))).toEqual(s);
  });

  it('empty state round-trips', () => {
    const s = makeState();
    expect(rowSetToState(stateToRowSet(s))).toEqual(s);
  });

  it('normalizes rows into the expected tables', () => {
    const rs = stateToRowSet(rich());
    expect(Object.keys(rs.months).sort()).toEqual(['2026-05', '2026-08', '2026-09']);
    expect(rs.incomes['i1']).toMatchObject({ monthKey: '2026-08', amount: 500, cur: 'USD' });
    expect(rs.recActuals['2026-08|r1']).toMatchObject({ recurringId: 'r1', amount: 210000 });
    expect(rs.contributions['g1|2026-08']).toMatchObject({ goalId: 'g1', monthKey: '2026-08', amount: 50000 });
    expect(rs.months['2026-05']).toEqual({ closed: true, leftover: 40000 });
  });
});

describe('diff engine', () => {
  it('a state equal to itself has an empty diff', () => {
    const rs = stateToRowSet(rich());
    expect(isEmptyDiff(diffRowSets(rs, rs))).toBe(true);
  });

  it('first push from empty upserts everything, deletes nothing', () => {
    const d = diffRowSets(emptyRowSet(), stateToRowSet(rich()));
    expect(d.settings).not.toBeNull();
    expect(Object.keys(d.incomes.upserts)).toContain('i1');
    expect(d.incomes.deletes).toEqual([]);
    expect(Object.keys(d.assets.upserts).length).toBe(3);
  });

  it('detects a single edited field as one upsert', () => {
    const a = stateToRowSet(rich());
    const bState = rich();
    bState.months['2026-08'].expenses[0].actual = 999;
    const d = diffRowSets(a, stateToRowSet(bState));
    expect(Object.keys(d.expenses.upserts)).toEqual(['e1']);
    expect(d.expenses.deletes).toEqual([]);
    expect(isEmptyDiff(d)).toBe(false);
  });

  it('detects deletions', () => {
    const a = stateToRowSet(rich());
    const bState = rich();
    bState.assets = bState.assets.filter((x) => x.id !== 'a2');
    const d = diffRowSets(a, stateToRowSet(bState));
    expect(d.assets.deletes).toEqual(['a2']);
    expect(Object.keys(d.assets.upserts)).toEqual([]);
  });

  it('diffColl treats reordered identical rows as unchanged', () => {
    const c = diffColl({ x: { a: 1, b: 2 } }, { x: { a: 1, b: 2 } });
    expect(c.upserts).toEqual({});
    expect(c.deletes).toEqual([]);
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { recommendations, suggestedExtra } from '../recommend';
import { makeState } from '../../../test/factory';
import type { Loan } from '../../../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const loan = (over: Partial<Loan>): Loan => ({
  id: 'l', name: 'L', bank: 'Halyk', payment: 60000, cur: 'KZT', start: '2026-09', end: '2028-09',
  rate: 20, overpayment: null, debt: 800000, contract: null, kind: null, source: 'import', ...over,
});

describe('suggestedExtra', () => {
  it('is 0 with no payable debt, and a rounded positive amount otherwise', () => {
    expect(suggestedExtra(makeState({}))).toBe(0);
    const s = makeState({ loans: [loan({ id: 'a' })] });
    const x = suggestedExtra(s);
    expect(x).toBeGreaterThanOrEqual(10000);
    expect(x % 10000).toBe(0);
  });
});

describe('recommendations', () => {
  it('surfaces an extra-to-debt action and ranks by impact', () => {
    const s = makeState({
      loans: [loan({ id: 'a' }), loan({ id: 'b', debt: 300000, payment: 0 })], // one payable, one without a payment
    });
    const recs = recommendations(s);
    const kinds = recs.map((r) => r.kind);
    expect(kinds).toContain('extraToDebt');
    expect(kinds).toContain('setLoanPayment');
    // sorted by impact descending
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].impact).toBeGreaterThanOrEqual(recs[i].impact);
    // setLoanPayment (90) ranks above extraToDebt (72)
    expect(kinds.indexOf('setLoanPayment')).toBeLessThan(kinds.indexOf('extraToDebt'));
  });

  it('returns nothing to do for an empty planner', () => {
    expect(recommendations(makeState({}))).toEqual([]);
  });
});

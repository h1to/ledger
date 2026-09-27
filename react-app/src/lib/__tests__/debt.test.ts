import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { debtSummary, loanCurrentDebt, loanPayoffMonths, bankKey } from '../debt';
import { makeState } from '../../test/factory';
import type { Loan } from '../../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

const base = { start: '2026-09', end: '2026-09', rate: null, overpayment: null, contract: null, kind: null, source: 'import' as const };

function imported(id: string, bank: string, debt: number, payment: number, cur: Loan['cur'] = 'KZT'): Loan {
  return { id, name: id, bank, debt, payment, cur, ...base };
}

describe('per-loan debt helpers', () => {
  it('uses the imported debt figure and derives payoff months from it', () => {
    const l = imported('a', 'Halyk', 100000, 20000);
    expect(loanCurrentDebt(l)).toBe(100000);
    expect(loanPayoffMonths(l)).toBe(5); // ceil(100000 / 20000)
  });
  it('returns null payoff when no payment is set yet', () => {
    expect(loanPayoffMonths(imported('a', 'Halyk', 100000, 0))).toBeNull();
  });
  it('rounds partial final month up', () => {
    expect(loanPayoffMonths(imported('a', 'Halyk', 100000, 30000))).toBe(4); // ceil(3.33)
  });
  it('buckets a bankless loan under Other', () => {
    expect(bankKey({ ...imported('a', '', 1, 0), bank: null })).toBe('Other');
  });
});

describe('debtSummary', () => {
  it('totals debt, monthly repayment and payoff, grouped by bank', () => {
    const s = makeState({
      baseCur: 'KZT',
      loans: [
        imported('h1', 'Halyk', 200000, 50000),
        imported('h2', 'Halyk', 100000, 0), // no payment yet
        imported('k1', 'Kaspi', 300000, 60000),
      ],
    });
    const d = debtSummary(s);
    expect(d.totalDebt).toBe(600000);
    expect(d.monthlyTotal).toBe(110000); // 50000 + 60000 (h2 has none)
    expect(d.loansWithoutPayment).toBe(1);
    // payoff: Halyk max(ceil(200000/50000)=4) , Kaspi ceil(300000/60000)=5 → overall 5
    expect(d.payoffMonths).toBe(5);

    const halyk = d.byBank.find((b) => b.bank === 'Halyk')!;
    const kaspi = d.byBank.find((b) => b.bank === 'Kaspi')!;
    expect(halyk.debt).toBe(300000);
    expect(halyk.monthly).toBe(50000);
    expect(halyk.count).toBe(2);
    expect(kaspi.debt).toBe(300000);
    // byBank sorted by debt desc → ties keep both; both 300000
    expect(d.byBank).toHaveLength(2);
  });

  it('converts foreign-currency debt to the base currency', () => {
    const s = makeState({ baseCur: 'KZT', rates: { USD: 500 }, loans: [imported('u', 'Kaspi', 100, 0, 'USD')] });
    expect(debtSummary(s).totalDebt).toBe(50000); // 100 USD * 500
  });
});

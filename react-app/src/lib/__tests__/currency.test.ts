import { describe, it, expect } from 'vitest';
import { defaultRate, rebaseRates } from '../currency';
import { normalizeState } from '../migrate';
import { netWorth } from '../money';
import { makeState } from '../../test/factory';

describe('defaultRate', () => {
  it('is 1 for a currency against itself and a cross-rate otherwise', () => {
    expect(defaultRate('KZT', 'KZT')).toBe(1);
    expect(defaultRate('USD', 'KZT')).toBe(540); // 540 KZT per USD
    expect(defaultRate('KZT', 'USD')).toBeCloseTo(1 / 540, 8);
    expect(defaultRate('EUR', 'USD')).toBeCloseTo(590 / 540, 8);
  });
});

describe('normalizeState base currency', () => {
  it('defaults to KZT and fills every non-base rate', () => {
    const s = normalizeState({ months: {} });
    expect(s.baseCur).toBe('KZT');
    expect(s.rates.USD).toBe(540);
    expect(s.rates.KZT).toBeUndefined(); // base is never stored in rates
  });
  it('rejects an invalid base and seeds cross-rates for a valid one', () => {
    expect(normalizeState({ baseCur: 'XXX' }).baseCur).toBe('KZT');
    const s = normalizeState({ baseCur: 'USD' });
    expect(s.baseCur).toBe('USD');
    expect(s.rates.USD).toBeUndefined();
    expect(s.rates.KZT).toBeCloseTo(1 / 540, 8);
  });
});

describe('rebaseRates', () => {
  it('re-expresses rates + base-denominated figures and preserves real net worth', () => {
    const s = makeState({
      baseCur: 'KZT',
      assets: [{ id: 'a1', name: 'Dep', kind: 'asset', value: 1000, cur: 'USD', liquid: true }], // 540000 KZT
      goals: [{ id: 'g1', name: 'G', target: 5000000, deadline: null, contribs: { '2026-08': 540000 } }],
      months: { '2026-05': { incomes: [], expenses: [], recActuals: {}, closed: true, leftover: 54000 } },
    });
    const nwKzt = netWorth(s); // 540000 + 540000 + 54000

    rebaseRates(s, 'USD');

    expect(s.baseCur).toBe('USD');
    expect(s.rates.USD).toBeUndefined();
    expect(s.rates.KZT).toBeCloseTo(1 / 540, 8);
    expect(s.goals[0].contribs['2026-08']).toBeCloseTo(1000, 6); // 540000 KZT → 1000 USD
    expect(s.months['2026-05'].leftover).toBeCloseTo(100, 6); // 54000 KZT → 100 USD
    expect(netWorth(s)).toBeCloseTo(nwKzt / 540, 4); // same real value, expressed in USD
  });

  it('round-trips back to the original base', () => {
    const s = makeState({ goals: [{ id: 'g', name: 'G', target: 1, deadline: null, contribs: { '2026-08': 540000 } }] });
    rebaseRates(s, 'USD');
    rebaseRates(s, 'KZT');
    expect(s.baseCur).toBe('KZT');
    expect(s.goals[0].contribs['2026-08']).toBeCloseTo(540000, 3);
  });
});

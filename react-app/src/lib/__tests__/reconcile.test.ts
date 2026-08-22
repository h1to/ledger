import { describe, it, expect } from 'vitest';
import { stateForCompare } from '../reconcile';
import { makeState } from '../../test/factory';

describe('stateForCompare', () => {
  it('ignores lastModified', () => {
    const a = makeState({ lastModified: 1 });
    const b = makeState({ lastModified: 999999 });
    expect(stateForCompare(a)).toBe(stateForCompare(b));
  });

  it('is stable under object key reordering (jsonb re-sorts keys)', () => {
    const a = makeState({ months: { '2026-01': { incomes: [], expenses: [], recActuals: {}, closed: true, leftover: 5 } } });
    const b = makeState({ months: { '2026-01': { leftover: 5, closed: true, recActuals: {}, expenses: [], incomes: [] } } });
    expect(stateForCompare(a)).toBe(stateForCompare(b));
  });

  it('detects a real content difference', () => {
    const a = makeState({ goals: [{ id: 'g', name: 'A', target: 1, deadline: null, contribs: {} }] });
    const b = makeState({ goals: [{ id: 'g', name: 'B', target: 1, deadline: null, contribs: {} }] });
    expect(stateForCompare(a)).not.toBe(stateForCompare(b));
  });
});

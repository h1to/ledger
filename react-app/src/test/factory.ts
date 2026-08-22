import type { PlannerState } from '../types';
import { emptyState } from '../lib/migrate';

/** Build a planner state for tests, merging overrides onto a sane base. */
export function makeState(overrides: Partial<PlannerState> = {}): PlannerState {
  const base = emptyState();
  base.rates = { USD: 540, EUR: 590, RUB: 6.7, GBP: 680, TRY: 13 };
  base.ratesUpdated = Date.now();
  base.year = 2026;
  return { ...base, ...overrides };
}

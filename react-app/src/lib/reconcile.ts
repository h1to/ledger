import type { PlannerState } from '../types';

/** Recursively sort object keys so JSON comparison is stable (jsonb re-sorts keys). */
export function canonical(o: unknown): unknown {
  if (Array.isArray(o)) return o.map(canonical);
  if (o && typeof o === 'object') {
    const out: Record<string, unknown> = {};
    Object.keys(o as Record<string, unknown>)
      .sort()
      .forEach((k) => {
        out[k] = canonical((o as Record<string, unknown>)[k]);
      });
    return out;
  }
  return o;
}

/**
 * Canonical JSON of a state with `lastModified` removed, for equality checks.
 * jsonb re-sorts object keys, so a naive JSON.stringify comparison always
 * reports a difference and causes a sync loop — this fixes that.
 */
export function stateForCompare(o: PlannerState): string {
  const c = canonical(JSON.parse(JSON.stringify(o))) as Record<string, unknown>;
  delete c.lastModified;
  return JSON.stringify(c);
}

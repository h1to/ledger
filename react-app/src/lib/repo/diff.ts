import type { RowSet, SettingsRow } from './rows';

export interface CollDiff<T> {
  upserts: Record<string, T>;
  deletes: string[];
}

function eq<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Rows present-and-changed in `next` → upserts; rows gone from `next` → deletes. */
export function diffColl<T>(prev: Record<string, T>, next: Record<string, T>): CollDiff<T> {
  const upserts: Record<string, T> = {};
  const deletes: string[] = [];
  for (const k of Object.keys(next)) {
    if (!(k in prev) || !eq(prev[k], next[k])) upserts[k] = next[k];
  }
  for (const k of Object.keys(prev)) {
    if (!(k in next)) deletes.push(k);
  }
  return { upserts, deletes };
}

export interface RowSetDiff {
  settings: SettingsRow | null; // non-null when changed
  rates: CollDiff<RowSet['rates'][string]>;
  months: CollDiff<RowSet['months'][string]>;
  incomes: CollDiff<RowSet['incomes'][string]>;
  expenses: CollDiff<RowSet['expenses'][string]>;
  recActuals: CollDiff<RowSet['recActuals'][string]>;
  recurring: CollDiff<RowSet['recurring'][string]>;
  goals: CollDiff<RowSet['goals'][string]>;
  contributions: CollDiff<RowSet['contributions'][string]>;
  assets: CollDiff<RowSet['assets'][string]>;
}

/** Compute the operations needed to bring the DB from `prev` (last synced) to `next` (current). */
export function diffRowSets(prev: RowSet, next: RowSet): RowSetDiff {
  return {
    settings: eq(prev.settings, next.settings) ? null : next.settings,
    rates: diffColl(prev.rates, next.rates),
    months: diffColl(prev.months, next.months),
    incomes: diffColl(prev.incomes, next.incomes),
    expenses: diffColl(prev.expenses, next.expenses),
    recActuals: diffColl(prev.recActuals, next.recActuals),
    recurring: diffColl(prev.recurring, next.recurring),
    goals: diffColl(prev.goals, next.goals),
    contributions: diffColl(prev.contributions, next.contributions),
    assets: diffColl(prev.assets, next.assets),
  };
}

const collEmpty = (c: CollDiff<unknown>) => Object.keys(c.upserts).length === 0 && c.deletes.length === 0;

export function isEmptyDiff(d: RowSetDiff): boolean {
  return (
    d.settings === null &&
    collEmpty(d.rates) &&
    collEmpty(d.months) &&
    collEmpty(d.incomes) &&
    collEmpty(d.expenses) &&
    collEmpty(d.recActuals) &&
    collEmpty(d.recurring) &&
    collEmpty(d.goals) &&
    collEmpty(d.contributions) &&
    collEmpty(d.assets)
  );
}

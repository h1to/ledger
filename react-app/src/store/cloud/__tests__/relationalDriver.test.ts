import { describe, it, expect, beforeEach } from 'vitest';
import { createRelationalDriver } from '../relationalDriver';
import { makeState } from '../../../test/factory';
import type { PlannerState } from '../../../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** In-memory fake of the subset of the Supabase/PostgREST query API the driver uses. */
class FakeSupabase {
  tables = new Map<string, any[]>();
  upsertCalls: Record<string, number> = {};
  from(table: string) {
    return new QB(table, this);
  }
  rows(table: string) {
    return this.tables.get(table) || [];
  }
}
class QB {
  private op: 'select' | 'delete' | 'upsert' = 'select';
  private filters: [string, any][] = [];
  private inFilter: [string, any[]] | null = null;
  constructor(private table: string, private db: FakeSupabase) {}
  select() {
    this.op = 'select';
    return this;
  }
  eq(col: string, val: any) {
    this.filters.push([col, val]);
    return this;
  }
  in(col: string, vals: any[]) {
    this.inFilter = [col, vals];
    return this;
  }
  private match(): any[] {
    let rows = this.db.tables.get(this.table) || [];
    rows = rows.filter((r) => this.filters.every(([c, v]) => r[c] === v));
    if (this.inFilter) {
      const [c, vals] = this.inFilter;
      rows = rows.filter((r) => vals.includes(r[c]));
    }
    return rows;
  }
  maybeSingle() {
    return Promise.resolve({ data: this.match()[0] || null, error: null });
  }
  upsert(rows: any | any[], opts?: { onConflict?: string }) {
    this.db.upsertCalls[this.table] = (this.db.upsertCalls[this.table] || 0) + 1;
    const keys = (opts?.onConflict || 'id').split(',');
    const arr = this.db.tables.get(this.table) || [];
    (Array.isArray(rows) ? rows : [rows]).forEach((nr) => {
      const idx = arr.findIndex((er) => keys.every((k) => er[k] === nr[k]));
      if (idx >= 0) arr[idx] = { ...arr[idx], ...nr };
      else arr.push({ ...nr });
    });
    this.db.tables.set(this.table, arr);
    return Promise.resolve({ error: null });
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  // thenable: awaiting the builder runs a select (returns rows) or a delete (mutates)
  then(resolve: (v: { data: any[]; error: null }) => any) {
    if (this.op === 'delete') {
      const toDel = new Set(this.match());
      this.db.tables.set(this.table, (this.db.tables.get(this.table) || []).filter((r) => !toDel.has(r)));
      return Promise.resolve({ data: [], error: null }).then(resolve);
    }
    return Promise.resolve({ data: this.match(), error: null }).then(resolve);
  }
}

function seed(): PlannerState {
  return makeState({
    ratesUpdated: 111,
    lastModified: 222,
    recurring: [{ id: 'r1', name: 'Rent', type: 'expense', category: 'Housing', amount: 200000, cur: 'KZT', start: '2026-01', end: null }],
    goals: [{ id: 'g1', name: 'Apartment', target: 5000000, deadline: '2027-06', contribs: { '2026-08': 50000 } }],
    assets: [
      { id: 'a1', name: 'Deposit', kind: 'asset', value: 1000000, cur: 'KZT', liquid: true },
      { id: 'a2', name: 'Apartment', kind: 'asset', value: 5000000, cur: 'KZT', liquid: false },
    ],
    months: {
      '2026-08': { incomes: [{ id: 'i1', name: 'Freelance', amount: 500, cur: 'USD' }], expenses: [{ id: 'e1', name: 'Food', category: 'Groceries', planned: 150000, actual: 120000, cur: 'KZT' }], recActuals: { r1: 210000 } },
      '2026-05': { incomes: [], expenses: [], recActuals: {}, closed: true, leftover: 40000 },
    },
  });
}

let db: FakeSupabase;
let driver: ReturnType<typeof createRelationalDriver>;
beforeEach(() => {
  db = new FakeSupabase();
  driver = createRelationalDriver(db as any);
});

describe('relational driver', () => {
  it('returns null for an empty cloud', async () => {
    expect(await driver.load('u1')).toBeNull();
  });

  it('save then load round-trips the full state through relational rows', async () => {
    const s = seed();
    await driver.save('u1', s);
    // rows really landed in separate tables
    expect(db.rows('incomes').length).toBe(1);
    expect(db.rows('expenses').length).toBe(1);
    expect(db.rows('rec_actuals')[0]).toMatchObject({ month_key: '2026-08', recurring_id: 'r1', amount: 210000 });
    expect(db.rows('contributions')[0]).toMatchObject({ goal_id: 'g1', month_key: '2026-08', amount: 50000 });
    expect(db.rows('assets').length).toBe(2);

    const loaded = await driver.load('u1');
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toEqual(s);
  });

  it('a second save only upserts the tables that changed (minimal diff)', async () => {
    const s = seed();
    await driver.save('u1', s);
    db.upsertCalls = {};

    const s2 = JSON.parse(JSON.stringify(s)) as PlannerState;
    s2.months['2026-08'].expenses[0].actual = 999;
    s2.lastModified = 333;
    await driver.save('u1', s2);

    expect(db.upsertCalls['expenses']).toBe(1); // the edited expense
    expect(db.upsertCalls['settings']).toBe(1); // lastModified changed
    expect(db.upsertCalls['incomes']).toBeUndefined(); // untouched
    expect(db.upsertCalls['assets']).toBeUndefined();
    expect(db.rows('expenses')[0].actual).toBe(999);
  });

  it('propagates deletions to the DB', async () => {
    const s = seed();
    await driver.save('u1', s);
    const s2 = JSON.parse(JSON.stringify(s)) as PlannerState;
    s2.assets = s2.assets.filter((a) => a.id !== 'a2');
    delete s2.months['2026-08'].recActuals['r1'];
    await driver.save('u1', s2);
    expect(db.rows('assets').map((a) => a.id)).toEqual(['a1']);
    expect(db.rows('rec_actuals').length).toBe(0);
  });

  it('migrates a legacy jsonb blob into relational rows on first load', async () => {
    const blob = seed();
    db.tables.set('planner_data', [{ user_id: 'u1', data: blob, updated_at: '2026-08-01T00:00:00Z' }]);

    const loaded = await driver.load('u1');
    expect(loaded).not.toBeNull();
    expect(loaded!.state).toEqual(blob);
    // the blob was unpacked into real rows
    expect(db.rows('incomes').length).toBe(1);
    expect(db.rows('goals').length).toBe(1);
    expect(db.rows('assets').length).toBe(2);
  });
});

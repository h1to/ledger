import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- controllable fake Supabase ----
const cloud: { row: { data: unknown; updated_at: string } | null } = { row: null };
let upserts = 0;

vi.mock('@supabase/supabase-js', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve({ data: cloud.row, error: null }),
    upsert: (rec: { data: unknown; updated_at: string }) => {
      upserts++;
      cloud.row = { data: JSON.parse(JSON.stringify(rec.data)), updated_at: rec.updated_at };
      return Promise.resolve({ error: null });
    },
    insert: () => Promise.resolve({ error: null }),
  };
  return {
    createClient: () => ({
      from: () => builder,
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        getSession: () => Promise.resolve({ data: { session: null } }),
      },
    }),
  };
});

import { useStore } from '../useStore';
import { pullRemote, pushRemote, __resetSyncStateForTests } from '../sync';
import { emptyState } from '../../lib/migrate';

function localMonths() {
  return Object.keys(useStore.getState().state.months).sort();
}
function cloudMonths() {
  const d = cloud.row?.data as { months?: Record<string, unknown> } | undefined;
  return d?.months ? Object.keys(d.months).sort() : [];
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const M = () => ({ incomes: [], expenses: [], recActuals: {} });

beforeEach(() => {
  cloud.row = null;
  upserts = 0;
  localStorage.clear();
  useStore.setState({ state: emptyState(), user: { id: 'u1', email: 'a@b.c' }, appStarted: true, tour: { active: false, index: 0 } });
  __resetSyncStateForTests(); // wires push hook + initialises the mocked client (no session fetch)
});

describe('sync reconciliation (startup-race fix)', () => {
  it('a stale device does not overwrite a newer cloud copy', async () => {
    // CLOUD holds the newer copy
    cloud.row = { data: { ...emptyState(), months: { '2026-09': { incomes: [], expenses: [], recActuals: {} } }, lastModified: 2000 }, updated_at: new Date(2000).toISOString() };
    // LOCAL is stale
    useStore.setState({ state: { ...emptyState(), months: { '2026-01': { incomes: [], expenses: [], recActuals: {} } }, lastModified: 1000 } });

    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();

    expect(localMonths()).toEqual(['2026-09']); // cloud won
    expect(cloudMonths()).toEqual(['2026-09']); // stale local was NOT pushed
  });

  it('blocks pushes before the first reconcile (push gate)', async () => {
    cloud.row = { data: { ...emptyState(), months: { '2026-09': M() }, lastModified: 2000 }, updated_at: '' };
    useStore.setState({ state: { ...emptyState(), months: { '2026-01': M() }, lastModified: 1000 } });
    // simulate a background save's push firing during the boot window (before any pull)
    pushRemote();
    await tick();
    expect(upserts).toBe(0);
    expect(cloudMonths()).toEqual(['2026-09']);
  });

  it('a genuinely newer local edit wins and is pushed', async () => {
    cloud.row = { data: { ...emptyState(), months: { '2026-09': M() }, lastModified: 2000 }, updated_at: '' };
    useStore.setState({ state: { ...emptyState(), months: { '2026-12': M() }, lastModified: 3000 } });

    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();

    expect(cloudMonths()).toEqual(['2026-12']);
    expect(localMonths()).toEqual(['2026-12']);
  });
});

describe('store primitives', () => {
  it('commit bumps lastModified, persists, and triggers a push after reconcile', async () => {
    // reconcile once so pushes are allowed
    cloud.row = { data: emptyState(), updated_at: '' };
    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();
    upserts = 0;

    useStore.getState().commit((s) => {
      s.goals.push({ id: 'g', name: 'X', target: 1, deadline: null, contribs: {} });
    });
    expect(useStore.getState().state.lastModified).toBeGreaterThan(0);
    // localStorage was written
    expect(localStorage.getItem('ledger_planner_v1::u1')).toContain('"name":"X"');
    await new Promise((r) => setTimeout(r, 1600)); // debounced push
    expect(upserts).toBeGreaterThan(0);
  });

  it('openMonth creates the month and switches view', () => {
    useStore.setState({ state: emptyState(), view: 'dashboard', openMonthKey: null });
    useStore.getState().openMonth('2027-03');
    expect(useStore.getState().view).toBe('month');
    expect(useStore.getState().openMonthKey).toBe('2027-03');
    expect(useStore.getState().state.months['2027-03']).toBeTruthy();
  });
});

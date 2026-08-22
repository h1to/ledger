import { describe, it, expect, beforeEach, vi } from 'vitest';

// Minimal supabase mock so initSupabase() doesn't throw. Pull/push go through the injected
// fake driver below, so the client's query methods are never exercised here.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({}),
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: null } }),
    },
  }),
}));

import { useStore } from '../useStore';
import { pullRemote, pushRemote, __resetSyncStateForTests, __setDriverForTests } from '../sync';
import { emptyState } from '../../lib/migrate';
import type { CloudDriver } from '../cloud/driver';
import type { PlannerState } from '../../types';

const M = () => ({ incomes: [], expenses: [], recActuals: {} });
const withMonths = (months: PlannerState['months'], lastModified: number): PlannerState => ({ ...emptyState(), months, lastModified });

// ---- in-memory fake cloud driver ----
let cloudState: PlannerState | null = null;
let saveCount = 0;
const fakeDriver: CloudDriver = {
  load: async () => (cloudState ? { state: JSON.parse(JSON.stringify(cloudState)), updatedAt: null } : null),
  save: async (_uid, st) => {
    saveCount++;
    cloudState = JSON.parse(JSON.stringify(st));
  },
};

const localMonths = () => Object.keys(useStore.getState().state.months).sort();
const cloudMonths = () => (cloudState ? Object.keys(cloudState.months).sort() : []);
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  cloudState = null;
  saveCount = 0;
  localStorage.clear();
  useStore.setState({ state: emptyState(), user: { id: 'u1', email: 'a@b.c' }, appStarted: true, tour: { active: false, index: 0 } });
  __resetSyncStateForTests();
  __setDriverForTests(fakeDriver);
});

describe('sync reconciliation (driver-agnostic; startup-race fix)', () => {
  it('a stale device does not overwrite a newer cloud copy', async () => {
    cloudState = withMonths({ '2026-09': M() }, 2000);
    useStore.setState({ state: withMonths({ '2026-01': M() }, 1000) });

    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();

    expect(localMonths()).toEqual(['2026-09']); // cloud won
    expect(cloudMonths()).toEqual(['2026-09']); // cloud untouched
    expect(saveCount).toBe(0); // stale local was NOT pushed
  });

  it('blocks pushes before the first reconcile (push gate)', async () => {
    cloudState = withMonths({ '2026-09': M() }, 2000);
    useStore.setState({ state: withMonths({ '2026-01': M() }, 1000) });
    pushRemote(); // background save's push firing before any pull
    await tick();
    expect(saveCount).toBe(0);
    expect(cloudMonths()).toEqual(['2026-09']);
  });

  it('a genuinely newer local edit wins and is pushed', async () => {
    cloudState = withMonths({ '2026-09': M() }, 2000);
    useStore.setState({ state: withMonths({ '2026-12': M() }, 3000) });

    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();

    expect(cloudMonths()).toEqual(['2026-12']);
    expect(localMonths()).toEqual(['2026-12']);
    expect(saveCount).toBe(1);
  });

  it('seeds an empty cloud from local', async () => {
    cloudState = null;
    useStore.setState({ state: withMonths({ '2026-03': M() }, 5) });
    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();
    expect(cloudMonths()).toEqual(['2026-03']);
  });
});

describe('store primitives', () => {
  it('commit persists locally and triggers a push after reconcile', async () => {
    cloudState = emptyState();
    await new Promise<void>((resolve) => pullRemote(resolve));
    await tick();
    saveCount = 0;

    useStore.getState().commit((st) => {
      st.goals.push({ id: 'g', name: 'X', target: 1, deadline: null, contribs: {} });
    });
    expect(useStore.getState().state.lastModified).toBeGreaterThan(0);
    expect(localStorage.getItem('ledger_planner_v1::u1')).toContain('"name":"X"');
    await new Promise((r) => setTimeout(r, 1600)); // debounced push
    expect(saveCount).toBeGreaterThan(0);
    expect(cloudState?.goals[0]?.name).toBe('X');
  });

  it('openMonth creates the month and switches view', () => {
    useStore.setState({ state: emptyState(), view: 'dashboard', openMonthKey: null });
    useStore.getState().openMonth('2027-03');
    expect(useStore.getState().view).toBe('month');
    expect(useStore.getState().openMonthKey).toBe('2027-03');
    expect(useStore.getState().state.months['2027-03']).toBeTruthy();
  });
});

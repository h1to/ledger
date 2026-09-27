import type { SupabaseClient } from '@supabase/supabase-js';
import type { CloudDriver } from './driver';
import type { PlannerState } from '../../types';
import { normalizeState } from '../../lib/migrate';
import { stateToRowSet, rowSetToState } from '../../lib/repo/mapper';
import { type RowSet, emptyRowSet, recActualKey, contributionKey } from '../../lib/repo/rows';
import { diffRowSets, isEmptyDiff, type RowSetDiff } from '../../lib/repo/diff';

/* eslint-disable @typescript-eslint/no-explicit-any */

const num = (v: any): number => Number(v) || 0;

/**
 * Normalized strategy: the state is spread across relational tables. Load assembles a
 * RowSet from all tables; save computes a minimal diff against the last-synced snapshot
 * (shadow) and applies only the changed/deleted rows. Existing users with a legacy
 * `planner_data` jsonb blob are migrated into rows on first load.
 */
export function createRelationalDriver(sb: SupabaseClient): CloudDriver {
  let shadow: RowSet = emptyRowSet();

  async function fetchRowSet(userId: string): Promise<{ rs: RowSet; updatedAt: string | null; any: boolean } | null> {
    const q = (t: string, cols = '*') => sb.from(t).select(cols).eq('user_id', userId);
    const [settings, rates, months, incomes, expenses, recActuals, recurring, loans, goals, contributions, assets] = await Promise.all([
      sb.from('settings').select('*').eq('user_id', userId).maybeSingle(),
      q('currency_rates'), q('months'), q('incomes'), q('expenses'), q('rec_actuals'),
      q('recurring'), q('loans'), q('goals'), q('contributions'), q('assets'),
    ]);
    for (const r of [settings, rates, months, incomes, expenses, recActuals, recurring, loans, goals, contributions, assets]) {
      if ((r as any).error) throw new Error((r as any).error.message);
    }
    const rs = emptyRowSet();
    const s = settings.data as any;
    let any = false;
    if (s) {
      any = true;
      rs.settings = { year: num(s.year) || new Date().getFullYear(), baseCur: s.base_cur || 'KZT', ratesUpdated: s.rates_updated != null ? num(s.rates_updated) : null, tourDone: !!s.tour_done, lastModified: s.last_modified != null ? num(s.last_modified) : null };
    }
    (rates.data as any[]).forEach((r) => { rs.rates[r.currency] = num(r.rate); any = true; });
    (months.data as any[]).forEach((r) => { rs.months[r.month_key] = { closed: !!r.closed, leftover: r.leftover != null ? num(r.leftover) : null }; any = true; });
    (incomes.data as any[]).forEach((r) => { rs.incomes[r.id] = { monthKey: r.month_key, name: r.name ?? '', amount: num(r.amount), cur: r.cur }; any = true; });
    (expenses.data as any[]).forEach((r) => { rs.expenses[r.id] = { monthKey: r.month_key, name: r.name ?? '', category: r.category ?? 'Other', planned: num(r.planned), actual: num(r.actual), cur: r.cur }; any = true; });
    (recActuals.data as any[]).forEach((r) => { rs.recActuals[recActualKey(r.month_key, r.recurring_id)] = { monthKey: r.month_key, recurringId: r.recurring_id, amount: num(r.amount) }; any = true; });
    (recurring.data as any[]).forEach((r) => { rs.recurring[r.id] = { name: r.name ?? '', type: r.type, category: r.category ?? 'Other', amount: num(r.amount), cur: r.cur, startKey: r.start_key, endKey: r.end_key ?? null }; any = true; });
    (loans.data as any[]).forEach((r) => { rs.loans[r.id] = { name: r.name ?? '', payment: num(r.payment), cur: r.cur, startKey: r.start_key, endKey: r.end_key, rate: r.rate != null ? num(r.rate) : null, overpayment: r.overpayment != null ? num(r.overpayment) : null, bank: r.bank ?? null, debt: r.debt != null ? num(r.debt) : null, contract: r.contract ?? null, kind: r.kind ?? null, source: r.source === 'import' ? 'import' : 'manual' }; any = true; });
    (goals.data as any[]).forEach((r) => { rs.goals[r.id] = { name: r.name ?? '', target: num(r.target), deadlineKey: r.deadline_key ?? null }; any = true; });
    (contributions.data as any[]).forEach((r) => { rs.contributions[contributionKey(r.goal_id, r.month_key)] = { goalId: r.goal_id, monthKey: r.month_key, amount: num(r.amount) }; any = true; });
    (assets.data as any[]).forEach((r) => { rs.assets[r.id] = { name: r.name ?? '', kind: r.kind, value: num(r.value), cur: r.cur, liquid: r.liquid !== false }; any = true; });
    return { rs, updatedAt: s?.updated_at ?? null, any };
  }

  async function applyDiff(userId: string, prev: RowSet, diff: RowSetDiff): Promise<void> {
    const run = async (p: PromiseLike<{ error: { message: string } | null }>) => {
      const res = await p;
      if (res.error) throw new Error(res.error.message);
    };
    const up = (rows: any[]) => rows.length > 0;

    // ----- upserts (parents before children: goals before contributions) -----
    if (diff.settings) await run(sb.from('settings').upsert({ user_id: userId, year: diff.settings.year, base_cur: diff.settings.baseCur, rates_updated: diff.settings.ratesUpdated, tour_done: diff.settings.tourDone, last_modified: diff.settings.lastModified, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));

    let rows: any[];
    rows = Object.keys(diff.rates.upserts).map((c) => ({ user_id: userId, currency: c, rate: diff.rates.upserts[c] }));
    if (up(rows)) await run(sb.from('currency_rates').upsert(rows, { onConflict: 'user_id,currency' }));

    rows = Object.keys(diff.months.upserts).map((k) => ({ user_id: userId, month_key: k, closed: diff.months.upserts[k].closed, leftover: diff.months.upserts[k].leftover }));
    if (up(rows)) await run(sb.from('months').upsert(rows, { onConflict: 'user_id,month_key' }));

    rows = Object.keys(diff.recurring.upserts).map((id) => { const r = diff.recurring.upserts[id]; return { id, user_id: userId, name: r.name, type: r.type, category: r.category, amount: r.amount, cur: r.cur, start_key: r.startKey, end_key: r.endKey }; });
    if (up(rows)) await run(sb.from('recurring').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.loans.upserts).map((id) => { const r = diff.loans.upserts[id]; return { id, user_id: userId, name: r.name, payment: r.payment, cur: r.cur, start_key: r.startKey, end_key: r.endKey, rate: r.rate, overpayment: r.overpayment, bank: r.bank, debt: r.debt, contract: r.contract, kind: r.kind, source: r.source }; });
    if (up(rows)) await run(sb.from('loans').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.goals.upserts).map((id) => { const r = diff.goals.upserts[id]; return { id, user_id: userId, name: r.name, target: r.target, deadline_key: r.deadlineKey }; });
    if (up(rows)) await run(sb.from('goals').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.assets.upserts).map((id) => { const r = diff.assets.upserts[id]; return { id, user_id: userId, name: r.name, kind: r.kind, value: r.value, cur: r.cur, liquid: r.liquid }; });
    if (up(rows)) await run(sb.from('assets').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.incomes.upserts).map((id) => { const r = diff.incomes.upserts[id]; return { id, user_id: userId, month_key: r.monthKey, name: r.name, amount: r.amount, cur: r.cur }; });
    if (up(rows)) await run(sb.from('incomes').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.expenses.upserts).map((id) => { const r = diff.expenses.upserts[id]; return { id, user_id: userId, month_key: r.monthKey, name: r.name, category: r.category, planned: r.planned, actual: r.actual, cur: r.cur }; });
    if (up(rows)) await run(sb.from('expenses').upsert(rows, { onConflict: 'id' }));

    rows = Object.keys(diff.recActuals.upserts).map((k) => { const r = diff.recActuals.upserts[k]; return { user_id: userId, month_key: r.monthKey, recurring_id: r.recurringId, amount: r.amount }; });
    if (up(rows)) await run(sb.from('rec_actuals').upsert(rows, { onConflict: 'user_id,month_key,recurring_id' }));

    rows = Object.keys(diff.contributions.upserts).map((k) => { const r = diff.contributions.upserts[k]; return { user_id: userId, goal_id: r.goalId, month_key: r.monthKey, amount: r.amount }; });
    if (up(rows)) await run(sb.from('contributions').upsert(rows, { onConflict: 'user_id,goal_id,month_key' }));

    // ----- deletes (children before parents) -----
    for (const k of diff.recActuals.deletes) { const r = prev.recActuals[k]; if (r) await run(sb.from('rec_actuals').delete().eq('user_id', userId).eq('month_key', r.monthKey).eq('recurring_id', r.recurringId)); }
    for (const k of diff.contributions.deletes) { const r = prev.contributions[k]; if (r) await run(sb.from('contributions').delete().eq('user_id', userId).eq('goal_id', r.goalId).eq('month_key', r.monthKey)); }
    if (diff.incomes.deletes.length) await run(sb.from('incomes').delete().eq('user_id', userId).in('id', diff.incomes.deletes));
    if (diff.expenses.deletes.length) await run(sb.from('expenses').delete().eq('user_id', userId).in('id', diff.expenses.deletes));
    if (diff.months.deletes.length) await run(sb.from('months').delete().eq('user_id', userId).in('month_key', diff.months.deletes));
    if (diff.recurring.deletes.length) await run(sb.from('recurring').delete().eq('user_id', userId).in('id', diff.recurring.deletes));
    if (diff.loans.deletes.length) await run(sb.from('loans').delete().eq('user_id', userId).in('id', diff.loans.deletes));
    if (diff.goals.deletes.length) await run(sb.from('goals').delete().eq('user_id', userId).in('id', diff.goals.deletes));
    if (diff.assets.deletes.length) await run(sb.from('assets').delete().eq('user_id', userId).in('id', diff.assets.deletes));
    if (diff.rates.deletes.length) await run(sb.from('currency_rates').delete().eq('user_id', userId).in('currency', diff.rates.deletes));
  }

  async function saveState(userId: string, state: PlannerState): Promise<void> {
    const next = stateToRowSet(state);
    const diff = diffRowSets(shadow, next);
    if (!isEmptyDiff(diff)) await applyDiff(userId, shadow, diff);
    shadow = next;
  }

  return {
    async load(userId) {
      const got = await fetchRowSet(userId);
      if (got && got.any) {
        shadow = got.rs;
        return { state: rowSetToState(got.rs), updatedAt: got.updatedAt };
      }
      // No relational data yet — migrate a legacy jsonb blob if one exists.
      const legacy = await sb.from('planner_data').select('data,updated_at').eq('user_id', userId).maybeSingle();
      if (!legacy.error && legacy.data && (legacy.data as any).data) {
        const blobState = normalizeState((legacy.data as any).data);
        shadow = emptyRowSet();
        await saveState(userId, blobState); // writes all rows; sets shadow = migrated snapshot
        return { state: blobState, updatedAt: (legacy.data as any).updated_at ?? null };
      }
      shadow = emptyRowSet();
      return null;
    },
    save: saveState,
  };
}

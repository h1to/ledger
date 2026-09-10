import type { PlannerState, Currency } from '../../types';
import { emptyState } from '../migrate';
import { type RowSet, emptyRowSet, recActualKey, contributionKey } from './rows';

/** PlannerState → normalized RowSet (the relational representation). */
export function stateToRowSet(state: PlannerState): RowSet {
  const rs = emptyRowSet();
  rs.settings = {
    year: state.year,
    baseCur: state.baseCur,
    ratesUpdated: state.ratesUpdated ?? null,
    tourDone: !!state.tourDone,
    lastModified: state.lastModified ?? null,
  };
  for (const c of Object.keys(state.rates)) {
    const v = state.rates[c as Currency];
    if (v != null) rs.rates[c] = v;
  }
  // months (emit a row for every month key so empty/opened months survive), then children in order
  for (const mk of Object.keys(state.months)) {
    const m = state.months[mk];
    rs.months[mk] = { closed: !!m.closed, leftover: m.leftover ?? null };
  }
  for (const mk of Object.keys(state.months)) {
    const m = state.months[mk];
    m.incomes.forEach((i) => {
      rs.incomes[i.id] = { monthKey: mk, name: i.name, amount: i.amount, cur: i.cur };
    });
    m.expenses.forEach((e) => {
      rs.expenses[e.id] = { monthKey: mk, name: e.name, category: e.category, planned: e.planned, actual: e.actual, cur: e.cur };
    });
    for (const recId of Object.keys(m.recActuals || {})) {
      rs.recActuals[recActualKey(mk, recId)] = { monthKey: mk, recurringId: recId, amount: Number(m.recActuals[recId]) || 0 };
    }
  }
  state.recurring.forEach((r) => {
    rs.recurring[r.id] = { name: r.name, type: r.type, category: r.category, amount: r.amount, cur: r.cur, startKey: r.start, endKey: r.end ?? null };
  });
  state.loans.forEach((l) => {
    rs.loans[l.id] = { name: l.name, payment: l.payment, cur: l.cur, startKey: l.start, endKey: l.end, rate: l.rate ?? null, overpayment: l.overpayment ?? null };
  });
  state.goals.forEach((g) => {
    rs.goals[g.id] = { name: g.name, target: g.target, deadlineKey: g.deadline ?? null };
    for (const mk of Object.keys(g.contribs)) {
      rs.contributions[contributionKey(g.id, mk)] = { goalId: g.id, monthKey: mk, amount: Number(g.contribs[mk]) || 0 };
    }
  });
  state.assets.forEach((a) => {
    rs.assets[a.id] = { name: a.name, kind: a.kind, value: a.value, cur: a.cur, liquid: a.liquid !== false };
  });
  return rs;
}

/** Normalized RowSet → PlannerState (inverse of stateToRowSet). */
export function rowSetToState(rs: RowSet): PlannerState {
  const state = emptyState();
  state.year = rs.settings.year;
  state.baseCur = rs.settings.baseCur;
  state.ratesUpdated = rs.settings.ratesUpdated;
  state.tourDone = rs.settings.tourDone;
  state.lastModified = rs.settings.lastModified;
  state.rates = {};
  for (const c of Object.keys(rs.rates)) state.rates[c as Currency] = rs.rates[c];

  // months first, preserving row order. Match the in-memory convention where `closed`
  // and `leftover` are present only when set, so state↔rows round-trips exactly.
  for (const mk of Object.keys(rs.months)) {
    const r = rs.months[mk];
    state.months[mk] = { incomes: [], expenses: [], recActuals: {} };
    if (r.closed) state.months[mk].closed = true;
    if (r.leftover != null) state.months[mk].leftover = r.leftover;
  }
  const ensure = (mk: string) => {
    if (!state.months[mk]) state.months[mk] = { incomes: [], expenses: [], recActuals: {} };
    return state.months[mk];
  };
  for (const id of Object.keys(rs.incomes)) {
    const r = rs.incomes[id];
    ensure(r.monthKey).incomes.push({ id, name: r.name, amount: r.amount, cur: r.cur });
  }
  for (const id of Object.keys(rs.expenses)) {
    const r = rs.expenses[id];
    ensure(r.monthKey).expenses.push({ id, name: r.name, category: r.category, planned: r.planned, actual: r.actual, cur: r.cur });
  }
  for (const key of Object.keys(rs.recActuals)) {
    const r = rs.recActuals[key];
    ensure(r.monthKey).recActuals[r.recurringId] = r.amount;
  }

  state.recurring = Object.keys(rs.recurring).map((id) => {
    const r = rs.recurring[id];
    return { id, name: r.name, type: r.type, category: r.category, amount: r.amount, cur: r.cur, start: r.startKey, end: r.endKey };
  });

  state.loans = Object.keys(rs.loans).map((id) => {
    const r = rs.loans[id];
    return { id, name: r.name, payment: r.payment, cur: r.cur, start: r.startKey, end: r.endKey, rate: r.rate, overpayment: r.overpayment };
  });

  const goalById: Record<string, PlannerState['goals'][number]> = {};
  state.goals = Object.keys(rs.goals).map((id) => {
    const r = rs.goals[id];
    const g = { id, name: r.name, target: r.target, deadline: r.deadlineKey, contribs: {} as Record<string, number> };
    goalById[id] = g;
    return g;
  });
  for (const key of Object.keys(rs.contributions)) {
    const r = rs.contributions[key];
    const g = goalById[r.goalId];
    if (g) g.contribs[r.monthKey] = r.amount;
  }

  state.assets = Object.keys(rs.assets).map((id) => {
    const r = rs.assets[id];
    return { id, name: r.name, kind: r.kind, value: r.value, cur: r.cur, liquid: r.liquid };
  });

  return state;
}

import type { PlannerState } from '../types';
import { mk } from './dates';
import { labelFull } from '../i18n';
import { recurringForMonth, recEffectiveActual, savedInMonth, toKZT } from './money';

/** Build the CSV export string. Returns null if there is nothing to export. */
export function buildCSV(state: PlannerState): string | null {
  const allKeys: Record<string, 1> = {};
  Object.keys(state.months).forEach((k) => {
    allKeys[k] = 1;
  });
  const y = state.year;
  for (let m = 1; m <= 12; m++) {
    const k0 = mk(y, m);
    if (recurringForMonth(state, k0).length || savedInMonth(state, k0) > 0) allKeys[k0] = 1;
  }
  state.goals.forEach((g) => {
    Object.keys(g.contribs).forEach((k) => {
      allKeys[k] = 1;
    });
  });
  const keys = Object.keys(allKeys).sort();
  if (!keys.length && !state.assets.length) return null;

  const rows: (string | number)[][] = [
    ['Month', 'Type', 'Name', 'Category', 'Currency', 'Planned', 'Actual', 'Amount KZT', 'Note'],
  ];
  keys.forEach((k) => {
    const mo = state.months[k];
    recurringForMonth(state, k).forEach((r) => {
      if (r.type === 'income') {
        rows.push([labelFull(k), 'Income', r.name, 'Income', r.cur, '', r.amount, toKZT(state, r.amount, r.cur).toFixed(2), 'recurring']);
        return;
      }
      const eff = recEffectiveActual(k, mo, r);
      rows.push([labelFull(k), 'Expense', r.name, r.category, r.cur, r.amount, eff, toKZT(state, eff, r.cur).toFixed(2), 'recurring']);
    });
    if (mo) {
      mo.incomes.forEach((i) => {
        rows.push([labelFull(k), 'Income', i.name, 'Income', i.cur, '', i.amount, toKZT(state, i.amount, i.cur).toFixed(2), '']);
      });
      mo.expenses.forEach((e) => {
        rows.push([labelFull(k), 'Expense', e.name || '', e.category || 'Other', e.cur, e.planned, e.actual, toKZT(state, e.actual, e.cur).toFixed(2), '']);
      });
      if (mo.closed) rows.push([labelFull(k), 'Closed', 'Leftover', 'Banked', 'KZT', '', mo.leftover || 0, Number(mo.leftover || 0).toFixed(2), 'banked to net worth']);
    }
    state.goals.forEach((g) => {
      if (g.contribs[k]) rows.push([labelFull(k), 'Savings', g.name, 'Savings', 'KZT', '', g.contribs[k], Number(g.contribs[k]).toFixed(2), 'counted as expense']);
    });
  });
  state.assets.forEach((a) => {
    rows.push(['—', a.kind === 'liability' ? 'Liability' : 'Asset', a.name, 'Net worth', a.cur, '', a.value, ((a.kind === 'liability' ? -1 : 1) * toKZT(state, a.value, a.cur)).toFixed(2), '']);
  });

  return rows
    .map((r) => r.map((v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(','))
    .join('\n');
}

/** Trigger a client-side file download (no-op guard for non-browser test envs). */
export function downloadFile(filename: string, content: string, mime: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

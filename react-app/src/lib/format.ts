import { CUR_SYMBOLS } from '../constants';
import type { Currency } from '../types';

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

/** Grouped number, always 2 decimals, en-US style in both languages (parseAmt relies on this). */
export function fmtNum(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtCur(n: number, cur: Currency | string): string {
  n = Number(n) || 0;
  const sym = CUR_SYMBOLS[cur as Currency] || cur + ' ';
  const neg = n < 0;
  return (neg ? '−' : '') + sym + fmtNum(Math.abs(n));
}

// The base currency `fmt()` renders in. Kept as a module-level value (like the current language)
// so the ~100 `fmt(n)` call sites need not thread state through. Updated on every state change.
let baseCur: Currency = 'KZT';
export function setBaseCur(c: Currency): void {
  baseCur = c || 'KZT';
}

/** Base currency with symbol. */
export function fmt(n: number): string {
  return fmtCur(n, baseCur);
}

/** Strip grouping separators back to a float. */
export function parseAmt(v: unknown): number {
  const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}

let uidCounter = 0;
/** Collision-resistant id, matching the original's shape. */
export function uid(): string {
  uidCounter = (uidCounter + 1) % 1e6;
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + uidCounter.toString(36);
}

import { pad2 } from './format';
import type { MonthKey } from '../types';

export function mk(y: number, m: number): MonthKey {
  return y + '-' + pad2(m);
}
export function keyYear(k: MonthKey): number {
  return parseInt(k.slice(0, 4), 10);
}
export function keyMonth(k: MonthKey): number {
  return parseInt(k.slice(5, 7), 10);
}
export function nowKey(): MonthKey {
  const d = new Date();
  return mk(d.getFullYear(), d.getMonth() + 1);
}
export function isPast(k: MonthKey): boolean {
  return k < nowKey();
}
export function shiftKey(k: MonthKey, delta: number): MonthKey {
  const d = new Date(keyYear(k), keyMonth(k) - 1 + delta, 1);
  return mk(d.getFullYear(), d.getMonth() + 1);
}
/** Inclusive month count from fromK to toK; 0 if toK is before fromK. */
export function monthsBetween(fromK: MonthKey, toK: MonthKey): number {
  const d = (keyYear(toK) - keyYear(fromK)) * 12 + (keyMonth(toK) - keyMonth(fromK));
  return d < 0 ? 0 : d + 1;
}

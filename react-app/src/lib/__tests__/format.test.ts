import { describe, it, expect } from 'vitest';
import { fmtNum, fmtCur, fmt, parseAmt } from '../format';

describe('formatting', () => {
  it('groups numbers with 2 decimals (en-US in both languages)', () => {
    expect(fmtNum(1234567)).toBe('1,234,567.00');
    expect(fmtNum(0)).toBe('0.00');
  });
  it('formats currency with symbol and unicode minus', () => {
    expect(fmt(1000)).toBe('₸1,000.00');
    expect(fmtCur(-50, 'USD')).toBe('−$50.00');
  });
  it('parseAmt strips grouping separators back to a float', () => {
    expect(parseAmt('1,234,567.00')).toBe(1234567);
    expect(parseAmt('')).toBe(0);
    expect(parseAmt('abc')).toBe(0);
  });
  it('parseAmt round-trips fmtNum', () => {
    expect(parseAmt(fmtNum(9876543.21))).toBe(9876543.21);
  });
});

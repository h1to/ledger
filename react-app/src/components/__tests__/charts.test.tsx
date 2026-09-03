import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { DonutCard } from '../charts';
import type { CategoryAggregate } from '../../types';

afterEach(cleanup);

const entries: CategoryAggregate[] = [
  { name: 'Housing', val: 200000 },
  { name: 'Food', val: 100000 },
]; // pie total = 300000

describe('DonutCard legend percentages', () => {
  it('defaults to a share of the pie total when no pctOf is given', () => {
    render(<DonutCard title="Spending" entries={entries} infoKey="pie_actual" />);
    // 200000/300000 = 67%, 100000/300000 = 33%
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
  });

  it('shows each slice as a share of pctOf (income) when provided', () => {
    render(<DonutCard title="Spending" entries={entries} infoKey="pie_actual" pctOf={1000000} />);
    // 200000/1000000 = 20%, 100000/1000000 = 10%
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.queryByText('67%')).toBeNull();
  });

  it('falls back to the pie total when income is zero (no divide-by-zero)', () => {
    render(<DonutCard title="Spending" entries={entries} infoKey="pie_actual" pctOf={0} />);
    expect(screen.getByText('67%')).toBeTruthy();
    expect(screen.getByText('33%')).toBeTruthy();
  });
});

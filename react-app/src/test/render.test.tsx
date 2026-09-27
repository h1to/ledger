import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { makeState } from './factory';
import { Dashboard } from '../views/Dashboard';
import { MonthEditor } from '../views/MonthEditor';
import { Savings } from '../views/Savings';
import { Recurring } from '../views/Recurring';
import { Loans } from '../views/Loans';
import { Insights } from '../views/Insights';
import { Gate } from '../views/Gate';
import { AssetModal } from '../components/modals/AssetModal';
import { RecurringModal } from '../components/modals/RecurringModal';
import { LoanModal } from '../components/modals/LoanModal';
import { ImportDebtsModal } from '../components/modals/ImportDebtsModal';
import { GoalDetail } from '../components/modals/GoalDetail';
import { SettingsModal } from '../components/modals/SettingsModal';
import type { Lang } from '../types';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());
afterEach(cleanup);

function seed() {
  const s = makeState({
    recurring: [
      { id: 'r1', name: 'Rent', type: 'expense', category: 'Housing', amount: 200000, cur: 'KZT', start: '2026-01', end: null },
      { id: 'r2', name: 'Salary', type: 'income', category: 'Income', amount: 2000, cur: 'USD', start: '2026-01', end: null },
    ],
    loans: [{ id: 'l1', name: 'Car loan', payment: 100000, cur: 'KZT', start: '2026-01', end: '2027-01', rate: 15, overpayment: 180000 }],
    goals: [{ id: 'g1', name: 'Apartment', target: 5000000, deadline: '2027-06', contribs: { '2026-07': 100000, '2026-08': 50000 } }],
    assets: [
      { id: 'a1', name: 'Deposit', kind: 'asset', value: 1000000, cur: 'KZT', liquid: true },
      { id: 'a2', name: 'Loan', kind: 'liability', value: 300, cur: 'USD' },
    ],
    months: {
      '2026-08': {
        incomes: [{ id: 'i1', name: 'Freelance', amount: 500, cur: 'USD' }],
        expenses: [{ id: 'e1', name: 'Food', category: 'Groceries', planned: 150000, actual: 120000, cur: 'KZT' }],
        recActuals: { r1: 210000 },
      },
      '2026-05': { incomes: [], expenses: [{ id: 'e2', name: 'Old', category: 'Other', planned: 50000, actual: 60000, cur: 'KZT' }], recActuals: {}, closed: true, leftover: 40000 },
    },
  });
  useStore.setState({ state: s, appStarted: true, user: { id: 'u1', email: 'a@b.c' } });
}

const langs: Lang[] = ['en', 'ru'];

describe('render sweep — every screen in both languages must not throw', () => {
  for (const lang of langs) {
    it(`dashboard [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<Dashboard />)).not.toThrow();
    });

    it(`month editor — current [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      useStore.setState({ view: 'month', openMonthKey: '2026-08' });
      expect(() => render(<MonthEditor />)).not.toThrow();
    });

    it(`month editor — closed past [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      useStore.setState({ view: 'month', openMonthKey: '2026-05' });
      expect(() => render(<MonthEditor />)).not.toThrow();
    });

    it(`savings [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<Savings />)).not.toThrow();
    });

    it(`recurring [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<Recurring />)).not.toThrow();
    });

    it(`loans [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<Loans />)).not.toThrow();
    });

    it(`insights [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<Insights />)).not.toThrow();
    });

    it(`gate [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      useStore.setState({ appStarted: false, gateMode: 'auth' });
      expect(() => render(<Gate />)).not.toThrow();
    });

    it(`modals [${lang}]`, () => {
      seed();
      useStore.getState().setLang(lang);
      expect(() => render(<AssetModal id="a1" />)).not.toThrow();
      cleanup();
      expect(() => render(<RecurringModal id="r1" />)).not.toThrow();
      cleanup();
      expect(() => render(<LoanModal id="l1" />)).not.toThrow();
      cleanup();
      expect(() => render(<ImportDebtsModal />)).not.toThrow();
      cleanup();
      expect(() => render(<GoalDetail goalId="g1" />)).not.toThrow();
      cleanup();
      expect(() => render(<SettingsModal />)).not.toThrow();
    });
  }

  it('register mode asks to confirm the password; sign-in mode does not', () => {
    seed();
    useStore.getState().setLang('en');
    useStore.setState({ appStarted: false, gateMode: 'auth' });
    render(<Gate />);
    // sign-in mode: single password field, no confirmation
    expect(screen.queryByText('Confirm password')).toBeNull();
    // switch to Register
    fireEvent.click(screen.getByText('Register'));
    expect(screen.getByText('Confirm password')).toBeInTheDocument();
  });

  it('shows a per-bank loan payment row in the month expenses', () => {
    seed();
    // an active imported loan with a monthly payment, tagged to a bank
    useStore.setState((st) => ({
      state: { ...st.state, loans: [{ id: 'lb', name: 'Halyk · X', bank: 'Halyk', debt: 300000, contract: null, kind: null, source: 'import', payment: 50000, cur: 'KZT', start: '2026-08', end: '2026-12', rate: null, overpayment: null }] },
    }));
    useStore.getState().setLang('en');
    useStore.setState({ view: 'month', openMonthKey: '2026-08' });
    render(<MonthEditor />);
    expect(screen.getByText('Halyk')).toBeInTheDocument(); // bank row label
    expect(screen.getAllByText('loan').length).toBeGreaterThan(0); // loan tag
  });

  it('dashboard shows the hero and net-worth cards', () => {
    seed();
    useStore.getState().setLang('en');
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Net worth ✨')).toBeInTheDocument();
    expect(screen.getByText('Safety runway')).toBeInTheDocument();
  });

  it('renders Russian labels when language is ru', () => {
    seed();
    useStore.getState().setLang('ru');
    render(<Dashboard />);
    expect(screen.getByText('Обзор')).toBeInTheDocument(); // "Dashboard"
  });
});

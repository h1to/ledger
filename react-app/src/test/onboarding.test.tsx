import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { useStore } from '../store/useStore';
import { emptyState } from '../lib/migrate';
import { Onboarding } from '../components/Onboarding';
import type { Lang } from '../types';

beforeEach(() => {
  useStore.setState({ state: emptyState(), appStarted: true, onboardingActive: true, user: { id: 'u1', email: 'a@b.c' } });
});
afterEach(cleanup);

describe('onboarding wizard', () => {
  for (const lang of ['en', 'ru'] as Lang[]) {
    it(`renders every step without throwing [${lang}]`, () => {
      useStore.getState().setLang(lang);
      const { container } = render(<Onboarding />);
      // walk forward through all five panes
      for (let i = 0; i < 4; i++) {
        const btns = container.querySelectorAll('.ob-foot .btn-primary');
        fireEvent.click(btns[btns.length - 1]);
      }
      expect(container.querySelector('.ob-stamp')).toBeTruthy(); // reached the summary
    });
  }

  it('writes recurring income + expense + goal and marks the intro done', () => {
    useStore.getState().setLang('en');
    const { container } = render(<Onboarding />);
    const amount = () => container.querySelector('.ob-body .ob-row input.mono') as HTMLInputElement;
    const next = () => fireEvent.click(container.querySelector('.ob-foot .btn-primary')!);

    next(); // welcome -> income
    fireEvent.change(screen.getByPlaceholderText('e.g. Salary'), { target: { value: 'Salary' } });
    fireEvent.change(amount(), { target: { value: '800000' } });
    next(); // income -> expenses
    fireEvent.change(screen.getByPlaceholderText('e.g. Rent'), { target: { value: 'Rent' } });
    fireEvent.change(amount(), { target: { value: '200000' } });
    next(); // expenses -> goals
    fireEvent.change(screen.getByPlaceholderText('e.g. Emergency fund'), { target: { value: 'Fund' } });
    fireEvent.change(amount(), { target: { value: '5000000' } });
    next(); // goals -> summary
    next(); // finish

    const st = useStore.getState().state;
    const inc = st.recurring.filter((r) => r.type === 'income');
    const exp = st.recurring.filter((r) => r.type === 'expense');
    expect(inc).toHaveLength(1);
    expect(inc[0]).toMatchObject({ name: 'Salary', category: 'Income', amount: 800000, cur: 'KZT' });
    expect(exp[0]).toMatchObject({ name: 'Rent', amount: 200000 });
    expect(exp[0].start).toBeTruthy();
    expect(exp[0].end).toBeNull();
    expect(st.goals).toHaveLength(1);
    expect(st.goals[0]).toMatchObject({ name: 'Fund', target: 5000000 });
    expect(st.tourDone).toBe(true); // intro complete; the tour stays available manually
    expect(useStore.getState().onboardingActive).toBe(false);
  });

  it('skips goals when "Not right now" is chosen and no goal is written', () => {
    useStore.getState().setLang('en');
    const { container } = render(<Onboarding />);
    const next = () => fireEvent.click(container.querySelector('.ob-foot .btn-primary')!);
    next(); // -> income
    next(); // -> expenses
    next(); // -> goals
    fireEvent.click(screen.getByText('Skip this step'));
    next(); // finish from summary
    expect(useStore.getState().state.goals).toHaveLength(0);
    expect(useStore.getState().onboardingActive).toBe(false);
  });
});

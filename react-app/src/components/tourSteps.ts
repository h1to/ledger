import type { View } from '../types';

export interface TourStep {
  view: Exclude<View, never>;
  sel: string;
  title: string;
  text: string;
}

/** First-run walkthrough. Titles & texts are translated at render time via tt(). */
export const TOUR: TourStep[] = [
  { view: 'dashboard', sel: '.hero-card', title: "What's free to spend", text: 'The big number answers the everyday question — how much is safe to spend this month after your plan and savings. Tap any small “i” icon in the app for a quick explanation of any number.' },
  { view: 'dashboard', sel: '#nba', title: 'Your next best move', text: 'One suggestion, tuned to your numbers right now — close a finished month, build your safety net, or send spare cash to a goal. Tap it to jump straight there.' },
  { view: 'dashboard', sel: '.stats-grid', title: 'Your financial vitals', text: "Four honest health checks: savings rate, net worth with this month's change, safety runway (months you could cover with no income), and how much of your income is already committed. The trend line below shows net worth growing over the year." },
  { view: 'dashboard', sel: '#months-grid', title: 'Twelve months, one plan each', text: 'Tap a month to plan it. The dot shows its state: green = on plan, red = over plan, amber = closed. The big number is what is free to spend.' },
  { view: 'month', sel: '#expense-card', title: 'Plan once, then live', text: 'Give each category a planned amount, then fill in actuals as the month goes. Recurring payments appear here automatically and count as spent.' },
  { view: 'month', sel: '#savings-card', title: 'Pay yourself first', text: 'Send part of the month to your goals. Contributions count as expenses and reduce free-to-spend — honest math.' },
  { view: 'savings', sel: '#goals-grid', title: 'Savings goals', text: 'Set a target and a deadline — the app computes the monthly amount needed and tracks pace. Money here also builds your safety runway on the dashboard.' },
  { view: 'recurring', sel: '#rec-list', title: 'Recurring payments', text: 'Add rent, loans, subscriptions or a salary once — they are included in every month until their end date.' },
  { view: 'dashboard', sel: '#btn-sync', title: 'Saved and synced', text: 'Everything saves automatically and syncs to the cloud — sign in on any device and your planner follows. Open Settings for backups, rates and sign-out. Enjoy!' },
];

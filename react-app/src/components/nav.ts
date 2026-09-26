import type { NavIconKey } from './icons';
import { tt } from '../i18n';

export interface NavItem {
  key: string; // routing key
  label: string;
  icon: NavIconKey;
}

/** The four primary destinations, translated. */
export function navItems(): NavItem[] {
  return [
    { key: 'dashboard', label: tt('Dashboard'), icon: 'dashboard' },
    { key: 'thismonth', label: tt('This month'), icon: 'thismonth' },
    { key: 'savings', label: tt('Savings'), icon: 'savings' },
    { key: 'recurring', label: tt('Recurring'), icon: 'recurring' },
    { key: 'loans', label: tt('Loans'), icon: 'loans' },
    { key: 'insights', label: tt('Insights'), icon: 'insights' },
  ];
}

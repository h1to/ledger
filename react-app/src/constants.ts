import type { Currency } from './types';

export const STORAGE_KEY = 'ledger_planner_v1';
export const LANG_KEY = 'ledger_lang';
export const SYNC_CFG_KEY = 'ledger_sync_cfg';

// Embedded project credentials (publishable key is safe to expose — data access is enforced by RLS).
// Overridable via Vite env vars for self-hosting.
export const EMBEDDED_SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hgdkmaxehbnhxzkpbicq.supabase.co';
export const EMBEDDED_SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_HhYlVgXWtq7yQ3Cvz-vysQ_IUFM_xZF';

// Optional: set a Web3Forms access key to also receive feedback by email.
export const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || '';

export const MONTH_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export const MONTH_FULL_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

export const CURRENCIES: Currency[] = ['KZT', 'USD', 'EUR', 'RUB', 'GBP', 'TRY'];
export const CUR_SYMBOLS: Record<Currency, string> = { KZT: '₸', USD: '$', EUR: '€', RUB: '₽', GBP: '£', TRY: '₺' };
export const DEFAULT_RATES: Partial<Record<Currency, number>> = { USD: 540, EUR: 590, RUB: 6.7, GBP: 680, TRY: 13 };
/** Live-rates endpoint for a given base currency (1 base = N of each other currency). */
export const ratesUrl = (base: string) => 'https://open.er-api.com/v6/latest/' + base;

export const PIE_COLORS = ['#34D399', '#FAFAFA', '#F87171', '#60A5FA', '#FBBF24', '#A78BFA', '#F472B6', '#2DD4BF', '#FB923C', '#9CA3AF'];

export const REC_CATEGORIES = ['Debts & loans', 'Family', 'Housing', 'Groceries', 'Food', 'Subscriptions', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Travel', 'Other'];

export const ASSET_KINDS: Record<'asset' | 'liability', string> = { asset: 'Asset', liability: 'Liability' };

/** Categories treated as "essential" when computing the emergency-fund runway. */
export const ESSENTIAL_CATEGORIES: Record<string, true> = {
  Housing: true, Groceries: true, Food: true, 'Debts & loans': true, Transport: true, Health: true, Family: true,
};

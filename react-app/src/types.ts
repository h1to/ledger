/** Currency code. KZT is the base; everything converts to it for totals. */
export type Currency = 'KZT' | 'USD' | 'EUR' | 'RUB' | 'GBP' | 'TRY';

/** "YYYY-MM" — sorts and compares lexicographically, which the code relies on. */
export type MonthKey = string;

export type Lang = 'en' | 'ru';

export interface Income {
  id: string;
  name: string;
  amount: number;
  cur: Currency;
}

export interface Expense {
  id: string;
  name: string;
  category: string;
  planned: number;
  actual: number;
  cur: Currency;
}

export interface Month {
  incomes: Income[];
  expenses: Expense[];
  /** per-month override for a recurring payment's actual: recurringId -> amount */
  recActuals: Record<string, number>;
  closed?: boolean;
  leftover?: number;
}

export type RecurringType = 'expense' | 'income';

export interface Recurring {
  id: string;
  name: string;
  type: RecurringType;
  category: string;
  amount: number;
  cur: Currency;
  start: MonthKey;
  end: MonthKey | null;
}

/**
 * A loan / debt. A fixed monthly `payment` from `start` to `end` (inclusive) is auto-counted
 * in each active month's expenses (category "Debts & loans"). `rate` (annual %) and
 * `overpayment` (total interest over the loan's life, in `cur`) are optional info figures.
 *
 * Loans imported from a bank debt certificate carry `bank`, the remaining `debt` owed right
 * now, the `contract` number and a type `kind` label; their `payment` starts at 0 (unknown —
 * the certificates don't include it) until the user fills it in. `source` distinguishes
 * imported rows (replaced on re-import) from manually-added ones.
 */
export interface Loan {
  id: string;
  name: string;
  payment: number;
  cur: Currency;
  start: MonthKey;
  end: MonthKey;
  rate: number | null;
  overpayment: number | null;
  bank?: string | null;
  debt?: number | null;
  contract?: string | null;
  kind?: string | null;
  source?: 'manual' | 'import';
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  deadline: MonthKey | null;
  /** monthKey -> amount contributed that month, in KZT */
  contribs: Record<MonthKey, number>;
}

export type AssetKind = 'asset' | 'liability';

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  value: number;
  cur: Currency;
  /** assets only: counts toward the safety-runway metric. Defaults true. */
  liquid?: boolean;
}

/** The single persisted planner state object. */
export interface PlannerState {
  year: number;
  /** the currency all totals, charts and net worth are expressed in. Defaults to KZT. */
  baseCur: Currency;
  rates: Partial<Record<Currency, number>>; // 1 unit of currency = N base-currency units (base itself is implicit 1, not stored)
  ratesUpdated: number | null;
  months: Record<MonthKey, Month>;
  recurring: Recurring[];
  loans: Loan[];
  goals: Goal[];
  assets: Asset[];
  tourDone: boolean;
  /** last-write-wins reconciliation clock (ms epoch) */
  lastModified?: number | null;
}

/** Result of monthTotals() — all amounts in KZT. */
export interface MonthTotals {
  income: number;
  planned: number;
  actual: number;
  saved: number;
  free: number;
  deviation: number;
  spentPct: number;
}

export interface YearTotals {
  income: number;
  planned: number;
  actual: number;
  saved: number;
  deviation: number;
  monthsWithData: number;
}

export interface CategoryAggregate {
  name: string;
  val: number;
}

export type DisplayFreeState = 'closed' | 'past' | 'open';
export interface DisplayFree {
  val: number;
  state: DisplayFreeState;
}

export type View = 'dashboard' | 'month' | 'savings' | 'recurring' | 'loans' | 'insights';
export type SyncState = 'off' | 'ready' | 'syncing' | 'synced' | 'error';

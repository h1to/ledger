import type { Currency, RecurringType, AssetKind } from '../../types';

/**
 * A "row set" is the normalized, relational representation of a PlannerState:
 * one collection per table, each keyed by that table's identity. It is the neutral
 * form used for mapping to/from the DB and for diffing between two states.
 */
export interface SettingsRow {
  year: number;
  ratesUpdated: number | null;
  tourDone: boolean;
  lastModified: number | null;
}
export interface MonthRow {
  closed: boolean;
  leftover: number | null;
}
export interface IncomeRow {
  monthKey: string;
  name: string;
  amount: number;
  cur: Currency;
}
export interface ExpenseRow {
  monthKey: string;
  name: string;
  category: string;
  planned: number;
  actual: number;
  cur: Currency;
}
export interface RecActualRow {
  monthKey: string;
  recurringId: string;
  amount: number;
}
export interface RecurringRow {
  name: string;
  type: RecurringType;
  category: string;
  amount: number;
  cur: Currency;
  startKey: string;
  endKey: string | null;
}
export interface GoalRow {
  name: string;
  target: number;
  deadlineKey: string | null;
}
export interface ContributionRow {
  goalId: string;
  monthKey: string;
  amount: number;
}
export interface AssetRow {
  name: string;
  kind: AssetKind;
  value: number;
  cur: Currency;
  liquid: boolean;
}

export interface RowSet {
  settings: SettingsRow;
  rates: Record<string, number>; // currency -> rate
  months: Record<string, MonthRow>; // month_key -> row
  incomes: Record<string, IncomeRow>; // id -> row
  expenses: Record<string, ExpenseRow>; // id -> row
  recActuals: Record<string, RecActualRow>; // `${monthKey}|${recurringId}` -> row
  recurring: Record<string, RecurringRow>; // id -> row
  goals: Record<string, GoalRow>; // id -> row
  contributions: Record<string, ContributionRow>; // `${goalId}|${monthKey}` -> row
  assets: Record<string, AssetRow>; // id -> row
}

export const recActualKey = (monthKey: string, recurringId: string) => monthKey + '|' + recurringId;
export const contributionKey = (goalId: string, monthKey: string) => goalId + '|' + monthKey;

export function emptyRowSet(): RowSet {
  return {
    settings: { year: new Date().getFullYear(), ratesUpdated: null, tourDone: false, lastModified: null },
    rates: {},
    months: {},
    incomes: {},
    expenses: {},
    recActuals: {},
    recurring: {},
    goals: {},
    contributions: {},
    assets: {},
  };
}

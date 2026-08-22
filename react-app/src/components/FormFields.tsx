import { CURRENCIES, REC_CATEGORIES } from '../constants';
import type { Currency, MonthKey } from '../types';
import { catLabel, monthFull, tt } from '../i18n';
import { mk, keyMonth, keyYear } from '../lib/dates';

/** Compact currency dropdown used inside tables. */
export function CurSelect({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <select className="cur-select" value={value} onChange={(e) => onChange(e.target.value as Currency)}>
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** Compact category dropdown used inside the expense table. Keeps an unknown value selectable. */
export function CatSelect({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const opts = REC_CATEGORIES.slice();
  if (value && opts.indexOf(value) === -1) opts.push(value);
  return (
    <select className="cur-select cat-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((c) => (
        <option key={c} value={c}>
          {catLabel(c)}
        </option>
      ))}
    </select>
  );
}

/** Full-width currency dropdown for modals (.field styling supplied by the parent). */
export function CurrencyField({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Currency)}>
      {CURRENCIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

/** Month + Year pair that reports a MonthKey. `prefix` drives the translated labels. */
export function MonthYearSelect({
  prefix,
  value,
  onChange,
  yearsAhead = 5,
}: {
  prefix: 'start' | 'end' | 'deadline' | 'month';
  value: MonthKey | null;
  onChange: (k: MonthKey) => void;
  yearsAhead?: number;
}) {
  const y0 = new Date().getFullYear();
  const selY = value ? keyYear(value) : y0;
  const selM = value ? keyMonth(value) : new Date().getMonth() + 1;
  const years: number[] = [];
  for (let y = y0 - 3; y <= y0 + yearsAhead; y++) years.push(y);
  if (years.indexOf(selY) === -1) years.push(selY);
  years.sort((a, b) => a - b);

  const emit = (m: number, yr: number) => onChange(mk(yr, m));

  return (
    <div className="field-row">
      <div className="field">
        <label>{tt(prefix + ' month')}</label>
        <select value={selM} onChange={(e) => emit(parseInt(e.target.value, 10), selY)}>
          {monthFull().map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{tt(prefix + ' year')}</label>
        <select value={selY} onChange={(e) => emit(selM, parseInt(e.target.value, 10))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

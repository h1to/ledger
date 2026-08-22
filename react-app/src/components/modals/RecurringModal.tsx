import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { CurrencyField, MonthYearSelect } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { REC_CATEGORIES } from '../../constants';
import { tt, catLabel } from '../../i18n';
import { uid } from '../../lib/format';
import { nowKey } from '../../lib/dates';
import type { Currency, MonthKey, RecurringType } from '../../types';

export function RecurringModal({ id }: { id: string | null }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const existing = id ? state.recurring.find((r) => r.id === id) : null;

  const [type, setType] = useState<RecurringType>(existing?.type ?? 'expense');
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? REC_CATEGORIES[0]);
  const [amount, setAmount] = useState(existing?.amount ?? 0);
  const [cur, setCur] = useState<Currency>(existing?.cur ?? 'KZT');
  const [start, setStart] = useState<MonthKey>(existing?.start ?? nowKey());
  const [hasEnd, setHasEnd] = useState(!!existing?.end);
  const [end, setEnd] = useState<MonthKey | null>(existing?.end ?? null);

  return (
    <FormModal
      title={existing ? tt('Edit recurring') : tt('Add recurring')}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Give it a name')); return false; }
        if (!amount || amount <= 0) { toast(tt('Enter a valid amount')); return false; }
        const category2 = type === 'income' ? 'Income' : category;
        let end2: MonthKey | null = null;
        if (hasEnd) {
          end2 = end ?? start;
          if (end2 < start) { toast(tt('End date is before start date')); return false; }
        }
        commit((s) => {
          if (existing) {
            const r = s.recurring.find((x) => x.id === existing.id)!;
            r.name = name.trim(); r.type = type; r.category = category2; r.amount = amount; r.cur = cur; r.start = start; r.end = end2;
          } else {
            s.recurring.push({ id: uid(), name: name.trim(), type, category: category2, amount, cur, start, end: end2 });
          }
        });
      }}
    >
      <div className="seg">
        <button type="button" className={type === 'expense' ? 'on' : ''} onClick={() => setType('expense')}>{tt('Expense')}</button>
        <button type="button" className={type === 'income' ? 'on' : ''} onClick={() => setType('income')}>{tt('Income')}</button>
      </div>
      <div className="field"><label>{tt('Name')}</label>
        <input value={name} placeholder={tt('Name')} onChange={(e) => setName(e.target.value)} /></div>
      {type !== 'income' && (
        <div className="field"><label>{tt('Category')}</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {REC_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select></div>
      )}
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}><label>{tt('Amount per month')}</label>
          <MoneyInput className="mono" value={amount} onCommit={setAmount} /></div>
        <div className="field"><label>{tt('Currency')}</label><CurrencyField value={cur} onChange={setCur} /></div>
      </div>
      <MonthYearSelect prefix="start" value={start} onChange={setStart} />
      <div className="checkrow">
        <input type="checkbox" id="rec-hasend" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} />
        <label htmlFor="rec-hasend" style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--dim)' }}>
          {tt('Has an end date (e.g. loan payoff)')}
        </label>
      </div>
      {hasEnd && <MonthYearSelect prefix="end" value={end ?? start} onChange={setEnd} />}
    </FormModal>
  );
}

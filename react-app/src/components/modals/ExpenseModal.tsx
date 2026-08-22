import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { CurrencyField } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { REC_CATEGORIES } from '../../constants';
import { tt, catLabel, labelShortKey } from '../../i18n';
import { uid } from '../../lib/format';
import type { Currency } from '../../types';

export function ExpenseModal({ k }: { k: string }) {
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const [name, setName] = useState('');
  const [cat, setCat] = useState(REC_CATEGORIES[0]);
  const [planned, setPlanned] = useState(0);
  const [actual, setActual] = useState(0);
  const [cur, setCur] = useState<Currency>('KZT');

  return (
    <FormModal
      title={tt('Add expense') + ' · ' + labelShortKey(k)}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Name the expense')); return false; }
        if (planned <= 0 && actual <= 0) { toast(tt('Enter a planned or actual amount')); return false; }
        commit((s) => {
          s.months[k].expenses.push({ id: uid(), name: name.trim(), category: cat, planned, actual, cur });
        });
      }}
    >
      <div className="field"><label>{tt('Name')}</label>
        <input value={name} placeholder={tt('Name')} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>{tt('Category')}</label>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          {REC_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
        </select></div>
      <div className="field-row">
        <div className="field"><label>{tt('Planned')}</label><MoneyInput className="mono" value={planned} onCommit={setPlanned} /></div>
        <div className="field"><label>{tt('Actual (optional)')}</label><MoneyInput className="mono" value={actual} onCommit={setActual} /></div>
      </div>
      <div className="field"><label>{tt('Currency')}</label><CurrencyField value={cur} onChange={setCur} /></div>
    </FormModal>
  );
}

import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { CurrencyField } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt, labelShortKey } from '../../i18n';
import { uid } from '../../lib/format';
import type { Currency } from '../../types';

export function IncomeModal({ k }: { k: string }) {
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [cur, setCur] = useState<Currency>('KZT');

  return (
    <FormModal
      title={tt('Add income') + ' · ' + labelShortKey(k)}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Name the source')); return false; }
        if (!amount || amount <= 0) { toast(tt('Enter a valid amount')); return false; }
        commit((s) => {
          s.months[k].incomes.push({ id: uid(), name: name.trim(), amount, cur });
        });
      }}
    >
      <div className="field"><label>{tt('Source')}</label>
        <input value={name} placeholder={tt('Source')} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}><label>{tt('Amount')}</label>
          <MoneyInput className="mono" value={amount} onCommit={setAmount} /></div>
        <div className="field"><label>{tt('Currency')}</label><CurrencyField value={cur} onChange={setCur} /></div>
      </div>
    </FormModal>
  );
}

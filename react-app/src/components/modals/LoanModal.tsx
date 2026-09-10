import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { CurrencyField, MonthYearSelect } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt } from '../../i18n';
import { uid } from '../../lib/format';
import { nowKey, shiftKey } from '../../lib/dates';
import type { Currency, MonthKey } from '../../types';

export function LoanModal({ id }: { id: string | null }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const existing = id ? state.loans.find((l) => l.id === id) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [payment, setPayment] = useState(existing?.payment ?? 0);
  const [cur, setCur] = useState<Currency>(existing?.cur ?? state.baseCur);
  const [start, setStart] = useState<MonthKey>(existing?.start ?? nowKey());
  const [end, setEnd] = useState<MonthKey>(existing?.end ?? shiftKey(nowKey(), 12));
  const [rate, setRate] = useState(existing?.rate != null ? String(existing.rate) : '');
  const [overpayment, setOverpayment] = useState(existing?.overpayment ?? 0);

  return (
    <FormModal
      title={existing ? tt('Edit loan') : tt('Add loan')}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Give it a name')); return false; }
        if (!payment || payment <= 0) { toast(tt('Enter a valid monthly payment')); return false; }
        if (end < start) { toast(tt('End date is before start date')); return false; }
        const rateNum = rate.trim() ? parseFloat(rate.replace(',', '.')) : NaN;
        const rate2 = isFinite(rateNum) && rateNum > 0 ? rateNum : null;
        const over2 = overpayment > 0 ? overpayment : null;
        commit((s) => {
          if (existing) {
            const l = s.loans.find((x) => x.id === existing.id)!;
            l.name = name.trim(); l.payment = payment; l.cur = cur; l.start = start; l.end = end; l.rate = rate2; l.overpayment = over2;
          } else {
            s.loans.push({ id: uid(), name: name.trim(), payment, cur, start, end, rate: rate2, overpayment: over2 });
          }
        });
      }}
    >
      <div className="field"><label>{tt('Name')}</label>
        <input value={name} placeholder={tt('e.g. Mortgage')} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}><label>{tt('Monthly payment')}</label>
          <MoneyInput className="mono" value={payment} onCommit={setPayment} /></div>
        <div className="field"><label>{tt('Currency')}</label><CurrencyField value={cur} onChange={setCur} /></div>
      </div>
      <MonthYearSelect prefix="start" value={start} onChange={setStart} yearsAhead={10} />
      <MonthYearSelect prefix="end" value={end} onChange={setEnd} yearsAhead={40} />
      <div className="field-row">
        <div className="field"><label>{tt('Interest rate % (optional)')}</label>
          <input className="mono" inputMode="decimal" value={rate} placeholder="—" onChange={(e) => setRate(e.target.value)} /></div>
        <div className="field" style={{ flex: 2 }}><label>{tt('Total overpayment (optional)')}</label>
          <MoneyInput className="mono" value={overpayment} onCommit={setOverpayment} blankZero /></div>
      </div>
      <div className="modal-note">{tt('The monthly payment is automatically counted as an expense in every month from start to end.')}</div>
    </FormModal>
  );
}

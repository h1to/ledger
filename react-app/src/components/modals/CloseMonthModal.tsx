import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { MoneyInput } from '../MoneyInput';
import { tt, labelFull, monthFull } from '../../i18n';
import { fmt } from '../../lib/format';
import { keyMonth } from '../../lib/dates';
import { monthTotals } from '../../lib/money';

export function CloseMonthModal({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const t = monthTotals(state, k);
  const suggested = Math.max(0, t.income - t.actual);
  const [amt, setAmt] = useState(suggested);

  return (
    <FormModal
      title={tt('Close') + ' ' + monthFull()[keyMonth(k) - 1]}
      onClose={closeModal}
      onSubmit={() => {
        if (amt < 0) { toast(tt('Leftover cannot be negative')); return false; }
        commit((s) => {
          s.months[k].closed = true;
          s.months[k].leftover = amt;
        });
        toast(labelFull(k) + ' ' + tt('closed —') + ' ' + fmt(amt) + ' ' + tt('banked'));
      }}
    >
      <div className="modal-note">
        {tt('How much money is actually left at the end of')} {labelFull(k)}? {tt('It will be added to your net worth as a banked leftover.')}
      </div>
      <div className="field"><label>{tt('Leftover (KZT)')}</label><MoneyInput className="mono" value={amt} onCommit={setAmt} blankZero={false} /></div>
      <div className="modal-note">
        {tt('Suggested')}: {tt('Income')} {fmt(t.income)} − {tt('Spent').toLowerCase()} {fmt(t.actual)} = {fmt(t.income - t.actual)}
      </div>
    </FormModal>
  );
}

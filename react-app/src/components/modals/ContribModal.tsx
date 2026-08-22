import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { MonthYearSelect } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt } from '../../i18n';
import { nowKey } from '../../lib/dates';
import type { MonthKey } from '../../types';

export function ContribModal({ goalId }: { goalId: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const g = state.goals.find((x) => x.id === goalId);

  const [amount, setAmount] = useState(0);
  const [month, setMonth] = useState<MonthKey>(nowKey());

  if (!g) return null;
  return (
    <FormModal
      title={tt('Add to') + ' “' + g.name + '”'}
      onClose={closeModal}
      onSubmit={() => {
        if (!amount) { toast(tt('Enter an amount')); return false; }
        commit((s) => {
          const goal = s.goals.find((x) => x.id === goalId)!;
          goal.contribs[month] = (Number(goal.contribs[month]) || 0) + amount;
          if (goal.contribs[month] <= 0) delete goal.contribs[month];
        });
      }}
    >
      <div className="modal-note">{tt('The contribution will appear in that month’s expenses as')} “→ {g.name}”.</div>
      <div className="field"><label>{tt('Amount (KZT)')}</label><MoneyInput className="mono" value={amount} onCommit={setAmount} /></div>
      <MonthYearSelect prefix="month" value={month} onChange={setMonth} yearsAhead={3} />
    </FormModal>
  );
}

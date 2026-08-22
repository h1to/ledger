import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { MonthYearSelect } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt } from '../../i18n';
import { uid } from '../../lib/format';
import { nowKey } from '../../lib/dates';
import type { MonthKey } from '../../types';

export function GoalModal({ id }: { id: string | null }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const existing = id ? state.goals.find((g) => g.id === id) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [target, setTarget] = useState(existing?.target ?? 0);
  const [hasDl, setHasDl] = useState(!!existing?.deadline);
  const [deadline, setDeadline] = useState<MonthKey | null>(existing?.deadline ?? nowKey());

  return (
    <FormModal
      title={existing ? tt('Edit goal') : tt('New savings goal')}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Name the goal')); return false; }
        if (!target || target <= 0) { toast(tt('Enter a valid target')); return false; }
        const dl = hasDl ? deadline ?? nowKey() : null;
        commit((s) => {
          if (existing) {
            const g = s.goals.find((x) => x.id === existing.id)!;
            g.name = name.trim(); g.target = target; g.deadline = dl;
          } else {
            s.goals.push({ id: uid(), name: name.trim(), target, deadline: dl, contribs: {} });
          }
        });
      }}
    >
      <div className="field"><label>{tt('Goal name')}</label>
        <input value={name} placeholder={tt('Goal name')} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field"><label>{tt('Target amount (KZT)')}</label>
        <MoneyInput className="mono" value={target} onCommit={setTarget} /></div>
      <div className="checkrow">
        <input type="checkbox" id="g-hasdl" checked={hasDl} onChange={(e) => setHasDl(e.target.checked)} />
        <label htmlFor="g-hasdl" style={{ all: 'unset', cursor: 'pointer', fontSize: 13, color: 'var(--dim)' }}>{tt('Has a deadline')}</label>
      </div>
      {hasDl && <MonthYearSelect prefix="deadline" value={deadline} onChange={setDeadline} yearsAhead={10} />}
    </FormModal>
  );
}

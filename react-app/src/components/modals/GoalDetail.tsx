import { useStore } from '../../store/useStore';
import { Modal } from '../Modal';
import { MoneyInput } from '../MoneyInput';
import { TrashIcon } from '../icons';
import { tt, labelShortKey } from '../../i18n';
import { fmt } from '../../lib/format';
import { nowKey, shiftKey, monthsBetween } from '../../lib/dates';
import { goalSaved, goalNeededPerMonth } from '../../lib/money';

function IRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="gd-irow">
      <span>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}

export function GoalDetail({ goalId }: { goalId: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const openModal = useStore((s) => s.openModal);
  const closeModal = useStore((s) => s.closeModal);
  useStore((s) => s.lang);
  const g = state.goals.find((x) => x.id === goalId);
  if (!g) return null;

  const saved = goalSaved(g);
  const pct = g.target > 0 ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
  const need = goalNeededPerMonth(g);
  const keys = Object.keys(g.contribs).sort().reverse();
  const count = keys.length;
  const avg = count ? saved / count : 0;
  const remaining = Math.max(0, (Number(g.target) || 0) - saved);
  let projTxt = '—';
  if (remaining <= 0) projTxt = tt('Reached') + ' 🎉';
  else if (avg > 0) projTxt = '~' + labelShortKey(shiftKey(nowKey(), Math.ceil(remaining / avg))) + ' ' + tt('at current pace');

  return (
    <Modal onClose={closeModal}>
      <h3>{g.name}</h3>
      <div className="goal-track" style={{ marginTop: 4 }}><div className="goal-fill" style={{ width: pct + '%' }} /></div>
      <div className="goal-nums"><span>{fmt(saved)} / {fmt(g.target)}</span><span>{pct}%</span></div>
      <div style={{ marginTop: 14 }}>
        <IRow label={tt('Deadline')} value={g.deadline ? labelShortKey(g.deadline) + ' · ' + monthsBetween(nowKey(), g.deadline) + ' ' + tt('mo left') : tt('none')} />
        {need != null && <IRow label={tt('Needed monthly')} value={fmt(need)} />}
        <IRow label={tt('Contributions')} value={count + ' ' + (count === 1 ? tt('month') : tt('months'))} />
        {count > 0 && <IRow label={tt('Average per month')} value={fmt(avg)} />}
        <IRow label={tt('Projected finish')} value={projTxt} />
      </div>
      <div className="section-title" style={{ margin: '16px 0 6px' }}>{tt('Contribution history')}</div>
      {count ? (
        keys.map((k) => (
          <div className="gd-row" key={k}>
            <div className="gd-month">{labelShortKey(k)}</div>
            <MoneyInput
              className="cell-input mono in"
              value={g.contribs[k]}
              blankZero={false}
              onCommit={(v) =>
                commit((s) => {
                  const goal = s.goals.find((x) => x.id === goalId)!;
                  if (v <= 0) delete goal.contribs[k];
                  else goal.contribs[k] = v;
                })
              }
            />
            <button className="icon-btn" onClick={() => commit((s) => { delete s.goals.find((x) => x.id === goalId)!.contribs[k]; })}>
              <TrashIcon />
            </button>
          </div>
        ))
      ) : (
        <div className="empty" style={{ padding: 18 }}>{tt('No contributions yet.')}</div>
      )}
      <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-secondary btn-small" onClick={() => openModal({ type: 'contrib', goalId })}>{tt('+ Contribution')}</button>
        <button className="btn btn-primary btn-small" onClick={closeModal}>{tt('Close')}</button>
      </div>
    </Modal>
  );
}

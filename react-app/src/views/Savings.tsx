import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { EditIcon, TrashIcon } from '../components/icons';
import { tt, labelShortKey } from '../i18n';
import { fmt } from '../lib/format';
import { nowKey, monthsBetween } from '../lib/dates';
import { totalGoalsSaved, savedInMonth, goalSaved, goalNeededPerMonth } from '../lib/money';

function GoalsGrid() {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);

  if (!state.goals.length)
    return (
      <div className="empty" style={{ gridColumn: '1/-1' }}>
        {tt('No goals yet. An apartment fund, an emergency cushion, a trip — name it and give it a number.')}
      </div>
    );

  const curK = nowKey();
  return (
    <>
      {state.goals.map((g) => {
        const saved = goalSaved(g);
        const pct = g.target > 0 ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
        const need = goalNeededPerMonth(g);
        const thisM = Number(g.contribs[curK]) || 0;
        const onTrack = need == null ? null : thisM >= need - 0.01;
        const deadlineTxt = g.deadline
          ? tt('by') + ' ' + labelShortKey(g.deadline) + ' · ' + monthsBetween(curK, g.deadline) + ' ' + tt('mo left')
          : tt('no deadline');
        return (
          <div
            className="goal-card"
            key={g.id}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button')) return;
              openModal({ type: 'goalDetail', goalId: g.id });
            }}
          >
            <div className="goal-top">
              <div>
                <div className="goal-name">
                  {g.name}{' '}
                  {need != null &&
                    (onTrack ? <span className="tag under">{tt('on track')}</span> : <span className="tag over">{tt('behind')}</span>)}
                </div>
                <div className="goal-deadline">{deadlineTxt}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="icon-btn" onClick={() => openModal({ type: 'goal', id: g.id })}><EditIcon /></button>
                <button
                  className="icon-btn"
                  onClick={() =>
                    askConfirm('Delete goal "' + g.name + '" and its contribution history?', () =>
                      commit((s) => {
                        s.goals = s.goals.filter((x) => x.id !== g.id);
                      }),
                    )
                  }
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
            <div className="goal-track"><div className="goal-fill" style={{ width: pct + '%' }} /></div>
            <div className="goal-nums"><span>{fmt(saved)} / {fmt(g.target)}</span><span>{pct}%</span></div>
            {need != null && (
              <div className="goal-nums" style={{ marginTop: 6 }}>
                <span style={{ color: 'var(--faint)' }}>{tt('needed monthly')}</span>
                <span>{fmt(need)}</span>
              </div>
            )}
            <div className="goal-nums" style={{ marginTop: 6 }}>
              <span style={{ color: 'var(--faint)' }}>{tt('this month')}</span>
              <span className={thisM > 0 ? 'green' : ''}>{fmt(thisM)}</span>
            </div>
            <div className="goal-actions">
              <button className="btn btn-secondary btn-small" onClick={() => openModal({ type: 'contrib', goalId: g.id })}>
                {tt('+ Contribution')}
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Savings() {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  useStore((s) => s.lang);

  const totalSaved = totalGoalsSaved(state);
  const totalTarget = state.goals.reduce((s, g) => s + (Number(g.target) || 0), 0);
  const curK = nowKey();
  const thisMonth = savedInMonth(state, curK);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{tt('Savings')}</h1>
          <div className="subtitle">{tt('Goals & progress')}</div>
        </div>
      </div>
      <div className="grid stats-grid">
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Total saved')}</span><InfoTip infoKey="sv_saved" /></div>
          <div className="card-value green">{fmt(totalSaved)}</div>
          <div className="card-sub">{tt('across')} {state.goals.length} {state.goals.length === 1 ? tt('goal') : tt('goals')}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Total target')}</span><InfoTip infoKey="sv_target" /></div>
          <div className="card-value">{fmt(totalTarget)}</div>
          <div className="card-sub">{totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% {tt('complete')}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('this month')}</span><InfoTip infoKey="sv_month" /></div>
          <div className="card-value green">{fmt(thisMonth)}</div>
          <div className="card-sub">{labelShortKey(curK)}</div>
        </div>
        <div className="card invert">
          <div className="card-label"><span className="st-l">{tt('Still needed')}</span><InfoTip infoKey="sv_needed" /></div>
          <div className="card-value">{fmt(Math.max(0, totalTarget - totalSaved))}</div>
          <div className="card-sub">{tt('to hit every goal')}</div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'goal', id: null })}>{tt('New savings goal')}</button>
      </div>
      <div className="section-title"><span className="st-l">{tt('Goals')}<InfoTip infoKey="goals_info" /></span></div>
      <div className="goals-grid" id="goals-grid"><GoalsGrid /></div>
    </>
  );
}

import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { EditIcon, TrashIcon } from '../components/icons';
import { tt, catLabel, labelShortKey } from '../i18n';
import { fmt, fmtCur } from '../lib/format';
import { nowKey } from '../lib/dates';
import { toKZT } from '../lib/money';

function RecList() {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);

  if (!state.recurring.length)
    return <div className="empty">{tt('Nothing recurring yet. Add rent, loan payments, subscriptions — or a salary.')}</div>;

  const cur = nowKey();
  const sorted = state.recurring.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
    return toKZT(state, b.amount, b.cur) - toKZT(state, a.amount, a.cur);
  });

  return (
    <>
      {sorted.map((r) => {
        const active = r.start <= cur && (!r.end || cur <= r.end);
        const range = labelShortKey(r.start) + ' → ' + (r.end ? labelShortKey(r.end) : '∞');
        const kztNote = r.cur !== 'KZT' ? ' · ≈ ' + fmt(toKZT(state, r.amount, r.cur)) : '';
        return (
          <div className="rec-card" key={r.id}>
            <div className="rec-info">
              <div className="rec-name">
                {r.name} <span className={'tag ' + (r.type === 'income' ? 'under' : '')}>{r.type === 'income' ? tt('income') : catLabel(r.category)}</span>
                {!active && <> <span className="tag">{tt('inactive now')}</span></>}
              </div>
              <div className="rec-range">{range}{kztNote}</div>
            </div>
            <div className="rec-right">
              <div className={'rec-amt ' + (r.type === 'income' ? 'green' : '')}>
                {(r.type === 'income' ? '+' : '−') + fmtCur(r.amount, r.cur)}
                <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 500 }}>{tt('/month')}</div>
              </div>
              <button className="icon-btn" onClick={() => openModal({ type: 'recurring', id: r.id })}><EditIcon /></button>
              <button
                className="icon-btn"
                onClick={() =>
                  askConfirm('Delete "' + r.name + '"? It will disappear from every month.', () =>
                    commit((s) => {
                      s.recurring = s.recurring.filter((x) => x.id !== r.id);
                      Object.keys(s.months).forEach((k) => {
                        if (s.months[k].recActuals) delete s.months[k].recActuals[r.id];
                      });
                    }),
                  )
                }
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function Recurring() {
  const openModal = useStore((s) => s.openModal);
  useStore((s) => s.lang);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{tt('Recurring')}</h1>
          <div className="subtitle">{tt('Payments & income on repeat')}</div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'recurring', id: null })}>{tt('+ Add recurring')}</button>
      </div>
      <div className="section-title"><span className="st-l">{tt('Active & scheduled')}<InfoTip infoKey="rec_info" /></span></div>
      <div className="rec-list" id="rec-list"><RecList /></div>
    </>
  );
}

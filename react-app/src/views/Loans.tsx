import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { EditIcon, TrashIcon } from '../components/icons';
import { tt, labelShortKey } from '../i18n';
import { fmt, fmtCur } from '../lib/format';
import { toKZT, loanStats } from '../lib/money';

function LoanList() {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);

  if (!state.loans.length)
    return <div className="empty">{tt('No loans yet. Add a mortgage, car loan or any credit — its monthly payment is counted in every month automatically.')}</div>;

  const sorted = state.loans.slice().sort((a, b) => toKZT(state, b.payment, b.cur) - toKZT(state, a.payment, a.cur));

  return (
    <>
      {sorted.map((l) => {
        const st = loanStats(l);
        const status = st.done ? tt('paid off') : st.active ? tt('active') : tt('upcoming');
        const range = labelShortKey(l.start) + ' → ' + labelShortKey(l.end);
        const baseNote = l.cur !== state.baseCur ? ' · ≈ ' + fmt(toKZT(state, l.payment, l.cur)) : '';
        return (
          <div className="rec-card" key={l.id}>
            <div className="rec-info">
              <div className="rec-name">
                {l.name} <span className="tag">{status}</span>
                {l.rate != null && l.rate > 0 && <> <span className="tag">{l.rate}%</span></>}
              </div>
              <div className="rec-range">{range} · {st.paid}/{st.term} {tt('payments')}{baseNote}</div>
              <div className="mg-track" style={{ margin: '8px 0 6px' }}><div className="mg-fill" style={{ width: Math.round(st.progress * 100) + '%' }} /></div>
              <div className="rec-range">
                {tt('Paid')} {fmtCur(st.paidToDate, l.cur)} · {tt('Left')} {fmtCur(st.remaining, l.cur)}
                {l.overpayment != null && l.overpayment > 0 && <> · {tt('overpayment')} {fmtCur(l.overpayment, l.cur)}</>}
              </div>
            </div>
            <div className="rec-right">
              <div className="rec-amt">
                −{fmtCur(l.payment, l.cur)}
                <div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 500 }}>{tt('/month')}</div>
              </div>
              <button className="icon-btn" onClick={() => openModal({ type: 'loan', id: l.id })}><EditIcon /></button>
              <button
                className="icon-btn"
                onClick={() =>
                  askConfirm('Delete "' + l.name + '"? It will stop being counted in your monthly expenses.', () =>
                    commit((s) => {
                      s.loans = s.loans.filter((x) => x.id !== l.id);
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

export function Loans() {
  const openModal = useStore((s) => s.openModal);
  useStore((s) => s.lang);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{tt('Loans')}</h1>
          <div className="subtitle">{tt('Debts & repayments, counted every month')}</div>
        </div>
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={() => openModal({ type: 'loan', id: null })}>{tt('+ Add loan')}</button>
      </div>
      <div className="section-title"><span className="st-l">{tt('Your loans')}<InfoTip infoKey="loans_info" /></span></div>
      <div className="rec-list" id="loan-list"><LoanList /></div>
    </>
  );
}

import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { EditIcon, TrashIcon } from '../components/icons';
import { tt, labelShortKey } from '../i18n';
import { fmt, fmtCur } from '../lib/format';
import { toKZT, loanStats } from '../lib/money';
import { debtSummary, loanCurrentDebt, loanPayoffMonths, bankKey, payoffDateKey } from '../lib/debt';
import type { Loan } from '../types';

/** Human "N mo" / "≈ N yr M mo" for a month count. */
function monthsLabel(n: number): string {
  if (n <= 0) return '0';
  if (n < 12) return n + ' ' + tt('mo');
  const y = Math.floor(n / 12);
  const m = n % 12;
  return y + ' ' + tt('yr') + (m ? ' ' + m + ' ' + tt('mo') : '');
}

function DebtDashboard() {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);
  const d = debtSummary(state);
  if (!state.loans.length) return null;

  const maxBankDebt = Math.max(1, ...d.byBank.map((b) => b.debt));

  return (
    <>
      <div className="card" style={{ background: 'var(--white)', color: 'var(--ink)', marginBottom: 12 }}>
        <div className="stamp-label" style={{ color: '#6b6b70' }}>{tt('Total debt')}<InfoTip infoKey="debt_total" /></div>
        <div className="stamp-value mono" style={{ fontSize: 30, marginTop: 8 }}>{fmt(d.totalDebt)}</div>
        <div className="stamp-sub" style={{ color: '#8a8a90' }}>{tt('across')} {state.loans.length} {tt('loans')}</div>
      </div>

      <div className="grid debt-stats" style={{ marginBottom: 12 }}>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Monthly repayment')}</span></div>
          <div className="card-value mono">{fmt(d.monthlyTotal)}</div>
          {d.loansWithoutPayment > 0 && (
            <div className="card-sub" style={{ color: 'var(--amber)' }}>
              {d.loansWithoutPayment} {tt('without a payment yet')}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Time to clear all')}</span><InfoTip infoKey="debt_payoff" /></div>
          <div className="card-value mono">{d.payoffMonths != null ? monthsLabel(d.payoffMonths) : '—'}</div>
          {d.payoffMonths != null && d.payoffMonths > 0 && (
            <div className="card-sub">{tt('by')} {labelShortKey(payoffDateKey(d.payoffMonths))}</div>
          )}
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Banks')}</span></div>
          <div className="card-value mono">{d.byBank.length}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-label"><span className="st-l">{tt('Debt by bank')}<InfoTip infoKey="debt_by_bank" /></span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 6 }}>
          {d.byBank.map((b) => (
            <div key={b.bank}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{b.bank === 'Other' ? tt('Other') : b.bank}</span>
                <span className="mono" style={{ fontSize: 13 }}>{fmt(b.debt)}</span>
              </div>
              <div className="mg-track"><div className="mg-fill" style={{ width: Math.round((b.debt / maxBankDebt) * 100) + '%' }} /></div>
              <div className="rec-range" style={{ marginTop: 4 }}>
                {b.count} {tt('loans')}
                {b.monthly > 0 && <> · {fmt(b.monthly)}/{tt('mo')}</>}
                {b.payoffMonths != null && b.payoffMonths > 0 && <> · {monthsLabel(b.payoffMonths)}</>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LoanCard({ l }: { l: Loan }) {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);

  const debtOwn = loanCurrentDebt(l);
  const pay = Number(l.payment) || 0;
  const payoff = loanPayoffMonths(l);
  const baseNote = l.cur !== state.baseCur ? ' · ≈ ' + fmt(toKZT(state, debtOwn, l.cur)) : '';
  const isManualSchedule = l.source !== 'import' && l.debt == null;
  const st = isManualSchedule ? loanStats(l) : null;

  return (
    <div className="rec-card">
      <div className="rec-info">
        <div className="rec-name">
          {l.name}
          {l.kind && l.source === 'import' && <> <span className="tag">{l.kind}</span></>}
          {l.contract && <> <span className="tag" style={{ fontFamily: 'var(--mono)', fontSize: 9 }}>{l.contract}</span></>}
          {l.rate != null && l.rate > 0 && <> <span className="tag">{l.rate}%</span></>}
        </div>
        <div className="rec-range">
          {tt('Remaining debt')}: <b>{fmtCur(debtOwn, l.cur)}</b>{baseNote}
        </div>
        {st && (
          <div className="mg-track" style={{ margin: '8px 0 4px' }}>
            <div className="mg-fill" style={{ width: Math.round(st.progress * 100) + '%' }} />
          </div>
        )}
        <div className="rec-range" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {pay > 0 ? (
            <>
              <span>{fmtCur(pay, l.cur)}/{tt('mo')}</span>
              {payoff != null && payoff > 0 && <span>· {monthsLabel(payoff)} {tt('left')}</span>}
            </>
          ) : (
            <button className="btn btn-secondary btn-small" onClick={() => openModal({ type: 'loan', id: l.id })}>
              + {tt('Add monthly payment')}
            </button>
          )}
        </div>
      </div>
      <div className="rec-right">
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
}

function LoanGroups() {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);

  if (!state.loans.length)
    return <div className="empty">{tt('No loans yet. Import a bank debt certificate (PDF), or add one manually — the monthly payment is counted in every month automatically.')}</div>;

  // group by bank, ordered by total debt desc
  const groups = new Map<string, Loan[]>();
  state.loans.forEach((l) => {
    const k = bankKey(l);
    (groups.get(k) || groups.set(k, []).get(k)!).push(l);
  });
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    const da = a[1].reduce((s, l) => s + toKZT(state, loanCurrentDebt(l), l.cur), 0);
    const db = b[1].reduce((s, l) => s + toKZT(state, loanCurrentDebt(l), l.cur), 0);
    return db - da;
  });

  return (
    <>
      {ordered.map(([bank, loans]) => (
        <div key={bank} style={{ marginBottom: 18 }}>
          <div className="section-title"><span className="st-l">{bank === 'Other' ? tt('Other') : bank}</span></div>
          {loans
            .slice()
            .sort((a, b) => toKZT(state, loanCurrentDebt(b), b.cur) - toKZT(state, loanCurrentDebt(a), a.cur))
            .map((l) => <LoanCard key={l.id} l={l} />)}
        </div>
      ))}
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
        <button className="btn btn-primary" onClick={() => openModal({ type: 'importDebts' })}>{tt('Import from bank PDF')}</button>
        <button className="btn btn-secondary" onClick={() => openModal({ type: 'loan', id: null })}>{tt('+ Add loan')}</button>
      </div>
      <DebtDashboard />
      <div id="loan-list"><LoanGroups /></div>
    </>
  );
}

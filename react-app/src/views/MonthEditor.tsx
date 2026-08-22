import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { ChevronLeft, ChevronRight, TrashIcon, WarnIcon, CheckIcon, InfoCircleIcon } from '../components/icons';
import { MoneyInput, TextCell } from '../components/MoneyInput';
import { CurSelect, CatSelect } from '../components/FormFields';
import { DonutCard, RingSvg } from '../components/charts';
import { tt, catLabel, monthFull, monthShort } from '../i18n';
import { fmt, fmtCur, fmtNum, uid } from '../lib/format';
import { nowKey, isPast, shiftKey, keyMonth, keyYear } from '../lib/dates';
import {
  monthTotals,
  recurringForMonth,
  recEffectiveActual,
  monthCategoryBreakdown,
  goalSaved,
  goalNeededPerMonth,
  toKZT,
} from '../lib/money';
import type { PlannerState, Currency } from '../types';

const CATLIST_ID = 'cat-list';
const INCLIST_ID = 'inc-list';

function Datalists({ state }: { state: PlannerState }) {
  const cats: Record<string, 1> = {};
  const incs: Record<string, 1> = {};
  Object.keys(state.months).forEach((k) => {
    state.months[k].expenses.forEach((e) => e.name && (cats[e.name] = 1));
    state.months[k].incomes.forEach((i) => i.name && (incs[i.name] = 1));
  });
  return (
    <>
      <datalist id={CATLIST_ID}>{Object.keys(cats).map((c) => <option key={c} value={c} />)}</datalist>
      <datalist id={INCLIST_ID}>{Object.keys(incs).map((c) => <option key={c} value={c} />)}</datalist>
    </>
  );
}

function MonthStats({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);
  const m = state.months[k];
  const t = monthTotals(state, k);
  let last;
  if (m?.closed) {
    last = (
      <div className="card invert">
        <div className="card-label"><span className="st-l">{tt('Banked')} ✓</span><InfoTip infoKey="mo_banked" /></div>
        <div className="card-value">{fmt(m.leftover || 0)}</div>
        <div className="card-sub">{tt('added to net worth')}</div>
      </div>
    );
  } else if (isPast(k)) {
    last = (
      <div className="card invert">
        <div className="card-label"><span className="st-l">{tt('Month passed')}</span><InfoTip infoKey="mo_passed" /></div>
        <div className="card-value">{fmt(0)}</div>
        <div className="card-sub">{tt('close it to bank what is left')}</div>
      </div>
    );
  } else {
    last = (
      <div className="card invert">
        <div className="card-label"><span className="st-l">{tt('Free to spend')} ✨</span><InfoTip infoKey="mo_free" /></div>
        <div className="card-value">{fmt(t.free)}</div>
        <div className="card-sub">{tt('income − plan (incl. savings)')}</div>
      </div>
    );
  }
  return (
    <div className="grid stats-grid" id="mo-stats">
      <div className="card">
        <div className="card-label"><span className="st-l">{tt('Income')}</span><InfoTip infoKey="mo_income" /></div>
        <div className="card-value green">{fmt(t.income)}</div>
      </div>
      <div className="card">
        <div className="card-label"><span className="st-l">{tt('Spent')}</span><InfoTip infoKey="mo_spent" /></div>
        <div className={'card-value ' + (t.deviation > 0 ? 'pink' : '')}>{fmt(t.actual)}</div>
        <div className="card-sub">{t.spentPct}% {tt('of income')} · {tt('planned')} {fmt(t.planned)}</div>
      </div>
      <div className="card">
        <div className="card-label"><span className="st-l">{tt('Saved')}</span><InfoTip infoKey="mo_saved" /></div>
        <div className="card-value green">{fmt(t.saved)}</div>
        <div className="card-sub">{tt('counted in expenses')}</div>
      </div>
      {last}
    </div>
  );
}

function VarianceTag({ planned, actual, cur }: { planned: number; actual: number; cur: Currency }) {
  const dev = (Number(actual) || 0) - (Number(planned) || 0);
  if (dev > 0) return <span className="tag over">+{fmtCur(dev, cur)}</span>;
  if (dev < 0) return <span className="tag under">{fmtCur(dev, cur)}</span>;
  return <span className="tag">{tt('on plan')}</span>;
}

function IncomeTable({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);
  const m = state.months[k];
  const recInc = recurringForMonth(state, k).filter((r) => r.type === 'income');
  const t = monthTotals(state, k);

  if (!m.incomes.length && !recInc.length)
    return <div className="empty" style={{ border: 'none' }}>{tt('No income yet. Add salary, bonus — or set it up once in Recurring.')}</div>;

  return (
    <table style={{ minWidth: 380 }}>
      <thead>
        <tr><th>{tt('Source')}</th><th style={{ textAlign: 'right' }}>{tt('Amount')}</th><th></th><th style={{ width: 38 }}></th></tr>
      </thead>
      <tbody>
        {recInc.map((r) => (
          <tr key={r.id}>
            <td style={{ paddingLeft: 8 }}>{r.name} <span className="tag rec">{tt('recurring')}</span></td>
            <td style={{ textAlign: 'right' }} className="mono green">{fmtCur(r.amount, r.cur)}</td>
            <td></td><td></td>
          </tr>
        ))}
        {m.incomes.map((i) => (
          <tr key={i.id}>
            <td>
              <TextCell className="cell-input" list={INCLIST_ID} value={i.name} placeholder={tt('Source')}
                onCommit={(v) => commit((s) => { const it = s.months[k].incomes.find((x) => x.id === i.id); if (it) it.name = v; })} />
            </td>
            <td>
              <MoneyInput className="cell-input mono in" value={i.amount}
                onCommit={(v) => commit((s) => { const it = s.months[k].incomes.find((x) => x.id === i.id); if (it) it.amount = v; })} />
            </td>
            <td>
              <CurSelect value={i.cur} onChange={(c) => commit((s) => { const it = s.months[k].incomes.find((x) => x.id === i.id); if (it) it.cur = c; })} />
            </td>
            <td>
              <button className="icon-btn" onClick={() => commit((s) => { s.months[k].incomes = s.months[k].incomes.filter((x) => x.id !== i.id); })}><TrashIcon /></button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr><td>{tt('Total (KZT)')}</td><td style={{ textAlign: 'right' }}>{fmt(t.income)}</td><td></td><td></td></tr>
      </tfoot>
    </table>
  );
}

function ExpenseTable({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);
  const m = state.months[k];
  const recExp = recurringForMonth(state, k).filter((r) => r.type === 'expense');
  const t = monthTotals(state, k);
  const savRows = state.goals.filter((g) => (Number(g.contribs[k]) || 0) > 0);

  if (!m.expenses.length && !recExp.length && !savRows.length)
    return <div className="empty" style={{ border: 'none' }}>{tt('No planned expenses yet.')}</div>;

  return (
    <table style={{ minWidth: 680 }}>
      <thead>
        <tr>
          <th>{tt('Name')}</th><th>{tt('Category')}</th><th style={{ textAlign: 'right' }}>{tt('Planned')}</th>
          <th style={{ textAlign: 'right' }}>{tt('Actual')}</th><th></th><th style={{ textAlign: 'right' }}>{tt('Variance')}</th><th style={{ width: 38 }}></th>
        </tr>
      </thead>
      <tbody>
        {recExp.map((r) => {
          const recorded = m.recActuals[r.id] != null ? m.recActuals[r.id] : undefined;
          const eff = recEffectiveActual(k, m, r);
          return (
            <tr key={r.id}>
              <td style={{ paddingLeft: 8, whiteSpace: 'nowrap' }}>{r.name} <span className="tag rec">{tt('recurring')}</span></td>
              <td><span className="tag">{catLabel(r.category)}</span></td>
              <td style={{ textAlign: 'right' }} className="mono">{fmtCur(r.amount, r.cur)}</td>
              <td>
                <MoneyInput className="cell-input mono out" value={recorded} placeholder={fmtNum(eff)}
                  onCommit={(v) => commit((s) => { s.months[k].recActuals[r.id] = v; })} />
              </td>
              <td style={{ textAlign: 'center' }} className="mono">{r.cur}</td>
              <td style={{ textAlign: 'right' }}><VarianceTag planned={r.amount} actual={eff} cur={r.cur} /></td>
              <td></td>
            </tr>
          );
        })}
        {savRows.map((g) => {
          const c = Number(g.contribs[k]) || 0;
          return (
            <tr key={'sav-' + g.id}>
              <td style={{ paddingLeft: 8, whiteSpace: 'nowrap' }}>→ {g.name} <span className="tag sav">{tt('savings')}</span></td>
              <td><span className="tag">{catLabel('Savings')}</span></td>
              <td style={{ textAlign: 'right' }} className="mono">{fmtNum(c)}</td>
              <td style={{ textAlign: 'right' }} className="mono">{fmtNum(c)}</td>
              <td style={{ textAlign: 'center' }} className="mono">KZT</td>
              <td style={{ textAlign: 'right' }}><span className="tag">{tt('on plan')}</span></td>
              <td></td>
            </tr>
          );
        })}
        {m.expenses.map((e) => (
          <tr key={e.id}>
            <td>
              <TextCell className="cell-input" list={CATLIST_ID} value={e.name} placeholder={tt('Name')}
                onCommit={(v) => commit((s) => { const it = s.months[k].expenses.find((x) => x.id === e.id); if (it) it.name = v; })} />
            </td>
            <td>
              <CatSelect value={e.category || 'Other'} onChange={(c) => commit((s) => { const it = s.months[k].expenses.find((x) => x.id === e.id); if (it) it.category = c; })} />
            </td>
            <td>
              <MoneyInput className="cell-input mono" value={e.planned}
                onCommit={(v) => commit((s) => { const it = s.months[k].expenses.find((x) => x.id === e.id); if (it) it.planned = v; })} />
            </td>
            <td>
              <MoneyInput className="cell-input mono out" value={e.actual}
                onCommit={(v) => commit((s) => { const it = s.months[k].expenses.find((x) => x.id === e.id); if (it) it.actual = v; })} />
            </td>
            <td>
              <CurSelect value={e.cur} onChange={(c) => commit((s) => { const it = s.months[k].expenses.find((x) => x.id === e.id); if (it) it.cur = c; })} />
            </td>
            <td style={{ textAlign: 'right' }}><VarianceTag planned={e.planned} actual={e.actual} cur={e.cur} /></td>
            <td>
              <button className="icon-btn" onClick={() => commit((s) => { s.months[k].expenses = s.months[k].expenses.filter((x) => x.id !== e.id); })}><TrashIcon /></button>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={2}>{tt('Total (KZT)')}</td>
          <td style={{ textAlign: 'right' }}>{fmt(t.planned)}</td>
          <td style={{ textAlign: 'right' }}>{fmt(t.actual)}</td>
          <td></td>
          <td style={{ textAlign: 'right' }} className={t.deviation > 0 ? 'pink' : 'green'}>{(t.deviation >= 0 ? '+' : '') + fmt(t.deviation)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );
}

function SavingsSection({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);
  if (!state.goals.length)
    return <div className="empty" style={{ border: 'none' }}>{tt('No savings goals yet. Create one in Savings — contributions land in this month’s expenses.')}</div>;
  return (
    <>
      {state.goals.map((g) => {
        const saved = goalSaved(g);
        const pct = g.target > 0 ? Math.min(100, Math.round((saved / g.target) * 100)) : 0;
        const need = goalNeededPerMonth(g);
        const hint = need != null ? tt('needs') + ' ' + fmt(need) + '/' + tt('mo') : pct + '% ' + tt('complete');
        const val = Number(g.contribs[k]) || 0;
        return (
          <div className="mini-goal" key={g.id}>
            <div style={{ minWidth: 0 }}>
              <div className="mg-name">{g.name}</div>
              <div className="mg-track"><div className="mg-fill" style={{ width: pct + '%' }} /></div>
              <div className="mg-hint">{hint}</div>
            </div>
            <MoneyInput
              className="cell-input mono in"
              value={val}
              title="Contribution this month (KZT)"
              onCommit={(v) =>
                commit((s) => {
                  const goal = s.goals.find((x) => x.id === g.id);
                  if (!goal) return;
                  if (v <= 0) delete goal.contribs[k];
                  else goal.contribs[k] = v;
                })
              }
            />
          </div>
        );
      })}
    </>
  );
}

function MonthAnalytics({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);
  const t = monthTotals(state, k);
  const color = t.spentPct > 100 ? 'var(--pink)' : t.spentPct > 80 ? 'var(--amber)' : 'var(--green)';
  const savePct = t.income > 0 ? Math.round((t.saved / t.income) * 100) : 0;
  return (
    <>
      <div className="card" id="ring-card">
        <div className="card-label"><span className="st-l">{tt('Spent of income')}</span><InfoTip infoKey="ring_info" /></div>
        <div className="ring-wrap">
          <RingSvg pct={t.spentPct} color={color} />
          <div className="ring-stats">
            <div className="ring-stat"><div className="rs-label">{tt('Spent')}</div><div className="rs-value">{fmt(t.actual)}</div></div>
            <div className="ring-stat"><div className="rs-label">{tt('of it saved')} · {savePct}%</div><div className="rs-value green">{fmt(t.saved)}</div></div>
            <div className="ring-stat"><div className="rs-label">{tt('Left free')}</div><div className={'rs-value ' + (t.free >= 0 ? '' : 'pink')}>{fmt(t.free)}</div></div>
          </div>
        </div>
      </div>
      <div style={{ height: 12 }} />
      <DonutCard title={tt('Actual spending by category')} entries={monthCategoryBreakdown(state, k, 'actual')} infoKey="pie_actual" />
      <div style={{ height: 12 }} />
      <DonutCard title={tt('Planned by category')} entries={monthCategoryBreakdown(state, k, 'planned')} infoKey="pie_planned" />
    </>
  );
}

function MonthInsights({ k }: { k: string }) {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);
  const t = monthTotals(state, k);
  const m = state.months[k];
  const recExp = recurringForMonth(state, k).filter((r) => r.type === 'expense');
  const list: { type: 'warn' | 'good' | 'info'; text: string }[] = [];

  if (isPast(k) && !m.closed) list.push({ type: 'warn', text: tt('This month has passed — close it to bank the leftover into your net worth.') });
  if (m.closed) list.push({ type: 'good', text: tt('Closed —') + ' ' + fmt(m.leftover || 0) + ' ' + tt('banked to net worth') + '.' });
  if (t.income === 0 && (m.expenses.length || recExp.length)) list.push({ type: 'info', text: tt('No income logged yet — add it to see what is free to spend.') });
  if (t.income > 0 && t.planned > t.income) list.push({ type: 'warn', text: tt('The plan (incl. savings) exceeds income by') + ' ' + fmt(t.planned - t.income) + '. ' + tt('Something needs to shrink.') });
  else if (t.income > 0 && t.free > 0 && !m.closed && !isPast(k)) list.push({ type: 'good', text: fmt(t.free) + ' ' + tt('is unallocated — free to spend, or push it into a goal.') });

  const overs: { name: string; dev: number }[] = [];
  m.expenses.forEach((e) => {
    const dev = toKZT(state, e.actual, e.cur) - toKZT(state, e.planned, e.cur);
    if (dev > 0 && e.planned > 0) overs.push({ name: e.name || e.category || 'Unnamed', dev });
  });
  recExp.forEach((r) => {
    const a = recEffectiveActual(k, m, r);
    const dev = toKZT(state, a, r.cur) - toKZT(state, r.amount, r.cur);
    if (dev > 0) overs.push({ name: r.name, dev });
  });
  if (overs.length) {
    overs.sort((a, b) => b.dev - a.dev);
    list.push({ type: 'warn', text: '“' + overs[0].name + '” ' + tt('is over plan by') + ' ' + fmt(overs[0].dev) + '.' });
  }
  state.goals.forEach((g) => {
    const need = goalNeededPerMonth(g);
    if (need == null || need <= 0) return;
    const c = Number(g.contribs[k]) || 0;
    if (c < need && t.free > 0 && !isPast(k)) {
      list.push({ type: 'info', text: '“' + g.name + '” ' + tt('needs') + ' ' + fmt(need) + ' ' + tt('to stay on track —') + ' ' + fmt(c) + ' ' + tt('contributed so far this month.') });
    }
  });
  if (recExp.length) {
    const recTotal = recExp.reduce((s, r) => s + toKZT(state, r.amount, r.cur), 0);
    list.push({ type: 'info', text: recExp.length + ' ' + (recExp.length === 1 ? tt('recurring payment auto-included') : tt('recurring payments auto-included')) + ': ' + fmt(recTotal) + '/' + tt('mo') + '.' });
  }
  if (!list.length) list.push({ type: 'info', text: tt('Add income and planned expenses to see insights.') });

  return (
    <div className="insights" id="mo-insights">
      {list.slice(0, 6).map((i, idx) => (
        <div className={'insight ' + i.type} key={idx}>
          {i.type === 'warn' ? <WarnIcon /> : i.type === 'good' ? <CheckIcon /> : <InfoCircleIcon />}
          <div>{i.text}</div>
        </div>
      ))}
    </div>
  );
}

export function MonthEditor() {
  const state = useStore((s) => s.state);
  const k = useStore((s) => s.openMonthKey)!;
  const openMonth = useStore((s) => s.openMonth);
  const setView = useStore((s) => s.setView);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);

  const m = state.months[k];
  if (!m) return null;
  const prevK = shiftKey(k, -1);
  const prevM = state.months[prevK];
  const canCopy = m.expenses.length === 0 && prevM && prevM.expenses.length > 0;
  const closable = k <= nowKey() && !m.closed;
  const full = monthFull();
  const short = monthShort();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{full[keyMonth(k) - 1]}</h1>
          <div className="subtitle mono">
            {keyYear(k)}
            {m.closed && (
              <span className="badge closed" style={{ fontSize: '9.5px', padding: '5px 12px', verticalAlign: 'middle', marginLeft: 8 }}>
                {tt('Banked')} · {fmt(m.leftover || 0)}
              </span>
            )}
          </div>
        </div>
        <div className="yearswitch">
          <button onClick={() => openMonth(shiftKey(k, -1))}><ChevronLeft /></button>
          <span className="yr mono" style={{ minWidth: 46 }}>{short[keyMonth(k) - 1]}</span>
          <button onClick={() => openMonth(shiftKey(k, 1))}><ChevronRight /></button>
        </div>
      </div>

      <MonthStats k={k} />

      <div className="actions">
        {canCopy && (
          <button
            className="btn btn-secondary btn-small"
            onClick={() =>
              commit((s) => {
                const src = s.months[prevK];
                src.expenses.forEach((e) => {
                  s.months[k].expenses.push({ id: uid(), name: e.name || '', category: e.category || 'Other', planned: e.planned, actual: 0, cur: e.cur || 'KZT' });
                });
              })
            }
          >
            {tt('Copy plan from')} {full[keyMonth(prevK) - 1]}
          </button>
        )}
        {closable && (
          <button className="btn btn-primary btn-small" onClick={() => openModal({ type: 'closeMonth', k })}>
            {tt('Close month · bank the leftover')}
          </button>
        )}
        {m.closed && (
          <button
            className="btn btn-secondary btn-small"
            onClick={() =>
              askConfirm(
                'Reopen ' + full[keyMonth(k) - 1] + ' ' + keyYear(k) + '? Its banked leftover of ' + fmt(m.leftover || 0) + ' will be removed from net worth.',
                () =>
                  commit((s) => {
                    s.months[k].closed = false;
                    delete s.months[k].leftover;
                  }),
              )
            }
          >
            {tt('Reopen month')}
          </button>
        )}
      </div>

      <div className="mo-layout">
        <div className="mo-col">
          <div className="section-title"><span className="st-l">{tt('Income')}<InfoTip infoKey="sec_income" /></span>
            <button className="inline-btn" onClick={() => openModal({ type: 'income', k })}>{tt('+ Add income')}</button></div>
          <div className="card table-card scroll-x"><IncomeTable k={k} /></div>

          <div className="section-title"><span className="st-l">{tt('Expenses')}<InfoTip infoKey="sec_expenses" /></span>
            <button className="inline-btn" onClick={() => openModal({ type: 'expense', k })}>{tt('+ Add expense')}</button></div>
          <div className="card table-card scroll-x" id="expense-card"><ExpenseTable k={k} /></div>

          <div className="section-title"><span className="st-l">{tt('Savings this month')}<InfoTip infoKey="sec_savings" /></span>
            <button className="inline-btn" onClick={() => setView('savings')}>{tt('Manage goals')}</button></div>
          <div className="card" id="savings-card"><SavingsSection k={k} /></div>
        </div>
        <div className="mo-col">
          <div className="section-title">{tt('Month analytics')}</div>
          <MonthAnalytics k={k} />
          <div className="section-title"><span className="st-l">{tt('Insights')}<InfoTip infoKey="insights_info" /></span></div>
          <MonthInsights k={k} />
        </div>
      </div>
      <Datalists state={state} />
    </>
  );
}

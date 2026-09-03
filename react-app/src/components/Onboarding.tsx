import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tt, catLabel } from '../i18n';
import { CURRENCIES, CUR_SYMBOLS, REC_CATEGORIES } from '../constants';
import { uid, parseAmt, fmt } from '../lib/format';
import { toKZT } from '../lib/money';
import { nowKey, shiftKey, monthsBetween } from '../lib/dates';
import type { Currency } from '../types';

interface IncRow { name: string; amount: string; cur: Currency }
interface ExpRow { name: string; category: string; amount: string; cur: Currency }
interface GoalRow { name: string; target: string; deadline: string }

const STEP_LABELS = ['Welcome', 'Income', 'Expenses', 'Goals'];
const NEXT_LABELS = ['Get started', 'Next', 'Next', 'Next', 'Open my planner'];

export function Onboarding() {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const endOnboarding = useStore((s) => s.endOnboarding);
  useStore((s) => s.lang);

  const base = state.baseCur;
  const [step, setStep] = useState(0);
  const [incomes, setIncomes] = useState<IncRow[]>([{ name: '', amount: '', cur: base }]);
  const [expenses, setExpenses] = useState<ExpRow[]>([{ name: '', category: 'Housing', amount: '', cur: base }]);
  const [hasGoals, setHasGoals] = useState(true);
  const [goals, setGoals] = useState<GoalRow[]>([{ name: '', target: '', deadline: shiftKey(nowKey(), 12) }]);

  // ---- summary preview (converts each row to the base currency) ----
  const incTotal = incomes.reduce((a, r) => a + toKZT(state, parseAmt(r.amount), r.cur), 0);
  const expTotal = expenses.reduce((a, r) => a + toKZT(state, parseAmt(r.amount), r.cur), 0);
  const goalMonthly = hasGoals
    ? goals.reduce((a, g) => {
        const t = parseAmt(g.target);
        const months = g.deadline ? Math.max(1, monthsBetween(nowKey(), g.deadline)) : 12;
        return a + t / months;
      }, 0)
    : 0;
  const free = incTotal - expTotal - goalMonthly;

  function finish() {
    commit((s) => {
      const start = nowKey();
      incomes.forEach((r) => {
        const amt = parseAmt(r.amount);
        if (amt > 0) s.recurring.push({ id: uid(), name: r.name.trim() || tt('Income'), type: 'income', category: 'Income', amount: amt, cur: r.cur, start, end: null });
      });
      expenses.forEach((r) => {
        const amt = parseAmt(r.amount);
        if (amt > 0) s.recurring.push({ id: uid(), name: r.name.trim() || catLabel(r.category), type: 'expense', category: r.category, amount: amt, cur: r.cur, start, end: null });
      });
      if (hasGoals)
        goals.forEach((g) => {
          const t = parseAmt(g.target);
          if (t > 0) s.goals.push({ id: uid(), name: g.name.trim() || tt('Goal'), target: t, deadline: g.deadline || null, contribs: {} });
        });
      s.tourDone = true; // first-run intro is done; the tour stays available from the Guide button
    });
    toast(tt('All set — welcome to your planner!'));
    endOnboarding();
  }

  function go(d: number) {
    const nextStep = Math.max(0, Math.min(4, step + d));
    if (step === 4 && d > 0) return finish();
    setStep(nextStep);
  }
  function skipGoals() {
    setHasGoals(false);
    setStep(4);
  }

  // row helpers
  const setInc = (i: number, patch: Partial<IncRow>) => setIncomes((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setExp = (i: number, patch: Partial<ExpRow>) => setExpenses((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setGoal = (i: number, patch: Partial<GoalRow>) => setGoals((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const curOptions = CURRENCIES.map((c) => (
    <option key={c} value={c}>{CUR_SYMBOLS[c]}</option>
  ));

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-label={tt('Set up your planner')}>
      <div className="ob-wiz">
        <div className="ob-head">
          <div className="brand"><span className="dot" />{tt('Money Planner')} · {tt('Setup')}</div>
          <div className="ob-steps">
            {STEP_LABELS.map((l, i) => (
              <div key={l} className={'s' + (i < step ? ' done' : '') + (i === step ? ' active' : '')}>
                <div className="bar" />
                <div className="lbl">{tt(l)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ob-body">
          {step === 0 && (
            <>
              <div className="ob-eyebrow">{tt("Let's set up your planner")}</div>
              <h1>{tt('A minute of setup, then it does the math')}</h1>
              <p className="ob-lede">{tt("Money Planner doesn't want every transaction — just the shape of your month. Tell it what comes in and what goes out, and it tells you what's free to spend.")}</p>
              <ul className="ob-points">
                <li><span className="ic">＋</span><div><b>{tt('Your monthly income')}</b><p>{tt('Salary and anything else that lands every month.')}</p></div></li>
                <li><span className="ic">↻</span><div><b>{tt('Your regular expenses')}</b><p>{tt('Rent, subscriptions, loans — set once, counted every month automatically.')}</p></div></li>
                <li><span className="ic">◎</span><div><b>{tt('Your goals')}</b><p>{tt("Optional. Saving for something? We'll track the pace.")}</p></div></li>
              </ul>
              <p className="ob-hint">{tt('You can change or add anything later — nothing here is final.')}</p>
            </>
          )}

          {step === 1 && (
            <>
              <div className="ob-eyebrow">{tt('Recurring income')}</div>
              <h1>{tt('What comes in each month?')}</h1>
              <p className="ob-lede">{tt('Add your salary and any other regular income. Each one repeats every month until you give it an end date.')}</p>
              <div style={{ marginTop: 18 }}>
                <div className="ob-colhead"><span>{tt('Source')}</span><span>{tt('Amount')}</span><span>{tt('Cur.')}</span><span /></div>
                <div className="ob-rowlist">
                  {incomes.map((r, i) => (
                    <div className="ob-row" key={i}>
                      <input placeholder={tt('e.g. Salary')} value={r.name} onChange={(e) => setInc(i, { name: e.target.value })} />
                      <input className="mono" inputMode="decimal" placeholder="0" value={r.amount} onChange={(e) => setInc(i, { amount: e.target.value })} />
                      <select className="cur" value={r.cur} onChange={(e) => setInc(i, { cur: e.target.value as Currency })}>{curOptions}</select>
                      <button className="ob-del" title={tt('Remove')} onClick={() => setIncomes((rs) => rs.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
                <button className="ob-add" onClick={() => setIncomes((rs) => [...rs, { name: '', amount: '', cur: base }])}>＋ {tt('Add another income')}</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="ob-eyebrow">{tt('Recurring expenses')}</div>
              <h1>{tt('What goes out each month?')}</h1>
              <p className="ob-lede">{tt('Your fixed monthly costs — rent, groceries, subscriptions, loan payments. Add as many as you like.')}</p>
              <div style={{ marginTop: 18 }}>
                <div className="ob-colhead exp"><span>{tt('Expense')}</span><span>{tt('Category')}</span><span>{tt('Amount')}</span><span>{tt('Cur.')}</span><span /></div>
                <div className="ob-rowlist">
                  {expenses.map((r, i) => (
                    <div className="ob-row exp" key={i}>
                      <input placeholder={tt('e.g. Rent')} value={r.name} onChange={(e) => setExp(i, { name: e.target.value })} />
                      <select value={r.category} onChange={(e) => setExp(i, { category: e.target.value })}>
                        {REC_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                      </select>
                      <input className="mono" inputMode="decimal" placeholder="0" value={r.amount} onChange={(e) => setExp(i, { amount: e.target.value })} />
                      <select className="cur" value={r.cur} onChange={(e) => setExp(i, { cur: e.target.value as Currency })}>{curOptions}</select>
                      <button className="ob-del" title={tt('Remove')} onClick={() => setExpenses((rs) => rs.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                </div>
                <button className="ob-add" onClick={() => setExpenses((rs) => [...rs, { name: '', category: 'Other', amount: '', cur: base }])}>＋ {tt('Add another expense')}</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="ob-eyebrow">{tt('Savings goals')}</div>
              <h1>{tt('Saving toward anything?')}</h1>
              <p className="ob-lede">{tt('Optional. Set a target and a deadline and the planner works out how much to set aside each month.')}</p>
              <div className="ob-seg">
                <button className={hasGoals ? 'on' : ''} onClick={() => setHasGoals(true)}>{tt('Yes, add a goal')}</button>
                <button className={hasGoals ? '' : 'on'} onClick={() => setHasGoals(false)}>{tt('Not right now')}</button>
              </div>
              {hasGoals ? (
                <div>
                  <div className="ob-colhead goal"><span>{tt('Goal')}</span><span>{tt('Target')}</span><span>{tt('By')}</span><span /></div>
                  <div className="ob-rowlist">
                    {goals.map((g, i) => (
                      <div className="ob-row goal" key={i}>
                        <input placeholder={tt('e.g. Emergency fund')} value={g.name} onChange={(e) => setGoal(i, { name: e.target.value })} />
                        <input className="mono" inputMode="decimal" placeholder="0" value={g.target} onChange={(e) => setGoal(i, { target: e.target.value })} />
                        <input type="month" value={g.deadline} onChange={(e) => setGoal(i, { deadline: e.target.value })} />
                        <button className="ob-del" title={tt('Remove')} onClick={() => setGoals((rs) => rs.filter((_, j) => j !== i))}>×</button>
                      </div>
                    ))}
                  </div>
                  <button className="ob-add" onClick={() => setGoals((rs) => [...rs, { name: '', target: '', deadline: shiftKey(nowKey(), 12) }])}>＋ {tt('Add another goal')}</button>
                </div>
              ) : (
                <p className="ob-hint">{tt('No problem — you can add goals any time from the Savings tab.')}</p>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="ob-eyebrow">{tt("You're all set")} ✨</div>
              <h1>{tt("Here's your month at a glance")}</h1>
              <div className="ob-stamp">
                <div className="k">{tt('Free to spend · this month')}</div>
                <div className="v">{fmt(free)}</div>
              </div>
              <div className="ob-break">
                <div className="ob-brow"><span className="n">{tt('Monthly income')}</span><span className="a pos">+{fmt(incTotal)}</span></div>
                <div className="ob-brow"><span className="n">{tt('Recurring expenses')}</span><span className="a neg">−{fmt(expTotal)}</span></div>
                <div className="ob-brow"><span className="n">{tt('Set aside for goals')}</span><span className="a neg">−{fmt(goalMonthly)}</span></div>
              </div>
              <p className="ob-hint">{tt('Opening your planner — you can fine-tune everything from here.')}</p>
            </>
          )}
        </div>

        <div className="ob-foot">
          <button className="btn btn-secondary" disabled={step === 0} onClick={() => go(-1)}>{tt('Back')}</button>
          {step === 3 && <button className="ob-skip" onClick={skipGoals}>{tt('Skip this step')}</button>}
          <button className="btn btn-primary" onClick={() => go(1)}>{tt(NEXT_LABELS[step])}</button>
        </div>
      </div>
    </div>
  );
}

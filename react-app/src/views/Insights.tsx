import { useState } from 'react';
import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { DebtProjectionChart } from '../components/charts';
import { tt, labelShortKey } from '../i18n';
import { fmt } from '../lib/format';
import { debtSummary } from '../lib/debt';
import { computeDebtPlan, type DebtStrategy } from '../lib/analysis/debtPlan';
import { computeSavingsInsight } from '../lib/analysis/savingsPlan';
import { computeBudgetInsight } from '../lib/analysis/budgetHealth';
import { recommendations, suggestedExtra, type Recommendation } from '../lib/analysis/recommend';

function monthsLabel(n: number): string {
  if (n <= 0) return '0 ' + tt('mo');
  if (n < 12) return n + ' ' + tt('mo');
  const y = Math.floor(n / 12);
  const m = n % 12;
  return y + ' ' + tt('yr') + (m ? ' ' + m + ' ' + tt('mo') : '');
}

function pct(n: number): string {
  return Math.round(n * 100) + '%';
}

function Meter({ value, color }: { value: number; color?: string }) {
  return (
    <div className="mg-track"><div className="mg-fill" style={{ width: Math.max(0, Math.min(100, Math.round(value * 100))) + '%', background: color }} /></div>
  );
}

/** Turn a language-agnostic recommendation into a title + detail line. */
function recText(r: Recommendation): { title: string; detail: string } {
  switch (r.kind) {
    case 'closeMonth':
      return { title: tt('Close a finished month'), detail: labelShortKey(r.monthKey) + ' — ' + tt('bank its leftover into net worth') };
    case 'setLoanPayment':
      return { title: tt('Add monthly payments to imported debts'), detail: r.count + ' ' + tt('loans have no payment set — add them to see repayment and payoff') };
    case 'extraToDebt':
      return {
        title: tt('Put') + ' ' + fmt(r.extra) + '/' + tt('mo') + ' ' + tt('extra toward') + ' ' + (r.bank === 'Other' ? tt('your debt') : r.bank),
        detail: tt('Debt-free') + ' ' + monthsLabel(r.monthsSaved) + ' ' + tt('sooner') + (r.hasRates && r.interestSaved > 0 ? ' · ' + tt('save') + ' ' + fmt(r.interestSaved) + ' ' + tt('interest') : ''),
      };
    case 'buildEmergency':
      return { title: tt('Build your emergency fund'), detail: (r.runway != null ? r.runway.toFixed(1) + ' ' + tt('mo') : '—') + ' ' + tt('of runway — aim for at least') + ' ' + r.targetMonths };
    case 'curbOverspend':
      return { title: tt('Rein in overspending'), detail: r.category + ' — ' + tt('over plan by') + ' ' + fmt(r.overBy) };
    case 'raiseSavingsRate':
      return { title: tt('Lift your savings rate'), detail: (r.rate != null ? pct(r.rate) : '—') + ' ' + tt('now — target') + ' ' + pct(r.target) };
    case 'trimFixedCosts':
      return { title: tt('Trim fixed costs'), detail: pct(r.ratio) + ' ' + tt('of income goes to fixed commitments') };
  }
}

export function Insights() {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);

  const ds = debtSummary(state);
  const [strategy, setStrategy] = useState<DebtStrategy>('avalanche');
  const [extra, setExtra] = useState(() => suggestedExtra(state));
  const plan = computeDebtPlan(state, { extra, strategy });
  const sv = computeSavingsInsight(state);
  const bud = computeBudgetInsight(state);
  const recs = recommendations(state);

  const hasAnything =
    state.loans.length || state.goals.length || state.recurring.length || state.assets.length || Object.keys(state.months).length;

  if (!hasAnything)
    return (
      <>
        <div className="page-head"><div><h1>{tt('Insights')}</h1><div className="subtitle">{tt('Your finances, analyzed')}</div></div></div>
        <div className="empty">{tt('Add some income, expenses, loans or goals and your personalized insights will appear here.')}</div>
      </>
    );

  const sliderMax = Math.max(Math.round((Math.max(plan.monthlyBase, 50000) * 2) / 10000) * 10000, extra, 50000);
  const runwayFill = sv.runway == null ? 0 : sv.runway / sv.runwayTargetMax;
  const runwayColor = sv.emergencyStatus === 'none' ? 'var(--pink)' : sv.emergencyStatus === 'building' ? 'var(--amber)' : 'var(--green)';
  const rateFill = sv.savingsRate == null ? 0 : sv.savingsRate / sv.savingsRateTarget;
  const fixedColor = bud.fixedCostStatus === 'severe' ? 'var(--pink)' : bud.fixedCostStatus === 'high' ? 'var(--amber)' : 'var(--green)';

  return (
    <>
      <div className="page-head">
        <div><h1>{tt('Insights')}</h1><div className="subtitle">{tt('Your finances, analyzed')}</div></div>
      </div>

      {/* headline stats */}
      <div className="grid stats-grid">
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Total debt')}</span></div>
          <div className="card-value mono">{fmt(ds.totalDebt)}</div>
          <div className="card-sub">{ds.byBank.length} {tt('banks')}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Monthly repayment')}</span></div>
          <div className="card-value mono">{fmt(ds.monthlyTotal)}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Savings rate')}</span></div>
          <div className="card-value mono">{sv.savingsRate == null ? '—' : pct(sv.savingsRate)}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Safety runway')}</span></div>
          <div className="card-value mono">{sv.runway == null ? '—' : sv.runway.toFixed(1) + ' ' + tt('mo')}</div>
        </div>
      </div>

      {/* debt payoff plan */}
      {ds.totalDebt > 0 && (
        <>
          <div className="section-title"><span className="st-l">{tt('Debt payoff plan')}<InfoTip infoKey="debt_payoff" /></span></div>
          <div className="card">
            <div className="seg" style={{ marginBottom: 14 }}>
              <button type="button" className={strategy === 'avalanche' ? 'on' : ''} onClick={() => setStrategy('avalanche')}>{tt('Avalanche (save most)')}</button>
              <button type="button" className={strategy === 'snowball' ? 'on' : ''} onClick={() => setStrategy('snowball')}>{tt('Snowball (quick wins)')}</button>
            </div>

            <div className="field">
              <label>{tt('Extra per month')}: <span className="mono">{fmt(extra)}</span></label>
              <input className="ext-slider" type="range" min={0} max={sliderMax} step={10000} value={Math.min(extra, sliderMax)} onChange={(e) => setExtra(parseInt(e.target.value, 10))} />
            </div>

            <div className="dash-hero" style={{ margin: '6px 0 14px' }}>
              <div className="card invert hero-card">
                <div className="card-label"><span className="st-l">{tt('Debt-free by')}</span></div>
                <div className="card-value">{plan.accelerated.debtFreeKey ? labelShortKey(plan.accelerated.debtFreeKey) : '—'}</div>
                <div className="card-sub">
                  {plan.monthsSaved > 0 ? monthsLabel(plan.monthsSaved) + ' ' + tt('sooner') : tt('on the current pace')}
                  {plan.hasRates && plan.interestSaved > 0 && <> · {fmt(plan.interestSaved)} {tt('interest saved')}</>}
                </div>
              </div>
            </div>

            <DebtProjectionChart startDebt={plan.totalDebt} baseline={plan.baseline.curve} accelerated={plan.accelerated.curve} />

            <div className="section-title" style={{ margin: '16px 0 8px' }}><span className="st-l">{tt('Payoff order')}</span></div>
            {plan.order.map((o, i) => (
              <div className="rec-card" key={o.id}>
                <div className="rec-info">
                  <div className="rec-name"><span className="tag">{i + 1}</span> {o.bank === 'Other' ? tt('Other') : o.bank}</div>
                </div>
                <div className="rec-right"><div className="rec-amt mono">{fmt(o.balance)}</div></div>
              </div>
            ))}

            {!plan.hasRates && <div className="card-sub" style={{ marginTop: 12 }}>{tt('Add interest rates to your loans to see exact interest saved.')}</div>}
            {plan.loansWithoutPayment > 0 && <div className="card-sub" style={{ color: 'var(--amber)' }}>{plan.loansWithoutPayment} {tt('debts have no payment set and are not in this projection.')}</div>}
          </div>
        </>
      )}

      {/* savings */}
      <div className="section-title"><span className="st-l">{tt('Savings & safety')}<InfoTip infoKey="ins_savings" /></span></div>
      <div className="card">
        <div className="mini-label">{tt('Emergency fund')} · {sv.runway == null ? '—' : sv.runway.toFixed(1) + '/' + sv.runwayTargetMax + ' ' + tt('mo')}</div>
        <Meter value={runwayFill} color={runwayColor} />
        <div style={{ height: 14 }} />
        <div className="mini-label">{tt('Savings rate')} · {sv.savingsRate == null ? '—' : pct(sv.savingsRate)} / {pct(sv.savingsRateTarget)} {tt('target')}</div>
        <Meter value={rateFill} color={sv.savingsRateOnTrack ? 'var(--green)' : 'var(--amber)'} />
        {sv.goals.length > 0 && (
          <>
            <div className="section-title" style={{ margin: '16px 0 8px' }}><span className="st-l">{tt('Goals')}</span></div>
            {sv.goals.map((g) => (
              <div className="rec-card" key={g.id}>
                <div className="rec-info">
                  <div className="rec-name">{g.name} {g.onTrack === false && <span className="tag" style={{ color: 'var(--amber)' }}>{tt('behind')}</span>}{g.onTrack === true && <span className="tag under">{tt('on track')}</span>}</div>
                  <Meter value={g.pctToTarget} />
                  <div className="rec-range">{fmt(g.saved)} / {fmt(g.target)}{g.neededPerMonth != null && <> · {tt('needs')} {fmt(g.neededPerMonth)}/{tt('mo')}</>}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* budget */}
      <div className="section-title"><span className="st-l">{tt('Budget health')}<InfoTip infoKey="ins_budget" /></span></div>
      <div className="card">
        <div className="mini-label">{tt('Fixed-cost ratio')} · {bud.fixedCostRatio == null ? '—' : pct(bud.fixedCostRatio)}</div>
        <Meter value={bud.fixedCostRatio || 0} color={fixedColor} />
        {bud.overspendCategories.length > 0 && (
          <>
            <div className="section-title" style={{ margin: '16px 0 8px' }}><span className="st-l">{tt('Over plan lately')}</span></div>
            {bud.overspendCategories.slice(0, 5).map((c) => (
              <div className="rec-card" key={c.category}>
                <div className="rec-info"><div className="rec-name">{c.category}</div></div>
                <div className="rec-right"><div className="rec-amt mono pink">+{fmt(c.overBy)}</div></div>
              </div>
            ))}
          </>
        )}
        <div className="card-sub" style={{ marginTop: 12 }}>{tt('Net worth this month')}: {(bud.netWorthDelta >= 0 ? '+' : '') + fmt(bud.netWorthDelta)}</div>
      </div>

      {/* recommendations */}
      {recs.length > 0 && (
        <>
          <div className="section-title"><span className="st-l">{tt('Do this next')}<InfoTip infoKey="ins_actions" /></span></div>
          {recs.map((r, i) => {
            const { title, detail } = recText(r);
            return (
              <div className="rec-card" key={r.kind + i}>
                <div className="rec-info">
                  <div className="rec-name"><span className="tag">{i + 1}</span> {title}</div>
                  <div className="rec-range">{detail}</div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

import { useStore } from '../store/useStore';
import { InfoTip } from '../components/InfoTip';
import { ChevronLeft, ChevronRight, EditIcon, TrashIcon, BoltIcon } from '../components/icons';
import { YearBars, NetWorthTrend } from '../components/charts';
import { tt, catLabel, labelFull, monthShort, monthFull } from '../i18n';
import { fmt, fmtCur } from '../lib/format';
import { mk, nowKey, keyMonth } from '../lib/dates';
import {
  yearTotals,
  netWorth,
  monthTotals,
  hasData,
  displayFree,
  bankedTotal,
  totalGoalsSaved,
  toKZT,
  yearCategoryAggregates,
} from '../lib/money';
import {
  savingsRate,
  netWorthDeltaThisMonth,
  runwayMonths,
  fixedCostsMonthly,
  liquidAssetsTotal,
  nextBestAction,
  type NextBestAction,
} from '../lib/metrics';
import { ASSET_KINDS } from '../constants';

function NBA() {
  const state = useStore((s) => s.state);
  const openMonth = useStore((s) => s.openMonth);
  const setView = useStore((s) => s.setView);
  useStore((s) => s.lang);
  const a: NextBestAction = nextBestAction(state);

  let text = '';
  let note = '';
  let view: 'month' | 'savings' | null = null;
  let cta = '';
  let key = '';
  switch (a.kind) {
    case 'closeMonth':
      text = tt('Close a finished month to bank its leftover into net worth.');
      note = labelFull(a.key);
      view = 'month';
      key = a.key;
      cta = tt('Open');
      break;
    case 'buildRunway':
      text = tt('Build your safety net toward 3–6 months of expenses.');
      note = a.months.toFixed(1) + ' ' + tt('mo');
      view = 'savings';
      cta = tt('Savings');
      break;
    case 'pushToGoal':
      text = tt('You have free cash this month — push some toward a goal.');
      note = fmt(a.free);
      view = 'savings';
      cta = tt('Savings');
      break;
    case 'firstGoal':
      text = tt('Set your first savings goal — a cushion, a trip, a big purchase.');
      view = 'savings';
      cta = tt('Savings');
      break;
    case 'onTrack':
      text = tt("You're on track — keep planning ahead.");
      break;
  }

  return (
    <div className="nba" id="nba">
      <div className="nba-icon">
        <BoltIcon />
      </div>
      <div className="nba-body">
        <div className="nba-text">
          {text}
          {note && <span className="nba-note mono">{note}</span>}
        </div>
      </div>
      {view && (
        <button
          className="btn btn-secondary btn-small nba-cta"
          id="nba-go"
          onClick={() => (view === 'month' ? openMonth(key) : setView(view!))}
        >
          {cta}
        </button>
      )}
    </div>
  );
}

function MonthsGrid() {
  const state = useStore((s) => s.state);
  const openMonth = useStore((s) => s.openMonth);
  useStore((s) => s.lang);
  const y = state.year;
  const cur = nowKey();
  const short = monthShort();
  return (
    <div className="grid months-grid" id="months-grid">
      {Array.from({ length: 12 }, (_, idx) => {
        const m = idx + 1;
        const k = mk(y, m);
        const cls = 'month-widget' + (k === cur ? ' current' : '');
        if (!hasData(state, k)) {
          return (
            <button className={cls} key={k} onClick={() => openMonth(k)}>
              <div className="mw-top"><span className="mw-name">{short[m - 1]}</span><span className="mw-dot" /></div>
              <div className="mw-value-row"><span className="mw-value muted mono">—</span></div>
              <div className="mw-sub">{tt('tap to plan')}</div>
            </button>
          );
        }
        const t = monthTotals(state, k);
        const df = displayFree(state, k);
        let dot: string;
        let valueNode;
        let sub;
        if (df.state === 'closed') {
          dot = 'closed';
          valueNode = <span className="mw-value mono amber">{fmt(df.val)}</span>;
          sub = tt('closed · banked to net worth');
        } else if (df.state === 'past') {
          dot = t.deviation > 0 ? 'over' : 'ok';
          valueNode = <span className="mw-value muted mono">{fmt(0)}</span>;
          sub = tt('passed · not closed');
        } else {
          dot = t.deviation > 0 ? 'over' : 'ok';
          valueNode = <span className={'mw-value mono ' + (df.val >= 0 ? 'green' : 'pink')}>{fmt(df.val)}</span>;
          sub = tt('free') + ' · ' + t.spentPct + '% ' + tt('of income spent');
        }
        return (
          <button className={cls} key={k} onClick={() => openMonth(k)}>
            <div className="mw-top"><span className="mw-name">{short[m - 1]}</span><span className={'mw-dot ' + dot} /></div>
            <div className="mw-value-row">
              {valueNode}
              <span className={'mw-pct' + (t.spentPct > 100 ? ' hot' : '')}>{t.spentPct}%</span>
            </div>
            <div className="mw-sub">{sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function TopCats() {
  const state = useStore((s) => s.state);
  useStore((s) => s.lang);
  const cats = yearCategoryAggregates(state, state.year).slice(0, 7);
  if (!cats.length)
    return (
      <div className="empty" style={{ border: 'none' }}>
        {tt('No actual spending recorded yet this year.')}
      </div>
    );
  const max = cats[0].val || 1;
  return (
    <>
      {cats.map((c) => (
        <div className="cat-row" key={c.name}>
          <div className="cat-name">{catLabel(c.name)}</div>
          <div className="cat-track">
            <div className="cat-fill" style={{ width: Math.round((c.val / max) * 100) + '%' }} />
          </div>
          <div className="cat-amt">{fmt(c.val)}</div>
        </div>
      ))}
    </>
  );
}

function AssetsList() {
  const state = useStore((s) => s.state);
  const openModal = useStore((s) => s.openModal);
  const askConfirm = useStore((s) => s.askConfirm);
  const commit = useStore((s) => s.commit);
  useStore((s) => s.lang);

  const banked = bankedTotal(state);
  const goalsS = totalGoalsSaved(state);
  const auto: JSX.Element[] = [];
  if (goalsS > 0)
    auto.push(
      <div className="rec-card" key="goals">
        <div className="rec-info"><div className="rec-name">{tt('Savings goals')} <span className="tag sav">{tt('auto')}</span></div>
          <div className="rec-range">{tt('total contributed across all goals')}</div></div>
        <div className="rec-right"><div className="rec-amt green">{fmt(goalsS)}</div></div>
      </div>,
    );
  if (banked > 0)
    auto.push(
      <div className="rec-card" key="banked">
        <div className="rec-info"><div className="rec-name">{tt('Banked leftovers')} <span className="tag closed">{tt('auto')}</span></div>
          <div className="rec-range">{tt('from closed months')}</div></div>
        <div className="rec-right"><div className="rec-amt amber">{fmt(banked)}</div></div>
      </div>,
    );

  if (!state.assets.length && !auto.length)
    return (
      <div className="empty">
        {tt('Add what you own (deposits, car, apartment share…) and what you owe. Net worth = assets − liabilities + savings + banked leftovers.')}
      </div>
    );

  return (
    <>
      {auto}
      {state.assets.map((a) => {
        const isL = a.kind === 'liability';
        const kztNote = a.cur !== 'KZT' ? ' · ≈ ' + fmt(toKZT(state, a.value, a.cur)) : '';
        const liqNote = !isL && a.liquid === false ? ' · ' + tt('not liquid') : '';
        return (
          <div className="rec-card" key={a.id}>
            <div className="rec-info">
              <div className="rec-name">
                {a.name} <span className={'tag ' + (isL ? 'over' : 'under')}>{tt(ASSET_KINDS[a.kind])}</span>
              </div>
              <div className="rec-range">{a.cur}{kztNote}{liqNote}</div>
            </div>
            <div className="rec-right">
              <div className={'rec-amt ' + (isL ? 'pink' : 'green')}>{(isL ? '−' : '+') + fmtCur(a.value, a.cur)}</div>
              <button className="icon-btn" onClick={() => openModal({ type: 'asset', id: a.id })}><EditIcon /></button>
              <button
                className="icon-btn"
                onClick={() =>
                  askConfirm('Remove "' + a.name + '" from net worth?', () =>
                    commit((s) => {
                      s.assets = s.assets.filter((x) => x.id !== a.id);
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

export function Dashboard() {
  const state = useStore((s) => s.state);
  const setYear = useStore((s) => s.setYear);
  const setView = useStore((s) => s.setView);
  const openModal = useStore((s) => s.openModal);
  useStore((s) => s.lang);

  const y = state.year;
  const t = yearTotals(state, y);
  const nw = netWorth(state);
  const cur = nowKey();
  const ct = monthTotals(state, cur);

  const sr = savingsRate(state, y);
  const srPct = sr == null ? null : Math.round(sr * 100);
  const srColor = sr == null ? '' : sr >= 0.2 ? 'green' : sr >= 0.1 ? '' : 'amber';
  const nwDelta = netWorthDeltaThisMonth(state);
  const deltaTxt = nwDelta > 0 ? '▲ +' + fmt(nwDelta) : nwDelta < 0 ? '▼ −' + fmt(Math.abs(nwDelta)) : tt('no change');
  const deltaCls = nwDelta > 0 ? 'green' : nwDelta < 0 ? 'pink' : '';
  const rw = runwayMonths(state);
  const rwColor = rw == null ? '' : rw < 1 ? 'pink' : rw < 3 ? 'amber' : 'green';
  const fixed = fixedCostsMonthly(state, cur);
  const incRef = ct.income > 0 ? ct.income : t.monthsWithData ? t.income / t.monthsWithData : 0;
  const frac = incRef > 0 ? fixed / incRef : null;
  const frPct = frac == null ? null : Math.round(frac * 100);
  const frColor = frac == null ? '' : frac > 0.6 ? 'pink' : frac > 0.4 ? 'amber' : 'green';
  const dNow = new Date();
  const dayN = dNow.getDate();
  const dim = new Date(dNow.getFullYear(), dNow.getMonth() + 1, 0).getDate();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{tt('Dashboard')}</h1>
          <div className="subtitle">{tt('Your year at a glance')}</div>
        </div>
        <div className="yearswitch">
          <button onClick={() => setYear(-1)}><ChevronLeft /></button>
          <span className="yr mono">{y}</span>
          <button onClick={() => setYear(1)}><ChevronRight /></button>
        </div>
      </div>

      <div className="dash-hero">
        <div className="card invert hero-card">
          <div className="card-label"><span className="st-l">{tt('Free to spend')} · {monthFull()[keyMonth(cur) - 1]}</span><InfoTip infoKey="free_now" /></div>
          <div className="card-value">{fmt(ct.free)}</div>
          <div className="card-sub">{fmt(ct.income)} {tt('income')} · {ct.spentPct}% {tt('spent')} · {tt('day')} {dayN}/{dim}</div>
        </div>
      </div>

      <NBA />

      <button className="analyze-card" onClick={() => setView('insights')}>
        <div>
          <div className="analyze-title">{tt('Analyze my finances')} <span className="tag ai">AI</span></div>
          <div className="analyze-sub">{tt('Debt payoff plan, savings & budget insights')}</div>
        </div>
        <ChevronRight />
      </button>

      <div className="grid stats-grid">
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Savings rate')} · {y}</span><InfoTip infoKey="savings_rate" /></div>
          <div className={'card-value ' + srColor}>{srPct == null ? '—' : srPct + '%'}</div>
          <div className="card-sub">{fmt(t.saved)} {tt('saved')}</div>
        </div>
        <div className="card invert">
          <div className="card-label"><span className="st-l">{tt('Net worth')} ✨</span><InfoTip infoKey="networth" /></div>
          <div className="card-value">{fmt(nw)}</div>
          <div className="card-sub"><span className={deltaCls}>{deltaTxt}</span> · {tt('this month')}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Safety runway')}</span><InfoTip infoKey="runway" /></div>
          <div className={'card-value ' + rwColor}>
            {rw == null ? '—' : (rw >= 100 ? '99+' : rw.toFixed(1))}
            {rw != null && <span className="cv-unit"> {tt('mo')}</span>}
          </div>
          <div className="card-sub">{rw == null ? tt('add liquid assets') : fmt(liquidAssetsTotal(state)) + ' ' + tt('liquid')}</div>
        </div>
        <div className="card">
          <div className="card-label"><span className="st-l">{tt('Fixed costs')}</span><InfoTip infoKey="fixed_ratio" /></div>
          <div className={'card-value ' + frColor}>{frPct == null ? '—' : frPct + '%'}</div>
          <div className="card-sub">{fmt(fixed)} · {tt('per month')}</div>
        </div>
      </div>

      <div className="section-title"><span className="st-l">{tt('Months')} · {y}<InfoTip infoKey="months" /></span></div>
      <MonthsGrid />

      <div className="section-title">
        <span className="st-l">{tt('Income vs spending')} · {y}<InfoTip infoKey="yearbars" /></span>
        <span className="st-cap mono">↑ {fmt(t.income)} · ↓ {fmt(t.actual)}</span>
      </div>
      <div className="card"><YearBars state={state} year={y} /></div>

      <div className="section-title"><span className="st-l">{tt('Net worth trend')} · {y}<InfoTip infoKey="nw_trend" /></span></div>
      <div className="card"><NetWorthTrend state={state} year={y} /></div>

      <div className="section-title"><span className="st-l">{tt('Top spending categories')} · {y}<InfoTip infoKey="topcats" /></span></div>
      <div className="card"><TopCats /></div>

      <div className="section-title">
        <span className="st-l">{tt('Assets & liabilities')}<InfoTip infoKey="assets_info" /></span>
        <button className="inline-btn" onClick={() => openModal({ type: 'asset', id: null })}>{tt('+ Add')}</button>
      </div>
      <div className="rec-list"><AssetsList /></div>
    </>
  );
}

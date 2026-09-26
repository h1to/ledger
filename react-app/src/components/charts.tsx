import { PIE_COLORS } from '../constants';
import type { CategoryAggregate, PlannerState } from '../types';
import { fmt } from '../lib/format';
import { catLabel, monthShort, tt } from '../i18n';
import { InfoTip } from './InfoTip';
import { hasData, monthTotals, netWorth } from '../lib/money';
import { netWorthSeries } from '../lib/metrics';
import { mk, nowKey, keyYear, keyMonth } from '../lib/dates';

export function DonutSvg({ entries, size = 130 }: { entries: CategoryAggregate[]; size?: number }) {
  const total = entries.reduce((s, e) => s + e.val, 0);
  if (total <= 0) return null;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {entries.map((e, i) => {
        const len = (e.val / total) * C;
        const seg = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={PIE_COLORS[i % PIE_COLORS.length]}
            strokeWidth={18}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        off += len;
        return seg;
      })}
    </svg>
  );
}

export function DonutCard({ title, entries, infoKey, pctOf }: { title: string; entries: CategoryAggregate[]; infoKey: string; pctOf?: number }) {
  const total = entries.reduce((s, e) => s + e.val, 0);
  // Legend percentages are shown relative to `pctOf` (e.g. income) when given, else to the
  // pie total. The donut arcs are always proportional to the pie total (a ring must fill 360°).
  const pctBase = pctOf && pctOf > 0 ? pctOf : total;
  const top = entries.slice(0, 8);
  return (
    <div className="card">
      <div className="card-label">
        <span className="st-l">{title}</span>
        <InfoTip infoKey={infoKey} />
      </div>
      {!entries.length ? (
        <div className="empty" style={{ border: 'none', padding: 22 }}>
          {tt('No data yet.')}
        </div>
      ) : (
        <div className="donut-wrap">
          <DonutSvg entries={top} />
          <div className="donut-legend">
            {top.map((e, i) => (
              <div className="dl-item" key={i}>
                <span className="dl-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {catLabel(e.name)}
                </span>
                <span className="dl-pct">{Math.round((e.val / pctBase) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RingSvg({ pct, color, size = 110 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const len = (C * p) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--card-3)" strokeWidth={12} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${len} ${C - len}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 6} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize={20} fontWeight={700} fill="var(--text)">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export function YearBars({ state, year }: { state: PlannerState; year: number }) {
  const data: { income: number; actual: number; planned: number }[] = [];
  let max = 1;
  let any = false;
  for (let m = 1; m <= 12; m++) {
    const k = mk(year, m);
    const t = hasData(state, k) ? monthTotals(state, k) : { income: 0, actual: 0, planned: 0 };
    if (hasData(state, k)) any = true;
    data.push({ income: t.income, actual: t.actual, planned: t.planned });
    max = Math.max(max, t.income, t.actual, t.planned);
  }
  if (!any)
    return (
      <div className="empty" style={{ border: 'none' }}>
        {tt('Nothing logged in')} {year}
      </div>
    );
  const short = monthShort();
  return (
    <>
      <div className="bars">
        {data.map((d, i) => {
          const inH = Math.round((d.income / max) * 126);
          const acH = Math.round((d.actual / max) * 126);
          const overP = d.actual > d.planned && d.planned > 0;
          return (
            <div className="bar-group" key={i}>
              <div className="bar-pair">
                <div className="bar" style={{ height: Math.max(inH, 2), background: 'var(--green)', opacity: d.income > 0 ? 1 : 0.15 }} />
                <div className="bar" style={{ height: Math.max(acH, 2), background: overP ? 'var(--pink)' : 'var(--white)', opacity: d.actual > 0 ? 0.9 : 0.12 }} />
              </div>
              <div className="bar-month">{short[i].charAt(0)}</div>
            </div>
          );
        })}
      </div>
      <div className="legend">
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} />{tt('Income')}</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--white)' }} />{tt('Spent')}</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--pink)' }} />{tt('Spent (over plan)')}</div>
      </div>
    </>
  );
}

export function NetWorthTrend({ state, year }: { state: PlannerState; year: number }) {
  const series = netWorthSeries(state, year);
  const hasAny = netWorth(state) !== 0 || series.some((v) => v !== 0);
  if (!hasAny)
    return (
      <div className="empty" style={{ border: 'none' }}>
        {tt('Add assets or savings to see your net worth grow.')}
      </div>
    );
  const W = 640;
  const H = 150;
  const pad = 10;
  let min = Math.min(...series);
  let max = Math.max(...series);
  if (min > 0) min = 0;
  if (max === min) max = min + 1;
  const n = series.length;
  const px = (i: number) => pad + i * ((W - 2 * pad) / (n - 1));
  const py = (v: number) => H - pad - ((v - min) / (max - min)) * (H - 2 * pad);
  const line = series.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join(' ');
  const area =
    'M' + px(0).toFixed(1) + ' ' + (H - pad) + ' ' +
    series.map((v, i) => 'L' + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join(' ') +
    ' L' + px(n - 1).toFixed(1) + ' ' + (H - pad) + ' Z';
  const curIdx = keyYear(nowKey()) === year ? keyMonth(nowKey()) - 1 : n - 1;
  const short = monthShort();
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 150, display: 'block' }}>
        <path d={area} fill="var(--green)" opacity={0.08} />
        <path d={line} fill="none" stroke="var(--green)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={px(curIdx).toFixed(1)} cy={py(series[curIdx]).toFixed(1)} r={3.5} fill="var(--green)" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="nwt-x">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i}>{short[i].charAt(0)}</span>
        ))}
      </div>
    </>
  );
}

/**
 * Debt-payoff projection: total remaining debt over time. Baseline (minimum payments, no
 * rollover) is a dim pink dashed line; the accelerated plan is the solid green line with a soft
 * fill and an emphasized "debt-free" endpoint. Curves are `remaining debt after each month`.
 */
export function DebtProjectionChart({ startDebt, baseline, accelerated }: { startDebt: number; baseline: number[]; accelerated: number[] }) {
  const n = Math.max(baseline.length, accelerated.length, 1);
  const W = 640;
  const H = 180;
  const pad = 12;
  const maxY = Math.max(startDebt, 1);
  const px = (i: number) => pad + (i * (W - 2 * pad)) / n;
  const py = (v: number) => H - pad - (Math.max(0, v) / maxY) * (H - 2 * pad);
  const path = (curve: number[]) => {
    const pts = [startDebt, ...curve];
    return pts.map((v, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join(' ');
  };
  const area = () => {
    const pts = [startDebt, ...accelerated];
    return 'M' + px(0).toFixed(1) + ' ' + (H - pad) + ' ' + pts.map((v, i) => 'L' + px(i).toFixed(1) + ' ' + py(v).toFixed(1)).join(' ') + ' L' + px(pts.length - 1).toFixed(1) + ' ' + (H - pad) + ' Z';
  };
  const endX = accelerated.length;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 180, display: 'block' }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={area()} fill="var(--green)" opacity={0.1} />
        <path d={path(baseline)} fill="none" stroke="var(--pink)" strokeWidth={2} strokeDasharray="5 4" opacity={0.7} vectorEffect="non-scaling-stroke" />
        <path d={path(accelerated)} fill="none" stroke="var(--green)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {endX <= n && <circle cx={px(endX).toFixed(1)} cy={py(0).toFixed(1)} r={4} fill="var(--green)" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="legend" style={{ marginTop: 8 }}>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} />{tt('With your plan')}</div>
        <div className="legend-item"><span className="legend-dot" style={{ background: 'var(--pink)' }} />{tt('Minimum payments')}</div>
      </div>
    </div>
  );
}

/** Small helper so callers can render a value with fmt without importing it. */
export const money = fmt;

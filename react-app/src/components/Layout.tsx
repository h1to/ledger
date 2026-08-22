import { useStore } from '../store/useStore';
import { navItems } from './nav';
import { NavIcon, GuideIcon, FeedbackIcon, LangIcon, RatesIcon, ExportIcon, MenuIcon } from './icons';
import { tt, labelFull } from '../i18n';
import { fmt } from '../lib/format';
import { monthTotals } from '../lib/money';
import { nowKey } from '../lib/dates';
import { buildCSV, downloadFile } from '../lib/csv';
import type { View } from '../types';

function activeKey(view: View, openMonthKey: string | null): string {
  if (view === 'month') return openMonthKey === nowKey() ? 'thismonth' : 'dashboard';
  return view;
}

export function useExportCSV() {
  const state = useStore((s) => s.state);
  const toast = useStore((s) => s.toast);
  return () => {
    const csv = buildCSV(state);
    if (!csv) {
      toast(tt('Nothing to export yet'));
      return;
    }
    downloadFile('money-planner.csv', '﻿' + csv, 'text/csv;charset=utf-8');
    toast(tt('CSV downloaded'));
  };
}

export function Sidebar() {
  const view = useStore((s) => s.view);
  const openMonthKey = useStore((s) => s.openMonthKey);
  const state = useStore((s) => s.state);
  const sync = useStore((s) => s.sync);
  const appStarted = useStore((s) => s.appStarted);
  const lang = useStore((s) => s.lang);
  const goTo = useStore((s) => s.goTo);
  const setLang = useStore((s) => s.setLang);
  const openModal = useStore((s) => s.openModal);
  const startTour = useStore((s) => s.startTour);
  const toast = useStore((s) => s.toast);
  const exportCSV = useExportCSV();

  const cur = nowKey();
  const free = monthTotals(state, cur).free;
  const active = activeKey(view, openMonthKey);

  return (
    <div className="sidebar" id="sidebar">
      <div className="brand">
        <span className="dot" />
        LEDGER
      </div>
      <div className="stamp">
        <div className="stamp-label">{tt('Free to spend')}</div>
        <div className={'stamp-value mono' + (free < 0 ? ' neg' : '')}>{fmt(free)}</div>
        <div className="stamp-sub">{labelFull(cur)}</div>
      </div>
      <div className="nav">
        {navItems().map((n) => (
          <button key={n.key} className={'nav-item' + (n.key === active ? ' active' : '')} onClick={() => goTo(n.key)}>
            <NavIcon name={n.icon} />
            {n.label}
          </button>
        ))}
      </div>
      <div className="side-foot">
        <button className="nav-item" id="btn-sync" onClick={() => openModal({ type: 'sync' })}>
          <span className={'sync-dot ' + sync} />
          <span>{sync === 'synced' ? tt('Synced') : sync === 'syncing' ? tt('Syncing…') : sync === 'error' ? tt('Sync error') : sync === 'ready' ? tt('Sign in') : tt('Sync')}</span>
        </button>
        <button className="nav-item" onClick={() => (appStarted ? startTour() : toast(tt('Sign in')))}>
          <GuideIcon />
          <span>{tt('Guide')}</span>
        </button>
        <button className="nav-item" onClick={() => openModal({ type: 'feedback' })}>
          <FeedbackIcon />
          <span>{tt('Feedback')}</span>
        </button>
        <button className="nav-item" onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>
          <LangIcon />
          <span>{lang === 'ru' ? 'RU' : 'EN'}</span>
        </button>
        <button className="nav-item" onClick={() => openModal({ type: 'rates' })}>
          <RatesIcon />
          <span>{tt('Rates')}</span>
        </button>
        <button className="nav-item" onClick={exportCSV}>
          <ExportIcon />
          <span>{tt('Export CSV')}</span>
        </button>
      </div>
    </div>
  );
}

export function MobileTopbar() {
  return (
    <div className="mobile-topbar">
      <div className="brand">
        <span className="dot" />
        LEDGER
      </div>
      {/* Hamburger is inert on mobile (nav lives in the bottom bar); kept for layout parity. */}
      <button className="menu-btn" aria-label="Menu">
        <MenuIcon />
      </button>
    </div>
  );
}

export function BottomNav() {
  const view = useStore((s) => s.view);
  const openMonthKey = useStore((s) => s.openMonthKey);
  const goTo = useStore((s) => s.goTo);
  const openModal = useStore((s) => s.openModal);
  useStore((s) => s.lang);
  const active = activeKey(view, openMonthKey);
  return (
    <div className="bottom-nav" id="bottom-nav">
      {navItems().map((n) => (
        <button key={n.key} className={'bn-item' + (n.key === active ? ' active' : '')} aria-label={n.label} title={n.label} onClick={() => goTo(n.key)}>
          <NavIcon name={n.icon} />
          <span className="bn-dot" />
        </button>
      ))}
      <button className="bn-item" id="bn-more" aria-label={tt('More')} title={tt('More')} onClick={() => openModal({ type: 'more' })}>
        <NavIcon name="more" />
        <span className="bn-dot" />
      </button>
    </div>
  );
}

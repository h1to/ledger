import type { ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from '../Modal';
import { GuideIcon, FeedbackIcon, LangIcon, RatesIcon, ExportIcon } from '../icons';
import { tt, labelFull } from '../../i18n';
import { fmt } from '../../lib/format';
import { nowKey } from '../../lib/dates';
import { monthTotals } from '../../lib/money';
import { useExportCSV } from '../Layout';

function MoreItem({ icon, label, sub, onClick }: { icon: ReactNode; label: string; sub?: string; onClick: () => void }) {
  return (
    <button className="nav-item" style={{ width: '100%' }} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {sub && (
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
          {sub}
        </span>
      )}
    </button>
  );
}

export function MoreSheet() {
  const state = useStore((s) => s.state);
  const user = useStore((s) => s.user);
  const sync = useStore((s) => s.sync);
  const lang = useStore((s) => s.lang);
  const appStarted = useStore((s) => s.appStarted);
  const setLang = useStore((s) => s.setLang);
  const openModal = useStore((s) => s.openModal);
  const closeModal = useStore((s) => s.closeModal);
  const startTour = useStore((s) => s.startTour);
  const toast = useStore((s) => s.toast);
  const exportCSV = useExportCSV();

  const cur = nowKey();
  const free = monthTotals(state, cur).free;
  const syncSub = user ? user.email || tt('Synced') : tt('Sign in');

  return (
    <Modal onClose={closeModal}>
      <h3>{tt('Menu')}</h3>
      <div className="stamp" style={{ marginBottom: 16 }}>
        <div className="stamp-label">{tt('Free to spend')}</div>
        <div className={'stamp-value mono' + (free < 0 ? ' neg' : '')}>{fmt(free)}</div>
        <div className="stamp-sub">{labelFull(cur)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MoreItem icon={<span className={'sync-dot ' + sync} style={{ margin: '0 4px' }} />} label={tt('Sync')} sub={syncSub} onClick={() => { closeModal(); openModal({ type: 'sync' }); }} />
        <MoreItem icon={<GuideIcon />} label={tt('Guide')} onClick={() => { closeModal(); if (!appStarted) { toast(tt('Sign in')); return; } startTour(); }} />
        <MoreItem icon={<FeedbackIcon />} label={tt('Feedback')} onClick={() => { closeModal(); openModal({ type: 'feedback' }); }} />
        <MoreItem icon={<LangIcon />} label={tt('Language')} sub={lang === 'ru' ? 'Русский' : 'English'} onClick={() => { closeModal(); setLang(lang === 'ru' ? 'en' : 'ru'); }} />
        <MoreItem icon={<RatesIcon />} label={tt('Rates')} onClick={() => { closeModal(); openModal({ type: 'rates' }); }} />
        <MoreItem icon={<ExportIcon />} label={tt('Export CSV')} onClick={() => { closeModal(); exportCSV(); }} />
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary btn-small" onClick={closeModal}>{tt('Close')}</button>
      </div>
    </Modal>
  );
}

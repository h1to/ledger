import { useStore } from '../../store/useStore';
import { Modal } from '../Modal';
import { tt } from '../../i18n';
import { downloadFile } from '../../lib/csv';
import { pullRemote, signOut } from '../../store/sync';
import { RatesIcon, RefreshIcon } from '../icons';

export function SettingsModal() {
  const state = useStore((s) => s.state);
  const user = useStore((s) => s.user);
  const sync = useStore((s) => s.sync);
  const toast = useStore((s) => s.toast);
  const openModal = useStore((s) => s.openModal);
  const closeModal = useStore((s) => s.closeModal);
  useStore((s) => s.lang);

  const status =
    sync === 'synced' ? tt('Synced') : sync === 'syncing' ? tt('Syncing…') : sync === 'error' ? tt('Sync error') : sync === 'ready' ? tt('Sign in') : tt('Sync');

  return (
    <Modal onClose={closeModal}>
      <h3>{tt('Settings')}</h3>
      <div className="modal-note">
        {user ? (
          <>
            {tt('Signed in as')} <b>{user.email || ''}</b>
            <br />
            {tt('Status')}: {status}
          </>
        ) : (
          tt('Sign in')
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '4px 0 10px' }}>
        <button className="nav-item" style={{ width: '100%' }} onClick={() => { closeModal(); openModal({ type: 'rates' }); }}>
          <RatesIcon />
          <span>{tt('Exchange rates')}</span>
        </button>
        <button className="nav-item" style={{ width: '100%' }} onClick={() => { pullRemote(); closeModal(); toast(tt('Syncing…')); }}>
          <RefreshIcon />
          <span>{tt('Sync now')}</span>
        </button>
      </div>
      <div className="actions" style={{ margin: '0 0 8px' }}>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => {
            downloadFile('money-planner-backup.json', JSON.stringify(state, null, 2), 'application/json');
            toast(tt('Backup downloaded'));
          }}
        >
          {tt('Export backup (.json)')}
        </button>
        <button className="btn btn-secondary btn-small" onClick={() => openModal({ type: 'import' })}>{tt('Import data')}</button>
      </div>
      <div className="modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <button className="btn btn-secondary btn-small" onClick={() => signOut().then(closeModal)}>{tt('Sign out')}</button>
        <button className="btn btn-primary btn-small" onClick={closeModal}>{tt('Close')}</button>
      </div>
    </Modal>
  );
}

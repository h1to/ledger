import { useStore } from '../store/useStore';
import { tt } from '../i18n';
import { Modal } from './Modal';

export function ConfirmDialog() {
  const confirm = useStore((s) => s.confirm);
  const close = useStore((s) => s.closeConfirm);
  useStore((s) => s.lang);
  if (!confirm) return null;
  return (
    <Modal onClose={close} maxWidth={360}>
      <h3>{tt('Confirm')}</h3>
      <div style={{ color: 'var(--dim)', fontSize: '13.5px' }}>{confirm.message}</div>
      <div className="modal-actions">
        <button className="btn btn-secondary btn-small" onClick={close}>
          {tt('Cancel')}
        </button>
        <button
          className="btn btn-small"
          style={{ background: 'var(--pink)', color: 'var(--ink)' }}
          onClick={() => {
            confirm.onConfirm();
            close();
          }}
        >
          {tt('Confirm')}
        </button>
      </div>
    </Modal>
  );
}

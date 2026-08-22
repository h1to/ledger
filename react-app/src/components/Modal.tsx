import { useEffect, useRef, type ReactNode } from 'react';
import { tt } from '../i18n';

/** Base overlay + card. Clicking the backdrop closes. */
export function Modal({ onClose, children, maxWidth }: { onClose: () => void; children: ReactNode; maxWidth?: number }) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        {children}
      </div>
    </div>
  );
}

interface FormModalProps {
  title: string;
  okLabel?: string;
  onSubmit: () => boolean | void; // return false to keep the modal open
  onClose: () => void;
  children: ReactNode;
}

/** Title + body + Cancel/OK actions, mirroring the original openModal(). Autofocuses the first field. */
export function FormModal({ title, okLabel, onSubmit, onClose, children }: FormModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>('input,select,textarea');
    if (first) setTimeout(() => first.focus(), 50);
  }, []);
  return (
    <Modal onClose={onClose}>
      <h3>{title}</h3>
      <div ref={ref}>{children}</div>
      <div className="modal-actions">
        <button className="btn btn-secondary btn-small" onClick={onClose}>
          {tt('Cancel')}
        </button>
        <button
          className="btn btn-primary btn-small"
          onClick={() => {
            const res = onSubmit();
            if (res !== false) onClose();
          }}
        >
          {okLabel || tt('Save')}
        </button>
      </div>
    </Modal>
  );
}

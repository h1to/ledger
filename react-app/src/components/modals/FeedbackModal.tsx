import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { tt } from '../../i18n';
import { sendFeedback } from '../../store/sync';

const KINDS = ['Bug', 'Idea', 'Other'];

export function FeedbackModal() {
  const user = useStore((s) => s.user);
  const lang = useStore((s) => s.lang);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const [kind, setKind] = useState('Idea');
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');

  return (
    <FormModal
      title={tt('Send feedback')}
      okLabel={tt('Send')}
      onClose={closeModal}
      onSubmit={() => {
        if (!msg.trim()) { toast(tt('Write a message first')); return false; }
        sendFeedback(kind, msg.trim(), email.trim(), lang);
      }}
    >
      <div className="modal-note">{tt('Tell me what broke, what is missing, or what would make this better.')}</div>
      <div className="field"><label>{tt('What kind of feedback?')}</label></div>
      <div className="seg" style={{ marginTop: -6 }}>
        {KINDS.map((kk) => (
          <button type="button" key={kk} className={kind === kk ? 'on' : ''} onClick={() => setKind(kk)}>{tt(kk)}</button>
        ))}
      </div>
      <div className="field"><label>{tt('Your message')}</label>
        <textarea style={{ minHeight: 120, fontFamily: 'var(--sans)', fontSize: 14 }} value={msg} onChange={(e) => setMsg(e.target.value)} /></div>
      <div className="field"><label>{tt('Email for a reply (optional)')}</label>
        <input type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} /></div>
    </FormModal>
  );
}

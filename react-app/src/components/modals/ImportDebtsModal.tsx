import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Modal } from '../Modal';
import { CurSelect } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt } from '../../i18n';
import { uid } from '../../lib/format';
import { nowKey, shiftKey } from '../../lib/dates';
import { extractPdfText } from '../../lib/pdfText';
import { parseDebtText } from '../../lib/parseDebt';
import type { Currency } from '../../types';

interface Row {
  name: string;
  kind: string | null;
  contract: string | null;
  debt: number;
  payment: number;
  cur: Currency;
}

export function ImportDebtsModal() {
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  useStore((s) => s.lang);

  const [phase, setPhase] = useState<'pick' | 'review'>('pick');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bank, setBank] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

  async function onFile(file: File) {
    setBusy(true);
    setError('');
    try {
      const text = await extractPdfText(file);
      const { bank: detected, debts } = parseDebtText(text);
      if (!detected) {
        setError(tt("Couldn't recognize the bank in this PDF. Supported: Halyk, Kaspi, Alatau City Bank."));
        setBusy(false);
        return;
      }
      if (!debts.length) {
        setError(tt('No debts found in this PDF.'));
        setBusy(false);
        return;
      }
      setBank(detected);
      setRows(debts.map((d) => ({ name: d.name, kind: d.kind, contract: d.contract, debt: d.debt, payment: 0, cur: 'KZT' as Currency })));
      setPhase('review');
    } catch {
      setError(tt("Couldn't read this PDF. Make sure it's the debt certificate file."));
    }
    setBusy(false);
  }

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const totalDebt = rows.reduce((s, r) => s + r.debt, 0);

  function confirmImport() {
    const valid = rows.filter((r) => r.debt > 0 || r.payment > 0);
    if (!valid.length) { toast(tt('Nothing to import')); return; }
    commit((s) => {
      // replace this bank's previously imported loans; leave manual loans and other banks alone
      s.loans = s.loans.filter((l) => !(l.source === 'import' && l.bank === bank));
      valid.forEach((r) => {
        const months = r.payment > 0 && r.debt > 0 ? Math.max(1, Math.ceil(r.debt / r.payment)) : 1;
        s.loans.push({
          id: uid(),
          name: r.name,
          bank,
          debt: r.debt > 0 ? r.debt : null,
          contract: r.contract,
          kind: r.kind,
          payment: r.payment,
          cur: r.cur,
          start: nowKey(),
          end: r.payment > 0 ? shiftKey(nowKey(), months - 1) : nowKey(),
          rate: null,
          overpayment: null,
          source: 'import',
        });
      });
    });
    toast(tt('Imported') + ' ' + valid.length + ' · ' + bank);
    closeModal();
  }

  return (
    <Modal onClose={closeModal}>
      {phase === 'pick' ? (
        <>
          <h3>{tt('Import from bank PDF')}</h3>
          <div className="modal-note">
            {tt('Upload a debt certificate (справка о задолженности) from Halyk, Kaspi or Alatau City Bank. It is read on your device — the file is never uploaded. We read the remaining debt per loan; you add the monthly payment afterwards.')}
          </div>
          {error && <div className="gate-msg err" style={{ margin: '10px 0' }}>{error}</div>}
          <div className="field" style={{ marginTop: 12 }}>
            <label>{tt('Choose a PDF')}</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </div>
          {busy && <div className="modal-note" style={{ marginTop: 10 }}>{tt('Reading…')}</div>}
          <div className="modal-actions">
            <button className="btn btn-secondary btn-small" onClick={closeModal}>{tt('Close')}</button>
          </div>
        </>
      ) : (
        <>
          <h3>{tt('Review debts')} · {bank}</h3>
          <div className="modal-note">
            {tt('Check the amounts, then set a monthly payment where you know it (you can also do this later on each card). Importing replaces this bank’s previously imported loans.')}
          </div>
          <div style={{ maxHeight: '46vh', overflowY: 'auto', margin: '12px 0' }}>
            <div className="ob-colhead exp"><span>{tt('Loan')}</span><span>{tt('Remaining debt')}</span><span>{tt('Monthly')}</span><span>{tt('Cur.')}</span><span /></div>
            <div className="ob-rowlist">
              {rows.map((r, i) => (
                <div className="ob-row exp" key={i}>
                  <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                  <MoneyInput className="mono" value={r.debt} onCommit={(v) => setRow(i, { debt: v })} blankZero />
                  <MoneyInput className="mono" value={r.payment} placeholder={tt('add')} onCommit={(v) => setRow(i, { payment: v })} blankZero />
                  <CurSelect value={r.cur} onChange={(c) => setRow(i, { cur: c })} />
                  <button className="ob-del" title={tt('Remove')} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="modal-note" style={{ textAlign: 'right' }}>
            {tt('Total')}: <b className="mono">{totalDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₸</b> · {rows.length} {tt('loans')}
          </div>
          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-secondary btn-small" onClick={() => { setPhase('pick'); setRows([]); }}>{tt('Back')}</button>
            <button className="btn btn-primary btn-small" onClick={confirmImport}>{tt('Import')} {rows.length}</button>
          </div>
        </>
      )}
    </Modal>
  );
}

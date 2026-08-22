import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { CurrencyField } from '../FormFields';
import { MoneyInput } from '../MoneyInput';
import { tt } from '../../i18n';
import { uid } from '../../lib/format';
import type { AssetKind, Currency } from '../../types';

export function AssetModal({ id }: { id: string | null }) {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const existing = id ? state.assets.find((a) => a.id === id) : null;

  const [kind, setKind] = useState<AssetKind>(existing ? existing.kind : 'asset');
  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState<number>(existing?.value ?? 0);
  const [cur, setCur] = useState<Currency>(existing?.cur ?? 'KZT');
  const [liquid, setLiquid] = useState<boolean>(existing ? existing.liquid !== false : true);

  return (
    <FormModal
      title={existing ? tt('Edit item') : tt('Add to net worth')}
      onClose={closeModal}
      onSubmit={() => {
        if (!name.trim()) { toast(tt('Name it')); return false; }
        if (!value || value <= 0) { toast(tt('Enter a valid value')); return false; }
        const liq = kind === 'asset' ? liquid : false;
        commit((s) => {
          if (existing) {
            const a = s.assets.find((x) => x.id === existing.id)!;
            a.name = name.trim(); a.kind = kind; a.value = value; a.cur = cur; a.liquid = liq;
          } else {
            s.assets.push({ id: uid(), name: name.trim(), kind, value, cur, liquid: liq });
          }
        });
      }}
    >
      <div className="seg">
        <button type="button" className={kind === 'asset' ? 'on' : ''} onClick={() => setKind('asset')}>{tt('Asset')}</button>
        <button type="button" className={kind === 'liability' ? 'on' : ''} onClick={() => setKind('liability')}>{tt('Liability')}</button>
      </div>
      <div className="field"><label>{tt('Name')}</label>
        <input value={name} placeholder={tt('Name')} onChange={(e) => setName(e.target.value)} /></div>
      <div className="field-row">
        <div className="field" style={{ flex: 2 }}><label>{tt('Value')}</label>
          <MoneyInput className="mono" value={value} onCommit={setValue} /></div>
        <div className="field"><label>{tt('Currency')}</label><CurrencyField value={cur} onChange={setCur} /></div>
      </div>
      {kind === 'asset' && (
        <label className="acheck">
          <input type="checkbox" checked={liquid} onChange={(e) => setLiquid(e.target.checked)} />
          <span>{tt('Liquid — cash you could reach quickly (counts toward safety runway)')}</span>
        </label>
      )}
    </FormModal>
  );
}

import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { RefreshIcon } from '../icons';
import { CURRENCIES } from '../../constants';
import { tt } from '../../i18n';
import { refreshRates } from '../../store/sync';
import type { Currency } from '../../types';

const NON_KZT = CURRENCIES.filter((c) => c !== 'KZT');

export function RatesModal() {
  const state = useStore((s) => s.state);
  const commit = useStore((s) => s.commit);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);

  const [rates, setRates] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    NON_KZT.forEach((c) => (r[c] = state.rates[c] != null ? String(state.rates[c]) : ''));
    return r;
  });
  const [fetching, setFetching] = useState(false);
  const [updated, setUpdated] = useState(state.ratesUpdated ? new Date(state.ratesUpdated).toLocaleString() : tt('never'));

  return (
    <FormModal
      title={tt('Currency rates')}
      onClose={closeModal}
      onSubmit={() => {
        commit((s) => {
          NON_KZT.forEach((c) => {
            const v = parseFloat(rates[c].replace(/,/g, ''));
            if (v > 0) s.rates[c] = v;
          });
        });
      }}
    >
      <div className="rates-meta">
        {tt('1 unit of currency = how many KZT. Used to convert everything to ₸.')}
        <br />
        {tt('Last updated from internet')}: <span>{updated}</span>
      </div>
      {NON_KZT.map((c) => (
        <div className="rate-row" key={c}>
          <div className="rr-label">1 {c} =</div>
          <input type="text" inputMode="decimal" value={rates[c]} onChange={(e) => setRates((r) => ({ ...r, [c]: e.target.value }))} />
        </div>
      ))}
      <div className="actions" style={{ margin: '14px 0 0' }}>
        <button
          className="btn btn-secondary btn-small"
          disabled={fetching}
          onClick={(e) => {
            e.preventDefault();
            setFetching(true);
            refreshRates((ok) => {
              setFetching(false);
              if (ok) {
                const latest = useStore.getState().state;
                const next: Record<string, string> = {};
                NON_KZT.forEach((c) => (next[c] = Number(latest.rates[c as Currency]).toFixed(4)));
                setRates(next);
                setUpdated(latest.ratesUpdated ? new Date(latest.ratesUpdated).toLocaleString() : '');
                toast(tt('Rates updated'));
              } else toast(tt('Could not fetch rates — check connection, or adjust manually'));
            });
          }}
        >
          <RefreshIcon />
          {fetching ? tt('Syncing…') : tt('Update from internet')}
        </button>
      </div>
    </FormModal>
  );
}

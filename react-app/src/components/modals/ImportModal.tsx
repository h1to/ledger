import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { FormModal } from '../Modal';
import { tt } from '../../i18n';
import { looksLikePlannerData } from '../../lib/migrate';
import { pushRemote } from '../../store/sync';

export function ImportModal() {
  const hydrate = useStore((s) => s.hydrate);
  const toast = useStore((s) => s.toast);
  const closeModal = useStore((s) => s.closeModal);
  const [json, setJson] = useState('');

  return (
    <FormModal
      title={tt('Import data')}
      onClose={closeModal}
      onSubmit={() => {
        const raw = json.trim();
        if (!raw) { toast(tt('Paste the JSON or pick a file')); return false; }
        let p: unknown;
        try { p = JSON.parse(raw); } catch { toast(tt('Invalid JSON — check that you copied the whole thing')); return false; }
        if (!looksLikePlannerData(p)) { toast(tt('This does not look like planner data')); return false; }
        (p as { lastModified?: number }).lastModified = Date.now(); // newest copy wins over the cloud row
        hydrate(p as never);
        pushRemote();
        toast(tt('Imported — syncing to cloud…'));
      }}
    >
      <div className="modal-note">
        {tt('Paste a backup JSON (from “Export backup”, or copied from your old file’s localStorage). It will replace the data in this account and sync to the cloud.')}
      </div>
      <div className="field">
        <label>{tt('JSON data')}</label>
        <textarea value={json} placeholder={'{"year":2026,"months":{...}}'} spellCheck={false} onChange={(e) => setJson(e.target.value)} />
      </div>
      <div className="field">
        <label>{tt('…or choose a backup file')}</label>
        <input
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = () => setJson(String(reader.result || ''));
            reader.readAsText(f);
          }}
        />
      </div>
    </FormModal>
  );
}

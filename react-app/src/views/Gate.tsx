import { useState } from 'react';
import { useStore } from '../store/useStore';
import { tt } from '../i18n';
import { signIn, signUp, saveSyncCfg, initSupabase, getSyncCfg } from '../store/sync';

function GateAuth() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  const gateMsg = useStore((s) => s.gateMsg);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(gateMsg);

  const isOk = msg.charAt(0) === '✓';

  async function submit() {
    if (!email || !pass) { setMsg(tt('Enter email and password')); return; }
    if (mode === 'up' && pass.length < 6) { setMsg(tt('Password must be at least 6 characters')); return; }
    setBusy(true);
    try {
      if (mode === 'in') {
        const err = await signIn(email.trim(), pass);
        if (err) setMsg(err);
      } else {
        const res = await signUp(email.trim(), pass);
        if (res.error) setMsg(res.error);
        else if (res.needsConfirm) { setMode('in'); setMsg(tt('✓ Account created — confirm it via the email we sent you, then sign in.')); }
      }
    } catch {
      setMsg(tt('Network error — try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="gate-hero">
        <div className="gate-brand"><span className="dot" />{tt('Money Planner')}</div>
        <div className="gate-tag">{tt('Plan once · spend free')}</div>
      </div>
      <div className="gate-card">
        <h2>{mode === 'in' ? tt('Welcome back') : tt('Create your account')}</h2>
        <div className="gate-sub">
          {mode === 'in' ? tt('Sign in to open your planner.') : tt('One account keeps your planner in sync on every device.')}
        </div>
        <div className="seg">
          <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>{tt('Sign in')}</button>
          <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>{tt('Register')}</button>
        </div>
        {msg && <div className={'gate-msg ' + (isOk ? 'ok' : 'err')}>{msg}</div>}
        <div className="field"><label>{tt('Email')}</label>
          <input type="email" autoComplete="username" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label>{tt('Password')}</label>
          <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={pass} placeholder={tt('min. 6 characters')}
            onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} /></div>
        <button className="btn btn-primary" disabled={busy} onClick={submit}>
          {busy ? (mode === 'in' ? tt('Signing in…') : tt('Creating…')) : mode === 'in' ? tt('Sign in') : tt('Create account')}
        </button>
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button style={{ color: 'var(--faint)', fontSize: 12, background: 'none', border: 'none' }} onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')}>
            {lang === 'ru' ? 'English' : 'Русский'}
          </button>
        </div>
      </div>
      <div className="gate-foot">Secure sign-in · synced to the cloud · only you can access your data</div>
    </>
  );
}

function GateSetup() {
  const setGate = useStore((s) => s.setGate);
  const setSync = useStore((s) => s.setSync);
  const cfg = getSyncCfg();
  const [url, setUrl] = useState(cfg.url || '');
  const [key, setKey] = useState(cfg.anonKey || '');
  const [msg, setMsg] = useState('');

  return (
    <>
      <div className="gate-brand"><span className="dot" />LEDGER</div>
      <div className="gate-card">
        <h2>Connect your Supabase</h2>
        <div className="gate-sub">
          Paste the project credentials once per device: Dashboard → Project Settings → API. Before first use, run <b>supabase-setup.sql</b> in the SQL Editor.
        </div>
        {msg && <div className="gate-msg err">{msg}</div>}
        <div className="field"><label>Project URL</label><input value={url} placeholder="https://xxxx.supabase.co" onChange={(e) => setUrl(e.target.value)} /></div>
        <div className="field"><label>Anon public key</label><input value={key} placeholder="eyJ…" onChange={(e) => setKey(e.target.value)} /></div>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!url.trim() || !key.trim()) { setMsg('Both fields are required.'); return; }
            saveSyncCfg({ url: url.trim(), anonKey: key.trim() });
            if (!initSupabase()) { setMsg('Could not create a client from these credentials.'); return; }
            setSync('ready');
            setGate('auth', '');
          }}
        >
          Continue
        </button>
      </div>
      <div className="gate-foot">Credentials are stored only in this browser · your data is protected by Row Level Security</div>
    </>
  );
}

export function Gate() {
  const gateMode = useStore((s) => s.gateMode);
  return <div className="gate">{gateMode === 'setup' ? <GateSetup /> : <GateAuth />}</div>;
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useStore, type AuthUser } from './useStore';
import type { PlannerState, Lang } from '../types';
import {
  SYNC_CFG_KEY,
  EMBEDDED_SUPABASE_URL,
  EMBEDDED_SUPABASE_KEY,
  CURRENCIES,
  ratesUrl,
  WEB3FORMS_KEY,
} from '../constants';
import { emptyState } from '../lib/migrate';
import { stateForCompare } from '../lib/reconcile';
import { tt } from '../i18n';
import type { CloudDriver } from './cloud/driver';
import { createRelationalDriver } from './cloud/relationalDriver';
import { createBlobDriver } from './cloud/blobDriver';

interface SyncCfg {
  url: string;
  anonKey: string;
}

let syncCfg: SyncCfg = { url: EMBEDDED_SUPABASE_URL, anonKey: EMBEDDED_SUPABASE_KEY };
let sb: SupabaseClient | null = null;
let driver: CloudDriver | null = null; // pluggable cloud persistence (relational by default)
let authListenerSet = false;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let pendingPush = false;
// A device must not push over the cloud until it has reconciled with it once (guards the
// startup race where a background save on open would otherwise clobber a newer cloud copy).
let syncReady = false;

const s = useStore.getState; // shorthand for latest store snapshot

function loadSyncCfg(): void {
  try {
    const r = localStorage.getItem(SYNC_CFG_KEY);
    if (r) {
      const p = JSON.parse(r);
      if (p && p.url && p.anonKey) syncCfg = p;
    }
  } catch {
    /* ignore */
  }
  if (!syncCfg.url || !syncCfg.anonKey) syncCfg = { url: EMBEDDED_SUPABASE_URL, anonKey: EMBEDDED_SUPABASE_KEY };
}
export function saveSyncCfg(cfg: SyncCfg): void {
  syncCfg = cfg;
  try {
    localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}
export function getSyncCfg(): SyncCfg {
  return syncCfg;
}
export function hasSupabase(): boolean {
  return !!sb;
}
export function getUser(): AuthUser | null {
  return s().user;
}

export function initSupabase(): boolean {
  if (!syncCfg.url || !syncCfg.anonKey) return false;
  try {
    sb = createClient(syncCfg.url, syncCfg.anonKey);
    driver = import.meta.env.VITE_CLOUD_DRIVER === 'blob' ? createBlobDriver(sb) : createRelationalDriver(sb);
    authListenerSet = false;
    return true;
  } catch {
    sb = null;
    driver = null;
    return false;
  }
}

/** Test-only: inject a fake cloud driver so reconciliation can be tested without Supabase. */
export function __setDriverForTests(d: CloudDriver | null): void {
  driver = d;
}

function toUser(sessionUser: { id: string; email?: string } | null | undefined): AuthUser | null {
  return sessionUser ? { id: sessionUser.id, email: sessionUser.email } : null;
}

// The DB is the single source of truth; the app keeps no local planner-data cache and never reads
// localStorage for state. `meaningfulLocalData` guards the reconciliation: on open the in-memory
// state is empty, so it always yields to the cloud copy (see enterApp / pullRemote).
function meaningfulLocalData(state: PlannerState): boolean {
  return (
    Object.keys(state.months).length > 0 ||
    state.recurring.length > 0 ||
    (state.loans?.length ?? 0) > 0 ||
    state.goals.length > 0 ||
    state.assets.length > 0
  );
}

// ---- push / pull ----

export function schedulePush(): void {
  if (!sb || !s().user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(pushRemote, 1500);
}

/**
 * Best-effort flush of a debounced/queued push — fired when the tab is hidden or closing so an
 * edit made within the 1.5s debounce window isn't lost. There is no local cache to fall back on
 * (the DB is the single source of truth by design), so this narrows the abrupt-close data-loss gap.
 */
export function flushPendingPush(): void {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
    pushRemote();
  } else if (pendingPush) {
    pushRemote();
  }
}

export function pushRemote(): void {
  const user = s().user;
  if (!driver || !user) return;
  if (!syncReady) {
    pendingPush = true;
    return;
  } // never overwrite the cloud before the first pull has reconciled
  if (pushInFlight) {
    pendingPush = true;
    return;
  }
  pushInFlight = true;
  s().setSync('syncing');
  driver
    .save(user.id, s().state)
    .then(() => {
      pushInFlight = false;
      s().setSync('synced');
      if (pendingPush) {
        pendingPush = false;
        pushRemote();
      }
    })
    .catch((e: unknown) => {
      pushInFlight = false;
      pendingPush = false; // don't tight-loop on a persistent error; the next pull/edit retries
      s().setSync('error');
      s().toast('Sync push failed: ' + (e instanceof Error ? e.message : String(e)));
    });
}

export function pullRemote(after?: () => void): void {
  const user = s().user;
  if (!driver || !user) {
    if (after) after();
    return;
  }
  s().setSync('syncing');
  driver
    .load(user.id)
    .then((result) => {
      // Reconciliation is happening now — from here this device is allowed to push again.
      syncReady = true;
      const finish = () => {
        if (after) after();
        maybeStartOnboarding();
      };
      if (!result) {
        pendingPush = false;
        pushRemote();
        finish();
        return;
      } // empty cloud — seed it from local
      const remote = result.state;
      const local = s().state;
      if (stateForCompare(remote) === stateForCompare(local)) {
        s().setSync('synced');
        if (pendingPush) {
          pendingPush = false;
          pushRemote();
        }
        finish();
        return;
      }
      if (!meaningfulLocalData(local)) {
        s().hydrate(remote);
        s().setSync('synced');
        pendingPush = false;
        s().toast(tt('Loaded your data from the cloud'));
        finish();
        return;
      }
      const remoteT = Number(remote.lastModified) || (result.updatedAt ? new Date(result.updatedAt).getTime() : 0);
      const localT = Number(local.lastModified) || 0;
      if (remoteT > localT) {
        s().hydrate(remote);
        s().setSync('synced');
        pendingPush = false;
        s().toast(tt('Updated from cloud (newer copy)'));
      } else {
        pendingPush = false;
        pushRemote(); // local is same age or newer — this device wins
      }
      finish();
    })
    .catch((e: unknown) => {
      syncReady = true;
      s().setSync('error');
      s().toast('Sync error: ' + (e instanceof Error ? e.message : String(e)));
      if (pendingPush) {
        pendingPush = false;
        pushRemote();
      }
      if (after) after();
      maybeStartOnboarding();
    });
}

// ---- rates ----

export function ratesStale(state: PlannerState): boolean {
  return !state.ratesUpdated || Date.now() - state.ratesUpdated > 24 * 3600 * 1000;
}

export function refreshRates(cb?: (ok: boolean) => void): void {
  if (typeof fetch !== 'function') {
    cb?.(false);
    return;
  }
  const base = s().state.baseCur || 'KZT';
  fetch(ratesUrl(base))
    .then((r) => r.json())
    .then((d) => {
      if (d && d.result === 'success' && d.rates) {
        s().commit((state) => {
          CURRENCIES.forEach((c) => {
            if (c !== base && d.rates[c] > 0) state.rates[c] = 1 / d.rates[c];
          });
          state.ratesUpdated = Date.now();
        });
        cb?.(true);
      } else cb?.(false);
    })
    .catch(() => cb?.(false));
}

// ---- tour ----

// First-run: a brand-new, empty account gets the setup wizard (the guided tour stays available
// from the Guide button). Existing accounts with data have already been through it — mark done.
function maybeStartOnboarding(): void {
  const st = s();
  if (st.onboardingActive || st.tour.active || !st.appStarted || st.state.tourDone) return;
  if (meaningfulLocalData(st.state)) {
    st.commit((state) => {
      state.tourDone = true;
    });
    return;
  }
  st.startOnboarding();
}

// ---- session lifecycle ----

export function enterApp(): void {
  const st = s();
  if (st.appStarted) return;
  st.setAppStarted(true);
  // The DB is the single source of truth. Start EMPTY and let the first pull adopt the cloud copy.
  // We deliberately do NOT seed from localStorage: a stale client state could win last-write-wins
  // and delete rows the DB has (this once wiped a user's loans). Empty local always yields to the
  // cloud, so a fresh open can never overwrite the DB. localStorage is no longer read at all.
  st.hydrate(emptyState());
  st.setLoading(true); // show a loading screen until the first pull returns the cloud copy
  st.setSync('syncing');
  syncReady = false; // block pushes until the initial pull has reconciled with the cloud
  // Refresh currency rates only AFTER reconciling — refreshing calls commit(), and a save on
  // open must not bump the sync clock or push before we know whether the cloud copy is newer.
  pullRemote(() => {
    s().setLoading(false);
    if (ratesStale(s().state)) {
      refreshRates((ok) => {
        if (ok) s().toast(tt('Currency rates refreshed'));
      });
    }
  });
}

function attachAuthListener(): void {
  if (authListenerSet || !sb) return;
  authListenerSet = true;
  sb.auth.onAuthStateChange((_evt, session) => {
    const was = !!s().user;
    const user = toUser(session ? session.user : null);
    s().setUser(user);
    if (user) {
      if (!s().appStarted) enterApp();
      else if (!was) pullRemote();
    } else if (s().appStarted || was) {
      s().setAppStarted(false);
      s().setSync('ready');
      s().setGate('auth', '');
    }
  });
}

let flushListenersSet = false;

/** Boot: wire the store->push hook, init supabase, restore any session. */
export function boot(): void {
  useStore.getState().setPushHook(schedulePush);
  if (!flushListenersSet && typeof window !== 'undefined') {
    flushListenersSet = true;
    // flush a pending push when the tab is backgrounded (mobile) or closed
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushPendingPush();
    });
    window.addEventListener('pagehide', flushPendingPush);
  }
  loadSyncCfg();
  if (!initSupabase()) {
    s().setGate('setup', '');
    return;
  }
  s().setSync('ready');
  attachAuthListener();
  if (!sb) {
    s().setGate('setup', '');
    return;
  }
  sb.auth
    .getSession()
    .then((res) => {
      const user = toUser(res?.data?.session?.user ?? null);
      s().setUser(user);
      if (user) {
        if (!s().appStarted) enterApp();
      } else s().setGate('auth', '');
    })
    .catch(() => s().setGate('auth', tt('Could not connect — check your internet and reload.')));
}

/** Test-only: reset module-internal sync flags and (re)initialise the client without a session fetch. */
export function __resetSyncStateForTests(): void {
  syncReady = false;
  pushInFlight = false;
  pendingPush = false;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  authListenerSet = false;
  useStore.getState().setPushHook(schedulePush);
  loadSyncCfg();
  initSupabase();
}

// ---- auth actions (return the supabase error message, or null on success) ----

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!sb) return 'Not connected';
  const res = await sb.auth.signInWithPassword({ email, password });
  if (res.error) return res.error.message;
  s().setUser(toUser(res.data.user));
  enterApp();
  return null;
}

export async function signUp(email: string, password: string): Promise<{ error: string | null; needsConfirm: boolean }> {
  if (!sb) return { error: 'Not connected', needsConfirm: false };
  const res = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  if (res.error) return { error: res.error.message, needsConfirm: false };
  if (res.data && res.data.session) {
    s().setUser(toUser(res.data.user));
    enterApp();
    return { error: null, needsConfirm: false };
  }
  return { error: null, needsConfirm: true };
}

export async function signOut(): Promise<void> {
  if (!sb) return;
  await sb.auth.signOut();
  s().setUser(null);
  s().setAppStarted(false);
  s().hydrate(emptyState()); // no local cache — clear the in-memory copy on sign-out
  s().setSync('ready');
  s().setGate('auth', '');
  s().toast(tt('Signed out'));
}

// ---- feedback ----

export function sendFeedback(kind: string, msg: string, email: string, lang: Lang): void {
  const user = s().user;
  const payload = {
    kind,
    message: msg,
    email: email || null,
    lang,
    app_version: 'v3-react',
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    user_id: user ? user.id : null,
  };
  let done = false;
  const ok = () => {
    if (done) return;
    done = true;
    s().toast(tt('Thanks! Feedback sent.'));
  };
  const fail = () => {
    if (done) return;
    done = true;
    s().toast(tt('Could not send — check your connection and try again.'));
  };

  let sentAnywhere = false;
  if (sb && user) {
    sentAnywhere = true;
    sb.from('feedback')
      .insert(payload)
      .then((res) => {
        if (res.error) fail();
        else ok();
      });
  }
  if (WEB3FORMS_KEY && typeof fetch === 'function') {
    sentAnywhere = true;
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: 'Money Planner feedback: ' + kind,
        from_name: 'Money Planner',
        email: email || 'noreply@planner.app',
        message: msg + '\n\n---\nkind: ' + kind + '\nlang: ' + lang + '\nuser: ' + (user ? user.email : 'anonymous'),
      }),
    })
      .then((r) => (r.ok ? ok() : fail()))
      .catch(fail);
  }
  if (!sentAnywhere) fail();
}

import { create } from 'zustand';
import type { PlannerState, View, MonthKey, Lang, SyncState } from '../types';
import { emptyState, normalizeState } from '../lib/migrate';
import { setBaseCur } from '../lib/format';
import { setCurrentLang, loadLang } from '../i18n';
import { nowKey, keyYear } from '../lib/dates';

export interface AuthUser {
  id: string;
  email?: string;
}

export interface Toast {
  id: number;
  msg: string;
}

/** Which modal is open (discriminated union), or null. */
export type ModalState =
  | { type: 'asset'; id: string | null }
  | { type: 'income'; k: MonthKey }
  | { type: 'expense'; k: MonthKey }
  | { type: 'recurring'; id: string | null }
  | { type: 'goal'; id: string | null }
  | { type: 'contrib'; goalId: string }
  | { type: 'goalDetail'; goalId: string }
  | { type: 'closeMonth'; k: MonthKey }
  | { type: 'rates' }
  | { type: 'import' }
  | { type: 'feedback' }
  | { type: 'settings' }
  | { type: 'more' };

export interface ConfirmState {
  message: string;
  onConfirm: () => void;
}

export interface TourState {
  active: boolean;
  index: number;
}

let toastSeq = 0;

interface StoreShape {
  // planner data
  state: PlannerState;
  rev: number; // bumped on every state change to guarantee re-render

  // ui/session
  view: View;
  openMonthKey: MonthKey | null;
  lang: Lang;
  loading: boolean; // true while the initial cloud pull is in flight (no local cache to fall back on)

  // sync/session (owned by the sync controller, mirrored here for rendering)
  sync: SyncState;
  user: AuthUser | null;
  appStarted: boolean;
  gateMode: 'auth' | 'setup';
  gateMsg: string;

  // overlays
  toasts: Toast[];
  modal: ModalState | null;
  confirm: ConfirmState | null;
  tour: TourState;

  /** Set by the sync controller: called after every user edit to schedule a cloud push. */
  pushHook: (() => void) | null;
  setPushHook: (fn: (() => void) | null) => void;

  // ---- actions ----
  /** Apply an in-place mutation to the planner state, bump the clock, and push straight to the DB. */
  commit: (mutator: (s: PlannerState) => void) => void;
  /** Replace the whole planner state (from cloud/import/load) without bumping the sync clock. */
  hydrate: (next: PlannerState) => void;

  setView: (v: View) => void;
  openMonth: (k: MonthKey) => void;
  goTo: (v: string) => void;
  setYear: (delta: number) => void;

  setLang: (l: Lang) => void;

  setSync: (s: SyncState) => void;
  setUser: (u: AuthUser | null) => void;
  setAppStarted: (v: boolean) => void;
  setLoading: (v: boolean) => void;
  setGate: (mode: 'auth' | 'setup', msg?: string) => void;

  toast: (msg: string) => void;
  dismissToast: (id: number) => void;

  openModal: (m: ModalState) => void;
  closeModal: () => void;
  askConfirm: (message: string, onConfirm: () => void) => void;
  closeConfirm: () => void;

  startTour: () => void;
  setTour: (t: TourState) => void;
  endTour: () => void;
}

export const useStore = create<StoreShape>((set, get) => ({
  state: emptyState(),
  rev: 0,

  view: 'dashboard',
  openMonthKey: null,
  lang: loadLang(),
  loading: false,

  sync: 'off',
  user: null,
  appStarted: false,
  gateMode: 'auth',
  gateMsg: '',

  toasts: [],
  modal: null,
  confirm: null,
  tour: { active: false, index: 0 },

  pushHook: null,
  setPushHook: (fn) => set({ pushHook: fn }),

  commit: (mutator) => {
    const s = get().state;
    mutator(s);
    s.lastModified = Date.now();
    setBaseCur(s.baseCur); // keep fmt()'s base in sync (e.g. after changing the base currency)
    set((st) => ({ state: { ...s }, rev: st.rev + 1 }));
    get().pushHook?.(); // push straight to the DB (user edits only, never cloud loads)
  },

  hydrate: (next) => {
    const normalized = normalizeState(next);
    setBaseCur(normalized.baseCur);
    set((st) => ({ state: normalized, rev: st.rev + 1 }));
  },

  setView: (v) => set({ view: v }),

  openMonth: (k) => {
    const s = get().state;
    if (!s.months[k]) {
      get().commit((st) => {
        st.months[k] = { incomes: [], expenses: [], recActuals: {} };
        st.year = keyYear(k);
      });
    } else if (s.year !== keyYear(k)) {
      get().commit((st) => {
        st.year = keyYear(k);
      });
    }
    set({ openMonthKey: k, view: 'month' });
  },

  goTo: (v) => {
    if (v === 'thismonth') get().openMonth(nowKey());
    else set({ view: v as View });
  },

  setYear: (delta) =>
    get().commit((s) => {
      s.year += delta;
    }),

  setLang: (l) => {
    setCurrentLang(l);
    set({ lang: l });
  },

  setSync: (s) => set({ sync: s }),
  setUser: (u) => set({ user: u }),
  setAppStarted: (v) => set({ appStarted: v }),
  setLoading: (v) => set({ loading: v }),
  setGate: (mode, msg = '') => set({ gateMode: mode, gateMsg: msg }),

  toast: (msg) => {
    const id = ++toastSeq;
    set((st) => ({ toasts: [...st.toasts, { id, msg }] }));
    setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),

  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),
  askConfirm: (message, onConfirm) => set({ confirm: { message, onConfirm } }),
  closeConfirm: () => set({ confirm: null }),

  startTour: () => set({ tour: { active: true, index: 0 } }),
  setTour: (t) => set({ tour: t }),
  endTour: () => {
    get().commit((s) => {
      s.tourDone = true;
    });
    set({ tour: { active: false, index: 0 }, view: 'dashboard' });
  },
}));

/** Non-hook access for the sync controller and tests. */
export const store = useStore;

import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { boot } from './store/sync';
import { fitNumbers } from './lib/fit';
import { Sidebar, MobileTopbar, BottomNav } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { MonthEditor } from './views/MonthEditor';
import { Savings } from './views/Savings';
import { Recurring } from './views/Recurring';
import { Loans } from './views/Loans';
import { Insights } from './views/Insights';
import { Gate } from './views/Gate';
import { ModalHost } from './components/modals/ModalHost';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toasts } from './components/Toasts';
import { Tour } from './components/Tour';
import { Onboarding } from './components/Onboarding';
import { tt } from './i18n';

let booted = false;

function LoadingScreen() {
  return (
    <div id="app">
      <div className="main" id="main">
        <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
          {tt('Loading…')}
        </div>
      </div>
    </div>
  );
}

function MainView() {
  const view = useStore((s) => s.view);
  if (view === 'dashboard') return <Dashboard />;
  if (view === 'month') return <MonthEditor />;
  if (view === 'savings') return <Savings />;
  if (view === 'loans') return <Loans />;
  if (view === 'insights') return <Insights />;
  return <Recurring />;
}

function AppShell() {
  const view = useStore((s) => s.view);
  const rev = useStore((s) => s.rev);
  const lang = useStore((s) => s.lang);
  const openMonthKey = useStore((s) => s.openMonthKey);

  // Auto-shrink long numbers after every render, and scroll to top on view change.
  useEffect(() => {
    fitNumbers();
  }, [rev, view, lang, openMonthKey]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view, openMonthKey]);

  useEffect(() => {
    const onResize = () => fitNumbers();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return (
    <div id="app">
      <MobileTopbar />
      <Sidebar />
      <div className="main" id="main">
        <MainView />
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  const appStarted = useStore((s) => s.appStarted);
  const loading = useStore((s) => s.loading);
  const onboardingActive = useStore((s) => s.onboardingActive);

  useEffect(() => {
    if (booted) return;
    booted = true;
    boot();
  }, []);

  return (
    <>
      {appStarted ? loading ? <LoadingScreen /> : <AppShell /> : <Gate />}
      {onboardingActive && <Onboarding />}
      <ModalHost />
      <ConfirmDialog />
      <Tour />
      <Toasts />
    </>
  );
}

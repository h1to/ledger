import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { TOUR } from './tourSteps';
import { tt } from '../i18n';
import { nowKey } from '../lib/dates';

/** First-run guided tour: dims the screen, glows the target, shows a step card. */
export function Tour() {
  const tour = useStore((s) => s.tour);
  const setTour = useStore((s) => s.setTour);
  const endTour = useStore((s) => s.endTour);
  const setView = useStore((s) => s.setView);
  const openMonth = useStore((s) => s.openMonth);
  useStore((s) => s.lang);
  const [cardTop, setCardTop] = useState(false);

  const index = tour.index;
  const active = tour.active;

  // Navigate to the right screen for the current step, then glow/scroll the target.
  useEffect(() => {
    if (!active) return;
    const step = TOUR[index];
    if (step.view === 'month') openMonth(nowKey());
    else setView(step.view);

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 860;
    const sel = step.sel === '#btn-sync' && isMobile ? '#bn-more' : step.sel;

    let glowEl: Element | null = null;
    let bnHost: HTMLElement | null = null;
    const t = window.setTimeout(() => {
      const target = document.querySelector(sel);
      if (target) {
        glowEl = target;
        target.classList.add('tour-glow');
        bnHost = (target as HTMLElement).closest('#bottom-nav');
        if (bnHost) bnHost.style.zIndex = '2550';
        try {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        } catch {
          target.scrollIntoView();
        }
        const r = target.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        setCardTop(r.bottom > vh - 230);
      } else {
        setCardTop(false);
      }
    }, 90);

    return () => {
      window.clearTimeout(t);
      if (glowEl) glowEl.classList.remove('tour-glow');
      if (bnHost) bnHost.style.zIndex = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  if (!active) return null;
  const step = TOUR[index];
  return (
    <>
      <div className="tour-dim" />
      <div className="tour-card" style={cardTop ? { top: 20, bottom: 'auto' } : undefined}>
        <div className="tour-step">{tt('Step')} {index + 1} {tt('of')} {TOUR.length}</div>
        <div className="tour-title">{tt(step.title)}</div>
        <div className="tour-text">{tt(step.text)}</div>
        <div className="tour-actions">
          <button className="btn btn-secondary btn-small" onClick={endTour}>{tt('Skip')}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {index > 0 && <button className="btn btn-secondary btn-small" onClick={() => setTour({ active: true, index: index - 1 })}>{tt('Back')}</button>}
            <button
              className="btn btn-primary btn-small"
              onClick={() => (index === TOUR.length - 1 ? endTour() : setTour({ active: true, index: index + 1 }))}
            >
              {index === TOUR.length - 1 ? tt('Finish') : tt('Next')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

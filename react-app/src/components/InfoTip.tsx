import { useEffect, useRef, useState } from 'react';
import { infoText } from '../i18n';
import { useStore } from '../store/useStore';

/** The small round "i" button that toggles a fixed tooltip, matching the original. */
export function InfoTip({ infoKey }: { infoKey: string }) {
  useStore((s) => s.lang); // re-translate on language change
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const text = infoText(infoKey);

  useEffect(() => {
    if (!open) return;
    // position after the tip has measured
    const anchor = btnRef.current;
    const tip = tipRef.current;
    if (anchor && tip) {
      const r = anchor.getBoundingClientRect();
      const tw = tip.offsetWidth;
      const th = tip.offsetHeight;
      const left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12));
      let top = r.bottom + 8;
      if (top + th > window.innerHeight - 12) top = Math.max(12, r.top - th - 8);
      setPos({ left, top });
    }
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open]);

  if (!text) return null;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="info-btn"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open && (
        <div ref={tipRef} className="tipbox" style={{ left: pos.left, top: pos.top }}>
          {text}
        </div>
      )}
    </>
  );
}

import { useStore } from '../store/useStore';

/** Stacked toast host. The store auto-dismisses each toast after ~2.6s. */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <>
      {toasts.map((t, i) => (
        <div key={t.id} className="toast" style={{ bottom: 24 + i * 52 }}>
          {t.msg}
        </div>
      ))}
    </>
  );
}

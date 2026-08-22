const FIT_TARGETS: [string, number][] = [
  ['.card-value', 11],
  ['.stamp-value', 11],
  ['.mw-value', 9],
  ['.rs-value', 10],
  ['.rec-amt', 10],
  ['.cat-amt', 9],
];

function fitOne(el: HTMLElement, minPx: number): void {
  el.style.fontSize = '';
  const cs = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
  let size = cs ? parseFloat(cs.fontSize) : 0;
  if (!size || !isFinite(size)) return;
  let guard = 0;
  while (el.scrollWidth > el.clientWidth + 1 && size > minPx && guard++ < 60) {
    size -= 0.5;
    el.style.fontSize = size + 'px';
  }
}

/** Shrink long numbers until they fit their box on one line, matching the original. */
export function fitNumbers(): void {
  if (typeof document === 'undefined' || !document.querySelectorAll) return;
  for (const [sel, min] of FIT_TARGETS) {
    const list = document.querySelectorAll<HTMLElement>(sel);
    for (let j = 0; j < list.length; j++) fitOne(list[j], min);
  }
}

'use client';

/**
 * What a button with only an icon on it does, said above it at the tap.
 *
 * The owner, 27 October 2026, with the Pro Booth's row of small icon
 * buttons on her screen: *"Elke kamer se funksies moet 'n klein pop out gee
 * wat sê wat dit doen. Hierdie klein buttons in probooth ook. Ek weet nie
 * wat dit doen nie."*
 *
 * One rule for the whole app rather than a label per room: a press on a
 * button that shows no words of its own puts its name (the `aria-label` or
 * `title` it already carries for screen readers) in a small line just above
 * it for a moment. The press still does what it does; this only says what
 * that was. A button that opts out carries `data-notip`.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

const SHOWN_MS = 1800;

interface Tip { readonly words: string; readonly x: number; readonly y: number; readonly below: boolean; readonly n: number }

/** The visible words of a button, without its icon. */
function wordsOn(el: Element): string {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export default function IconTips(): React.ReactElement | null {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const pressed = (event: Event): void => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target?.closest('button, [role="button"]');
      if (!button || button.closest('[data-notip]')) return;
      /* A button with its own words needs no line; one with a single
         character (a "+" or an "S") is still only an icon. */
      if (wordsOn(button).length > 1) return;
      const name = (button.getAttribute('aria-label') || button.getAttribute('title') || '').trim();
      if (!name) return;
      const box = button.getBoundingClientRect();
      const below = box.top < 64;
      setTip((was) => ({
        words: name.length > 90 ? `${name.slice(0, 87)}…` : name,
        x: Math.min(window.innerWidth - 12, Math.max(12, box.left + box.width / 2)),
        y: below ? box.bottom + 6 : box.top - 6,
        below,
        n: (was?.n ?? 0) + 1,
      }));
    };
    document.addEventListener('click', pressed, { capture: true, passive: true });
    return () => document.removeEventListener('click', pressed, { capture: true });
  }, []);

  useEffect(() => {
    if (!tip) return undefined;
    const gone = window.setTimeout(() => setTip(null), SHOWN_MS);
    return () => window.clearTimeout(gone);
  }, [tip]);

  /* Kept on the screen: measured once drawn, and moved in from whichever
     edge it would have run past. */
  const box = useRef<HTMLDivElement | null>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !tip) return;
    const half = el.offsetWidth / 2;
    const left = tip.x - half;
    const right = tip.x + half;
    setShift(left < 12 ? 12 - left : right > window.innerWidth - 12 ? window.innerWidth - 12 - right : 0);
  }, [tip]);

  if (!tip) return null;
  return (
    <div
      ref={box}
      key={tip.n}
      /* Hidden from screen readers: they already read the button's name. */
      aria-hidden
      data-icontip
      className="fb-tip pointer-events-none fixed z-[220] max-w-[min(18rem,calc(100vw-24px))] rounded-xl border border-emerald-400/50 bg-zinc-950/95 px-3 py-1.5 text-center text-[12px] font-semibold leading-snug text-emerald-50 shadow-lg"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(calc(-50% + ${shift}px), ${tip.below ? '0' : '-100%'})`,
      }}
    >
      {tip.words}
    </div>
  );
}

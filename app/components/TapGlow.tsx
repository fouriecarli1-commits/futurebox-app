'use client';

/**
 * Every press answers with a glow that outlives the finger.
 *
 * The owner, 17 October 2026: *"Doen 'n oudit van alle buttons. Dit moet 'n
 * beweging of glow maak wanneer 'n button gedruk word."* The press state in
 * `globals.css` is `:active`, and `:active` lasts exactly as long as the
 * finger is down — on a quick tap that is a tenth of a second, under the
 * finger, so nothing was seen. This adds a short glow ring to whatever was
 * pressed, which plays out after the finger lifts.
 *
 * One listener for the whole app, in the root layout, so a button added
 * tomorrow glows without anybody remembering to make it. Left out: anything
 * switched off, and the timeline, whose clips and handles are dragged rather
 * than pressed (`[data-timeline]`, the same exception the press state makes).
 */
import { useEffect } from 'react';

const PRESSABLE = 'button, [role="button"], a[href], label[class*="cursor-pointer"]';

export default function TapGlow(): null {
  useEffect(() => {
    /* One timer per element, so a quick second press is not cut short by
       the first press's timer running out. */
    const timers = new WeakMap<HTMLElement, number>();
    const pressed = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target.closest(PRESSABLE) : null;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-timeline]')) return;
      if (target.matches(':disabled, [aria-disabled="true"]')) return;
      /* Taken off and put back, so a second press restarts it. */
      target.classList.remove('fb-tap');
      void target.offsetWidth;
      target.classList.add('fb-tap');
      window.clearTimeout(timers.get(target));
      timers.set(target, window.setTimeout(() => target.classList.remove('fb-tap'), 600));
    };
    document.addEventListener('pointerdown', pressed, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', pressed, { capture: true });
  }, []);
  return null;
}

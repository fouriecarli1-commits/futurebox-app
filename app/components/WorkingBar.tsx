'use client';

/**
 * The neon ruler across the top of the screen while the app is waiting.
 *
 * The owner, 19 October 2026: *"Alles wat tyd vat om te laai moet 'n neon
 * glow met 'n ruler oor die blad beweeg."* One bar for the whole app rather
 * than one per room, so nothing that waits can be forgotten. It is on when
 * either is true for more than a moment:
 *
 *  - the app has asked its own server for work (`/api/…`, anything but a
 *    plain read) and the answer has not come back, or
 *  - a spinner is on the screen — every room already shows one while it
 *    waits, so a spinner anywhere is the most honest "something is loading"
 *    the page has.
 *
 * The moment matters: an answer in a fifth of a second is not a wait, and a
 * bar that flashes on every quick save is noise.
 */
import { useEffect, useState } from 'react';

const AFTER_MS = 300;
/* Fire-and-forget reports that are never a wait for the person. */
const QUIET = /\/api\/(events|listens|watch|oops|log)\b/;

let waiting = 0;
const listeners = new Set<() => void>();
const told = (): void => { for (const one of listeners) one(); };

function patchFetch(): void {
  const w = window as Window & { __fbWorkPatched?: boolean };
  if (w.__fbWorkPatched) return;
  w.__fbWorkPatched = true;
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    let path = '';
    try { path = new URL(url, window.location.href).pathname; } catch { /* not a URL we know */ }
    const counts = path.startsWith('/api/') && method !== 'GET' && method !== 'HEAD' && !QUIET.test(path);
    if (!counts) return original(input, init);
    waiting += 1;
    told();
    return original(input, init).finally(() => { waiting -= 1; told(); });
  };
}

export default function WorkingBar(): React.ReactElement | null {
  const [on, setOn] = useState(false);

  useEffect(() => {
    patchFetch();
    /* iOS Safari only draws :active on a touch when something listens. */
    const touch = (): void => undefined;
    document.addEventListener('touchstart', touch, { passive: true });

    let timer: number | null = null;
    let frame = 0;
    const busy = (): boolean => waiting > 0 || Boolean(document.querySelector('.animate-spin, [aria-busy="true"]'));
    const look = (): void => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (busy()) {
          if (timer === null) timer = window.setTimeout(() => { timer = null; setOn(busy()); }, AFTER_MS);
        } else {
          if (timer !== null) { window.clearTimeout(timer); timer = null; }
          setOn(false);
        }
      });
    };
    listeners.add(look);
    /* Class and aria-busy only: a playhead moving its style sixty times a
       second is not a reason to look. */
    const watcher = new MutationObserver(look);
    watcher.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });
    look();
    return () => {
      listeners.delete(look);
      watcher.disconnect();
      document.removeEventListener('touchstart', touch);
      if (timer !== null) window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return on ? <div className="fb-workbar" data-workbar role="progressbar" aria-label="Working" /> : null;
}

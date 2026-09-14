'use client';

/**
 * The two ways a page breaks that no error boundary sees.
 *
 * `app/error.tsx` catches a throw during render and draws a panel. Everything
 * else is silent:
 *
 *   - an exception in a click handler, a timer or a callback. React is not on
 *     the stack, so no boundary is either. `window.onerror` is.
 *   - a promise nobody awaited that rejects. `void save()` in a handler — and
 *     this app writes many of those on purpose, because a click handler must
 *     not be async — leaves nothing to catch it. `unhandledrejection` is the
 *     only listener that exists for it.
 *
 * Both are written to the device with `noteProblem`, and `/oops` reads them
 * back. Nothing is sent anywhere and nothing is shown here: this is a
 * recorder, not a dialog. A page that puts an error in front of somebody for
 * a failure they cannot act on has made a small problem into an interruption.
 *
 * Mounted once, in the root layout, so it is listening before any room draws.
 */

import { useEffect } from 'react';
import { noteProblem } from '../lib/lasterror';

export default function Watchdog(): null {
  useEffect(() => {
    const thrown = (event: ErrorEvent): void => {
      /* `event.error` is the Error where there is one. A cross-origin script
         gives none and only the message, which is still worth keeping: the
         name of the file it came from is often the whole answer. */
      noteProblem('thrown', event.error ?? `${event.message} (${event.filename}:${event.lineno})`);
    };
    const rejected = (event: PromiseRejectionEvent): void => {
      noteProblem('promise', event.reason);
    };
    /* ── And the white screen that is not an error ──────────────────────

       Carli's, most likely. A page that throws nothing, rejects nothing,
       comes back blank and recovers on a reload has not failed: Android
       has thrown the tab away to give its memory to something else — a
       file picker or a camera app is the commonest reason — and put an
       empty shell back when she returned.

       `document.wasDiscarded` is true on the load that follows exactly
       that, and it is the one thing that separates it from every other
       blank screen. It is read once, on mount, because that is when it is
       true. There is nothing to fix in this app if it is; what changes is
       what we do about it, and that cannot be decided while it is a
       guess. */
    if ((document as Document & { wasDiscarded?: boolean }).wasDiscarded) {
      noteProblem('discarded', 'The browser threw this page away and put it back.');
    }

    /* The step before that, when the browser catches it. Chrome freezes a
       backgrounded page before discarding it, and says so — so a `freeze`
       with no `resume` after it is the tab being taken, watched from the
       inside. Not every discard is announced, which is why both are here. */
    const froze = (): void => noteProblem('frozen', 'The browser froze this page in the background.');

    window.addEventListener('error', thrown);
    window.addEventListener('unhandledrejection', rejected);
    document.addEventListener('freeze', froze);
    return () => {
      window.removeEventListener('error', thrown);
      window.removeEventListener('unhandledrejection', rejected);
      document.removeEventListener('freeze', froze);
    };
  }, []);

  return null;
}

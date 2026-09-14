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
    window.addEventListener('error', thrown);
    window.addEventListener('unhandledrejection', rejected);
    return () => {
      window.removeEventListener('error', thrown);
      window.removeEventListener('unhandledrejection', rejected);
    };
  }, []);

  return null;
}

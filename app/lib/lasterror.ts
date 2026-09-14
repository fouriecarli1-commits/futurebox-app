'use client';

/**
 * What went wrong on this device, kept where somebody can read it back.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: choosing a photo in the video desk leaves a white
 * screen. Scrolling does nothing, a reload fixes it, and nothing is saved.
 *
 * Two explanations were offered and both were wrong — a memory death, ruled
 * out by an 854KB file doing it too, and an in-app browser, ruled out by real
 * Chrome doing it too. Neither was a guess made carelessly; both were beaten
 * by the same thing, which is that a white screen keeps its reason to itself.
 * `app/error.tsx` writes to the console, and nobody on a phone has a console.
 *
 * So the reason is written down on the device, and `/oops` reads it back. She
 * reloads, opens one address, and reads me a sentence. That is the whole
 * feature, and it is worth more than a third theory.
 *
 * ── What it catches that the error boundary does not ─────────────────────
 *
 * `error.tsx` catches a throw during render. It draws a dark panel with words
 * on it — which is not what she is seeing, so whatever is happening to her is
 * NOT a render throw. The two other ways to break a page are the ones with no
 * boundary at all:
 *
 *   - an exception in an event handler or a timer, which `window.onerror`
 *     sees and React never does;
 *   - a promise nobody awaited that rejects, which `unhandledrejection` sees
 *     and nothing else does.
 *
 * Both are listened for. A `void doSomething()` in a click handler — and this
 * app has many, deliberately — is exactly the second shape.
 *
 * ── It goes nowhere ──────────────────────────────────────────────────────
 *
 * `localStorage`, on the device, and never sent. An error message can carry
 * anything that was on the screen, and an error report is a thing somebody
 * has to agree to rather than a thing that happens to them. That is the same
 * posture `error.tsx` already takes with the console, said again here because
 * this one persists and the console does not.
 */

const KEY = 'futurebox.problems.v1';

/** How many are kept. Enough to see a pattern, few enough to read. */
const MOST = 10;

export interface Problem {
  /**
   * Which way it broke, which is most of what narrows a hunt.
   *
   * `discarded` is not a break at all and is the reason this list exists in
   * its second form. A page that throws nothing, rejects nothing, comes back
   * blank and recovers on a reload has not failed — it has been thrown away
   * and put back by the operating system, which happens on Android when a
   * file picker or a camera needs the memory the browser was holding.
   *
   * `document.wasDiscarded` says so in one boolean, and it is the only thing
   * that separates that from every other white screen. Nothing else in this
   * file needs an explanation; this one does, because a reader will wonder
   * why a non-error is in a list of errors. It is here because it is the
   * answer to the question the list was made to ask.
   */
  readonly how: 'render' | 'thrown' | 'promise' | 'discarded' | 'frozen';
  readonly name: string;
  readonly message: string;
  /** The first few frames. A phone screen holds about this much. */
  readonly where: string;
  /** Whatever the page was showing, so a report says which screen. */
  readonly page: string;
  readonly at: string;
  /** Next.js's own handle on a production error whose stack was stripped. */
  readonly digest?: string;
}

function readAll(): Problem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as Problem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Write one down.
 *
 * Every field is defended, because this runs while something is already
 * wrong: an `Error` is the usual thing to be handed and a string, a DOM
 * event, or `undefined` are all possible, and a recorder that throws while
 * recording a throw has made the day worse.
 */
export function noteProblem(how: Problem['how'], thing: unknown, digest?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const error = thing instanceof Error ? thing : null;
    const one: Problem = {
      how,
      name: error?.name || (thing && typeof thing === 'object' ? 'Object' : typeof thing),
      message: (error?.message || String(thing ?? '')).slice(0, 400),
      where: (error?.stack || '').split('\n').slice(1, 5).join('\n').slice(0, 600),
      page: `${window.location.pathname}${window.location.search}`.slice(0, 120),
      at: new Date().toISOString(),
      ...(digest ? { digest } : {}),
    };
    /* Newest first, because the one being asked about is the last one. */
    window.localStorage.setItem(KEY, JSON.stringify([one, ...readAll()].slice(0, MOST)));
  } catch {
    // Storage full, blocked, or the page is already too far gone. Nothing
    // here is worth a second failure.
  }
}

export function problems(): Problem[] {
  return readAll();
}

export function forgetProblems(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do, and nothing that depends on it.
  }
}

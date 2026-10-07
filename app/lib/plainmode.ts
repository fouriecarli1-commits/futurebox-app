/**
 * Simple, or every choice there is.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli's list, 7 October 2026: *"Simple en advances opsies."*
 *
 * ── What it is NOT ───────────────────────────────────────────────────────
 *
 * It is not a cut-down app. Hiding a tool from somebody because they have
 * not asked for it yet is how a person comes to believe the app cannot do a
 * thing it does, and they do not come back to check. Every tool is in both
 * modes.
 *
 * What simple hides is the CHOICES. The photo editor grew three cut edges,
 * three sharpening strengths, three blur strengths, three enlargements and
 * two file formats in two days, and every one of those was the right thing
 * to add — each exists because the right answer genuinely depends on the
 * photograph. But somebody posting a picture before work does not want to be
 * asked five questions she has no opinion about, and the honest answer to
 * most of them is the middle one.
 *
 * So: simple is one button per tool, at the setting that is right most of
 * the time. Everything is every rung. The same tools either way, and nothing
 * done in one mode is undone by switching to the other.
 *
 * ── Why a store and not a prop ───────────────────────────────────────────
 *
 * The same reason as `fullroom.ts`: the switch is in a room's header and the
 * controls it governs are four components down, in two rooms, and the
 * alternative was a prop threaded through every one of them or a context
 * provider wrapping the app for one boolean.
 *
 * ── Why it starts simple ─────────────────────────────────────────────────
 *
 * Because the first minute decides. Somebody who opens a room and finds
 * twenty controls learns that this app is hard; somebody who finds five and
 * a way to ask for more learns where the more is. The switch says
 * "Everything" in words rather than a gear icon, so the way to it is not a
 * thing to be discovered.
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'futurebox.plain.v1';

let plain: boolean | null = null;
const watchers = new Set<() => void>();

const tell = (): void => {
  for (const watcher of watchers) watcher();
};

const subscribe = (watcher: () => void): (() => void) => {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
};

/**
 * Read once, from the device, and then from memory.
 *
 * `useSyncExternalStore` calls the snapshot on every render and compares what
 * comes back, so a function that reads `localStorage` each time is a storage
 * read per render — and, worse, it must return the SAME value each time or
 * React loops. Read once into a variable is both faster and correct.
 */
const read = (): boolean => {
  if (plain !== null) return plain;
  try {
    plain = window.localStorage.getItem(KEY) !== 'no';
  } catch {
    /* Private browsing, blocked storage, a server. Simple is the better
       answer when nobody has said otherwise. */
    plain = true;
  }
  return plain;
};

/** Whether the rooms should show one button per tool rather than every rung. */
export function usePlain(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}

/** And the switch, which is a hook so a room can put it where it likes. */
export function useSetPlain(): (on: boolean) => void {
  return useCallback((on: boolean) => {
    plain = on;
    try {
      window.localStorage.setItem(KEY, on ? 'yes' : 'no');
    } catch {
      /* Not being able to remember it is not a reason not to do it. */
    }
    tell();
  }, []);
}

/**
 * For a check, and for a test that needs to start from nothing.
 *
 * Exported rather than reached for through the module's innards, so that a
 * second way of resetting it cannot come to exist and disagree with this one.
 */
export function forgetPlain(): void {
  plain = null;
  tell();
}

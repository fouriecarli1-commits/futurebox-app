'use client';

/**
 * Telling the account what somebody keeps doing, and asking it back.
 *
 * ── Never in the way ─────────────────────────────────────────────────────
 *
 * `noteTaste` is called from the middle of making something — a song lands, a
 * room opens — and none of those things may wait for it or fail because of it.
 * So it does not throw, is not awaited by its callers, and answers nothing.
 * The worst case is that the app forgets one song, which is a suggestion that
 * arrives a week later than it might have.
 *
 * ── Both, on purpose ─────────────────────────────────────────────────────
 *
 * The device still knows what it always knew: `lib/library.ts` holds the songs
 * with their genres and `lib/makes.ts` holds what came out of each room.
 * `habits.ts` merges the account's counts over the device's, so somebody with
 * no account, or an app with no Supabase behind it, still gets a greeting that
 * knows them — and somebody with an account gets one that follows them to a
 * second device.
 */

import { accessToken } from './cloud';

export type TasteKind = 'genre' | 'room';

export interface TasteLine {
  readonly kind: TasteKind;
  readonly label: string;
  readonly times: number;
  readonly last_at: string;
}

export interface Taste {
  readonly lines: readonly TasteLine[];
  /**
   * False where the account could not answer at all.
   *
   * A different thing from an empty list, and the two get different sentences:
   * a new account has nothing yet, an app whose migration has not been run
   * cannot know. The wallet was fixed for this exact confusion — a request
   * that never arrived looked identical to a working free account.
   */
  readonly ready: boolean;
}

export const NO_TASTE: Taste = { lines: [], ready: false };

/**
 * Say that this happened. Fire and forget, deliberately.
 *
 * Not awaited anywhere. A room that pauses to record what somebody likes
 * before showing them what they asked for has its priorities backwards.
 */
export function noteTaste(kind: TasteKind, label: string): void {
  const clean = (label ?? '').trim();
  if (!clean) return;
  void (async () => {
    try {
      const token = await accessToken();
      // Signed out is the common case on a first visit and is not worth a
      // request: the route would answer `noted: false` and nothing else.
      if (!token) return;
      await fetch('/api/taste', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, label: clean }),
        keepalive: true,
      });
    } catch {
      // Forgetting one song is not worth a line on anybody's screen.
    }
  })();
}

export async function loadTaste(): Promise<Taste> {
  try {
    const token = await accessToken();
    if (!token) return NO_TASTE;
    const response = await fetch('/api/taste', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return NO_TASTE;
    const said = (await response.json()) as { taste?: TasteLine[]; ready?: boolean };
    return { lines: said.taste ?? [], ready: said.ready === true };
  } catch {
    return NO_TASTE;
  }
}

/** Stop remembering, from the account screen. */
export async function forgetTaste(): Promise<boolean> {
  try {
    const token = await accessToken();
    if (!token) return false;
    const response = await fetch('/api/taste', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;
    return ((await response.json()) as { forgotten?: boolean }).forgotten === true;
  } catch {
    return false;
  }
}

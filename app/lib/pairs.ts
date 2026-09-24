'use client';

/**
 * A room the two of you are in, and who is holding the pen.
 *
 * ── What this is instead of ──────────────────────────────────────────────
 *
 * Carli asked for every create-room to be duplicated for two people. Put to
 * her, she chose the version that is not nine copies: *"dieselfde kamer, in
 * 'n paar-modus"*. The rooms stay one room each. A pair is a row saying
 * which two people, which room, and which of them may act — and the room
 * draws a strip at the top when one is open.
 *
 * That is not a shortcut. Nine two-person copies would be nine second places
 * for the same fault to live, and every fix in the booth would have to be
 * made twice or silently not apply to anybody working with somebody else.
 *
 * ── Why one of them holds a pen ──────────────────────────────────────────
 *
 * Asked what should happen when both change something at the same moment,
 * she chose turn-taking. It is the right answer and the reason is worth
 * writing down: the alternative that sounds friendlier — both free, last one
 * wins — means two people dragging the same lane at the same second end up
 * with one person's work gone and **nothing on either screen saying so**.
 * That is the worst kind of loss, because neither of them can even report
 * it. A pen is visible: you can see you do not have it.
 *
 * Everything here is a thin call to `/api/pairs`. The rules — that a pair
 * cannot exist without an accepted collab, that only the holder may pass the
 * pen — live in the route and in the table's own constraints, because a rule
 * enforced in the browser is a rule enforced for people who use the browser.
 */

import { accessToken } from './cloud';
import type { SurfaceId } from './surfaces';

export interface Pair {
  readonly id: string;
  /** Which room the two of you are working in. */
  readonly surface: SurfaceId;
  /** The other person, as they are named on their channel. */
  readonly withName: string;
  readonly withHandle: string;
  /** True when the pen is yours, so the room lets you act. */
  readonly mine: boolean;
  /** True when they have asked for it and you have not handed it over. */
  readonly wanted: boolean;
  /** When the pen last changed hands, so "asked four minutes ago" is sayable. */
  readonly penAt: string;
  /** What they left for you to reach them on, if anything. */
  readonly theirLink?: { readonly platform: string; readonly url: string; readonly shown: string };
  /** What you left for them, if anything. */
  readonly myLink?: { readonly platform: string; readonly url: string; readonly shown: string };
}

export interface Pairs {
  readonly pairs: Pair[];
  /**
   * False when `supabase/pairs.sql` has never been run.
   *
   * Apart from an empty list, for the reason the collab room learned the hard
   * way: a project with the tables missing drew "no collaborations yet",
   * which is indistinguishable from having none and is why that feature
   * looked unused rather than switched off for weeks.
   */
  readonly ready: boolean;
  /** True when the names or the shared links could not be read, so the strip says so. */
  readonly detailUnread?: boolean;
  readonly message?: string;
}

async function head(): Promise<Record<string, string>> {
  const token = await accessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loadPairs(): Promise<Pairs> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/pairs', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
    const body = (await response.json()) as Pairs;
    /* A failed read is not an empty list, here least of all: "you are in no
       rooms" and "we could not find out" send somebody to start a second
       room with the person they are already working with. */
    if (!response.ok) return { pairs: [], ready: false, message: body?.message };
    return body;
  } catch {
    return { pairs: [], ready: false, message: 'offline' };
  }
}

/** Open the room. Returns the pair, or a sentence saying why not. */
export async function openPair(
  collab: string,
  surface: SurfaceId,
): Promise<Pair | { readonly message: string }> {
  try {
    const response = await fetch('/api/pairs', {
      method: 'POST',
      headers: await head(),
      body: JSON.stringify({ what: 'open', collab, surface }),
    });
    const body = await response.json();
    if (!response.ok) return { message: body?.message ?? 'That did not go through.' };
    return body.pair as Pair;
  } catch {
    return { message: 'Could not reach the app’s server.' };
  }
}

/** Ask for the pen, or hand it over. Which one depends on who holds it. */
export async function pen(id: string, what: 'ask' | 'give'): Promise<string | null> {
  try {
    const response = await fetch('/api/pairs', {
      method: 'POST',
      headers: await head(),
      body: JSON.stringify({ what: `pen_${what}`, id }),
    });
    if (response.ok) return null;
    const body = await response.json();
    return body?.message ?? 'That did not go through.';
  } catch {
    return 'Could not reach the app’s server.';
  }
}

/** Leave one address, or one handle, for the other person. */
export async function shareLink(
  id: string,
  given: { readonly link?: string; readonly platform?: string; readonly handle?: string },
): Promise<string | null> {
  try {
    const response = await fetch('/api/pairs', {
      method: 'POST',
      headers: await head(),
      body: JSON.stringify({ what: 'link', id, ...given }),
    });
    if (response.ok) return null;
    const body = await response.json();
    return body?.message ?? 'That did not go through.';
  } catch {
    return 'Could not reach the app’s server.';
  }
}

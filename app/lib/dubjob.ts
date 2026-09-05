'use client';

/**
 * Talking to the dubbing route, from wherever a dub is started.
 *
 * The podcast room had all of this inside its own component: the auth header,
 * the two shapes of the polling answer, the collect URL, and the rule that a
 * job id must be written down before the screen can be closed. The video desk
 * needs the identical four things, and the one thing that must never drift
 * between two callers is the collect step — a dub is paid for at the moment it
 * is accepted, so a caller that fetches it wrongly has lost somebody money for
 * a file that exists on ElevenLabs' side and is now unreachable.
 *
 * So the wire lives here and each screen keeps its own state machine, which is
 * the part that is genuinely different: an episode becomes another episode,
 * and a film becomes a file you save.
 */

import { accessToken } from './cloud';

/** How often to ask. A dub is minutes, so a second would be rude to both ends. */
export const EVERY = 6000;

/** Where an in-flight job is remembered, so a reload does not strand it. */
export function remembered(what: string): string {
  return `futurebox.dub.${what}`;
}

export interface Progress {
  status: string;
  done: boolean;
  failed: boolean;
  error: string | null;
  language: string | null;
}

async function auth(): Promise<Record<string, string>> {
  const token = await accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Started =
  | { readonly ok: true; readonly id: string; readonly expected: number }
  | { readonly ok: false; readonly said: { message?: string; code?: string } | null };

/**
 * Start one.
 *
 * `seconds` is what the price is worked out from, so it is the length of the
 * thing being sent and not a guess — the route charges before the job runs and
 * a wrong number here is a wrong bill.
 */
export async function startDub(
  file: Blob,
  filename: string,
  to: string,
  seconds: number,
  title: string,
): Promise<Started> {
  const body = new FormData();
  body.append('file', file, filename);
  body.append('to', to.trim().toLowerCase());
  body.append('seconds', String(Math.max(0, Math.round(seconds))));
  body.append('title', title);
  // Zero is their own convention for "work out how many people are talking".
  body.append('speakers', '0');

  const response = await fetch('/api/dub', { method: 'POST', headers: await auth(), body });
  const said = (await response.json().catch(() => null)) as
    | { id?: string; expected?: number; message?: string; code?: string }
    | null;
  if (!response.ok || !said?.id) return { ok: false, said };
  return { ok: true, id: said.id, expected: Number(said.expected) || 0 };
}

export type Asked =
  | { readonly ok: true; readonly progress: Progress }
  | { readonly ok: false; readonly said: { message?: string; code?: string } | null };

/** Where it has got to. */
export async function askDub(id: string): Promise<Asked> {
  const response = await fetch(`/api/dub?id=${encodeURIComponent(id)}`, { headers: await auth() });
  if (!response.ok) {
    return { ok: false, said: (await response.json().catch(() => null)) as { message?: string } | null };
  }
  return { ok: true, progress: (await response.json()) as Progress };
}

export type Collected =
  | { readonly ok: true; readonly file: Blob }
  | { readonly ok: false; readonly said: { message?: string; code?: string } | null };

/**
 * The finished file.
 *
 * Whatever comes back, unchanged. A dub of a recording is audio and a dub of a
 * film is a film — the route passes the upstream's own content type through
 * rather than deciding, so the blob's `type` is the truth about which one this
 * is and callers read it off there.
 */
export async function collectDub(id: string): Promise<Collected> {
  const response = await fetch(`/api/dub?id=${encodeURIComponent(id)}&collect=1`, {
    headers: await auth(),
  });
  if (!response.ok) {
    return { ok: false, said: (await response.json().catch(() => null)) as { message?: string } | null };
  }
  return { ok: true, file: await response.blob() };
}

/** Forget a job id, for when it finished or failed. */
export function forget(what: string): void {
  try {
    window.localStorage.removeItem(remembered(what));
  } catch {
    // Nothing to clean up if it was never written.
  }
}

/** Write one down, so closing the screen does not strand a paid-for job. */
export function remember(what: string, id: string): void {
  try {
    window.localStorage.setItem(remembered(what), id);
  } catch {
    // Storage off: the poll still works for as long as the screen stays open.
  }
}

export function recall(what: string): string | null {
  try {
    return window.localStorage.getItem(remembered(what));
  } catch {
    return null;
  }
}

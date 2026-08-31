/**
 * Working with somebody: asking, answering, and the room afterwards.
 *
 * Everything here is a thin call to a route. The rules — one thread per pair,
 * only the person asked may answer, no messages before both agreed — live in
 * the server and in the row-level policies, not in this file. That is
 * deliberate: a rule enforced in the browser is a rule enforced for people who
 * use the browser.
 */

import { accessToken } from './cloud';

export interface Thread {
  readonly id: string;
  /** asked | accepted | declined. */
  readonly state: string;
  /** Why the two were put together, as the asker described it. */
  readonly because: string;
  /** True when you are the one who asked, which decides what you are offered. */
  readonly mine: boolean;
  readonly name: string;
  readonly handle: string;
  readonly createdAt: string;
}

export interface Said {
  readonly id: number;
  readonly mine: boolean;
  readonly body: string;
  readonly trackId?: string;
  readonly at: string;
}

async function head(): Promise<Record<string, string>> {
  const token = await accessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function loadThreads(): Promise<Thread[]> {
  const token = await accessToken();
  const response = await fetch('/api/collab', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return [];
  const data = (await response.json().catch(() => null)) as { threads?: Thread[] } | null;
  return data?.threads ?? [];
}

/**
 * Ask somebody to work with you.
 *
 * `because` is the match's own reasons — the tempo, the key, the shared style
 * words. A request carrying them is answerable; one without them is a cold
 * call, and the person on the other end has no way to tell the two apart
 * except by what is in it.
 */
export async function ask(
  handle: string,
  because: string,
): Promise<{ ok: true; id: string; existing?: boolean } | { ok: false; message: string }> {
  const response = await fetch('/api/collab', {
    method: 'POST',
    headers: await head(),
    body: JSON.stringify({ handle, because }),
  }).catch(() => null);
  if (!response) return { ok: false, message: 'Could not reach the app.' };

  const data = (await response.json().catch(() => ({}))) as {
    id?: string;
    existing?: boolean;
    message?: string;
  };
  if (!response.ok || !data.id) {
    return { ok: false, message: data.message ?? 'That could not be sent.' };
  }
  return { ok: true, id: data.id, existing: data.existing };
}

export async function answer(id: string, yes: boolean): Promise<string | null> {
  const response = await fetch('/api/collab', {
    method: 'PATCH',
    headers: await head(),
    body: JSON.stringify({ id, answer: yes ? 'accepted' : 'declined' }),
  }).catch(() => null);
  if (!response) return 'Could not reach the app.';
  if (response.ok) return null;
  const data = (await response.json().catch(() => ({}))) as { message?: string };
  return data.message ?? 'That did not work.';
}

export async function loadSaid(collab: string): Promise<Said[]> {
  const token = await accessToken();
  const response = await fetch(`/api/collab/messages?collab=${encodeURIComponent(collab)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return [];
  const data = (await response.json().catch(() => null)) as { messages?: Said[] } | null;
  return data?.messages ?? [];
}

export async function say(
  collab: string,
  body: string,
  trackId?: string,
): Promise<{ ok: true; said: Said } | { ok: false; message: string }> {
  const response = await fetch('/api/collab/messages', {
    method: 'POST',
    headers: await head(),
    body: JSON.stringify({ collab, body, trackId }),
  }).catch(() => null);
  if (!response) return { ok: false, message: 'Could not reach the app.' };

  const data = (await response.json().catch(() => ({}))) as Partial<Said> & { message?: string };
  if (!response.ok || typeof data.id !== 'number') {
    return { ok: false, message: data.message ?? 'That did not send.' };
  }
  return {
    ok: true,
    said: {
      id: data.id,
      mine: true,
      body: data.body ?? body,
      trackId: data.trackId,
      at: data.at ?? new Date().toISOString(),
    },
  };
}

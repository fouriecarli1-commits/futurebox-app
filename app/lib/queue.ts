'use client';

/**
 * The posting queue, from the browser's side.
 *
 * Thin on purpose: the queue is a table and a clock, and everything that
 * decides anything lives on the server. What is here is the shape of a row,
 * the four calls, and one piece of arithmetic — turning a local date and time
 * somebody typed into the instant the server stores.
 */

import { accessToken } from './cloud';

export type PostState = 'due' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface Scheduled {
  readonly id: string;
  readonly platform: string;
  readonly caption: string;
  readonly media_path: string;
  /** An ISO instant. Shown in whatever timezone the reader's device is in. */
  readonly due_at: string;
  readonly state: PostState;
  readonly note?: string;
  readonly sent_at?: string | null;
}

export interface Queue {
  readonly posts: readonly Scheduled[];
  /**
   * False where the queue could not be asked at all.
   *
   * Distinct from an empty queue, and the screen says different things about
   * them: nothing scheduled yet, against `supabase/posting.sql` not having
   * been run. Same distinction the wallet was fixed for.
   */
  readonly ready: boolean;
}

export const NO_QUEUE: Queue = { posts: [], ready: false };

/**
 * A date and a time as somebody typed them, as the instant they meant.
 *
 * `<input type="date">` gives "2026-06-09" and `<input type="time">` gives
 * "18:00", and both mean *their* six o'clock. `new Date('2026-06-09T18:00')`
 * — no zone — is read as local time by every browser, which is exactly right
 * and is the one place this could quietly go wrong: appending a `Z` would make
 * it UTC and send a South African's evening post at eight in the evening.
 */
export function instantOf(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const at = new Date(`${date}T${time}`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** The soonest date an `<input type="date">` should allow: today, locally. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export async function loadQueue(): Promise<Queue> {
  try {
    const token = await accessToken();
    if (!token) return NO_QUEUE;
    const response = await fetch('/api/schedule', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return NO_QUEUE;
    const said = (await response.json()) as { posts?: Scheduled[]; ready?: boolean };
    return { posts: said.posts ?? [], ready: said.ready === true };
  } catch {
    return NO_QUEUE;
  }
}

export interface Asked {
  readonly platform: string;
  readonly caption: string;
  readonly mediaPath?: string;
  /** An ISO instant, from `instantOf`. */
  readonly dueAt: string;
}

export type Added =
  | { readonly ok: true; readonly post: Scheduled }
  | { readonly ok: false; readonly message: string };

export async function schedule(asked: Asked): Promise<Added> {
  try {
    const token = await accessToken();
    if (!token) return { ok: false, message: 'Sign in first.' };
    const response = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(asked),
    });
    const said = (await response.json().catch(() => ({}))) as {
      post?: Scheduled;
      message?: string;
    };
    if (!response.ok || !said.post) {
      return { ok: false, message: said.message ?? 'That could not be scheduled.' };
    }
    return { ok: true, post: said.post };
  } catch {
    return { ok: false, message: 'That could not be scheduled.' };
  }
}

export async function cancel(id: string): Promise<boolean> {
  try {
    const token = await accessToken();
    if (!token) return false;
    const response = await fetch(`/api/schedule?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return false;
    return ((await response.json()) as { cancelled?: boolean }).cancelled === true;
  } catch {
    return false;
  }
}

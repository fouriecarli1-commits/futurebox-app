'use client';

/**
 * Telling the server that something happened, and reading back the totals.
 *
 * What is sent is deliberately thin: what kind of thing, which one, and an
 * opaque id for this browser. No email, no address, nothing that identifies
 * anybody — the id is random, made here, and means only "the same browser as
 * last time". That is all a visitor count needs, and anything more would be
 * collecting for the sake of it.
 *
 * Every call is fire-and-forget. A counter is never worth a slower page, and a
 * failure to record something is not a failure the person should hear about.
 */

import type { EventKind } from './server/stats';

const VISITOR_KEY = 'fb.visitor';
const SENT_KEY = 'fb.signalled';

/**
 * This browser's id: thirty-two hex characters, random, kept.
 *
 * Cleared site data means a new id and therefore a second visitor. That is a
 * known inaccuracy and the honest direction to be wrong in — it can only
 * overcount reach slightly, never invent an event that did not happen.
 */
function visitor(): string {
  try {
    const kept = localStorage.getItem(VISITOR_KEY);
    if (kept && /^[0-9a-f]{32}$/.test(kept)) return kept;
    const made =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, '')
        : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    localStorage.setItem(VISITOR_KEY, made);
    return made;
  } catch {
    return '';
  }
}

/**
 * Whether this exact thing has already been sent today.
 *
 * The database enforces one-per-day regardless, so this is not the rule — it is
 * the difference between a page that makes one request and a page that makes
 * one on every re-render for the server to throw away.
 */
function alreadySent(key: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(SENT_KEY);
    const kept = raw ? (JSON.parse(raw) as { day?: string; keys?: string[] }) : null;
    const keys = kept && kept.day === today && Array.isArray(kept.keys) ? kept.keys : [];
    if (keys.indexOf(key) !== -1) return true;
    keys.push(key);
    localStorage.setItem(SENT_KEY, JSON.stringify({ day: today, keys: keys.slice(-500) }));
    return false;
  } catch {
    return false;
  }
}

/** Records that something happened. Silent, and never throws. */
export function signal(kind: EventKind, about?: { category?: string; ref?: string }): void {
  if (typeof window === 'undefined') return;
  const who = visitor();
  if (!who) return;

  const key = `${kind}:${about?.ref ?? ''}`;
  if (alreadySent(key)) return;

  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Survives the page being closed straight after the click, which is exactly
    // what happens when the thing clicked opens somewhere else.
    keepalive: true,
    body: JSON.stringify({ kind, visitor: who, category: about?.category, ref: about?.ref }),
  }).catch(() => {});
}

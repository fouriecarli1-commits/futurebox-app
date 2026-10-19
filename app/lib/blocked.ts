'use client';

/**
 * Who this person has blocked, kept on the device and on the account, as
 * the `who` keys the feed carries (`server/who.ts`) — never account ids.
 *
 * On the device first, so a block takes effect the moment it is pressed and
 * works for somebody signed out; on the account too, so it follows them to a
 * second phone. Any list that shows other members' work reads `useBlocked`
 * and leaves those members out (`withoutBlocked` in `lib/reports.ts`).
 */

import { useEffect, useState } from 'react';
import { accessToken } from './cloud';
import { BLOCKED_KEY, blockedList } from './reports';

const CHANGED = 'futurebox:blocked';

export function readBlocked(): string[] {
  try {
    return blockedList(JSON.parse(localStorage.getItem(BLOCKED_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function keep(list: readonly string[]): void {
  try {
    localStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedList(list)));
  } catch {
    /* Storage refused: the block still holds for this visit through the event. */
  }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: blockedList(list) }));
}

/** What a block is pressed on: the member's key, and the post or link it was on. */
export interface BlockOn {
  readonly who: string;
  readonly post?: string;
  readonly said?: string;
}

async function tell(on: BlockOn, block: boolean): Promise<void> {
  const token = await accessToken();
  if (!token) return;
  await fetch('/api/block', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ post: on.post, said: on.said, on: block }),
  }).catch(() => undefined);
}

export async function block(on: BlockOn): Promise<void> {
  hide(on.who);
  await tell(on, true);
}

/** The account half of a block alone: written, but nothing hidden yet. */
export async function blockOnAccount(on: BlockOn): Promise<void> {
  await tell(on, true);
}

/** Take a member's work off this phone's screens. */
export function hide(who: string): void {
  keep([...readBlocked(), who]);
}


/** The device's list joined with the account's, once, when a list first shows. */
async function joinAccount(): Promise<void> {
  const token = await accessToken();
  if (!token) return;
  const answer = await fetch('/api/block', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!answer?.ok) return;
  const said = (await answer.json().catch(() => ({}))) as { blocked?: unknown };
  const theirs = blockedList(said.blocked);
  const mine = readBlocked();
  if (theirs.some((one) => !mine.includes(one))) keep([...mine, ...theirs]);
}

let joined = false;

/** The blocked list, live: it changes the moment somebody is blocked anywhere. */
export function useBlocked(): string[] {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    setList(readBlocked());
    const changed = (event: Event): void => setList(blockedList((event as CustomEvent).detail));
    window.addEventListener(CHANGED, changed);
    if (!joined) {
      joined = true;
      void joinAccount();
    }
    return () => window.removeEventListener(CHANGED, changed);
  }, []);
  return list;
}

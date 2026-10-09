/**
 * Asking and setting a child's allowance, from the browser.
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."* This is the page's half of that: three calls to `/api/kids`, which
 * is where the account is read off the token and never off the body.
 *
 * A thin file on purpose. The allowance itself is enforced in `charge()` —
 * see `lib/server/kidsmode.ts` — and nothing here is a limit. What is here
 * is a form talking to a row.
 */

import { accessToken } from './cloud';

export interface KidsState {
  readonly open: boolean;
  readonly allowance?: number;
  readonly spent?: number;
  readonly left?: number;
}

const shut: KidsState = { open: false };

async function ask(how: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<KidsState | null> {
  const token = await accessToken();
  /* No token is not an error worth a message: the page behind this is only
     reachable signed in, and a session that has just expired should send
     somebody to sign in rather than show them a failure about credits. */
  if (!token) return null;
  const answer = await fetch('/api/kids', {
    method: how,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!answer.ok) return null;
  return (await answer.json().catch(() => null)) as KidsState | null;
}

/** Where the allowance stands. `shut` when nothing is set. */
export async function kidsNow(): Promise<KidsState> {
  return (await ask('GET')) ?? shut;
}

/** Hand over an allowance, or change one. `null` when it could not be saved. */
export async function giveAllowance(allowance: number): Promise<KidsState | null> {
  return ask('POST', { allowance });
}

/** Shut the room. The child's spending cap goes with it. */
export async function endKids(): Promise<KidsState | null> {
  return ask('DELETE');
}

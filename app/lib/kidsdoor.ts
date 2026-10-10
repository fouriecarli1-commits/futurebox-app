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
  /** How long one sitting may last. Null or absent is a budget with no clock. */
  readonly minutes?: number | null;
  /**
   * Seconds left in this sitting, as the SERVER counted them.
   *
   * Read once and counted down from in the browser, which is the right
   * division of labour: the number is the server's and the ticking is the
   * page's. A page that worked the remaining time out for itself would be a
   * page a child could change the phone's clock to extend.
   */
  readonly secondsLeft?: number | null;
}

const shut: KidsState = { open: false };

async function ask(
  how: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<KidsState | null> {
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

/**
 * Hand over an allowance and, if they want one, a clock.
 *
 * Handing the phone over IS the start of the sitting, so this starts the
 * clock. `null` minutes is a budget with no clock on it, which is a
 * reasonable thing to want and is what every room opened before today has.
 */
export async function giveAllowance(
  allowance: number,
  minutes: number | null = null,
): Promise<KidsState | null> {
  return ask('POST', { allowance, minutes });
}

/** Another sitting, without touching the allowance. The grown-up's press. */
export async function sitAgain(): Promise<KidsState | null> {
  return ask('PUT', { sit: true });
}

/** End this sitting now, keeping the room and its allowance. */
export async function endSitting(): Promise<KidsState | null> {
  return ask('PUT', { sit: false });
}

/** Shut the room. The child's spending cap goes with it. */
export async function endKids(): Promise<KidsState | null> {
  return ask('DELETE');
}

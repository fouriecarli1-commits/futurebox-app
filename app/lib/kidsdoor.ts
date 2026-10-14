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
  /** Kids credits bought with a kids pack, already counted in `left`. */
  readonly bought?: number;
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
  /**
   * False when there is nobody signed in to belong to. The door draws a
   * sign-in step instead of allowance buttons, because an allowance pressed
   * with no account behind it goes nowhere — see `KidsFail` below.
   */
  readonly signedIn?: boolean;
}

/**
 * Why a press did not take.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 12 October 2026: *"Wel die kids room gaan nie verder as die parental
 * page nie."* Every call here used to answer `null` for four different
 * things — signed out, a network blip, a 4xx with a sentence in it, a 503 —
 * and the door swallowed the null and did nothing. A parent pressing "20
 * credits" and watching nothing happen is exactly what she saw: the door was
 * reached from the sign-in screen, there was no session, and the silence
 * was the whole report.
 *
 * `signedOut` and `network` are named so the door can say them in the
 * reader's language; anything else is the server's own sentence, which the
 * route already writes for a person.
 */
export interface KidsFail {
  readonly fail: 'signedOut' | 'network' | string;
}

/** Narrow an answer to the failure it is. */
export const failed = (answer: KidsState | KidsFail): answer is KidsFail =>
  'fail' in answer;

const shut: KidsState = { open: false };

async function ask(
  how: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<KidsState | KidsFail> {
  /* Sent even with no token. The server answers 401 for nobody, and that
     answer is the signed-out signal — the page does not decide for itself.
     Deciding here was the first version, and it meant a probe with the
     route stubbed could never get past the door, so the door's own
     behaviour on a good answer was unmeasured. */
  const token = await accessToken();
  let answer: Response;
  try {
    answer = await fetch('/api/kids', {
      method: how,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    return { fail: 'network' };
  }
  const said = (await answer.json().catch(() => null)) as
    | (KidsState & { message?: string })
    | null;
  if (answer.status === 401) return { fail: 'signedOut' };
  if (!answer.ok) return { fail: said?.message || `The server answered ${answer.status}.` };
  if (!said) return { fail: 'network' };
  return said;
}

/**
 * Where the allowance stands. `shut` when nothing is set, and `shut` with
 * `signedIn: false` when there is nobody to ask about.
 */
export async function kidsNow(): Promise<KidsState> {
  const now = await ask('GET');
  if (!failed(now)) return now;
  return now.fail === 'signedOut' ? { ...shut, signedIn: false } : shut;
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
): Promise<KidsState | KidsFail> {
  return ask('POST', { allowance, minutes });
}

/** Another sitting, without touching the allowance. The grown-up's press. */
export async function sitAgain(): Promise<KidsState | KidsFail> {
  return ask('PUT', { sit: true });
}

/** End this sitting now, keeping the room and its allowance. */
export async function endSitting(): Promise<KidsState | KidsFail> {
  return ask('PUT', { sit: false });
}

/** Shut the room. The child's spending cap goes with it. */
export async function endKids(): Promise<KidsState | KidsFail> {
  return ask('DELETE');
}

/**
 * A kids pack (`lib/kidspacks.ts`), bought at Paystack. Returns where to
 * send the browser, or why not in a sentence. The credits arrive by the
 * webhook, never by this page saying the payment went through.
 */
export async function buyKidsPack(pack: string): Promise<{ url: string } | KidsFail> {
  /* Without a token the server answers 401 and that is the signed-out
     signal, as for every other press here: the page does not decide. */
  const token = await accessToken();
  let answer: Response;
  try {
    answer = await fetch('/api/checkout', {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'kids', pack }),
    });
  } catch {
    return { fail: 'network' };
  }
  const said = (await answer.json().catch(() => null)) as { url?: string; message?: string } | null;
  if (answer.status === 401) return { fail: 'signedOut' };
  if (!answer.ok || !said?.url) return { fail: said?.message || `The server answered ${answer.status}.` };
  return { url: said.url };
}

/** The monthly kids packs standing at Paystack for this account. */
export async function kidsMonthly(): Promise<{ pack: string; nextPaymentAt: string | null }[]> {
  const token = await accessToken();
  /* Nobody signed in has no pack to show; asking would only be a 401. */
  if (!token) return [];
  try {
    const answer = await fetch('/api/kids/pack', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!answer.ok) return [];
    const said = (await answer.json().catch(() => null)) as { monthly?: { pack: string; nextPaymentAt: string | null }[] } | null;
    return said?.monthly ?? [];
  } catch {
    return [];
  }
}

/** Stop every monthly kids pack. The credits already bought stay. */
export async function stopKidsMonthly(): Promise<{ stopped: number } | KidsFail> {
  const token = await accessToken();
  let answer: Response;
  try {
    answer = await fetch('/api/kids/pack', { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    return { fail: 'network' };
  }
  const said = (await answer.json().catch(() => null)) as { stopped?: number; message?: string } | null;
  if (answer.status === 401) return { fail: 'signedOut' };
  if (!answer.ok) return { fail: said?.message || `The server answered ${answer.status}.` };
  return { stopped: said?.stopped ?? 0 };
}

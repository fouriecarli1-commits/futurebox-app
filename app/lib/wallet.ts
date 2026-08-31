/**
 * What is left to spend, as the browser sees it.
 *
 * Read from the server every time rather than kept: a balance held in the page
 * goes stale the moment the same person generates something in another tab,
 * and a wrong number here is a person told they cannot afford something they
 * can.
 *
 * Asking also settles whatever grant has come due, which is why every screen
 * that costs money calls this on open.
 */

import { accessToken } from './cloud';
import { PACKS, type Pack } from './credits';

export interface Wallet {
  /** False when the app has no accounts configured; nothing is counted then. */
  readonly metered: boolean;
  /**
   * True when the server could not be asked at all.
   *
   * Worth its own flag, because without one a failed request is indis-
   * tinguishable from an app with no accounts — and the screen showed both by
   * hiding the balance entirely. A broken endpoint then looks exactly like a
   * working free account, which is a bug you only find by being told.
   */
  readonly failed?: boolean;
  readonly signedIn: boolean;
  readonly balance: number;
  readonly monthly: number;
  readonly cap: number;
  readonly packs: readonly Pack[];
}

export const NO_WALLET: Wallet = {
  metered: false,
  signedIn: false,
  balance: 0,
  monthly: 0,
  cap: 0,
  packs: PACKS,
};

const COULD_NOT_ASK: Wallet = { ...NO_WALLET, metered: true, failed: true };

export async function loadWallet(): Promise<Wallet> {
  const token = await accessToken();
  const response = await fetch('/api/credits', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return COULD_NOT_ASK;

  const data = (await response.json().catch(() => null)) as Partial<Wallet> | null;
  if (!data) return COULD_NOT_ASK;
  return {
    metered: Boolean(data.metered),
    signedIn: Boolean(data.signedIn),
    balance: typeof data.balance === 'number' ? data.balance : 0,
    monthly: typeof data.monthly === 'number' ? data.monthly : 0,
    cap: typeof data.cap === 'number' ? data.cap : 0,
    packs: data.packs?.length ? data.packs : PACKS,
  };
}

/**
 * What a route said when it refused for want of credits.
 *
 * Every route that costs answers a 402 with `needsCredits` on it. This turns
 * that into the one thing the screen needs: how short they were.
 */
export interface Short {
  readonly need: number;
  readonly balance: number;
  readonly message: string;
}

export function shortOf(payload: unknown): Short | null {
  const body = payload as { needsCredits?: boolean; need?: number; balance?: number; message?: string };
  if (!body?.needsCredits) return null;
  return {
    need: typeof body.need === 'number' ? body.need : 0,
    balance: typeof body.balance === 'number' ? body.balance : 0,
    message: body.message ?? 'That needs more credits than you have.',
  };
}

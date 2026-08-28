/**
 * What the person looking at a track has paid for it.
 *
 * The page uses this to show the right button. It is not a permission check —
 * `app/api/track/download` decides that on the server, where the answer cannot
 * be edited by the person it applies to. Everything here is for the UI.
 */

import { accessToken, configured } from './cloud';
import type { Plan } from './entitlements';

export type Level = 'none' | 'opened' | 'owned';

export interface Owned {
  readonly levels: Record<string, Level>;
  /** Somebody on a plan owns everything they make, so no per-track buying. */
  readonly onAPlan: boolean;
  /**
   * The tier the server believes this person is on.
   *
   * The page has its own copy of the caps, which is how it dims a button
   * before you press it. That copy has to come from the same place the server
   * reads, or the two disagree — and when they disagree the page wins, because
   * it refuses before the request is ever sent. That is what happened with
   * OWNER_EMAIL: the server would have allowed it and the browser never asked.
   */
  readonly tier: Plan;
}

export const NOTHING: Owned = { levels: {}, onAPlan: false, tier: 'free' };

/**
 * With no Supabase project there is nobody to charge and nothing to record, so
 * a song belongs to whoever made it — which was true of this app before any of
 * this existed. Treating that state as "unpaid" would put buy buttons and a
 * watermark in front of someone who has no way to pay, which is the worst of
 * both: a wall with no door in it.
 */
const EVERYTHING: Owned = { levels: {}, onAPlan: true, tier: 'label' };

export async function loadOwned(): Promise<Owned> {
  if (!configured()) return EVERYTHING;
  const token = await accessToken();
  // Signed out with accounts available is genuinely "you own nothing yet".
  if (!token) return NOTHING;
  try {
    const response = await fetch('/api/purchases', { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return NOTHING;
    const data = (await response.json()) as { levels?: Record<string, Level>; tier?: Plan };
    const tier: Plan = data.tier ?? 'free';
    return { levels: data.levels ?? {}, onAPlan: tier !== 'free', tier };
  } catch {
    return NOTHING;
  }
}

export function levelOf(owned: Owned, trackId: string): Level {
  if (owned.onAPlan) return 'owned';
  return owned.levels[trackId] ?? 'none';
}

/**
 * Opens a checkout and sends the browser to it.
 *
 * Returns a message when it could not start, rather than throwing: a button
 * that silently does nothing is the failure this whole app keeps running into.
 */
export async function startCheckout(
  want: { kind: 'open' | 'keep'; trackId: string } | { kind: 'plan'; tier: string },
): Promise<string | null> {
  const token = await accessToken();
  if (!token) return 'Sign in before paying.';
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(want),
    });
    const data = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
    if (!response.ok || !data.url) return data.message ?? 'Could not start that payment.';
    window.location.href = data.url;
    return null;
  } catch {
    return 'Could not reach the payment service.';
  }
}

/**
 * A signed link to the clean file, when it is allowed.
 *
 * Answers with a message instead when it is not — including the price, so the
 * refusal can be an offer.
 */
export async function downloadLink(
  trackId: string,
): Promise<{ url: string } | { message: string; priceRand?: number }> {
  const token = await accessToken();
  if (!token) return { message: 'Sign in to download.' };
  try {
    const response = await fetch('/api/track/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ trackId }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      message?: string;
      priceRand?: number;
    };
    if (response.status === 503) {
      // No accounts configured — the device's own copy is the download, as it
      // was before any of this existed.
      return { message: '' };
    }
    if (!response.ok || !data.url) {
      return { message: data.message ?? 'That download could not be prepared.', priceRand: data.priceRand };
    }
    return { url: data.url };
  } catch {
    return { message: 'Could not reach the server.' };
  }
}

'use client';

/**
 * What this browser is allowed to show, and what it must sell instead.
 *
 * The lock is on the server — `/api/plan` and `/api/schedule` each ask for
 * themselves before spending or writing anything. This is only so the room can
 * show the right screen rather than showing the desk and then being refused,
 * which is a worse way to learn you have not bought something.
 */

import { accessToken } from './cloud';

export interface Unlocked {
  /** Add-on id → when it runs out, as an ISO instant. */
  readonly owns: Readonly<Record<string, string>>;
  /**
   * False where the question could not be asked — no account service, or
   * `supabase/addons.sql` not run.
   *
   * Distinct from owning nothing, and the screen says different things about
   * them: "buy this" against "this cannot be sold yet". Somebody who has paid
   * and is being shown a sales page because a migration was missed needs the
   * second sentence, not the first.
   */
  readonly ready: boolean;
  /** What is for sale and what it costs, from the server's own table. */
  readonly sells: readonly { id: string; rand: number }[];
}

export const NOTHING_UNLOCKED: Unlocked = { owns: {}, ready: false, sells: [] };

export async function unlocked(): Promise<Unlocked> {
  try {
    const token = await accessToken();
    const response = await fetch('/api/addons', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) return NOTHING_UNLOCKED;
    const said = (await response.json()) as Partial<Unlocked>;
    return {
      owns: said.owns ?? {},
      ready: said.ready === true,
      sells: said.sells ?? [],
    };
  } catch {
    return NOTHING_UNLOCKED;
  }
}

/** Whether one thing is owned right now. */
export function owns(what: Unlocked, addon: string): boolean {
  const until = what.owns[addon];
  if (!until) return false;
  const at = new Date(until);
  return !Number.isNaN(at.getTime()) && at.getTime() > Date.now();
}

/** What one costs, from the server rather than from a number typed on a page. */
export function priceOf(what: Unlocked, addon: string, fallback: number): number {
  return what.sells.find((one) => one.id === addon)?.rand ?? fallback;
}

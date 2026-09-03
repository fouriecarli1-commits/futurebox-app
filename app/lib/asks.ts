/**
 * How many people are waiting on an answer from you.
 *
 * ── Why this is not part of the collab room ──────────────────────────────
 *
 * Because the whole problem is that the collab room is the only place that
 * knows. `docs/FUNCTION_INVENTORY.md` puts it plainly: a request is seen when
 * the page is opened. Somebody asks to work with you, and the app's answer is
 * to wait until you happen to look — which for a room nobody visits daily
 * means the ask goes unanswered and the person concludes you said no.
 *
 * So the count is asked for by the studio, which is always open, and drawn on
 * the rail beside the room it belongs to.
 *
 * ── Why a poll and not a live connection ─────────────────────────────────
 *
 * A live subscription would be right if this were a chat. It is not: a collab
 * ask is a thing that happens a handful of times a month, and the difference
 * between hearing about it now and hearing about it in two minutes is nothing
 * at all. A poll on a slow interval costs one small request, holds no socket
 * open, and cannot leave a page connected to a channel it forgot to leave.
 *
 * Two minutes rather than ten seconds for the same reason. This is a
 * doorbell, not a heartbeat.
 *
 * ── What it counts, exactly ──────────────────────────────────────────────
 *
 * Only asks pointed at you and still unanswered. Something you sent and are
 * waiting on is not a thing you can act on, and a badge that lights up for
 * your own outbox is a badge people learn to ignore.
 */

import { accessToken } from './cloud';

/** Slow on purpose. A collab ask is a doorbell, not a heartbeat. */
export const EVERY = 120_000;

interface Thread {
  readonly state?: string;
  /** True where you are the one who asked. */
  readonly mine?: boolean;
}

/**
 * Asks waiting on you right now, or zero when there is nothing to ask.
 *
 * Never throws. This decorates a rail; a network blip must not take a studio
 * down, and "no answer" is correctly indistinguishable from "nobody asked".
 */
export async function asksWaiting(): Promise<number> {
  try {
    /* The token is sent when there is one, and its absence is not a reason to
       skip the ask.

       The first version returned zero the moment `accessToken()` came back
       empty. That is momentarily true while a session is being refreshed, and
       the effect was a badge that blinked out and back — which reads as an ask
       being withdrawn. The route already answers an unauthenticated caller
       with an empty list, so asking without one costs a small request and
       gives the same answer, without the flicker. */
    const token = await accessToken();
    const response = await fetch('/api/collab', {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) return 0;
    const data = (await response.json()) as { threads?: Thread[] };
    return (data.threads ?? []).filter((one) => one.state === 'pending' && !one.mine).length;
  } catch {
    return 0;
  }
}

/**
 * When a supplier is busy rather than saying no.
 *
 * ElevenLabs to the owner, 20 October 2026 (their support, in writing):
 * they throttle by how many requests are in flight at once — about 15 for
 * most speech, 30 for the fast models, 60 for transcription, 5 for music and
 * 3 dubbing jobs on the Business plan — not by requests per minute. Past
 * that, a request waits in their queue; past the queue it is answered 429
 * `too_many_concurrent_requests`, and under heavy load on their side 429
 * `system_busy`, "which usually resolves on retry".
 *
 * Until now both reached a member as a failure on the first try. Five people
 * pressing "Make the song" in the same minute is a normal Saturday at a few
 * thousand members, and four of them were told no. So those two answers —
 * and only those two — are asked again, a little later each time, a few
 * times. A 429 that means anything else (the account out of credits) is
 * handed straight back: waiting does not fix it. A body that cannot be sent
 * twice (a stream) is never retried; the first answer stands.
 *
 * Its own file because `suppliers.ts` is the credentials seam and is held
 * to not knowing who is asking (check:seam); these helpers only read what the
 * supplier answered.
 */
export const BUSY_TRIES = 3;
const BUSY_SIGNS = /too_many_concurrent_requests|system_busy/;

export async function busyOf(response: Response): Promise<boolean> {
  const said = await response.text().catch(() => '');
  return BUSY_SIGNS.test(said);
}

/** Something fetch can send a second time unchanged. A stream cannot. */
export function resendable(body: RequestInit['body']): boolean {
  return body === undefined || body === null || typeof body === 'string'
    || body instanceof FormData || body instanceof URLSearchParams
    || body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body);
}

/** Their Retry-After when they give one, otherwise 1.5s, 3s…, never past 8s. */
export function waitBefore(attempt: number, response: Response): number {
  const theirs = Number(response.headers.get('retry-after'));
  const base = Number.isFinite(theirs) && theirs > 0 ? theirs * 1000 : 1500 * 2 ** (attempt - 1);
  return Math.min(8000, base) + Math.floor(Math.random() * 400);
}

/**
 * How full the supplier's lanes are, written down when they are nearly full.
 *
 * Their answers carry `current-concurrent-requests` and
 * `maximum-concurrent-requests`, and their support said to watch them. One
 * line in the log when a request lands at 80% of the ceiling or more, with
 * which capability it was: the day the Business limits start to pinch shows
 * up there first, as the evidence for the Enterprise conversation, rather
 * than as members' failures.
 */
export function noteCrowding(supplier: string, what: string, response: Response): void {
  const now = Number(response.headers.get('current-concurrent-requests'));
  const most = Number(response.headers.get('maximum-concurrent-requests'));
  if (!Number.isFinite(now) || !Number.isFinite(most) || most <= 0) return;
  if (now / most < 0.8 && response.status !== 429) return;
  console.warn(JSON.stringify({
    supplier, capability: what, inFlight: now, ceiling: most, status: response.status,
    means: 'requests in flight at the supplier are at or near the plan ceiling',
  }));
}

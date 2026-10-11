/**
 * How long a room waits for a job that has not landed.
 *
 * ── Why this is its own file ─────────────────────────────────────────────
 *
 * Three rooms poll a video job every five seconds and gate their controls on
 * it: the kids' room, the photo room's *bring the photograph to life*, and
 * the cutting room. All three treated "no answer yet" as "keep waiting", for
 * ever.
 *
 * That is worse than a lost video. While a job is live those rooms disable
 * the press that started it — `disabled={liveBusy || Boolean(liveJob)}` in
 * the photo room, and the whole of the kids' room — so a job that stalls
 * without ever reporting `failed` locks the room until somebody thinks to
 * reload the page. In the kids' room the person it happens to is six.
 *
 * It was found by generalising: the kids' room was caught first, and the
 * same shape — `setInterval(() => { void ask(); }, 5_000)` with no clock —
 * turned out to be in two more.
 *
 * ── Why a function rather than an `if` in each effect ────────────────────
 *
 * Three copies of a comparison is three chances to point one the wrong way,
 * and a comparison inside a `useEffect` cannot be tested with real numbers.
 * This can, and `check:jobwait` tests it at the boundary — including the
 * reversal, which is the mutation a shape-reading check would pass.
 */

/**
 * The ceiling, in milliseconds.
 *
 * Eight minutes, which is not a guess: it is the ceiling the grown-up video
 * path already uses in `lib/engines.ts`, where the reasoning is written out
 * — Kling's own limit for a clip this length is under five minutes and the
 * rest is room for a queue. Matched rather than re-chosen, because two
 * different limits for the same engine would mean one of them is wrong and
 * nothing would say which.
 */
export const WAIT_MOST = 8 * 60_000;

/**
 * Whether a job that has not landed is still worth waiting for.
 *
 * @param since when the wait began, as a millisecond clock reading. Zero
 *   means no wait has started, which is not a wait that has gone on since
 *   1970 — the first version of this did not special-case it and would have
 *   abandoned every job the instant it started, breaking the ones that work.
 * @param now the current clock reading, passed in rather than read here so
 *   the boundary can be tested without waiting eight minutes for it.
 */
export const stillWorthWaiting = (since: number, now: number): boolean =>
  since === 0 || now - since <= WAIT_MOST;

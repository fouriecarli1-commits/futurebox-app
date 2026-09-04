/**
 * A ceiling on how often one caller may reach an expensive route.
 *
 * ── Why this exists as its own file ──────────────────────────────────────
 *
 * `app/api/events/route.ts` grew a small version of this because a script
 * could otherwise fill a table. The routes that cost actual money — the
 * copilot and the help assistant, both of which call a reasoning model on
 * every turn — had none at all, and neither asks who is calling. One person
 * with a loop could spend a month's model budget in an afternoon, and the
 * first anybody would know is the invoice.
 *
 * That matters more here than it would elsewhere: this app is being started
 * on the smallest plans its owner can manage, precisely because it is not yet
 * known whether there are customers. A surprise bill is not an inconvenience,
 * it is the end of the experiment.
 *
 * ── What it is not ───────────────────────────────────────────────────────
 *
 * Not a gate. The counter lives in the memory of one running instance, and a
 * serverless deployment has many, so a determined caller spread across
 * instances gets a multiple of these numbers. It is a brake: it turns an
 * accidental loop or a single crude script — which is what actually happens —
 * from unbounded into bounded, without a database round trip on the hot path
 * or a shared store to run.
 *
 * A real gate would be a counter in Postgres keyed by day. Worth building the
 * moment there is a bill worth protecting; not worth the latency on every
 * request before then. That trade is written down here so it is a decision
 * rather than an omission.
 *
 * ── Two windows, not one ─────────────────────────────────────────────────
 *
 * A per-minute limit alone allows a caller to sit exactly under it forever,
 * which over a day is the whole budget. An hourly limit alone lets somebody
 * spend it all in the first thirty seconds and then wait. Both together allow
 * ordinary use — nobody types eight questions a minute, or forty an hour, by
 * hand — and stop both shapes of abuse.
 */

interface Window {
  count: number;
  until: number;
}

const windows = new Map<string, Window>();

/** Enough entries to hold a busy hour; swept when it grows past this. */
const MAX_KEYS = 20_000;

function hit(key: string, limit: number, spanMs: number, now: number): boolean {
  const entry = windows.get(key);
  if (!entry || now > entry.until) {
    windows.set(key, { count: 1, until: now + spanMs });
    if (windows.size > MAX_KEYS) {
      for (const [name, window] of windows) if (now > window.until) windows.delete(name);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

/**
 * Who is calling, as well as it can be known.
 *
 * The first hop in `x-forwarded-for` is the client as the platform saw it.
 * Behind Vercel that header is set by the platform and cannot be spoofed by
 * the caller; behind something else it might be, which is another reason this
 * is a brake and not a gate.
 */
export function callerAddress(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export interface Limits {
  /** How many in a minute. */
  readonly perMinute: number;
  /** How many in an hour. */
  readonly perHour: number;
}

/**
 * True when this caller has had enough for now.
 *
 * `name` separates the routes, so somebody using the copilot heavily still
 * gets to ask for help.
 */
export function tooMany(name: string, request: Request, limits: Limits): boolean {
  const address = callerAddress(request);
  const now = Date.now();
  // Both are evaluated: a call that trips the minute window still counts
  // towards the hour, or a caller could hammer the minute limit all day and
  // never accumulate an hourly total.
  const minute = hit(`${name}:m:${address}`, limits.perMinute, 60_000, now);
  const hour = hit(`${name}:h:${address}`, limits.perHour, 3_600_000, now);
  return minute || hour;
}

/** Cleared between tests. Not used by the app. */
export function forgetEverything(): void {
  windows.clear();
}

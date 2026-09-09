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

/**
 * The limits for a route that spends a supplier's money.
 *
 * ── Why these routes were the ones without a brake ───────────────────────
 *
 * `docs/SAFETY-REVIEW.md` said rate limiting covered "the two routes that can
 * be called without an account — the copilot and the help desk". That was true
 * when it was written and became a wrong reassurance: eleven routes ended up
 * braked, and every one of them spends *text* money. The fourteen that spend
 * **ElevenLabs and Kits** money — music, stems, dubbing, every voice route,
 * video — had nothing.
 *
 * Carli, 9 September 2026: "kan een retry op enige funksie nie gestop word
 * nie, kan ons nie iets in bou wat dit stop nie?" It could not, and now it
 * can.
 *
 * ── What these numbers are chosen against ────────────────────────────────
 *
 * Not against a person: nobody asks for three songs in a minute by hand, and a
 * generation takes most of a minute to come back, so an honest member never
 * meets these.
 *
 * They are chosen against **how fast one address can eat the month before the
 * warning arrives.** The month is 600,000 credits, a two-minute song is 1,800,
 * so the month is about 333 songs. At twenty an hour one address needs
 * seventeen hours to spend all of it, and `spendwatch` writes at half — after
 * roughly eight. That is the whole design: the monthly ceiling is the bound,
 * and this is what keeps a runaway inside the time the warning needs.
 *
 * Sixty an hour would cut that to five and a half hours, which can fall
 * entirely inside one night's sleep. Twenty cannot.
 */
export const GENERATION: Limits = { perMinute: 3, perHour: 20 };

/**
 * For work priced several times higher than a song.
 *
 * Dubbing v2 is $2.20 a minute against music's $0.1485 — about fifteen times.
 * Ten an hour of that is roughly the same money as twenty songs, which is the
 * point: the limit is on the spending rather than on the request count.
 */
export const EXPENSIVE: Limits = { perMinute: 2, perHour: 10 };

/**
 * The refusal, or null to carry on.
 *
 * Returned rather than thrown so a route is one line, and phrased for a person
 * who has pressed a button twice rather than for a script: somebody who has
 * genuinely hit this is nearly always a member whose first attempt looked like
 * it did nothing.
 */
export function refuseIfTooMany(
  name: string,
  request: Request,
  limits: Limits = GENERATION,
): Response | null {
  if (!tooMany(name, request, limits)) return null;
  return Response.json(
    {
      error: 'rate_limited',
      message: 'That is a lot at once. Give the last one a moment to finish, then try again.',
    },
    { status: 429 },
  );
}

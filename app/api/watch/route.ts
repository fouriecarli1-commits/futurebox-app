/**
 * The health check that emails you when something needs you.
 *
 * ── What it watches, and why this one first ──────────────────────────────
 *
 * The ElevenLabs character allowance. Every voice, dub, transcript and note of
 * music in this app comes out of one plan with a hard monthly ceiling, and
 * running into it does not degrade anything — it refuses everything, at once,
 * in five different rooms. On a small starter plan that ceiling is close.
 *
 * Without this, the first anybody knows is a member being told their reading
 * failed, and the operator finding out when that member complains.
 *
 * ── Why a route you call on a schedule, not a background job ─────────────
 *
 * Because there is no server here to run one. This deploys to Vercel, where
 * nothing persists between requests. A cron that hits a URL is the shape the
 * platform actually offers — `vercel.json` can schedule it, and any external
 * pinger works just as well, which is worth keeping true so this is not
 * welded to one host.
 *
 * ── Why it needs a secret ────────────────────────────────────────────────
 *
 * It reports the size of somebody's bill and it can send email. Either is
 * enough reason not to leave it open. `WATCH_SECRET` is compared in constant
 * time, and without one set the route refuses rather than defaulting to open —
 * a monitoring endpoint that is public by default is how the monitoring
 * becomes the vulnerability.
 *
 * ── Why the warnings are keyed by month ──────────────────────────────────
 *
 * A ceiling warning that arrives every hour for a week is a warning that gets
 * filtered, and then the real one is filtered too. Each threshold sends once
 * per billing month: crossing 75% tells you once, crossing 90% tells you once
 * more, and neither repeats until the allowance resets.
 */

import crypto from 'node:crypto';
import { allowanceLeft } from '@/app/lib/server/eleven';
import { tellOwner, configured as canEmail, unsent } from '@/app/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Where a warning is worth sending, and what each one means. */
const STEPS = [
  { at: 0.75, what: 'three quarters gone' },
  { at: 0.9, what: 'nine tenths gone' },
  { at: 0.98, what: 'nearly gone' },
] as const;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.WATCH_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set WATCH_SECRET before using this.' },
      { status: 503 },
    );
  }
  const url = new URL(request.url);
  /* Vercel's own scheduler sends `Authorization: Bearer $CRON_SECRET` and
     nothing else, so the header is checked as well as the query parameter.
     Set `WATCH_SECRET` and `CRON_SECRET` to the same value and both the
     schedule and a manual check work. */
  const given =
    url.searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) {
    return new Response('no', { status: 404 });
  }

  const allowance = await allowanceLeft();
  if (!allowance) {
    return Response.json({ checked: 'eleven', reachable: false });
  }

  const percent = Math.round(allowance.spent * 100);
  const left = allowance.limit - allowance.used;
  const resets = allowance.resetsAt ? allowance.resetsAt.toISOString().slice(0, 10) : 'unknown';
  // One key per month, so a threshold tells you once and then goes quiet until
  // the allowance rolls over.
  const month = (allowance.resetsAt ?? new Date()).toISOString().slice(0, 7);

  let told: string | null = null;
  // Highest crossed threshold only: at 91% there is no reason to also send the
  // 75% letter, and two letters about one problem is how both get ignored.
  const crossed = [...STEPS].reverse().find((step) => allowance.spent >= step.at);
  if (crossed && canEmail()) {
    const said = await tellOwner(
      `ElevenLabs allowance ${percent}% used — ${crossed.what}`,
      `The ElevenLabs plan behind this app is ${percent}% used.

  Used        ${allowance.used.toLocaleString()} characters
  Limit       ${allowance.limit.toLocaleString()}
  Left        ${left.toLocaleString()}
  Resets      ${resets}
  Plan        ${allowance.tier}

When it runs out, every room that uses a voice stops at once — reading a
script, dubbing an episode, transcribing one, cloning a voice, and generating
music. They do not slow down; they refuse.

Either move up a plan before that, or accept the stop and know when it is
coming. This is the last warning at this level — the next one only comes if
usage crosses a higher mark.`,
      { once: `eleven:${crossed.at}:${month}`, kind: 'allowance' },
    );
    told = said.ok ? `${crossed.at}` : null;
  }

  /* Letters that were claimed and never arrived. Reported here because this is
     the address whoever runs the place already opens, and because the one
     thing that cannot carry this news is an email. Somebody paying and getting
     no receipt is the failure that costs a customer, and until now nothing
     anywhere said it had happened. */
  const missing = await unsent();

  return Response.json({
    checked: 'eleven',
    reachable: true,
    percent,
    left,
    resets,
    tier: allowance.tier,
    told,
    canEmail: canEmail(),
    lettersNotDelivered: missing ?? undefined,
  });
}

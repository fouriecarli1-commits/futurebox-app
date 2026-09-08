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
 *
 * ── And what it did not watch until now: the money ───────────────────────
 *
 * This route has always watched the allowance and only the allowance. The
 * subscription answer carries three other things that cost real money and had
 * nowhere to be seen:
 *
 *     current_overage             already being spent beyond the plan
 *     has_open_invoices           unpaid, and ElevenLabs suspends for it
 *     can_extend_character_limit  false means work FAILS instead of billing
 *
 * The first two are worse than the ceiling: running out of allowance is an
 * outage, and an outage announces itself. An overage is silent and arrives as
 * an invoice. So they are watched here too, and they go in the SAME letter as
 * the allowance rather than a second one — two emails about one account on one
 * morning is precisely the noise this file was written to avoid.
 *
 * ── Two thresholds for one number, on purpose ────────────────────────────
 *
 * `/api/eleven/prices` warns at 80%; this letter warns at 75, 90 and 98. That
 * is deliberate, not a drift. A page is read when somebody chooses to read it,
 * so one honest line is enough. A letter interrupts, so it has to earn each
 * interruption — hence an escalation, and hence once per level per month.
 */

import crypto from 'node:crypto';
import { bill, warningsFor } from '@/app/lib/server/eleven';
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

  const read = await bill();
  if (!read.ok) {
    return Response.json({ checked: 'eleven', reachable: false, why: read.message });
  }
  const money = read.bill;

  const percent = money.percent ?? 0;
  const left = money.included !== null && money.used !== null ? money.included - money.used : null;
  const resets = money.resetsAt ? money.resetsAt.slice(0, 10) : 'unknown';
  // One key per month, so a threshold tells you once and then goes quiet until
  // the allowance rolls over.
  const month = (money.resetsAt ?? new Date().toISOString()).slice(0, 7);

  /* What is true this morning, as short tags. The letter is sent once per
     distinct SET of these per month, which is the behaviour that falls out
     right: an overage appearing at 60% sends a letter, and the allowance later
     crossing 75% sends another, because the situation genuinely changed. The
     same situation on a second morning does not. */
  const flags: string[] = [];

  // Highest crossed threshold only: at 91% there is no reason to also say 75%.
  const crossed = [...STEPS].reverse().find((step) => percent >= step.at * 100);
  if (crossed) flags.push(`allowance:${crossed.at}`);
  if (money.overage && money.overage.amount > 0) flags.push('overage');
  if (money.openInvoices > 0) flags.push('unpaid');

  let told: string | null = null;
  if (flags.length > 0 && canEmail()) {
    /* The money lines come from the same function the money page uses, so the
       letter and the page can never say different things about one account. */
    const lines = warningsFor(money);
    const subject = crossed
      ? `ElevenLabs allowance ${percent}% used — ${crossed.what}`
      : money.overage && money.overage.amount > 0
        ? `ElevenLabs is over its plan — ${money.overage.amount} ${money.overage.currency.toUpperCase()} so far`
        : 'ElevenLabs has an unpaid invoice';

    const said = await tellOwner(
      subject,
      `${lines.length > 0 ? `${lines.map((line) => `  * ${line}`).join('\n')}\n\n` : ''}The ElevenLabs plan behind this app is ${percent}% used.

  Used         ${money.used?.toLocaleString() ?? 'unknown'} credits
  Limit        ${money.included?.toLocaleString() ?? 'unknown'}
  Left         ${left?.toLocaleString() ?? 'unknown'}
  Resets       ${resets}${money.resetsInDays === null ? '' : ` (${money.resetsInDays} days)`}
  Plan         ${money.tier ?? 'unknown'}
  Next invoice ${money.nextInvoiceCents === null ? 'unknown' : `${(money.nextInvoiceCents / 100).toFixed(2)}`}

When the allowance runs out, every room that uses a voice stops at once —
reading a script, dubbing an episode, transcribing one, cloning a voice, and
generating music. They do not slow down; they refuse.${
        money.canExceed === false
          ? '\n\nUsage-based billing is off on this account, so that is exactly what\nhappens: work fails rather than quietly costing more. That is a brake, and\nit is worth knowing it is there before anybody switches it off.'
          : money.canExceed === true
            ? '\n\nUsage-based billing is ON, so work past the allowance does not fail — it\ncosts extra, on an invoice nobody predicted.'
            : ''
      }

Either move up a plan before that, or accept the stop and know when it is
coming. This is the last letter about this situation — the next one only comes
if something changes.`,
      { once: `eleven:${flags.join('+')}:${month}`, kind: 'allowance' },
    );
    told = said.ok ? flags.join('+') : null;
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
    tier: money.tier,
    /* The money half, so opening this by hand is a status page and not only a
       thing that sometimes sends email. */
    overage: money.overage,
    nextInvoiceCents: money.nextInvoiceCents,
    openInvoices: money.openInvoices,
    canExceed: money.canExceed,
    warnings: warningsFor(money),
    told,
    canEmail: canEmail(),
    lettersNotDelivered: missing ?? undefined,
  });
}

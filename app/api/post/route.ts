/**
 * The clock. Whatever is due, sent.
 *
 * ── What it does, in order ───────────────────────────────────────────────
 *
 * Frees anything a dead worker left claimed, takes what is due, hands each row
 * to its handler, and writes down what happened. The taking is one statement
 * with `for update skip locked` — see `supabase/posting.sql` for why that
 * matters more than it looks.
 *
 * ── Guarded like the watch, and for the same reason ──────────────────────
 *
 * It sends email on somebody's behalf. `POST_SECRET` is compared in constant
 * time and the route refuses without one rather than defaulting to open: an
 * endpoint that sends mail and is public by default is not a queue, it is a
 * relay.
 *
 * ── The one thing to know before relying on this ─────────────────────────
 *
 * Vercel's scheduler on the free tier runs a cron once a day. A posting queue
 * that wakes once a day cannot honour "Tuesday at 18:00" — it will honour
 * "some time on Tuesday". Hourly needs the paid tier, and even hourly means a
 * slot lands within the hour rather than on the minute. `vercel.json` asks for
 * hourly and says so; if the plan does not allow it, the schedule silently
 * becomes daily, which is exactly the kind of thing worth knowing before
 * somebody plans a launch around it.
 */

import crypto from 'node:crypto';
import { admin, metered } from '@/app/lib/server/account';
import { handlerFor, type DuePost } from '@/app/lib/server/posting/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** How many to take in one run. Bounded by the function's own time budget. */
const BATCH = 20;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  // `timingSafeEqual` throws on a length mismatch, which is itself a leak.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const wanted = process.env.POST_SECRET ?? '';
  if (!wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Set POST_SECRET before using this.' },
      { status: 503 },
    );
  }
  /* Vercel's scheduler sends `Authorization: Bearer $CRON_SECRET` and nothing
     else, so the header is accepted as well as the query parameter. Set
     POST_SECRET and CRON_SECRET to the same value and both the schedule and a
     manual run work. */
  const given =
    new URL(request.url).searchParams.get('key') ??
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!given || !sameSecret(given, wanted)) {
    return new Response('no', { status: 404 });
  }

  if (!metered()) return Response.json({ ran: false, why: 'not_configured' });
  const client = admin();
  if (!client) return Response.json({ ran: false, why: 'not_configured' });

  // Anything a worker took and never finished, back on the queue first.
  const { data: freed } = await client.rpc('release_stuck_posts');

  const { data: claimed, error } = await client.rpc('claim_due_posts', { p_limit: BATCH });
  if (error) {
    /* The table not existing — `supabase/posting.sql` not run — lands here.
       Worth saying which, because "500" on a cron is a thing nobody
       investigates until the queue has been silently dead for a week. */
    return Response.json({ ran: false, why: 'queue_unavailable' }, { status: 503 });
  }

  const posts = (claimed ?? []) as DuePost[];
  let sent = 0;
  let failed = 0;
  let again = 0;

  for (const post of posts) {
    const handler = handlerFor(post.handler);
    if (!handler) {
      /* A handler that does not exist is not a retry. It means a connector was
         removed or the row was written by a newer version of the app, and
         neither improves by waiting an hour. */
      await client
        .from('scheduled_posts')
        .update({ state: 'failed', note: `no handler called ${post.handler}` })
        .eq('id', post.id);
      failed += 1;
      continue;
    }

    let outcome;
    try {
      outcome = await handler(post);
    } catch (thrown) {
      /* A handler that throws is a bug in the handler, not a decision about
         the post — so it is retried rather than failed, and the reason is
         written down where somebody will see it. */
      outcome = {
        ok: false as const,
        again: true,
        why: `handler threw: ${String(thrown).slice(0, 200)}`,
      };
    }

    if (outcome.ok) {
      await client
        .from('scheduled_posts')
        .update({ state: 'sent', sent_at: new Date().toISOString(), note: '' })
        .eq('id', post.id);
      sent += 1;
      continue;
    }

    /* Back on the queue, unless it has run out of attempts. The claim already
       counted this try, so five is five — a row that keeps coming back is
       failed here rather than looping until somebody notices. */
    const keepTrying = outcome.again && post.attempts < 5;
    await client
      .from('scheduled_posts')
      .update({
        state: keepTrying ? 'due' : 'failed',
        note: outcome.why.slice(0, 500),
      })
      .eq('id', post.id);
    if (keepTrying) again += 1;
    else failed += 1;
  }

  return Response.json({
    ran: true,
    freed: typeof freed === 'number' ? freed : 0,
    claimed: posts.length,
    sent,
    again,
    failed,
  });
}

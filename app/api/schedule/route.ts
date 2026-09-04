/**
 * Putting something in the queue, and taking it out again.
 *
 * The queue itself is `supabase/posting.sql`; this is the door to it. Reading
 * is done through the caller's own token so row-level security answers the
 * "whose is it" question, and writing goes through the service role after the
 * caller has been identified — same shape as every other owned thing here.
 */

import { admin, callerFrom, metered } from '@/app/lib/server/account';
import { tooMany } from '@/app/lib/server/brake';
import { configured as canEmail } from '@/app/lib/server/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Enough for a month of planning in one sitting, not enough to fill a table.
 *
 * A week of posting is about eight rows and somebody laying out a month might
 * write thirty in a few minutes, so the per-minute window is generous. The
 * per-hour one is what stops a loop.
 */
const LIMITS = { perMinute: 40, perHour: 300 };

/** What one account may have waiting at once. */
const MOST_QUEUED = 200;

/**
 * How far ahead something may be scheduled.
 *
 * A year. Not a technical limit — the row would sit there quite happily — but
 * a plan made now for eighteen months' time is a row nobody will remember
 * writing, arriving about something that no longer exists.
 */
const FURTHEST_AHEAD_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * And how far behind. A minute of slack, so a clock that is slightly out
 * between the browser and the server does not refuse a post for "now".
 */
const SLACK_MS = 60 * 1000;

interface Body {
  platform?: unknown;
  caption?: unknown;
  mediaPath?: unknown;
  dueAt?: unknown;
}

function text(value: unknown, most: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  return clean.length <= most ? clean : null;
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('schedule', request, LIMITS)) {
    return Response.json({ error: 'rate_limited', message: 'Too many at once.' }, { status: 429 });
  }
  if (!metered()) {
    return Response.json(
      { error: 'not_configured', message: 'Scheduling needs an account, and this app has none set up.' },
      { status: 503 },
    );
  }
  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }
  const client = admin();
  if (!client) {
    return Response.json({ error: 'not_configured', message: 'Scheduling is not set up.' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: 'bad_request', message: 'Could not read that.' }, { status: 400 });
  }

  const platform = text(body.platform, 40);
  const caption = text(body.caption, 5000) ?? '';
  const mediaPath = text(body.mediaPath, 400) ?? '';
  if (!platform) {
    return Response.json({ error: 'bad_request', message: 'Say where it goes.' }, { status: 400 });
  }

  const dueAt = typeof body.dueAt === 'string' ? new Date(body.dueAt) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return Response.json({ error: 'bad_request', message: 'Say when it goes.' }, { status: 400 });
  }
  const now = Date.now();
  if (dueAt.getTime() < now - SLACK_MS) {
    return Response.json(
      { error: 'in_the_past', message: 'That time has already gone by.' },
      { status: 400 },
    );
  }
  if (dueAt.getTime() > now + FURTHEST_AHEAD_MS) {
    return Response.json(
      { error: 'too_far', message: 'A year ahead is as far as this goes.' },
      { status: 400 },
    );
  }

  /* A ceiling per account, checked before the insert rather than left to a
     database constraint that would have to be written as a trigger. Counted
     rather than guessed: `head: true` asks for the number without the rows. */
  const { count } = await client
    .from('scheduled_posts')
    .select('id', { count: 'exact', head: true })
    .eq('owner', caller.id)
    .in('state', ['due', 'sending']);
  if ((count ?? 0) >= MOST_QUEUED) {
    return Response.json(
      { error: 'full', message: `There are already ${MOST_QUEUED} waiting. Send or cancel some first.` },
      { status: 409 },
    );
  }

  const { data, error } = await client
    .from('scheduled_posts')
    .insert({
      owner: caller.id,
      platform,
      /* Only one handler exists, and a row cannot ask for a connector that is
         not built — the check constraint on the column would refuse it anyway,
         and a 500 from Postgres is a worse way to learn that than this. */
      handler: 'remind',
      caption,
      media_path: mediaPath,
      due_at: dueAt.toISOString(),
    })
    .select('id,platform,caption,media_path,due_at,state')
    .single();

  if (error || !data) {
    return Response.json(
      { error: 'unavailable', message: 'That could not be scheduled just now.' },
      { status: 502 },
    );
  }
  return Response.json({ post: data });
}

export async function GET(request: Request): Promise<Response> {
  /* `sends` rather than a second guess on the screen.
     The only handler is `remind`, and reminding is email. Where no mail
     provider is configured every row queued here will be failed on its first
     attempt for a reason that has nothing to do with the post — so the screen
     has to be able to say so before somebody plans a week around it, and this
     is the only place that knows. */
  const sends = canEmail();
  if (!metered()) return Response.json({ posts: [], ready: false, sends });
  const caller = await callerFrom(request);
  if (!caller) return Response.json({ posts: [], ready: false, sends });
  const client = admin();
  if (!client) return Response.json({ posts: [], ready: false, sends });

  const { data, error } = await client
    .from('scheduled_posts')
    .select('id,platform,caption,media_path,due_at,state,note,sent_at')
    .eq('owner', caller.id)
    .neq('state', 'cancelled')
    .order('due_at', { ascending: true })
    .limit(100);

  /* `ready: false` rather than an empty list where the table is not there.
     They are different answers and the screen says different things about
     them — an account with nothing queued, against a migration that has not
     been run. */
  if (error) return Response.json({ posts: [], ready: false, sends });
  return Response.json({ posts: data ?? [], ready: true, sends });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!metered()) return Response.json({ cancelled: false });
  const caller = await callerFrom(request);
  if (!caller) {
    return Response.json({ error: 'signed_out', message: 'Sign in first.' }, { status: 401 });
  }
  const client = admin();
  if (!client) return Response.json({ cancelled: false });

  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: 'bad_request', message: 'Which one?' }, { status: 400 });
  }

  /* Scoped to the owner in the statement, not checked first and updated after.
     The service role bypasses row-level security, so the `eq('owner', …)` here
     is the only thing standing between one account and another's queue. */
  const { data, error } = await client
    .from('scheduled_posts')
    .update({ state: 'cancelled' })
    .eq('id', id)
    .eq('owner', caller.id)
    /* Only something still waiting. Cancelling one that has already gone out
       would say "cancelled" about an email somebody has already read. */
    .in('state', ['due', 'failed'])
    .select('id')
    .maybeSingle();

  if (error) {
    return Response.json({ error: 'unavailable', message: 'That could not be cancelled.' }, { status: 502 });
  }
  return Response.json({ cancelled: Boolean(data) });
}

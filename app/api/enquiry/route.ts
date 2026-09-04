/**
 * A question that needs a person, sent to whoever runs the place.
 *
 * ── Why a form and not a mailto: link ────────────────────────────────────
 *
 * A `mailto:` opens whatever the browser thinks is the mail client, which on
 * a phone is often nothing, and on a work machine is often Outlook signed in
 * as somebody else. The person who most needs to reach support — stuck,
 * annoyed, on a phone — is exactly the one for whom that fails silently. A
 * form posts and says "sent".
 *
 * The address is still printed everywhere, because somebody who prefers their
 * own mail client should not be forced through a form either.
 *
 * ── Reply-to, and why it matters here ────────────────────────────────────
 *
 * The letter goes to the operator with the asker's address as reply-to, so
 * answering is pressing reply. Without that the address sits in the body and
 * gets retyped, and a support answer sent to a mistyped address is a customer
 * who thinks they were ignored.
 *
 * ── What it does not do ──────────────────────────────────────────────────
 *
 * It does not confirm the address belongs to the sender. Doing that properly
 * means a round trip through their inbox before the question is even asked,
 * which is a lot of friction for the volume this will see at the start. What
 * it does instead is refuse to send a copy of anything to the address given —
 * the only mail generated is to the operator — so it cannot be used to send
 * mail to somebody else. The one confirmation the asker gets is on screen.
 *
 * ── Anonymous, and braked ────────────────────────────────────────────────
 *
 * No account needed, for the same reason as the help assistant: the person
 * who cannot sign in is the person with a question. `lib/server/brake.ts`
 * caps it, and the cap is tight because a form that sends mail is the more
 * abusable of the two.
 */
import { ENQUIRIES, configured, tellOwner } from '@/app/lib/server/email';
import { tooMany } from '@/app/lib/server/brake';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Three an hour is a person with a few questions. Thirty is a script. */
const LIMITS = { perMinute: 2, perHour: 8 };

const MAX_MESSAGE = 4000;
const MAX_FIELD = 200;

/**
 * Deliberately loose.
 *
 * The job here is to catch a typo and a blank box, not to decide what a valid
 * address looks like — that argument has no winner and every strict pattern
 * rejects somebody's real address. Whether it delivers is settled by trying.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  email?: string;
  name?: string;
  message?: string;
  /** Which room they were in. Context for the answer, not a claim about them. */
  where?: string;
  /** What the assistant had already said, if they tried it first. */
  tried?: string;
}

function clean(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export async function POST(request: Request): Promise<Response> {
  if (tooMany('enquiry', request, LIMITS)) {
    return Response.json(
      {
        sent: false,
        error: 'rate_limited',
        message: `That has been sent a few times already. Write to ${ENQUIRIES} directly.`,
      },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ sent: false, error: 'bad_request' }, { status: 400 });
  }

  const email = clean(body.email, MAX_FIELD);
  const message = clean(body.message, MAX_MESSAGE);
  const name = clean(body.name, MAX_FIELD);
  const where = clean(body.where, MAX_FIELD);
  const tried = clean(body.tried, MAX_MESSAGE);

  if (!LOOKS_LIKE_EMAIL.test(email)) {
    return Response.json(
      { sent: false, error: 'bad_email', message: 'That address does not look right.' },
      { status: 400 },
    );
  }
  if (message.length < 5) {
    return Response.json(
      { sent: false, error: 'empty', message: 'Say a little more and it will go.' },
      { status: 400 },
    );
  }

  /* Nothing is configured to send with yet.
     Said plainly rather than pretending it went. Somebody who is told "sent"
     and never hears back concludes they were ignored, which is the one
     impression a support form exists to prevent. */
  if (!configured()) {
    return Response.json({
      sent: false,
      error: 'not_configured',
      message: `Mail is not switched on for this app yet. Write to ${ENQUIRIES} and it will be read.`,
      enquiries: ENQUIRIES,
    });
  }

  const lines = [
    `From: ${name ? `${name} <${email}>` : email}`,
    where ? `Room: ${where}` : '',
    '',
    message,
    tried ? `\n— They had already asked the help assistant, which said:\n${tried}` : '',
  ].filter(Boolean);

  const said = await tellOwner(
    `Enquiry from ${name || email}`,
    lines.join('\n'),
    { kind: 'enquiry', replyTo: email },
  );

  if (!said.ok) {
    return Response.json(
      {
        sent: false,
        error: 'send_failed',
        message: `That could not be sent. Write to ${ENQUIRIES} directly.`,
      },
      { status: 502 },
    );
  }

  return Response.json({ sent: true });
}

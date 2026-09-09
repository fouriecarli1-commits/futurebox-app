/**
 * ElevenLabs telling us a dub has finished, instead of us asking every few
 * seconds whether it has.
 *
 * ── What this is worth ───────────────────────────────────────────────────
 *
 * `/api/dub?id=` is polled from the browser while a dub runs. Every poll is a
 * Vercel invocation *and* a call to ElevenLabs, and a long dub is many of
 * both. Their own documentation recommends the webhook over polling, and it is
 * the one line in that whole surface that saves money rather than costing it.
 *
 * When a dub finishes, they POST here. This writes the status onto the `dubs`
 * row. The next poll reads that row, sees it is already settled, and answers
 * without calling ElevenLabs at all.
 *
 * ── Polling is not removed, and that is the design ───────────────────────
 *
 * A webhook that has not been registered, or is registered against a stale
 * URL, or is dropped in transit, is a dub that never finishes on screen. So
 * the poll stays exactly as it was and remains the source of truth; the
 * webhook only ever gets there first. Nothing on the client changes, nothing
 * needs switching on, and if this route is never called by anybody the app
 * behaves precisely as it did before it existed.
 *
 * That also means this can ship before the webhook is registered on her
 * account. Registering it makes dubs cheaper; not registering it changes
 * nothing.
 *
 * ── Why it fails closed, and hard ────────────────────────────────────────
 *
 * This is a public, unauthenticated address that writes a dub's status. The
 * status is not decoration: `/api/dub` refunds a dub it sees as failed. So an
 * endpoint that believed whatever it was posted would be a way for anybody on
 * the internet to mark other people's dubs failed and mint credits.
 *
 * Two things stop that.
 *
 * **The signature.** ElevenLabs sign each delivery with an HMAC over
 * `timestamp.body` using a secret from their console. Without
 * `ELEVEN_WEBHOOK_SECRET` set, this route accepts nothing at all — it does not
 * fall back to trusting the body, because a webhook that works without its
 * secret is one that was never checking. Unset is the state today, and the app
 * simply polls.
 *
 * **It never touches money.** The refund is claimed in `/api/dub`'s GET, by a
 * request carrying the owner's own token, through `claim_dub_refund` which
 * takes the owner as an argument. This route records what ElevenLabs said and
 * stops. Even a forged event that got past the signature could only make a
 * poll happen sooner, and the poll re-reads the truth from ElevenLabs before
 * anything is given back.
 *
 * ── The replay window ────────────────────────────────────────────────────
 *
 * A signature is valid forever unless the timestamp is checked, so a delivery
 * captured once could be replayed later. Thirty minutes is theirs; anything
 * older is refused whatever its signature says.
 */

import crypto from 'node:crypto';
import { admin } from '@/app/lib/server/account';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Their tolerance. Older than this and the signature is not enough. */
const OLDEST_MS = 30 * 60 * 1000;

/**
 * Their header, as `t=<unix seconds>,v0=<hex hmac>`.
 *
 * Parsed by name rather than by position: a header whose parts are read in
 * order is one that breaks the day a third part is added in front.
 */
function signatureIn(header: string | null): { at: number; mac: string } | null {
  if (!header) return null;
  let at = 0;
  let mac = '';
  for (const part of header.split(',')) {
    const [name, value] = part.split('=', 2);
    if (name?.trim() === 't') at = Number(value) * 1000;
    if (name?.trim() === 'v0') mac = (value ?? '').trim();
  }
  if (!Number.isFinite(at) || at <= 0 || !mac) return null;
  return { at, mac };
}

/** Constant time, and only ever on two buffers of the same length. */
function same(a: string, b: string): boolean {
  const one = Buffer.from(a, 'utf8');
  const two = Buffer.from(b, 'utf8');
  if (one.length !== two.length) return false;
  return crypto.timingSafeEqual(one, two);
}

/**
 * What their event says about one dub.
 *
 * Read by name and coerced, because this is somebody else's shape arriving
 * over the internet. Anything not understood comes back null and the delivery
 * is answered 200 and ignored — a webhook that 500s on an event it does not
 * recognise is a webhook the sender disables.
 */
function dubIn(body: unknown): { id: string; status: string; error: string | null } | null {
  if (!body || typeof body !== 'object') return null;
  const said = body as Record<string, unknown>;
  const data = (said.data && typeof said.data === 'object' ? said.data : said) as Record<string, unknown>;

  const id =
    (typeof data.dubbing_id === 'string' && data.dubbing_id) ||
    (typeof data.id === 'string' && data.id) ||
    '';
  if (!id) return null;

  /* The event name is the reliable half. `dubbing_language_completed` and
     `dubbing_project_ready` both mean finished; anything with `failed` in it
     means failed. A `status` field is used when it is there and the name is
     not enough. */
  const name = typeof said.type === 'string' ? said.type : '';
  const status =
    typeof data.status === 'string' && data.status
      ? data.status
      : /fail|error/i.test(name)
        ? 'failed'
        : /complete|ready|dubbed/i.test(name)
          ? 'dubbed'
          : '';
  if (!status) return null;

  const error =
    typeof data.error === 'string' ? data.error : typeof said.error === 'string' ? said.error : null;
  return { id, status, error };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ELEVEN_WEBHOOK_SECRET ?? '';
  if (!secret) {
    /* Nothing is registered and nothing is trusted. 404 rather than 503: an
       address that says "I am here but switched off" tells somebody probing
       that there is something to come back to. */
    return new Response('no', { status: 404 });
  }

  /* The raw body, before parsing. The signature is over the exact bytes, so a
     parse-then-restringify would compute the hash of a different document. */
  const raw = await request.text().catch(() => '');
  if (!raw) return new Response('no', { status: 400 });

  const signed = signatureIn(request.headers.get('elevenlabs-signature'));
  if (!signed) return new Response('no', { status: 401 });
  if (Math.abs(Date.now() - signed.at) > OLDEST_MS) return new Response('no', { status: 401 });

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${Math.floor(signed.at / 1000)}.${raw}`)
    .digest('hex');
  if (!same(signed.mac, expected) && !same(signed.mac, `v0=${expected}`)) {
    return new Response('no', { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('no', { status: 400 });
  }

  const said = dubIn(body);
  /* Understood or not, the delivery is accepted. A sender that gets errors
     back stops sending, and an event shape we have not seen is not a failure
     on their side. */
  if (!said) return Response.json({ ok: true, noted: false });

  const client = admin();
  if (!client) return Response.json({ ok: true, noted: false });

  /* The owner is not checked, because there is nobody here to check against —
     that is what a webhook is. What bounds it is that the row must already
     exist: this can only ever move a dub this app itself started, and it
     cannot create one. The update is by id alone for the same reason.

     `status` and `error` only. Not `refunded_at`, not `charged`: nothing that
     decides money is writable from an address on the open internet, however
     well signed. */
  await client
    .from('dubs')
    .update({ status: said.status, error: said.error, updated_at: new Date().toISOString() })
    .eq('id', said.id)
    .then(
      () => undefined,
      () => undefined,
    );

  return Response.json({ ok: true, noted: true });
}

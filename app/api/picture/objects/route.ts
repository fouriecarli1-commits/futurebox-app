/**
 * What is in this picture, and exactly where.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 11 October 2026: *"dan moet die objekte en woorde gehighlight word,
 * en dit moet dan rondgeskuif kan word en ge-edit word."* And, when told the
 * version that runs on the phone would be free: *"Niks is gratis."*
 *
 * So it is Google, and it is charged — `CREDITS.grab`, two, the same as
 * `transcribe`, because this draws nothing: it reads one picture and answers
 * a few hundred bytes about it.
 *
 * ── One press, one charge, however much is in the picture ────────────────
 *
 * A photograph with six things in it is not six times the work — it is one
 * call. Charging per result would make a busy picture cost six times a plain
 * one for a reason nobody could explain at the till.
 *
 * ── What crosses back ────────────────────────────────────────────────────
 *
 * Boxes, labels and masks. No picture is stored anywhere: the member's
 * photograph arrives, is looked at, and is gone — the same rule
 * `api/google/picture` keeps, and for the same reason. A route that quietly
 * saved every photograph it was shown would be putting somebody's pictures
 * in our bucket without them asking.
 *
 * ── The order of the four gates ──────────────────────────────────────────
 *
 * Caller, then safety, then OUR ceiling on Google, then credits. Credits
 * last on purpose: a refusal that has already taken somebody's credits is a
 * refusal nobody accepts, and the first three can all refuse.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { enough, note } from '@/app/lib/server/googlespend';
import { LOOKER, lookAt } from '@/app/lib/server/grabber';
import { PER_PICTURE, configured } from '@/app/lib/server/picture';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** One look at one picture. Seconds, not minutes. */
export const maxDuration = 30;

/**
 * The most picture that may arrive, as base64 characters.
 *
 * Four megabytes, the same number and the same reason as
 * `api/google/picture`: the platform stops at 4.5 and everything past it is
 * a bare 413 with no sentence in it, so the limit is owned here where it can
 * be explained. `check:bodylimit` compares what this route CLAIMS it accepts
 * against what can actually arrive.
 */
const MOST_BYTES = 4 * 1024 * 1024;

const MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('picture-objects', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json(
      { message: 'The picture engine is not switched on for this app yet.' },
      { status: 503 },
    );
  }

  let body: { picture?: string; mime?: string; wide?: number; tall?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: 'That request could not be read.' }, { status: 400 });
  }

  const data = typeof body.picture === 'string' ? body.picture : '';
  const mime = typeof body.mime === 'string' ? body.mime : '';
  const wide = Number(body.wide);
  const tall = Number(body.tall);

  if (!data || !MIMES.has(mime)) {
    return Response.json(
      { message: 'Send a PNG, JPEG or WebP picture.' },
      { status: 400 },
    );
  }
  if (data.length > MOST_BYTES) {
    return Response.json(
      {
        message: 'That picture is too large to send. A photograph straight off'
          + ' a camera often is — a smaller copy will work.',
      },
      { status: 413 },
    );
  }
  /* The size is what every box comes back in terms of, so a wrong one puts
     every box in the wrong place. Refused rather than guessed from the
     bytes, which would mean decoding the picture here to find out. */
  if (!Number.isFinite(wide) || !Number.isFinite(tall) || wide < 1 || tall < 1) {
    return Response.json(
      { message: 'That request did not say how big the picture is.' },
      { status: 400 },
    );
  }

  const caller = metered() ? await callerFrom(request) : null;

  /* Our own ceiling, under Google's — `lib/server/googlespend.ts` says why
     ours has to exist at all. Before the credits. */
  const room = await enough('image', PER_PICTURE, caller?.id ?? null);
  if (room) {
    return Response.json(
      { error: room.code, message: room.message, left: room.left },
      { status: 429 },
    );
  }

  const paid = await charge(request, CREDITS.grab, 'grab');
  if (!paid.ok) return paid.response;

  const looked = await lookAt({ data, mime }, wide, tall);
  if (!looked.ok) {
    await paid.refund();
    return Response.json({ message: looked.message }, { status: looked.status });
  }

  /* Written down once the answer is in hand, and never awaited: the member
     is waiting on a list of boxes and the bookkeeping must not hold it. */
  void note('image', PER_PICTURE, LOOKER, caller?.id);

  return Response.json({ found: looked.found }, { headers: { 'Cache-Control': 'no-store' } });
}

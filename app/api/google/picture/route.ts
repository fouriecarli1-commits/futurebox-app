/**
 * A still picture made, or changed, by saying what to change.
 *
 * ── The order, which is the whole of it ──────────────────────────────────
 *
 * Signed in → safe to send → on a paid plan → is there room on OUR ceiling
 * → charge the member → ask Google → hand the picture back → write down
 * what it cost us.
 *
 * The same order as `/api/google/music`, for the same two reasons. A member
 * refused by a ceiling they cannot see must not also have paid for the turn.
 * And what Google cost us is written down only once the picture is in hand,
 * because a call that failed cost nothing, and a ceiling that counts
 * failures closes early for a reason nobody can see.
 *
 * ── Why the picture comes up in the request and not out of our storage ───
 *
 * Because the thing being changed is on her phone, not in this app. The
 * photo editor has always worked that way — a picture is brought in, worked
 * on in the browser, and only lands in storage when somebody takes it off
 * the device. Reaching into storage for it would mean the one feature that
 * needs no upload could only be used on pictures already uploaded.
 *
 * The cost is that the picture travels as base64 in a request body, which
 * is a third bigger than the file. `MOST_BYTES` is what keeps that from
 * being a way to make this route hold a phone's whole gallery in memory.
 *
 * ── It answers with the picture itself ───────────────────────────────────
 *
 * Bytes, with the mime Google gave, and no storage write anywhere. That is
 * deliberate: a route that quietly saved every edit would put a member's
 * photograph in our bucket without them asking, and this app's rule is that
 * a picture reaches the device, or our storage, because somebody pressed
 * something. See `check:onthisdevice`.
 */

import { callerFrom, metered } from '@/app/lib/server/account';
import { GENERATION, refuseIfTooMany } from '@/app/lib/server/brake';
import { CHOSEN } from '@/app/lib/server/google';
import { enough, note } from '@/app/lib/server/googlespend';
import { PER_PICTURE, configured, makePicture } from '@/app/lib/server/picture';
import { PODCAST_CAPS } from '@/app/lib/plans';
import { CREDITS } from '@/app/lib/credits';
import { charge } from '@/app/lib/server/credits';
import { guard } from '@/app/lib/server/safety';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A still is seconds, not minutes. Well under this, and not a quick call. */
export const maxDuration = 60;

/** Long enough to say what to change, short enough not to be a novel. */
const MOST = 2_000;

/**
 * The biggest picture that may come in, as base64 characters.
 *
 * Four megabytes, because **the platform stops at 4.5** and everything past
 * that is a bare 413 with no sentence in it. This file said eight, which was
 * a promise the deployment could not keep: a five-megabyte photograph would
 * have been refused by Vercel with nothing a member could read, and the
 * route's own friendly message about size would never have run.
 *
 * `check:bodylimit` caught it. The rule is the useful kind — it compares
 * what a route CLAIMS it accepts against what can actually arrive.
 *
 * Four rather than 4.5 because the words and the JSON travel in the same
 * body, and a limit set exactly at the ceiling fails on the one photograph
 * that is exactly at the ceiling.
 *
 * Base64 is a third bigger than the file, so four megabytes of it is about
 * three of photograph. A phone picture is usually under that; one that is
 * not gets a sentence asking for a smaller one, which is the whole point of
 * owning the limit rather than letting the platform own it.
 *
 * Checked on the STRING rather than on the decoded bytes, because the string
 * is what has already arrived and decoding it to find out it is too big is
 * doing the expensive part first.
 */
const MOST_BYTES = 4 * 1024 * 1024;

const MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const ASPECTS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);
type Aspect = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export async function POST(request: Request): Promise<Response> {
  const flood = refuseIfTooMany('google-picture', request, GENERATION);
  if (flood) return flood;

  if (!configured()) {
    return Response.json({ message: 'The picture engine is not switched on yet.' }, { status: 503 });
  }

  let said: { words?: unknown; from?: unknown; aspect?: unknown };
  try {
    said = await request.json() as typeof said;
  } catch {
    return Response.json({ message: 'Could not read that.' }, { status: 400 });
  }

  const words = String(said.words ?? '').trim().slice(0, MOST);
  if (!words) {
    return Response.json({ message: 'Say what to change, or what to draw.' }, { status: 400 });
  }

  /* ── The picture coming in, if there is one ──────────────────────────

     Its type travels beside it rather than being parsed back out of a data
     URL. The route has to know what it is before anything leaves this
     machine, and a check that re-reads a string the browser wrote is a
     check waiting to be fooled — the same reasoning as `StartRequest.image`
     in the video types. */
  let from: { data: string; mime: string } | undefined;
  const given = said.from && typeof said.from === 'object'
    ? said.from as { data?: unknown; mime?: unknown }
    : null;
  if (given) {
    const data = String(given.data ?? '');
    const mime = String(given.mime ?? '');
    if (!data || !MIMES.has(mime)) {
      return Response.json(
        { message: 'That picture is not a kind this can read. PNG, JPEG or WebP.' },
        { status: 400 },
      );
    }
    if (data.length > MOST_BYTES) {
      return Response.json(
        { message: 'That picture is too big. About three megabytes is the most.' },
        { status: 413 },
      );
    }
    from = { data, mime };
  }

  const aspect = ASPECTS.has(String(said.aspect ?? '')) ? String(said.aspect) as Aspect : undefined;

  /* A member's words going to another company, read before they are sent —
     the same check every other generating route runs, and before the
     charge, because a refusal that has already taken credits is a refusal
     nobody accepts. */
  const caller = metered() ? await callerFrom(request) : null;
  const safe = await guard(request, words, 'picture', caller);
  if (!safe.ok) return safe.response;

  if (metered() && !PODCAST_CAPS[caller?.tier ?? 'free'].publish) {
    return Response.json(
      { message: 'Changing a picture this way needs a paid plan.', needsPlan: true },
      { status: 402 },
    );
  }

  /* Our own ceiling, under Google's one cap — `lib/server/googlespend.ts`
     has why ours has to exist at all. Before the credits. */
  const room = await enough('image', PER_PICTURE, caller?.id ?? null);
  if (room) {
    return Response.json(
      { error: room.code, message: room.message, left: room.left },
      { status: 429 },
    );
  }

  const paid = await charge(request, CREDITS.repaint, 'repaint');
  if (!paid.ok) return paid.response;

  const drawn = await makePicture(words, from, aspect, CHOSEN.image);
  if (!drawn.ok) {
    await paid.refund();
    return Response.json({ message: drawn.message }, { status: drawn.status });
  }

  /* Written down once the picture is in hand, and never awaited: the
     member's picture is ready and the bookkeeping must not hold it. */
  void note('image', PER_PICTURE, CHOSEN.image, caller?.id);

  return new Response(new Uint8Array(drawn.image), {
    headers: {
      'Content-Type': drawn.type,
      'Cache-Control': 'no-store',
      /* Which field the picture actually came back under. The first real
         press settles a guess `lib/server/picture.ts` had to make, and a
         header is where that answer can be read without a log. */
      'X-Image-Under': drawn.under,
    },
  });
}

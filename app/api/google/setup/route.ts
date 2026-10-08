/**
 * Which Google models this project actually has, asked rather than guessed.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * The sources disagree about Lyria's model id: Google's own page documents
 * `lyria-002`, newer pages show `lyria-3-pro-preview`. Veo has a full and a
 * fast one. And a model being published is not the same as a model being
 * available on her account, in her region, to her key.
 *
 * Nobody here can settle that. `aiplatform.googleapis.com` IS reachable from
 * the machine this app is written on — a `:predict` with no key answered 401,
 * which is how the URL shape in `lib/server/google.ts` is known to be right —
 * but there is no key here, and there should not be.
 *
 * So she opens this once and sends back what it says. Every guess becomes a
 * fact. The same shape as `/api/kits/setup`, for the same reason.
 *
 * ── Nothing is generated, and therefore nothing is billed ────────────────
 *
 * Each model is asked with an EMPTY body, which it must refuse on contents.
 * A 400 means "there, allowed, and you sent rubbish" — which is the answer
 * being looked for. A 2xx would mean something was made from nothing, and
 * the page says so loudly rather than quietly passing.
 *
 * ── Guarded ──────────────────────────────────────────────────────────────
 *
 * Behind `POST_SECRET`, compared in constant time, 404 rather than 403 when
 * it is wrong. It reports status codes and model names. The key never
 * appears in the answer, and neither does anything of a member's.
 */

import crypto from 'node:crypto';
import { MODELS, addressOf, configured, project, reach, region } from '@/app/lib/server/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Four requests, each one a refusal. None of them generates anything. */
export const maxDuration = 60;

function sameSecret(given: string, wanted: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(wanted);
  /* `timingSafeEqual` throws on a length mismatch, which is itself a leak. */
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
  /* ── Three forms of the same secret, and why ────────────────────────

     `searchParams.get` URL-DECODES. A secret containing a `+` — which any
     base64-ish string can — arrives here as a SPACE, and the comparison
     fails for a secret that was typed perfectly. That failure is invisible:
     the page answers 404, which is the same answer as a wrong secret, and
     somebody spends an afternoon re-reading a value that was right.

     So the raw query text is tried as well, and the header for anything
     that is not a browser. All three go through the constant-time compare;
     an attacker learns nothing from three attempts at one string they
     already sent. */
  const url = new URL(request.url);
  const tries = [
    url.searchParams.get('key') ?? '',
    /^.*?[?&]key=([^&]*).*$/.exec(url.search)?.[1] ?? '',
    (request.headers.get('authorization') ?? '').replace(/^Bearer /, ''),
  ].filter(Boolean);
  if (!tries.some((one) => sameSecret(one, wanted))) return new Response('no', { status: 404 });

  if (!configured()) {
    return Response.json({
      ready: false,
      why: 'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT is not set on this deployment.'
        + ' See docs/GOOGLE-OPSTEL.md and docs/SWITCH-ON.md.',
      project: project() || null,
      region: region(),
    });
  }

  const found = await Promise.all(MODELS.map((one) => reach(one.id)));
  const music = found.filter((one) => one.what === 'music' && one.answer === 'yes');
  const video = found.filter((one) => one.what === 'video' && one.answer === 'yes');

  return Response.json({
    ready: true,
    project: project(),
    region: region(),
    /* So a wrong region is visible as a wrong address rather than guessed at
       from four 404s. */
    example: addressOf(MODELS[0].id),
    models: found,
    /* The sentence to send back, so nobody has to read four status codes to
       answer one question. */
    says: [
      music.length
        ? `Music: use ${music.map((one) => one.model).join(' or ')}.`
        : 'Music: NONE of the Lyria ids answered. Check Model Garden for this project and region.',
      video.length
        ? `Video: use ${video.map((one) => one.model).join(' or ')}.`
        : 'Video: NONE of the Veo ids answered. Check Model Garden for this project and region.',
      found.some((one) => one.answer === 'not-allowed')
        ? 'At least one said not-allowed, which is a key restriction or an access request rather than a wrong name.'
        : '',
    ].filter(Boolean).join(' '),
  });
}

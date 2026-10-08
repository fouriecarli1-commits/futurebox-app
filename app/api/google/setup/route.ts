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
import { callerFrom, metered } from '@/app/lib/server/account';
import { isOwnerEmail } from '@/app/lib/server/owners';
import { MODELS, addressOf, catalogue, configured, project, reach, region } from '@/app/lib/server/google';

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

/**
 * Being signed in as the owner, which is the way a PERSON should get in.
 *
 * ── Why this exists beside the secret ────────────────────────────────────
 *
 * Carli, 8 October 2026, on being told to open `?key=<POST_SECRET>`:
 * *"maar dan gaan ek nou weer 'n password weggee wat ek weer gaan moet
 * verander."*
 *
 * She is right, and it is this file's fault rather than hers. A secret in a
 * query string is a secret in the browser history, in the access log, and in
 * any screenshot of the address bar — which is exactly how her Google key
 * had to be rotated an hour earlier. Telling her to do the same thing again
 * with a different secret is asking her to burn a second one.
 *
 * So a signed-in owner gets in with no secret at all. The token travels in a
 * header, where nothing logs it, and it is hers already.
 *
 * The secret stays for everything that is not a person: a terminal, a
 * script, a check. Removing it would be trading one awkwardness for another.
 */
async function ownerOf(request: Request): Promise<boolean> {
  if (!metered()) return false;
  const caller = await callerFrom(request);
  return !!caller?.email && isOwnerEmail(caller.email);
}

export async function GET(request: Request): Promise<Response> {
  /* The person first, because it is the one that costs her nothing. */
  const isOwner = await ownerOf(request);

  const wanted = process.env.POST_SECRET ?? '';
  if (!isOwner && !wanted) {
    return Response.json(
      { error: 'no_secret', message: 'Sign in as the owner, or set POST_SECRET.' },
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
  if (!isOwner && !tries.some((one) => sameSecret(one, wanted))) {
    return new Response('no', { status: 404 });
  }

  if (!configured()) {
    return Response.json({
      ready: false,
      why: 'GOOGLE_VERTEX_KEY or GOOGLE_PROJECT is not set on this deployment.'
        + ' See docs/GOOGLE-OPSTEL.md and docs/SWITCH-ON.md.',
      project: project() || null,
      region: region(),
    });
  }

  /* ── The list first, because it is the answer ──────────────────────
 
     The named candidates below are a guess at what Google calls things.
     This is Google telling us what this project HAS, which is the question
     all along and the one the old empty-body probe could not answer — see
     the long note in `lib/server/google.ts`. It generates nothing.
 
     Both, not one: the list says what exists, the per-model reads say
     whether this key may touch each one. A model in the list that reads
     back `not-allowed` is a different problem from one that is absent, and
     only asking both tells them apart. */
  const [has, found] = await Promise.all([
    catalogue(),
    Promise.all(MODELS.map((one) => reach(one.id))),
  ]);

  /* ── One line per KIND, worked out from the list ────────────────────

     The first version of this named music and video in two hand-written
     sentences. Then Carli chose Nano Banana, a third kind arrived, and the
     report she sent back on 8 October said nothing at all about images —
     while the answer she needed was in the rows above it.

     That is the whole argument against a summary written out by hand: it
     describes the list as it was the day somebody wrote it. This one is
     built FROM the list, so a kind that cannot be silently left out is a
     kind nobody has to remember. `check:google` holds it. */
  const kinds = [...new Set(MODELS.map((one) => one.what))];
  const says = kinds.map((kind) => {
    const works = found.filter((one) => one.what === kind && one.answer === 'yes');
    return works.length
      ? `${kind}: use ${works.map((one) => one.model).join(' or ')}.`
      : `${kind}: NONE answered. Check Model Garden for this project and region.`;
  });

  /* What the list turned up that this app has never heard of — the most
     useful rows on the page, because they are the ids nobody had to guess. */
  const unknownToUs = has.ours
    .filter((one) => !MODELS.some((named) => named.id === one.name))
    .map((one) => `${one.what}: ${one.name}`);

  return Response.json({
    ready: true,
    project: project(),
    region: region(),
    /* Google's own answer to "what does this project have", first. */
    catalogue: {
      asked: has.ok,
      status: has.status,
      note: has.note,
      total: has.total,
      ours: has.ours,
      newToThisApp: unknownToUs,
    },
    /* So a wrong region is visible as a wrong address rather than guessed at
       from four 404s. */
    example: addressOf(MODELS[0].id, MODELS[0].verb),
    models: found,
    says: [
      ...says,
      found.some((one) => one.answer === 'not-allowed')
        ? 'At least one said not-allowed, which is a key restriction or an access request rather than a wrong name.'
        : '',
      has.ok
        ? `Google's own list: ${has.note}`
        : `Google's own list could not be read (${has.status}): ${has.note}`,
      unknownToUs.length
        ? `The list has engines this app does not name: ${unknownToUs.join(', ')}. Those ids are facts; the ones above are guesses.`
        : '',
    ].filter(Boolean).join(' '),
  });
}

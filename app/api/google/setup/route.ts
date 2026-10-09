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
 * Behind the owner's own sign-in, or `POST_SECRET` — one implementation,
 * in `ownerdoor.ts`, because this gate had been pasted into a dozen routes
 * and the copies had already drifted.
 *
 * It reports status codes and model names. The key never appears in the
 * answer, and neither does anything of a member's.
 */

import { opened } from '@/app/lib/server/ownerdoor';
import {
  MODELS, addressOf, catalogue, configured, project, reach, region, sighted,
} from '@/app/lib/server/google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Four requests, each one a refusal. None of them generates anything. */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const door = await opened(request);
  if (!door.open) return door.answer;

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
  const [has, found, canSee] = await Promise.all([
    catalogue(),
    Promise.all(MODELS.map((one) => reach(one.id))),
    /* Whether any of the rows above mean anything. Asked in the same breath
       rather than assumed, twice having reported readings from a method that
       was not reading. */
    sighted(),
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
  const tells = new Map(canSee.map((one) => [one.verb, one.canTell]));
  const kinds = [...new Set(MODELS.map((one) => one.what))];
  const says = kinds.map((kind) => {
    const verb = MODELS.find((one) => one.what === kind)?.verb ?? 'predict';
    /* ── Say nothing rather than say something unmeasured ──────────
 
       The old line read "NONE answered, check Model Garden" whether the
       probe had looked or not, and on 9 October it printed that for all
       three kinds when the truth was that the method had refused the
       credential before any model was reached. A sentence that reads the
       same whether or not anything was measured is the fault this whole
       file keeps arriving at. */
    if (!tells.get(verb)) {
      return `${kind}: NOT MEASURED. The probe cannot tell a real ${verb} model`
        + ' from a made-up one with this credential, so it is saying nothing'
        + ' about these. Open Vertex AI \u2192 Model Garden in the console.';
    }
    const works = found.filter((one) => one.what === kind && one.answer === 'yes');
    const absent = found.filter((one) => one.what === kind && one.answer === 'no');
    return works.length
      ? `${kind}: use ${works.map((one) => one.model).join(' or ')}.`
      : `${kind}: none of ${absent.map((one) => one.model).join(', ')} are on this project.`;
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
    /* Put this first: it decides whether anything below is a reading. */
    canTheProbeSee: canSee,
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

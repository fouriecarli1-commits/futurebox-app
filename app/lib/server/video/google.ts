/**
 * Veo, straight from Google rather than through a reseller.
 *
 * ── Why this is a Provider and not a route ───────────────────────────────
 *
 * `/api/video` already is what a video engine needs: a job rather than a
 * call, a row so closing the tab does not lose it, a charge before and a
 * refund if every engine gives up, grades, and a list tried cheapest first.
 * All of that was built for engines that did not exist yet. This is one of
 * them, and writing a second route beside it would have thrown the lot away.
 *
 * ── There is already a `veo` in the list, and this is not it ─────────────
 *
 * That one is Veo **resold by ElevenLabs**. This is Veo on her own Vertex
 * project, measured working on 8 October 2026. The difference is not the
 * picture, it is where the money goes and who can stop it: this one bills
 * against `GOOGLE_CAP_VIDEO` and pauses at her own ceiling.
 *
 * Google's own rates, video-only, are $0.08 a second for Fast against $0.20
 * for Standard. The fast one is the default for the reason the margin is one
 * cent — see `CREDITS.video`.
 *
 * ── The awkward part, and it is now measured rather than assumed ─────────
 *
 * `Progress` wants a URL when a clip is done, because every other engine
 * hands back a link the route then copies into our own bucket. **Google
 * hands back bytes**, because we deliberately did not switch Cloud Storage
 * on — see `docs/GOOGLE-OPSTEL.md`, where leaving it off is what keeps
 * everything inside the one capped service.
 *
 * That sentence was an inference for a day, and an uncomfortable one: every
 * Veo sample on Carli's Model Garden page answers with a `gs://` path, so
 * the reasonable fear was that Veo always writes to a bucket and this app
 * had no way to read one. The samples all send `storageUri` and this app
 * never does, so the samples could not settle it.
 *
 * **Carli ran `/api/google/videotest` on 9 October 2026 and it answered
 * `needsBucket: false`.** One real four-second clip, through these two
 * functions rather than through a probe beside them, and the bytes came
 * back. No bucket, nothing to switch on, and the Cloud Storage question is
 * closed for this rung.
 *
 * Measured on `veo-3.1-fast-generate-001`, which is what `googleVeo` runs.
 * The premium rung runs the full model and that one is still an INFERENCE —
 * same API, same request, no `storageUri` — which is a good inference and
 * not a measurement. `/api/google/videotest?rung=premium` settles it for
 * about R26 if anybody ever wants it settled.
 *
 * So `check` answers with a `data:` URL. `fetch` reads one, so the route's
 * own copy-into-the-bucket step works unchanged and nothing else had to
 * learn a second shape. The cost is that an eight-second clip is held in
 * memory as a string for a moment. For one clip that is fine; the day it is
 * not, the answer is a bucket and a signed link, and that is a Cloud Storage
 * decision rather than a code one.
 */

import { CHOSEN, addressOf, configured as googleOn, region } from '../google';
import { ceilingFor } from '../googlespend';
import type { Grade, Progress, Provider, StartRequest, Started } from './types';

/**
 * Micro-dollars a second, video only, from Google's published rate.
 *
 * $0.15 a second is 150 000 millionths of a dollar a second. Flatly.
 *
 * ── 80 000 was this app's own number and nobody had ever read it ─────────
 *
 * Carli found a price table on 9 October 2026: Veo Lite $0.05 a second, Veo
 * Fast $0.10 to $0.15, Veo Standard $0.40. This app had been counting Fast
 * at $0.08 — a figure that has been in the file since the provider was
 * written and that no one, including me, ever checked against anything.
 *
 * So it is set to 150 000: the TOP of the quoted range, not the middle and
 * not the bottom. Her source is a summary rather than Google's own page —
 * the range is the tell, because Google quotes one number — so the right
 * response to an uncertain price is the expensive end of it. Over-counting
 * binds our own ceiling early. Under-counting is a bill.
 *
 * ── What it costs against what it earns, read rather than guessed ────────
 *
 * Fifteen credits is one five-second unit, and a credit sells for R1.49 at
 * the cheapest tier — so the app takes **R22.35** for five seconds, not the
 * R3.75 I first told her. I had guessed a credit at twenty-five cents
 * instead of reading `TIER_SPECS` and `TIER_CREDITS`, and the guess turned a
 * healthy margin into an imaginary loss. Written down here because it is the
 * same fault as every other one this week: a number taken from memory when
 * the file was one command away.
 *
 *   per five seconds   costs us   margin on R22.35
 *   Seedance            R2.62      8.5x
 *   Kling               R3.44      6.5x
 *   Veo Lite            R4.00      5.6x
 *   Veo Fast           R12.00      1.9x
 *   Veo Standard       R32.00      loses money
 *
 * So Lite sits in the same band as the engines already in use, Fast is thin,
 * and Standard cannot be sold at this price at all.
 *
 * ── Raised to 200 000 earlier the same day, and put back ─────────────────
 *
 * Carli sent her Model Garden cards one at a time. On the first — the 3.0
 * one — I concluded the fast id this app used did not exist, moved the
 * chosen model to the full one, and raised this number to match it. Three
 * cards later `veo-3.1-fast-generate-001` appeared on her own screen.
 *
 * The original pairing was right: the fast model at $0.08 a second. What was
 * wrong was concluding from the first card instead of waiting for the last,
 * and then writing the conclusion into a file.
 *
 * The number stays tied to the model either way — `check:veo` holds them to
 * each other, so neither can move alone, which is the part that worked.
 *
 * The first version of this said `80_000 / 1000`, carried over from the
 * SONG cost next door, which is 80 000 per song and not per second. That
 * made a clip cost 640 instead of 640 000 — **a thousandth of the truth**,
 * so the video ceiling would have counted to forty dollars somewhere around
 * the sixty-thousandth clip and stopped nothing at all. `check:veo` caught
 * it on its first run, by multiplying the number out rather than reading it.
 */
const PER_SECOND = 150_000;

/**
 * The same unit for the full model: $0.40 a second, the dear end of what is
 * quoted for it. Five seconds costs R32.00 against the R89.40 premium takes.
 */
const FULL_PER_SECOND = 400_000;

/**
 * And Lite, at $0.05 a second — Carli's own price table, 9 October 2026.
 *
 * Five seconds costs R4.00 against the R22.35 standard takes, which is 5.6
 * times and the same band the engines already in use sit in.
 *
 * ── Why standard needed a second engine at all ──────────────────────────
 *
 * Seedance was the only thing behind it, and Seedance is behind
 * `ELEVEN_SEEDANCE_READY=1` because ByteDance models need approving on an
 * ElevenLabs workspace. If that variable is not set on the deployment — and
 * nothing in this repository can know whether it is — then `standard` has
 * no engine, the desk stops offering the CHEAPEST video grade, and the only
 * video anybody can buy is better or premium. That is a hole nobody would
 * see: no error, no failing check, just a rung quietly missing from a page.
 *
 * So Lite serves standard too, on her own Google project, behind her own
 * ceiling. Seedance is still tried first where it is switched on, because
 * R2.62 is cheaper than R4.00 and the picture at this rung is a promise
 * about the result rather than about whose engine made it.
 */
const LITE_PER_SECOND = 50_000;

const key = (): string => process.env.GOOGLE_VERTEX_KEY ?? '';

const post = async (model: string, verb: string, body: unknown): Promise<Response> => fetch(
  addressOf(model, verb),
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
    body: JSON.stringify(body),
  },
);

async function start(model: string, request: StartRequest): Promise<Started> {
  if (!googleOn()) {
    return { ok: false, status: 503, message: 'Google video is not switched on.' };
  }
  let answer: Response;
  try {
    answer = await post(model, 'predictLongRunning', {
      instances: [{
        prompt: request.prompt.slice(0, 2000),
        ...(request.image
          ? { image: { bytesBase64Encoded: request.image.data, mimeType: request.image.mime } }
          : {}),
      }],
      parameters: {
        durationSeconds: request.seconds,
        aspectRatio: request.aspect,
        sampleCount: 1,
        /* Silent on purpose. The app's own voices are Afrikaans and the
           video models are English-first, so the line is spoken afterwards
           by ElevenLabs — which is both cheaper and the only way this app
           gets Afrikaans at all. `speaks: false` below says the same thing
           to the router, so a request that needs speech is never offered
           here. */
        generateAudio: false,
      },
    });
  } catch {
    return { ok: false, status: 502, message: 'Google could not be reached.' };
  }
  const text = await answer.text().catch(() => '');
  if (!answer.ok) {
    return { ok: false, status: answer.status, message: text.slice(0, 300) || `Google answered ${answer.status}.` };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const name = (body as { name?: unknown } | null)?.name;
  if (typeof name !== 'string' || !name) {
    return { ok: false, status: 502, message: `Google started nothing it could name: ${text.slice(0, 200)}` };
  }
  return { ok: true, taskId: name };
}

/** Every field the finished video might be under. See `lyria.ts` for why. */
export const VIDEO_FIELDS = ['bytesBase64Encoded', 'videoBytes', 'video', 'bytes'] as const;

/**
 * The finished clip can come back as a PLACE instead of as bytes.
 *
 * Carli's Model Garden page, 9 October 2026, shows a finished Veo operation
 * answering with `videos: [{ gcsUri: "gs://BUCKET/…", mimeType: "video/mp4" }]`
 * — the file written into a Cloud Storage bucket, because the sample asks
 * for that with a `storageUri` parameter.
 *
 * This app does not send `storageUri`, and the measurement of 9 October 2026
 * says the cheap rung hands back bytes accordingly. This stays anyway, for
 * two reasons: the full model on the premium rung has never been measured,
 * and a model switched tomorrow is one line.
 *
 * If a path ever comes back, "the video was not where this app looked for
 * it" is true and useless: it reads as a field-name problem, and the real
 * problem is that the clip is in a bucket this app does not have and cannot
 * read with the credential it holds.
 *
 * So a path is recognised and named as itself.
 */
export function placeOf(done: unknown): string | null {
  const top = done as Record<string, unknown> | null;
  const response = (top?.response ?? top) as Record<string, unknown> | null;
  if (!response) return null;
  const lists = [response.videos, response.predictions, response.generatedSamples]
    .filter(Array.isArray) as unknown[][];
  for (const list of [...lists, [response]]) {
    for (const one of list) {
      const row = one as Record<string, unknown> | null;
      const where = row?.gcsUri ?? (row?.video as Record<string, unknown> | undefined)?.gcsUri;
      if (typeof where === 'string' && where.startsWith('gs://')) return where;
    }
  }
  return null;
}

/**
 * The clip out of whatever shape the finished operation takes.
 *
 * Exported so `check:veo` can drive it without a network — the response
 * shape was never measured here, and guessing one field would mean a paid
 * clip thrown away because it was called something else.
 */
export function videoIn(done: unknown): { base64: string; mime: string } | null {
  const top = done as Record<string, unknown> | null;
  const response = (top?.response ?? top) as Record<string, unknown> | null;
  if (!response) return null;
  const lists = [response.videos, response.predictions, response.generatedSamples]
    .filter(Array.isArray) as unknown[][];
  for (const list of [...lists, [response]]) {
    for (const one of list) {
      const row = one as Record<string, unknown> | null;
      if (!row) continue;
      /* Some shapes nest it one deeper under `video`. */
      const inner = (row.video && typeof row.video === 'object' ? row.video : row) as Record<string, unknown>;
      for (const name of VIDEO_FIELDS) {
        const got = inner[name];
        if (typeof got === 'string' && got.length > 1024) {
          const mime = typeof inner.mimeType === 'string' ? inner.mimeType : 'video/mp4';
          return { base64: got, mime };
        }
      }
    }
  }
  return null;
}

async function check(model: string, taskId: string): Promise<Progress> {
  let answer: Response;
  try {
    answer = await post(model, 'fetchPredictOperation', { operationName: taskId });
  } catch {
    /* Never a failure. The route refunds on failure, and a network blip
       that refunded a clip Google is still making would pay twice. */
    return { state: 'unknown', message: 'Google could not be reached.' };
  }
  const text = await answer.text().catch(() => '');
  if (!answer.ok) return { state: 'unknown', message: text.slice(0, 200) || String(answer.status) };

  let body: Record<string, unknown> | null;
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { return { state: 'unknown', message: 'unreadable' }; }
  if (!body?.done) return { state: 'running' };

  const wrong = body.error as { message?: unknown } | undefined;
  if (wrong) {
    return { state: 'failed', message: String(wrong.message ?? 'Google refused this one.').slice(0, 300) };
  }

  const got = videoIn(body);
  if (!got) {
    /* Named before the general case, because it is a different problem with
       a different fix: the clip exists and is in a bucket, rather than being
       under a field nobody looked under. */
    const where = placeOf(body);
    if (where) {
      return {
        state: 'failed',
        message: 'Google put the video in a storage bucket instead of handing it'
          + ` back (${where}). This app asks for the bytes themselves and has no`
          + ' bucket to read, so either a storageUri reached the request or this'
          + ' model always writes to one.',
      };
    }
    /* Finished, paid for, and the bytes are somewhere this app did not
       look. Said as itself rather than as an ordinary failure, which is the
       one description that stops anybody investigating. */
    return {
      state: 'failed',
      message: 'Google finished but the video was not where this app looked for it.'
        + ` The answer began: ${text.slice(0, 200)}`,
    };
  }
  return { state: 'done', url: `data:${got.mime};base64,${got.base64}` };
}

/**
 * One rung of Veo on her own project.
 *
 * ── Why this became a factory on 9 October 2026 ──────────────────────────
 *
 * Carli: *"Ons gaan ook nie meer Kling gebruik nie, die video generation
 * deur kling is sleg."*
 *
 * Kling was the only engine behind `premium`. Taking it out left that rung
 * with nothing behind it, and the router is honest about that — it simply
 * stops offering premium — but a member who was being sold a top grade and
 * now cannot buy one is a product with a hole in it.
 *
 * So premium is the full Veo, which it should arguably have been all along:
 * `videoCost` charges premium FOUR times the base, R89.40 for five seconds
 * at the cheapest credit tier, against R32.00 of Veo Standard. Kling at
 * R3.44 was earning twenty-six times on that rung, which is the sort of
 * number that reads as a mistake in the other direction.
 *
 * Both rungs are the same account and the same cap, which is the one thing
 * about this that could have cost real money — see `purse`.
 */
function rung(
  spec: { model: string; grade: Grade; perSecond: number; name: string },
): Provider {
  return {
    id: `google-veo-${spec.grade}`,
    name: spec.name,
    grade: spec.grade,
    model: spec.model,
    configured: googleOn,
    can: {
      seconds: [4, 6, 8],
      /* Wide and tall only, like the resold one: Veo's own request takes
         those, and offering a square it will refuse is a button that cannot
         work. */
      aspects: ['16:9', '9:16'],
      /* Deliberately silent — see `generateAudio` above. */
      speaks: false,
      /* Veo does take a start frame, and this says so only because the shape
         above sends it. An image field an endpoint does not read is a member
         paying for a clip that has nothing to do with their picture. */
      startFrame: true,
      maxPromptChars: 2000,
    },
    /* Both rungs bill the same Google project against the same
       `GOOGLE_CAP_VIDEO`. Counted separately they would spend it twice. */
    purse: 'google-video',
    /* In micro-dollars, which is this provider's own unit, and read from the
       one place the Google ceilings live so there are not two numbers. */
    ceiling: () => ceilingFor('video'),
    cost: (seconds) => Math.round(Math.max(1, seconds) * spec.perSecond),
    start: (request) => start(spec.model, request),
    check: (taskId) => check(spec.model, taskId),
  };
}

/**
 * The cheap rung, and the one that was here first.
 *
 * `id` changed from `google-veo` to `google-veo-better` the day the second
 * rung arrived. `providerById` still answers for the old id — see
 * `index.ts` — because a row written yesterday names it and a clip that
 * cannot be checked is a clip that was paid for and lost.
 */
export const googleVeo: Provider = rung({
  model: CHOSEN.video,
  grade: 'better',
  perSecond: PER_SECOND,
  name: `Veo 3.1 Fast (Google, ${region()})`,
});

/** The old id, so rows written before the rungs split can still be read. */
export const googleVeoOldId = 'google-veo';

/**
 * The cheapest rung, so that `standard` has an engine of its own.
 *
 * `veo-3.1-lite-generate-001` came off her own Model Garden page on
 * 9 October 2026. The rate is from her price table the same day and is the
 * one figure here that Google's own page has not confirmed — which is why
 * it is the CHEAP rung rather than a dear one: if $0.05 turns out to be low,
 * the error is on the engine with the biggest margin over it.
 */
export const googleVeoLite: Provider = rung({
  model: 'veo-3.1-lite-generate-001',
  grade: 'standard',
  perSecond: LITE_PER_SECOND,
  name: `Veo 3.1 Lite (Google, ${region()})`,
});

/**
 * The full model, on the top rung.
 *
 * `veo-3.1-generate-001` came off Carli's own Model Garden page on 9 October
 * 2026 — it is not a guessed id. The rate is the expensive end of what
 * is quoted for it: her summary said $0.40 a second for full quality where
 * Google's own page reads $0.20, and an uncertain price is taken at the top
 * so that over-counting binds our ceiling early instead of arriving as a
 * bill. `check:veo` holds the id and the rate to each other.
 */
export const googleVeoFull: Provider = rung({
  model: 'veo-3.1-generate-001',
  grade: 'premium',
  perSecond: FULL_PER_SECOND,
  name: `Veo 3.1 (Google, ${region()})`,
});

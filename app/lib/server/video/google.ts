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
 * ── The awkward part, stated rather than hidden ──────────────────────────
 *
 * `Progress` wants a URL when a clip is done, because every other engine
 * hands back a link the route then copies into our own bucket. **Google
 * hands back bytes**, because we deliberately did not switch Cloud Storage
 * on — see `docs/GOOGLE-OPSTEL.md`, where leaving it off is what keeps
 * everything inside the one capped service.
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
import type { Progress, Provider, StartRequest, Started } from './types';

/**
 * Micro-dollars a second, video only, from Google's published rate.
 *
 * $0.08 a second is 80 000 millionths of a dollar a second. Flatly.
 *
 * The first version of this said `80_000 / 1000`, carried over from the
 * SONG cost next door, which is 80 000 per song and not per second. That
 * made a clip cost 640 instead of 640 000 — **a thousandth of the truth**,
 * so the video ceiling would have counted to forty dollars somewhere around
 * the sixty-thousandth clip and stopped nothing at all. `check:veo` caught
 * it on its first run, by multiplying the number out rather than reading it.
 */
const PER_SECOND = 80_000;

const key = (): string => process.env.GOOGLE_VERTEX_KEY ?? '';

const post = async (verb: string, body: unknown): Promise<Response> => fetch(
  addressOf(CHOSEN.video, verb),
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
    body: JSON.stringify(body),
  },
);

async function start(request: StartRequest): Promise<Started> {
  if (!googleOn()) {
    return { ok: false, status: 503, message: 'Google video is not switched on.' };
  }
  let answer: Response;
  try {
    answer = await post('predictLongRunning', {
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

async function check(taskId: string): Promise<Progress> {
  let answer: Response;
  try {
    answer = await post('fetchPredictOperation', { operationName: taskId });
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

export const googleVeo: Provider = {
  id: 'google-veo',
  name: `Veo 3.1 Fast (Google, ${region()})`,
  /* The same rung as the resold one: it is the same model. A member who
     paid for "better" gets Veo either way, and which of the two answers is
     a billing decision rather than a promise about the picture. */
  grade: 'better',
  model: CHOSEN.video,
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
  /* In micro-dollars, which is this provider's own unit, and read from the
     one place the Google ceilings live so there are not two numbers. */
  ceiling: () => ceilingFor('video'),
  cost: (seconds) => Math.round(Math.max(1, seconds) * PER_SECOND),
  start,
  check,
};

/**
 * Video through ElevenLabs, which turns out to be two engines rather than one.
 *
 * `POST /v1/flows/video` is a broker: one key, one bill, several models behind
 * it. That matters more than it sounds. The key is already in this app for
 * music, speech and voice cloning, so adding video here costs no new account,
 * no second invoice and no second thing that can quietly lapse.
 *
 * Two models are used, and they are two rungs rather than two options:
 *
 *   seedance   ByteDance, the cheap one. ~R2.62 a clip. The workhorse.
 *   veo        Google Veo 3.1, ~R10.72. Better picture, and it can speak.
 *
 * Both are behind the same endpoint and differ only by `model_id`, which is
 * why they are one file.
 *
 * ── Seedance has to be switched on, and the app has to be told ───────────
 *
 * ElevenLabs' own SDK says it plainly: ByteDance models are disabled by
 * default and need explicit approval on the workspace. Nothing here can see
 * that — a key is a key — so without help this engine reports itself ready,
 * takes the default grade, charges, fails, and refunds. The member gets their
 * credits back and a bad first impression, which is the worse of the two
 * costs.
 *
 * So the approval is stated rather than guessed: ELEVEN_SEEDANCE_READY=1 once
 * support confirms it. Until then Standard simply does not appear, and the
 * cheapest *working* grade is the cheapest thing offered — which is the honest
 * shape of a shelf with one item still on order.
 *
 * A flag somebody must remember to set is a poor mechanism and this is the
 * only place in the app that has one. It earns its place because the
 * alternative is charging people for a request that cannot succeed.
 *
 * ── The wire format ──────────────────────────────────────────────────────
 *
 * Taken from @elevenlabs/elevenlabs-js — the serializers, not the docs, so the
 * names are what actually goes on the wire: snake_case in, `model_id` to pick
 * the model, and a response that is `pending`, `generating`, `completed` or
 * `failed`. A completed one carries `content_url`, signed and good for about
 * an hour; a failed one carries `failure_reason` and `error_message`, and
 * ElevenLabs states that failed generations are not charged.
 */

import type { Progress, Provider, StartRequest, Started } from './types.ts';

const BASE = 'https://api.elevenlabs.io/v1/flows/video';

const key = (): string => process.env.ELEVENLABS_API_KEY ?? '';

/**
 * Model ids, overridable because these move.
 *
 * The fast variants are the defaults on purpose: this app's whole video
 * economy rests on the cheap rung being cheap, and a "fast" model that is good
 * enough for a five-second cutaway is the difference between a feature that
 * pays and one that does not.
 */
const SEEDANCE = process.env.ELEVEN_SEEDANCE_MODEL || 'bytedance-seedance-v2-mini';
const VEO = process.env.ELEVEN_VEO_MODEL || 'veo-3.1-fast-generate-001';

/**
 * The month's allowance for each, in ElevenLabs credits.
 *
 * Small and deliberate, like Kling's. A ceiling set too high never fires, and
 * then the first anybody knows is a member paying for a generation that comes
 * back as a billing error.
 */
function allowance(name: string, fallback: number): number {
  const set = Number(process.env[name]);
  return Number.isFinite(set) && set > 0 ? set : fallback;
}

interface Envelope {
  id?: string;
  status?: string;
  content_url?: string;
  content_mime_type?: string;
  failure_reason?: string;
  error_message?: string;
  detail?: unknown;
}

async function call(path: string, init?: RequestInit): Promise<Envelope | null> {
  if (!key()) return null;
  try {
    const response = await fetch(BASE + path, {
      ...init,
      headers: { 'xi-api-key': key(), 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
    return (await response.json().catch(() => null)) as Envelope | null;
  } catch {
    return null;
  }
}

/** A message from ElevenLabs' error shapes, which are not all the same shape. */
function reason(body: Envelope | null): string | null {
  if (!body) return null;
  if (typeof body.error_message === 'string') return body.error_message;
  const detail = body.detail as { message?: string } | string | undefined;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail.message === 'string') return detail.message;
  return null;
}

/**
 * What each model will accept, which is not the same for the two of them.
 *
 * Seedance takes square, and 21:9 and 4:3 besides; Veo takes wide and tall
 * only. The first version of this file sent `16:9` for a square request to
 * both, which quietly gave a Seedance user a different shape from the one they
 * pressed. Silently substituting is worse than refusing — the member cannot
 * see it happen and has no idea why the crop is wrong.
 *
 * Resolution likewise: the mini tops out at 720p, Veo goes to 4K. Asking for
 * 720p from Veo was leaving the better half of what was paid for on the table.
 */
interface Wire {
  readonly aspects: readonly string[];
  readonly resolution: string;
}

const WIRE: Record<string, Wire> = {
  seedance: { aspects: ['16:9', '9:16', '1:1'], resolution: '720p' },
  veo: { aspects: ['16:9', '9:16'], resolution: '1080p' },
};

async function start(model: string, request: StartRequest, wire: Wire): Promise<Started> {
  if (!key()) {
    return { ok: false, status: 503, message: 'The video engine is not switched on for this app yet.' };
  }

  const body = await call('', {
    method: 'POST',
    body: JSON.stringify({
      model_id: model,
      prompt: request.prompt.slice(0, 2000),
      // Burnt-in text cannot be translated, cannot be turned off, and is wrong
      // the moment the clip is cut.
      negative_prompt: 'text, watermark, logo, subtitles, captions, distorted faces, extra limbs',
      duration_secs: request.seconds,
      // A shape the model does not take falls back to wide, and `suits()` in
      // ./types stops that request reaching here in the first place — so this
      // is a floor, not a substitution anybody will meet.
      aspect_ratio: wire.aspects.includes(request.aspect) ? request.aspect : '16:9',
      resolution: wire.resolution,
      generate_audio: request.speak,
    }),
  });

  if (!body) return { ok: false, status: 502, message: 'The video engine could not be reached.' };
  if (!body.id) {
    const said = reason(body);
    return {
      ok: false,
      status: 502,
      message: said ? `The video engine refused it: ${said}` : 'The video engine refused it.',
    };
  }
  return { ok: true, taskId: body.id };
}

async function check(taskId: string): Promise<Progress> {
  const body = await call(`/${encodeURIComponent(taskId)}`);
  if (!body) return { state: 'unknown', message: 'The video engine could not be reached.' };

  if (body.status === 'completed') {
    return body.content_url
      ? { state: 'done', url: body.content_url }
      : { state: 'failed', message: 'The engine finished but returned no video.' };
  }
  if (body.status === 'failed') {
    // `moderated` is the one worth repeating as itself: it means their screen
    // refused the prompt, which is a different thing from the engine breaking
    // and a different thing for the member to do about it.
    const said = body.error_message ?? 'The engine could not make that one.';
    return {
      state: 'failed',
      message: body.failure_reason === 'moderated' ? `Refused by the engine: ${said}` : said,
    };
  }
  if (body.status === 'pending' || body.status === 'generating') return { state: 'running' };

  // Anything unrecognised is treated as still running rather than as a
  // failure: guessing failure here would refund a video that is about to land.
  return { state: 'running' };
}



/* ─────────────────────────────────────────── a presenter, not a shot ────
 *
 * Everything above makes a clip out of a sentence. This makes one out of a
 * photograph and a voice: `creatify-aurora` is a lipsync model, and its body
 * is an image and an audio file with no prompt anywhere in it.
 *
 * ── Why it is here and not a `Provider` ──────────────────────────────────
 *
 * A `Provider` takes a prompt, an aspect ratio and a number of seconds.
 * Aurora takes none of the three — its length is the length of the audio, and
 * its framing is the framing of the picture. Wrapping it in that interface
 * would mean a grade whose length row and shape row mean nothing, which is a
 * worse lie than a second function.
 *
 * ── Why this app is most of the way there already ────────────────────────
 *
 * The picture is a cast member and the audio is the voice studio. Neither was
 * built for this and both are exactly what it takes.
 *
 * It is also how the presenter speaks Afrikaans. The model is never asked to
 * know any: it is handed audio, and whatever language that audio is in is the
 * language that comes out. That is the same argument already made for laying
 * an ElevenLabs voice over silent footage — with the mouth moving.
 *
 * ── Behind a flag, like Seedance ─────────────────────────────────────────
 *
 * The wire format below is read off @elevenlabs/elevenlabs-js's serializers,
 * which is where this file's other shapes came from. What no serializer can
 * say is whether a given account's plan will accept the model id — Seedance
 * sits behind `ELEVEN_SEEDANCE_READY` for exactly that reason, and this is not
 * different. One clip answers it.
 */

const AURORA = process.env.ELEVEN_AURORA_MODEL || 'creatify-aurora';

/** 720p is the ceiling the model declares; the other option is 480p. */
export type PresenterQuality = '480p' | '720p';

export interface PresenterRequest {
  /** The character to animate: base64 bytes and the mime type they are. */
  readonly image: { readonly data: string; readonly mime: string };
  /** The speech that drives the lips. mp3 or wav. */
  readonly audio: { readonly data: string; readonly mime: string };
  readonly quality: PresenterQuality;
}

export function presenterReady(): boolean {
  return Boolean(key()) && process.env.ELEVEN_AURORA_READY === '1';
}

/**
 * What the broker will take, spelled out because a wrong mime is a refusal
 * with a message nobody can act on.
 *
 * Narrower than the model's list on the audio side: it declares mp3 and wav,
 * and those are the two this app produces.
 */
export const PRESENTER_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const PRESENTER_AUDIO_MIMES = ['audio/mpeg', 'audio/wav'];

/** Inline base64 is capped at 25MB decoded, and both halves share the ceiling. */
export const PRESENTER_MAX_BYTES = 25 * 1024 * 1024;

export async function startPresenter(request: PresenterRequest): Promise<Started> {
  if (!presenterReady()) {
    return {
      ok: false,
      status: 503,
      message: 'The presenter is not switched on for this app yet.',
    };
  }

  const body = await call('', {
    method: 'POST',
    body: JSON.stringify({
      model_id: AURORA,
      /* Inline rather than uploaded, and that is a decision with a cost.

         The SDK is explicit that an inline asset is ephemeral: "stored as an
         ephemeral asset with no guaranteed retention… To keep an input and
         reuse it across generations, upload it via the assets API
         (POST /v1/assets) and pass an asset reference instead."

         A cast member IS reused across generations, so the assets API is the
         right home for one and is the obvious next step. Inline first because
         it needs nothing kept in step: no second id to store against a cast
         row, nothing to clean up when somebody takes a member out, and no way
         for a row here to point at an asset that has been deleted there. */
      image: {
        type: 'inline_base64',
        content_base64: request.image.data,
        mime_type: request.image.mime,
      },
      audio: {
        type: 'inline_base64',
        content_base64: request.audio.data,
        mime_type: request.audio.mime,
      },
      resolution: request.quality,
    }),
  });

  if (!body) return { ok: false, status: 502, message: 'The presenter could not be reached.' };
  if (!body.id) {
    const said = reason(body);
    return {
      ok: false,
      status: 502,
      message: said ? `The presenter refused it: ${said}` : 'The presenter refused it.',
    };
  }
  return { ok: true, taskId: body.id };
}

/** The same broker, so the same envelope and the same reading of it. */
export const checkPresenter = check;

export const seedance: Provider = {
  id: 'seedance',
  name: 'Seedance (ElevenLabs)',
  grade: 'standard',
  model: SEEDANCE,
  // Both halves, and neither is optional: the key gets us to the API, the flag
  // says the API will take this model.
  configured: () => Boolean(key()) && process.env.ELEVEN_SEEDANCE_READY === '1',
  can: {
    // Seedance takes a length rather than a step, so this is a shelf of useful
    // ones rather than a limit the model imposes.
    seconds: [5, 10, 15, 20, 30],
    aspects: ['16:9', '9:16', '1:1'],
    // Left false deliberately. The cheap rung is for pictures; a spoken line
    // goes to a rung that charges for one, or — better and far cheaper — to
    // ElevenLabs speech laid over silent footage, which is also the only way
    // this app speaks Afrikaans.
    speaks: false,
    // False because it is unverified, not because the endpoint is known to
    // refuse. `/v1/flows/video` is a broker, and this repository reads its wire
    // format off the SDK's serializers rather than a docs page; nothing here
    // has confirmed the name of a start-frame field on it. An image field an
    // endpoint ignores is the worst failure available — the clip is made, it is
    // charged, it has nothing to do with the picture, and no error explains it.
    // So the desk sends people to the grade that is proven, and this line
    // becomes true the day somebody checks rather than the day somebody hopes.
    startFrame: false,
    maxPromptChars: 2000,
  },
  ceiling: () => allowance('ELEVEN_VIDEO_CREDITS', 13_000),
  // ~20 credits a clip at the advertised rate, doubled for ten seconds. A
  // reading of a pricing page, and recorded as such: what each generation
  // really costs is written to the videos row.
  cost: (seconds) => Math.max(20, Math.ceil(seconds / 5) * 20),
  start: (request) => start(SEEDANCE, request, WIRE.seedance),
  check,
};

export const veo: Provider = {
  id: 'veo',
  name: 'Veo 3.1 (ElevenLabs)',
  grade: 'better',
  model: VEO,
  configured: () => Boolean(key()),
  can: {
    seconds: [4, 6, 8],
    // Not square. Veo's own request type takes wide and tall only, and
    // offering a shape it will refuse is a button that cannot work.
    aspects: ['16:9', '9:16'],
    speaks: true,
    /** Unverified on this broker; see the note on Seedance above. */
    startFrame: false,
    maxPromptChars: 2000,
  },
  ceiling: () => allowance('ELEVEN_VIDEO_CREDITS', 13_000),
  cost: (seconds) => (seconds >= 8 ? 120 : 60),
  start: (request) => start(VEO, request, WIRE.veo),
  check,
};

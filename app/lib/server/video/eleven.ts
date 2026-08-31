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
 * ── Seedance has to be switched on ───────────────────────────────────────
 *
 * ElevenLabs' own SDK says it plainly: ByteDance models are disabled by
 * default and need explicit approval on the workspace. `configured()` cannot
 * see that from here — a key is a key — so a workspace without approval gets a
 * refusal from the API rather than from this file, and the route falls through
 * to the next engine. That is the correct behaviour and it is why failover
 * exists, but it means the cheap path is silently the expensive path until
 * somebody writes to support.
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

async function start(model: string, request: StartRequest): Promise<Started> {
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
      aspect_ratio: request.aspect === '1:1' ? '16:9' : request.aspect,
      resolution: '720p',
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

/** Aspects both models accept. 1:1 is asked for as wide and cropped by the page. */
const ASPECTS = ['16:9', '9:16', '1:1'] as const;

export const seedance: Provider = {
  id: 'seedance',
  name: 'Seedance (ElevenLabs)',
  grade: 'standard',
  model: SEEDANCE,
  configured: () => Boolean(key()),
  can: {
    seconds: [5, 10],
    aspects: ASPECTS,
    // Left false deliberately. The cheap rung is for pictures; a spoken line
    // goes to a rung that charges for one, or — better and far cheaper — to
    // ElevenLabs speech laid over silent footage, which is also the only way
    // this app speaks Afrikaans.
    speaks: false,
    maxPromptChars: 2000,
  },
  ceiling: () => allowance('ELEVEN_VIDEO_CREDITS', 13_000),
  // ~20 credits a clip at the advertised rate, doubled for ten seconds. A
  // reading of a pricing page, and recorded as such: what each generation
  // really costs is written to the videos row.
  cost: (seconds) => (seconds >= 10 ? 40 : 20),
  start: (request) => start(SEEDANCE, request),
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
    aspects: ['16:9', '9:16', '1:1'],
    speaks: true,
    maxPromptChars: 2000,
  },
  ceiling: () => allowance('ELEVEN_VIDEO_CREDITS', 13_000),
  cost: (seconds) => (seconds >= 8 ? 120 : 60),
  start: (request) => start(VEO, request),
  check,
};

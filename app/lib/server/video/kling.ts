/**
 * Kling AI, the video engine.
 *
 * Until now `generateVideo` threw and the studio drew a visualiser in the
 * browser instead, honestly labelled as one. That still exists and is still
 * free; this is the other thing — a hosted model that makes footage from a
 * sentence, on a plan that is paid for by the month.
 *
 * ── Authentication, which comes in two shapes ────────────────────────────
 *
 * Kling's console now issues a single API key, sent straight through as a
 * bearer token. Older accounts have an AccessKey and a SecretKey instead, and
 * with those the bearer token is a JWT you sign yourself: HS256, `iss` is the
 * access key, valid half an hour, `nbf` five seconds back because two clocks
 * are never one clock. Signed per request with Web Crypto, which is in both
 * runtimes and needs no dependency.
 *
 * Both are supported and the single key wins where both are set, because that
 * is the one Kling hands out now. Which one an account has is not something
 * this repository can know, and finding out by having somebody's first video
 * fail is not a way to find out.
 *
 * The wire format below — the endpoints, the field names, the shape of the
 * envelope and the task states — is taken from the AI SDK's own KlingAI
 * provider (`@ai-sdk/klingai`), read from the published package rather than
 * remembered.
 *
 * ── Why it is a task and not a call ──────────────────────────────────────
 *
 * Kling answers a generation request immediately with a task id and makes the
 * video afterwards; a ten-second clip takes minutes. So this starts a task and
 * returns, and the video is collected later by asking. Holding a request open
 * for five minutes would fail on the platform's own timeout and lose the work
 * that had already been paid for.
 *
 * Set either of these, and none of them may ever carry a NEXT_PUBLIC_ prefix:
 *
 *   KLINGAI_API_KEY                          the single key the console issues
 *   KLINGAI_ACCESS_KEY + KLINGAI_SECRET_KEY  the older pair
 *
 * Optional, with the defaults below: KLINGAI_BASE_URL, KLING_MODEL,
 * KLING_MONTHLY_CREDITS.
 */

const BASE = process.env.KLINGAI_BASE_URL || 'https://api-singapore.klingai.com';
const PATH = '/v1/videos/text2video';

/**
 * The model, and why this default rather than the cheaper one.
 *
 * v3 has **native audio**: a line in quotation marks in the prompt comes back
 * spoken, in the voice the scene implies, in the language it was written in.
 * That is the difference between a clip you have to score afterwards and one
 * that is finished — and it is the whole reason the panel teaches quotation
 * marks. On a model without it, a quoted line is silent and the guidance is a
 * lie, so the two move together or not at all.
 *
 * Set KLING_MODEL to move it. The names are Kling's own with the dots written
 * as hyphens: `kling-v3`, `kling-v2-5-turbo`, `kling-v2-1-master`, `kling-v1`.
 */
const MODEL = process.env.KLING_MODEL || 'kling-v3';

/**
 * Whether this model can speak, and therefore whether to ask it to.
 *
 * Sending `sound` to a model that has no native audio is at best ignored, so
 * this is a list rather than an always-on. `KLING_SOUND=off` turns it off
 * everywhere for anybody who wants silent footage to score themselves.
 */
function speaks(): boolean {
  if (process.env.KLING_SOUND === 'off') return false;
  if (process.env.KLING_SOUND === 'on') return true;
  return /^kling-v3\b/.test(MODEL);
}

import type { Progress, Provider, StartRequest, Started } from './types.ts';

function isConfigured(): boolean {
  if (process.env.KLINGAI_API_KEY?.trim()) return true;
  return Boolean(process.env.KLINGAI_ACCESS_KEY?.trim() && process.env.KLINGAI_SECRET_KEY?.trim());
}

/** Which of the two an account is using. Reported by the probe, so a setup
 *  that is half done says which half. */
export function scheme(): 'api-key' | 'signed' | 'none' {
  if (process.env.KLINGAI_API_KEY?.trim()) return 'api-key';
  if (process.env.KLINGAI_ACCESS_KEY?.trim() && process.env.KLINGAI_SECRET_KEY?.trim()) return 'signed';
  return 'none';
}

/**
 * What one generation costs Kling, in Kling's own credits.
 *
 * Their number, not ours: a member spends FutureBox credits, and this is what
 * the platform spends behind that. It is what the monthly ceiling is counted
 * in, because counting videos would let ten-second clips quietly cost twice
 * what the budget assumed.
 *
 * Approximate on purpose, and deliberately not optimistic: if Kling's price
 * moves, a ceiling that over-counts stops early and a ceiling that
 * under-counts overspends. Rounded up.
 *
 * These two numbers are a reading of Kling's pro-mode pricing, not something
 * this repository can verify — their price list is theirs to change and does
 * not come back on the API. Treat them as the shape of the ratio (ten seconds
 * costs twice five) rather than as the truth about a bill, and set
 * KLING_MONTHLY_CREDITS from the balance actually shown on the account.
 */
function klingCost(seconds: 5 | 10): number {
  return seconds === 10 ? 70 : 35;
}

/**
 * The month's allowance, in Kling credits.
 *
 * The default is deliberately small, and that is the whole design of it. A
 * ceiling set too high never fires, which means the first anybody knows about
 * the allowance running out is a member paying credits for a generation that
 * comes back as an engine error. A ceiling set too low stops early and says
 * why, which is a worse afternoon and not a worse month.
 *
 * So this is not a guess at anybody's package — it is a floor to set
 * deliberately. Read the balance on Kling's Resource Packages page and put it
 * in KLING_MONTHLY_CREDITS. Until you do, this app will make about fifteen
 * ten-second clips a month and then stop, politely.
 */
function monthlyCeiling(): number {
  const set = Number(process.env.KLING_MONTHLY_CREDITS);
  return Number.isFinite(set) && set > 0 ? set : 1_000;
}

const base64url = (text: string): string => Buffer.from(text, 'utf8').toString('base64url');

/**
 * The bearer token for one request.
 *
 * A single API key is already one and goes through untouched. A key pair has
 * to be turned into a JWT that lives half an hour: `nbf` is five seconds in
 * the past because the two clocks are not the same clock, and a token that is
 * not yet valid is rejected exactly as firmly as a forged one.
 */
async function token(): Promise<string> {
  const direct = process.env.KLINGAI_API_KEY?.trim();
  if (direct) return direct;

  const access = process.env.KLINGAI_ACCESS_KEY ?? '';
  const secret = process.env.KLINGAI_SECRET_KEY ?? '';
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: access, exp: now + 1800, nbf: now - 5 }));
  const signing = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signing));
  return `${signing}.${Buffer.from(signature).toString('base64url')}`;
}

interface Envelope {
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    task_status?: string;
    task_status_msg?: string;
    task_result?: { videos?: { url?: string }[] };
  };
}

async function call(path: string, init?: RequestInit): Promise<Envelope | null> {
  try {
    const response = await fetch(BASE + path, {
      ...init,
      headers: {
        Authorization: `Bearer ${await token()}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => null)) as Envelope | null;
    // Kling reports its own failures inside a 200 as often as with a status,
    // so both are read the same way: the envelope's code is the answer.
    if (!body) return null;
    return body;
  } catch {
    return null;
  }
}

async function startVideo(request: StartRequest): Promise<Started> {
  if (!isConfigured()) {
    return { ok: false, status: 503, message: 'The video engine is not switched on for this app yet.' };
  }

  const body = await call(PATH, {
    method: 'POST',
    body: JSON.stringify({
      model_name: MODEL,
      prompt: request.prompt.slice(0, 2500),
      // What we never want in a generated video, said once rather than left to
      // each member to remember.
      // Subtitles are excluded on purpose even with sound on: burnt-in text
      // cannot be translated, cannot be turned off, and is wrong the moment
      // the clip is cut.
      negative_prompt: 'text, watermark, logo, subtitles, captions, distorted faces, extra limbs',
      mode: 'pro',
      aspect_ratio: request.aspect,
      duration: String(request.seconds >= 10 ? 10 : 5),
      // Quoted lines in the prompt come back spoken. Only sent where the model
      // can do it — see `speaks()`.
      ...(speaks() ? { sound: 'on' } : {}),
    }),
  });

  if (!body) return { ok: false, status: 502, message: 'The video engine could not be reached.' };
  if (body.code !== 0 || !body.data?.task_id) {
    return {
      ok: false,
      status: 502,
      message: body.message ? `The video engine refused it: ${body.message}` : 'The video engine refused it.',
    };
  }
  return { ok: true, taskId: body.data.task_id };
}

async function checkVideo(taskId: string): Promise<Progress> {
  if (!isConfigured()) return { state: 'unknown', message: 'The video engine is not switched on.' };

  const body = await call(`${PATH}/${encodeURIComponent(taskId)}`);
  if (!body) return { state: 'unknown', message: 'The video engine could not be reached.' };
  if (body.code !== 0) {
    return { state: 'unknown', message: body.message ?? 'The video engine answered with an error.' };
  }

  const status = body.data?.task_status;
  if (status === 'succeed') {
    const url = body.data?.task_result?.videos?.[0]?.url;
    return url
      ? { state: 'done', url }
      : { state: 'failed', message: 'The engine finished but returned no video.' };
  }
  if (status === 'failed') {
    return { state: 'failed', message: body.data?.task_status_msg ?? 'The engine could not make that one.' };
  }
  // 'submitted' and 'processing', and anything they add later. Unknown states
  // are treated as still running rather than as failures: a wrong guess here
  // would refund a video that is about to arrive.
  return { state: 'running' };
}

/**
 * Kling, as a provider.
 *
 * Premium, and that is a measurement rather than a compliment: R33.48 a clip
 * against R2.62 for the cheapest engine on the shelf, from this project's own
 * invoices. It earns its place on native audio and motion, and it is the one
 * engine that must never be reached by a member who has not specifically paid
 * for it.
 */
export const kling: Provider = {
  id: 'kling',
  name: 'Kling',
  grade: 'premium',
  model: MODEL,
  configured: isConfigured,
  can: {
    seconds: [5, 10],
    aspects: ['16:9', '9:16', '1:1'],
    get speaks() {
      return speaks();
    },
    maxPromptChars: 2500,
  },
  ceiling: monthlyCeiling,
  cost: (seconds) => klingCost(seconds >= 10 ? 10 : 5),
  start: startVideo,
  check: checkVideo,
};

export const MODEL_NAME = MODEL;

/**
 * Kling AI, the video engine.
 *
 * Until now `generateVideo` threw and the studio drew a visualiser in the
 * browser instead, honestly labelled as one. That still exists and is still
 * free; this is the other thing — a hosted model that makes footage from a
 * sentence, on a plan that is paid for by the month.
 *
 * ── Authentication ───────────────────────────────────────────────────────
 *
 * Kling does not take a bearer key. It takes a JWT you sign yourself with your
 * secret key, valid for half an hour: HS256, `iss` is the access key, `nbf`
 * five seconds ago because clocks disagree. Signed per request with Web
 * Crypto, which is available in both runtimes and needs no dependency.
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
 * Two keys switch it on, and neither may ever carry a NEXT_PUBLIC_ prefix:
 *
 *   KLINGAI_ACCESS_KEY   from the Kling API console
 *   KLINGAI_SECRET_KEY   the same, and secret in the way the name says
 *
 * Optional, with the defaults below: KLINGAI_BASE_URL, KLING_MODEL,
 * KLING_MONTHLY_CREDITS.
 */

const BASE = process.env.KLINGAI_BASE_URL || 'https://api-singapore.klingai.com';
const PATH = '/v1/videos/text2video';

/**
 * The model, and the honest reason for the default.
 *
 * Turbo is the one whose cost per second makes a monthly plan stretch far
 * enough to be worth offering to members. Set KLING_MODEL to move it — the
 * names are Kling's own, with the dots written as hyphens.
 */
const MODEL = process.env.KLING_MODEL || 'kling-v2-5-turbo';

export type Aspect = '16:9' | '9:16' | '1:1';

export interface StartRequest {
  readonly prompt: string;
  readonly aspect: Aspect;
  /** Kling takes five or ten, and nothing between. */
  readonly seconds: 5 | 10;
}

export type Started =
  | { readonly ok: true; readonly taskId: string }
  | { readonly ok: false; readonly status: number; readonly message: string };

export type Progress =
  | { readonly state: 'running' }
  | { readonly state: 'done'; readonly url: string }
  | { readonly state: 'failed'; readonly message: string }
  | { readonly state: 'unknown'; readonly message: string };

export function configured(): boolean {
  return Boolean(process.env.KLINGAI_ACCESS_KEY && process.env.KLINGAI_SECRET_KEY);
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
 */
export function klingCost(seconds: 5 | 10): number {
  return seconds === 10 ? 70 : 35;
}

/** The month's allowance, in Kling credits. The Ultra plan is 26 000. */
export function monthlyCeiling(): number {
  const set = Number(process.env.KLING_MONTHLY_CREDITS);
  return Number.isFinite(set) && set > 0 ? set : 26_000;
}

const base64url = (text: string): string => Buffer.from(text, 'utf8').toString('base64url');

/**
 * A token that lives for half an hour, signed here.
 *
 * `nbf` is five seconds in the past because the two clocks are not the same
 * clock, and a token that is not yet valid is rejected exactly as firmly as a
 * forged one.
 */
async function token(): Promise<string> {
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

export async function startVideo(request: StartRequest): Promise<Started> {
  if (!configured()) {
    return { ok: false, status: 503, message: 'The video engine is not switched on for this app yet.' };
  }

  const body = await call(PATH, {
    method: 'POST',
    body: JSON.stringify({
      model_name: MODEL,
      prompt: request.prompt.slice(0, 2500),
      // What we never want in a generated video, said once rather than left to
      // each member to remember.
      negative_prompt: 'text, watermark, logo, subtitles, distorted faces, extra limbs',
      mode: 'pro',
      aspect_ratio: request.aspect,
      duration: String(request.seconds),
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

export async function checkVideo(taskId: string): Promise<Progress> {
  if (!configured()) return { state: 'unknown', message: 'The video engine is not switched on.' };

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

export const MODEL_NAME = MODEL;

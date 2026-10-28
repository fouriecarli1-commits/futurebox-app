/**
 * fal.ai, for what the phone cannot do on its own: the Video Editor's two
 * engine presses (a clip's background out, an item out of it), and the
 * makes in `lib/makes.ts` (a sticker pulled out of a photo, a photo woken
 * up, a picture made into a 3D model).
 *
 * Switched on 27 October 2026, after the owner's account and billing were in
 * place. Everything this file does is decided in `docs/FAL-TERME.md`; the
 * points that shape the code:
 *
 *  - **The key stays here.** `FAL_KEY` is read on the server and never sent
 *    to a phone (API terms, section 2).
 *  - **Nothing is kept there.** Every request carries `X-Fal-Store-IO: 0`,
 *    so fal.ai does not store the request and its answer for its dashboard
 *    (30 days otherwise), and an object lifecycle of one hour, so the
 *    finished clip on their CDN deletes itself after an hour. The member's
 *    own clip is never uploaded to fal.ai's CDN at all: fal.ai reads it from
 *    a link to our own storage that lasts fifteen minutes, and the route
 *    deletes our copy when the job ends. This is the deletion answer the DPA
 *    left open (fal.ai docs: data retention, media expiration).
 *  - **Models fal.ai runs itself.** A partner model sends the clip on to
 *    another company (API terms, section 2). `veed/...` is a partner model,
 *    so the background is taken out by `fal-ai/ben/v2/video` instead.
 *  - **No retries on their side.** A job is charged once; `X-Fal-No-Retry`
 *    keeps fal.ai from running it a second time behind our back.
 *
 * The models' input fields are written from their published pages, which
 * cannot be opened from the build machine. `inputFor` is the one place they
 * live, so the first real job that is refused for a field name is a
 * one-line change.
 */

export type FalJob = 'cutout' | 'erase';

/** fal.ai's own models only. See the note above on partner models. */
export const FAL_MODELS: Readonly<Record<FalJob, string>> = {
  cutout: 'fal-ai/ben/v2/video',
  erase: 'fal-ai/void-video-inpainting',
};

/** How long fal.ai may keep the finished clip on its CDN. */
export const FAL_KEEP_SECONDS = 3600;

const QUEUE = 'https://queue.fal.run';
/** The same models answered in the one call, for the quick ones. */
const NOW = 'https://fal.run';
/** How long a quick model may take before it is given up on. */
const NOW_WAIT_MS = 50_000;

/**
 * The key as fal issued it. A key pasted into Vercel can carry a line break
 * or a space from the copy (the owner, 28 October 2026: Vercel warned "this
 * key has return characters"), and a line break in a header makes the call
 * fail before it leaves. No fal key has whitespace in it, so all of it goes.
 */
const falKey = (): string => (process.env.FAL_KEY ?? '').replace(/\s+/g, '');

export function falReady(): boolean {
  return Boolean(falKey());
}

function headers(): Record<string, string> {
  return {
    Authorization: `Key ${falKey()}`,
    'Content-Type': 'application/json',
    'X-Fal-Store-IO': '0',
    'X-Fal-No-Retry': '1',
    'X-Fal-Object-Lifecycle-Preference': JSON.stringify({ expiration_duration_seconds: FAL_KEEP_SECONDS }),
  };
}

/** What each model is sent. `words` is what the member typed to take out. */
export function inputFor(job: FalJob, videoUrl: string, words: string): Record<string, unknown> {
  /* webm, because an mp4 has no see-through and the background comes back
     black (docs/FAL-SKEMAS.md). */
  if (job === 'cutout') return { video_url: videoUrl, output_format: 'webm' };
  return {
    video_url: videoUrl,
    mask_prompt: words,
    prompt: `the same scene, with no ${words} in it`,
    /* The most frames it works on: about eight seconds. Left at its default
       of 85 it gives back three seconds of a longer clip. */
    num_frames: ERASE_FRAMES,
  };
}

/** The window VOID works on, at most; see `ERASE_MOST_SECONDS`. */
export const ERASE_FRAMES = 197;

export interface Submitted {
  readonly id: string;
  readonly status: string;
  readonly result: string;
}

/** A link that is fal.ai's own queue, and nothing else. */
function isQueueLink(link: unknown): link is string {
  return typeof link === 'string' && link.startsWith(`${QUEUE}/`);
}

/** Put a job in fal.ai's queue. Null when it would not take it. */
export async function falSubmit(job: FalJob, input: Record<string, unknown>): Promise<Submitted | { error: string }> {
  return falQueue(FAL_MODELS[job], input);
}

/** Any model into the queue: the slow ones (video, 3D). */
export async function falQueue(model: string, input: Record<string, unknown>): Promise<Submitted | { error: string }> {
  try {
    const answer = await fetch(`${QUEUE}/${model}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(input),
    });
    const got = await answer.json().catch(() => ({})) as { request_id?: string; status_url?: string; response_url?: string; detail?: unknown };
    if (!answer.ok || !got.request_id || !isQueueLink(got.status_url) || !isQueueLink(got.response_url)) {
      return { error: `fal.ai answered ${answer.status}${got.detail ? `: ${JSON.stringify(got.detail).slice(0, 200)}` : ''}` };
    }
    return { id: got.request_id, status: got.status_url, result: got.response_url };
  } catch (problem) {
    return { error: String(problem).slice(0, 200) };
  }
}

export type Progress =
  | { readonly state: 'waiting' }
  | { readonly state: 'done'; readonly url: string }
  | { readonly state: 'failed'; readonly refused: boolean; readonly why: string };

/** The finished clip's address in whatever shape the model answers with. */
export function videoUrlOf(result: unknown): string | null {
  const row = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const pick = (value: unknown): string | null => {
    if (typeof value === 'string' && /^https:\/\//.test(value)) return value;
    if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') return pick((value as { url: string }).url);
    return null;
  };
  return pick(row.video)
    ?? pick(row.video_url)
    ?? (Array.isArray(row.videos) ? pick(row.videos[0]) : null)
    ?? pick((row.output as Record<string, unknown> | undefined)?.video)
    ?? null;
}

/**
 * A refusal by fal.ai's own moderation, told apart from a fault. Their docs
 * answer a policy stop with a 4xx whose detail names the content policy;
 * read loosely on purpose, because it is the member who pays for a fault
 * being called a refusal (no strike) or the other way round (a refund).
 */
function isRefusal(status: number, text: string): boolean {
  return status >= 400 && status < 500 && /content[_\s-]?(policy|moderation|safety)|nsfw|not allowed|flagged/i.test(text);
}

export type Ran =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly refused: boolean; readonly why: string };

/**
 * A quick model answered in the one call: a cut-out, a depth map, a fill.
 * Asked with `sync_mode` where the model has it, so the answer comes back
 * as a data URI and nothing is left on fal.ai's CDN at all.
 */
export async function falNow(model: string, input: Record<string, unknown>): Promise<Ran> {
  try {
    const answer = await fetch(`${NOW}/${model}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(NOW_WAIT_MS),
    });
    const text = await answer.text();
    if (!answer.ok) {
      return { ok: false, refused: isRefusal(answer.status, text), why: `fal.ai answered ${answer.status}: ${text.slice(0, 200)}` };
    }
    let data: unknown = null;
    try { data = JSON.parse(text); } catch { return { ok: false, refused: false, why: 'fal.ai answered with something that is not JSON' }; }
    /* A picture model that flags its own result has refused it, whatever
       the status said. */
    const flags = (data as { has_nsfw_concepts?: unknown }).has_nsfw_concepts;
    if (Array.isArray(flags) && flags.some(Boolean)) return { ok: false, refused: true, why: 'fal.ai flagged its own result' };
    return { ok: true, data };
  } catch (problem) {
    return { ok: false, refused: false, why: String(problem).slice(0, 200) };
  }
}

/**
 * The mask in an answer that finds a thing. `fal-ai/sam-3/image` answers
 * with `masks` (what was found) AND `image` (a preview: the photo with the
 * find painted over it). `fileUrlOf` takes `image` first, which for a
 * sticker is the whole photo again: the sticker then covered the photo
 * with a copy of itself, and it looked as though nothing had happened
 * (the owner, 27 October 2026: *"Niks gebeur met peel it off nie"*).
 */
export function maskUrlOf(result: unknown): string | null {
  const row = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const masks = row.masks;
  if (Array.isArray(masks)) {
    for (const one of masks) {
      const url = typeof one === 'string' ? one : one && typeof one === 'object' ? (one as { url?: unknown }).url : null;
      if (typeof url === 'string' && /^(https:\/\/|data:)/.test(url)) return url;
    }
    return null;
  }
  return fileUrlOf({ mask_image: row.mask_image });
}

/** Every mask in an answer, for a call that asked for everything. */
export function maskUrlsOf(result: unknown): string[] {
  const row = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const masks = Array.isArray(row.masks) ? row.masks : [];
  return masks
    .map((one) => (typeof one === 'string' ? one : one && typeof one === 'object' ? (one as { url?: unknown }).url : null))
    .filter((url): url is string => typeof url === 'string' && /^(https:\/\/|data:)/.test(url));
}

/** The first file address in an answer, whatever the model calls it. */
export function fileUrlOf(result: unknown): string | null {
  const row = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  const pick = (value: unknown): string | null => {
    if (typeof value === 'string' && /^(https:\/\/|data:)/.test(value)) return value;
    if (value && typeof value === 'object' && typeof (value as { url?: unknown }).url === 'string') return pick((value as { url: string }).url);
    return null;
  };
  for (const key of ['model_glb', 'video', 'image', 'mask_image']) {
    const found = pick(row[key]);
    if (found) return found;
  }
  for (const key of ['masks', 'images', 'videos']) {
    const list = row[key];
    if (Array.isArray(list) && list.length) {
      const found = pick(list[0]);
      if (found) return found;
    }
  }
  return null;
}

/** Where a job is. Only ever called with links `falSubmit` handed back. */
export async function falProgress(status: string, result: string): Promise<Progress> {
  if (!isQueueLink(status) || !isQueueLink(result)) return { state: 'failed', refused: false, why: 'not a fal.ai job' };
  try {
    const now = await fetch(status, { headers: headers() });
    const said = await now.json().catch(() => ({})) as { status?: string };
    if (now.ok && said.status !== 'COMPLETED') return { state: 'waiting' };
    const answer = await fetch(result, { headers: headers() });
    const text = await answer.text();
    if (!answer.ok) {
      return { state: 'failed', refused: isRefusal(answer.status, text), why: `fal.ai answered ${answer.status}: ${text.slice(0, 200)}` };
    }
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* falls through to "no clip" */ }
    const url = videoUrlOf(parsed) ?? fileUrlOf(parsed);
    return url ? { state: 'done', url } : { state: 'failed', refused: false, why: 'fal.ai finished without a file' };
  } catch (problem) {
    return { state: 'failed', refused: false, why: String(problem).slice(0, 200) };
  }
}

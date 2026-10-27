/**
 * fal.ai, for the two things the Video Editor cannot do on the device:
 * taking a clip's background out, and taking an item out of it.
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

export function falReady(): boolean {
  return Boolean(process.env.FAL_KEY);
}

function headers(): Record<string, string> {
  return {
    Authorization: `Key ${process.env.FAL_KEY ?? ''}`,
    'Content-Type': 'application/json',
    'X-Fal-Store-IO': '0',
    'X-Fal-No-Retry': '1',
    'X-Fal-Object-Lifecycle-Preference': JSON.stringify({ expiration_duration_seconds: FAL_KEEP_SECONDS }),
  };
}

/** What each model is sent. `words` is what the member typed to take out. */
export function inputFor(job: FalJob, videoUrl: string, words: string): Record<string, unknown> {
  if (job === 'cutout') return { video_url: videoUrl };
  return {
    video_url: videoUrl,
    mask_prompt: words,
    prompt: `the same scene, with no ${words} in it`,
  };
}

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
  try {
    const answer = await fetch(`${QUEUE}/${FAL_MODELS[job]}`, {
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
    const url = videoUrlOf(parsed);
    return url ? { state: 'done', url } : { state: 'failed', refused: false, why: 'fal.ai finished without a clip' };
  } catch (problem) {
    return { state: 'failed', refused: false, why: String(problem).slice(0, 200) };
  }
}

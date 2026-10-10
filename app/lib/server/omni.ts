/**
 * Gemini Omni Flash: the one Google model that can CHANGE a video.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 9 October 2026, pasted a Gemini conversation naming it. I said I
 * could not verify the name from here — this machine cannot reach Google's
 * consoles and a model name out of a chat is not evidence — and asked for
 * her own page.
 *
 * On 10 October she pasted the page: the capability list, the endpoint, the
 * request body and a complete response. So everything below is MEASURED off
 * her own documentation rather than guessed, which is the difference between
 * this file and the first version of the Lyria one.
 *
 * ── What it does that nothing in this app can ────────────────────────────
 *
 * Her page lists four, and the fourth is the one that matters:
 *
 *   · Text-to-Video — Veo already does this, better and cheaper per second.
 *   · Image-to-Video — Veo does this too, as a start frame.
 *   · Reference-to-Video — several inputs, which is new.
 *   · **Video Editing — modify an original or previously generated video.**
 *
 * The cutting room cuts, trims, captions and overlays. It cannot change what
 * is IN a clip. "Make it evening", "take the car out", "make her turn round"
 * are all impossible today at any price, and this is the only engine on her
 * account that offers them.
 *
 * Coming soon on the same page, and worth knowing before anybody designs
 * around their absence: Video Extension — make a clip longer — and Video
 * Upscaling.
 *
 * ── It is the SAME api Lyria 3 Pro is on, which is lucky ─────────────────
 *
 *   POST https://aiplatform.googleapis.com/v1beta1/projects/{project}
 *        /locations/global/interactions
 *   { "model": "gemini-omni-flash-preview",
 *     "input": [ { "type": "text", "text": "…" } ] }
 *
 * `interactionsAddress()` already builds that address and `lyria.ts` already
 * posts that body, because the song engine is on the same endpoint. A week
 * went into working out that `interactions` is not the publisher API; none
 * of it has to be repeated.
 *
 * ── Two shapes on one API, which is why the reader is careful ────────────
 *
 * Lyria answers with `outputs: [ {type:'text'}, {type:'audio', data} ]`.
 * This one answers with `steps: [ {type:'thought'}, {type:'model_output',
 * content:[ {type:'video', data, mime_type} ] } ]`.
 *
 * Same endpoint, same verb, different envelope. So the reader takes both
 * rather than assuming either: a paid video on the floor because the field
 * was somewhere else is the failure `check:veo` and `check:prent` were both
 * written after.
 *
 * ── What is NOT settled, and why nothing is charged yet ──────────────────
 *
 * **The price.** Her response carries `usage.total_thought_tokens: 453`
 * against `total_input_tokens: 26` — so this model THINKS, and the thinking
 * is the bulk of the bill. It is priced per token, not per second like Veo,
 * which means `lib/server/googlespend.ts` cannot hold a ceiling for it until
 * somebody reads the real rate off the pricing page. This app's rule is that
 * an unread price is taken at the expensive end; a guess at a per-token rate
 * for VIDEO could be out by a factor of a hundred in either direction, and
 * that is not a guess worth writing down.
 *
 * So this file reads and reports. It is wired into the setup page's probe,
 * so one press on her own account says whether the model answers. It is not
 * offered as an engine and nothing can be charged through it until the rate
 * is in `docs/OPEN-QUESTIONS.md` with a source beside it.
 *
 * **Whether it can be slow.** The response carries `status: "completed"`,
 * which only has a reason to exist if it can also say something else. Veo is
 * a long-running job polled by name; this came back complete in one call. A
 * synchronous call that takes four minutes does not fit in a serverless
 * function, so `isWaiting` below is here for the day a reply arrives that is
 * not finished — rather than for it to be discovered by a timeout.
 *
 * **The input shape for the other three capabilities.** Her page gives the
 * text-only body. Image-to-video, reference-to-video and editing presumably
 * add rows to `input` with a type of their own, and presumably carry `data`
 * and `mime_type` the way the response does. `inputFor` below writes them
 * that way and says that it is an assumption.
 */

import { interactionsAddress } from './google';

/**
 * The model, exactly as her page spells it.
 *
 * Not `gemini-omni-flash-1.1`, which is what the Gemini conversation called
 * it on the 9th. A name off a chat and a name off the documentation differed
 * by a version number, and the documentation is the one that answers.
 */
export const OMNI_MODEL = 'gemini-omni-flash-preview';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? value as Record<string, unknown> : null;

/** Where the video was found, so the guessing stops after the first one. */
export let foundUnder: string | null = null;

export interface Found {
  readonly base64: string;
  readonly mime: string;
  readonly under: string;
}

/**
 * The video out of whatever shape the answer takes.
 *
 * Exported so a check can drive it with no network at all, which is the only
 * way the reader gets tested before her money is on the line.
 */
export function videoIn(body: unknown): Found | null {
  const top = asRecord(body);
  if (!top) return null;

  /* ── Her own documented shape ───────────────────────────────────────

     steps[] → the row whose type is `model_output` → content[] → the row
     whose type is `video`. Picked by TYPE and not by length: a thought
     summary is a long string too, and a reader that took the longest field
     would hand somebody an .mp4 full of the model's reasoning. */
  const steps = Array.isArray(top.steps) ? top.steps : [];
  for (const [at, step] of steps.entries()) {
    const row = asRecord(step);
    const content = Array.isArray(row?.content) ? row!.content : [];
    for (const [where, part] of content.entries()) {
      const one = asRecord(part);
      if (!one || one.type !== 'video') continue;
      const data = one.data;
      if (typeof data !== 'string' || data.length < 512) continue;
      const mime = one.mime_type ?? one.mimeType;
      return {
        base64: data,
        mime: typeof mime === 'string' && mime ? mime : 'video/mp4',
        under: `steps[${at}].content[${where}].data`,
      };
    }
  }

  /* ── And Lyria's shape, on the same endpoint ────────────────────────

     `outputs: [ … {type:'video', data} ]`. The song engine answers in this
     one and both are the `interactions` API, so a video arriving in it is
     not a surprise worth throwing a paid clip away over. */
  const outputs = Array.isArray(top.outputs) ? top.outputs : [];
  for (const [at, part] of outputs.entries()) {
    const one = asRecord(part);
    if (!one || one.type !== 'video') continue;
    const data = one.data;
    if (typeof data !== 'string' || data.length < 512) continue;
    const mime = one.mime_type ?? one.mimeType;
    return {
      base64: data,
      mime: typeof mime === 'string' && mime ? mime : 'video/mp4',
      under: `outputs[${at}].data`,
    };
  }

  return null;
}

/**
 * Anything it said in words, which is sometimes the refusal.
 *
 * A safety block on this API comes back as a finished interaction with
 * thoughts and no video. Reporting that as "the video was not where this app
 * looked for it" would send somebody hunting a field-name bug that is not
 * there — the same mistake `picture.ts` has a note about.
 *
 * Both the thought summaries and any plain text in the output, because a
 * refusal could be in either and neither is the place a video is.
 */
export function wordsIn(body: unknown): string[] {
  const top = asRecord(body);
  const out: string[] = [];
  const steps = Array.isArray(top?.steps) ? top!.steps : [];
  for (const step of steps) {
    const row = asRecord(step);
    for (const key of ['summary', 'content']) {
      const list = Array.isArray(row?.[key]) ? row![key] as unknown[] : [];
      for (const part of list) {
        const one = asRecord(part);
        const said = one?.text;
        if (typeof said === 'string' && said.trim()) out.push(said.trim());
      }
    }
  }
  const outputs = Array.isArray(top?.outputs) ? top!.outputs : [];
  for (const part of outputs) {
    const one = asRecord(part);
    if (one?.type !== 'text') continue;
    const said = one.text;
    if (typeof said === 'string' && said.trim()) out.push(said.trim());
  }
  return out;
}

/**
 * Whether the answer is still being worked on.
 *
 * `status: "completed"` is in her response, and a field that says completed
 * only has a reason to exist if it can say something else. Veo is a job
 * polled by name; this one came back whole. A reply that is NOT finished is
 * the case nobody has seen, so it is named here and reported as itself
 * rather than read as a missing video.
 */
export function isWaiting(body: unknown): boolean {
  const status = asRecord(body)?.status;
  return typeof status === 'string' && status !== 'completed' && status !== 'failed';
}

export interface Spent {
  readonly total: number;
  readonly input: number;
  readonly output: number;
  /** The thinking, which in her own sample was 95% of the bill. */
  readonly thought: number;
}

/**
 * What the call used, in tokens.
 *
 * Read and written down on every call, because this is the engine whose
 * price nobody has yet. Her sample: 26 in, 0 out, **453 thought**, 479
 * total. So the thinking is the bill, and a cost model built on input length
 * would be wrong by a factor of eighteen.
 *
 * Numbers are taken as they come and clamped at zero. A usage block that is
 * missing is zeros rather than a throw: the video is already in hand by the
 * time this is read, and bookkeeping must not lose it.
 */
export function spentOn(body: unknown): Spent {
  const usage = asRecord(asRecord(body)?.usage);
  const num = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  return {
    total: num(usage?.total_tokens ?? usage?.totalTokens),
    input: num(usage?.total_input_tokens ?? usage?.totalInputTokens),
    output: num(usage?.total_output_tokens ?? usage?.totalOutputTokens),
    thought: num(usage?.total_thought_tokens ?? usage?.totalThoughtTokens),
  };
}

/** A picture or a clip going in: base64 without the `data:` preamble. */
export interface Given {
  readonly kind: 'image' | 'video';
  readonly data: string;
  readonly mime: string;
}

/**
 * The `input` array for a request.
 *
 * ── The text row is documented; the others are an assumption ─────────────
 *
 * Her page gives exactly one body, and it is text only:
 *
 *   "input": [ { "type": "text", "text": "TEXT_PROMPT" } ]
 *
 * Image-to-video, reference-to-video and editing must add rows, and the
 * obvious shape is the one the RESPONSE uses for a video — a `type`, a
 * `data` and a `mime_type`. That is what this writes, and it is written down
 * as a guess rather than presented as read, because the last time this app
 * guessed a field name on a Google API it cost a week of 404s.
 *
 * The text goes LAST, after whatever it is about, for the reason
 * `picture.ts` gives: a model reads a turn in order, and an instruction that
 * arrives before the thing it is about is an instruction about nothing.
 */
export function inputFor(words: string, from: readonly Given[] = []): unknown[] {
  return [
    ...from.map((one) => ({ type: one.kind, data: one.data, mime_type: one.mime })),
    { type: 'text', text: words },
  ];
}

/**
 * The address and body a call would use.
 *
 * Exported and separate from any sending, so a check can assert the shape
 * without a key and without a network — and so the probe on the setup page
 * and any future route cannot drift apart.
 */
export function requestFor(words: string, from: readonly Given[] = []): {
  where: string;
  body: string;
} {
  return {
    where: interactionsAddress(),
    body: JSON.stringify({ model: OMNI_MODEL, input: inputFor(words, from) }),
  };
}

export type Answered =
  | { readonly ok: true; readonly video: Buffer; readonly type: string; readonly under: string; readonly spent: Spent }
  | { readonly ok: false; readonly status: number; readonly message: string };

/**
 * Ask it for a video.
 *
 * ── Why nothing calls this yet ───────────────────────────────────────────
 *
 * Because the price is unknown, and this app does not run an engine it
 * cannot put a ceiling under — `lib/server/googlespend.ts` is the whole
 * argument. It is written now, beside the documentation it was written from,
 * because the expensive part of adding an engine is the reader and the
 * reader can be settled today.
 */
export async function askOmni(
  words: string,
  from: readonly Given[] = [],
): Promise<Answered> {
  const asked = requestFor(words, from);
  let answer: Response;
  try {
    answer = await fetch(asked.where, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_VERTEX_KEY ?? '',
      },
      body: asked.body,
    });
  } catch {
    return { ok: false, status: 502, message: 'The video engine could not be reached.' };
  }

  const text = await answer.text().catch(() => '');
  if (!answer.ok) {
    /* Google's own words. A sentence invented here would hide the one thing
       worth seeing, which is what they actually objected to. */
    return {
      ok: false,
      status: answer.status,
      message: text.slice(0, 300) || `The video engine answered ${answer.status}.`,
    };
  }

  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }

  if (isWaiting(body)) {
    /* The case nobody has seen, reported as itself. A reply that is not
       finished read as a missing video would send somebody looking for a
       field-name bug in a reader that is working. */
    return {
      ok: false,
      status: 202,
      message: 'The video engine is still working on it. This app has never seen'
        + ' that answer from this model and has nowhere to wait — the reply shape'
        + ' needs reading before it can be handled.',
    };
  }

  const got = videoIn(body);
  if (!got) {
    const said = wordsIn(body);
    return {
      ok: false,
      status: 502,
      message: said.length
        ? `The engine answered in words instead of a video: ${said.join(' ').slice(0, 300)}`
        : 'The engine finished but the video was not where this app looked for'
          + ` it. The answer began: ${text.slice(0, 200)}`,
    };
  }
  foundUnder = got.under;
  return {
    ok: true,
    video: Buffer.from(got.base64, 'base64'),
    type: got.mime,
    under: got.under,
    spent: spentOn(body),
  };
}

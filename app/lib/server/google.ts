/**
 * Google's engines: where they are, and what we are allowed to assume.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Lyria writes and sings; Veo makes video. Both are Vertex AI, which means
 * both are one project, one bill and one key — see `docs/GOOGLE-OPSTEL.md`
 * for how that project was set up and why the spend cap came first.
 *
 * ── The one thing here that was measured rather than read ────────────────
 *
 * On 8 October 2026, from the machine this app is written on:
 *
 *   POST https://us-central1-aiplatform.googleapis.com/v1/projects/x
 *        /locations/us-central1/publishers/google/models/lyria-002:predict
 *   → 401
 *
 * **401, not 404.** The address exists and the path is shaped correctly; the
 * only thing missing was a key. That is worth more than any documentation
 * page, because it rules out the failure that wastes a day: a URL built
 * wrong, answering 404, and read as "the model is not available to us".
 *
 * The regional host matters. `aiplatform.googleapis.com` without the region
 * in front answered 404 for the same path.
 */

/** The key. Never `NEXT_PUBLIC_` — `check:security` scans for exactly that. */
const key = (): string => process.env.GOOGLE_VERTEX_KEY ?? '';

/** Her Cloud project. The engines bill to this, and so does the spend cap. */
export const project = (): string => process.env.GOOGLE_PROJECT ?? '';

/**
 * Where the models are served from.
 *
 * Part of the URL rather than a parameter, so a region that is wrong fails
 * as a bad address rather than as a model that does not exist.
 */
export const region = (): string => process.env.GOOGLE_REGION || 'us-central1';

/** Whether this app has what it needs to call Google at all. */
export const configured = (): boolean => !!key() && !!project();

/**
 * The address of one model, and the verb it answers to.
 *
 * ── Why the verb is per model ──────────────────────────────────
 *
 * They genuinely differ, and getting one wrong looks exactly like the model
 * not existing. Lyria takes `:predict`. Veo takes `:predictLongRunning`,
 * because a video is a job rather than an answer. Nano Banana is a Gemini
 * model and takes `:generateContent`.
 *
 * A probe that asked all of them to `:predict` would report 404 for most of
 * the list and send somebody to Model Garden looking for models that were
 * there all along — the same fault the regional host prevents, one level
 * down.
 *
 * Exported so `check:google` can read it without a key and without a
 * network — the shape is the part that can be got wrong silently.
 */
export const addressOf = (model: string, verb = 'predict'): string =>
  `https://${region()}-aiplatform.googleapis.com/v1/projects/${project()}`
  + `/locations/${region()}/publishers/google/models/${model}:${verb}`;

/**
 * The models, and how sure we are of each name.
 *
 * ── Why this is a list and not a constant ────────────────────────────────
 *
 * The sources disagree. Google's own Lyria page documents `lyria-002`;
 * newer pages show `lyria-3-pro-preview`. Picking one and hard-coding it
 * means a 404 on her account and an afternoon working out whether the model,
 * the region or the URL was wrong.
 *
 * So both are named, `/api/google/setup` asks which of them answers, and the
 * answer replaces the guess. The same shape `lib/server/kits.ts` used to
 * find out what Kits really had, for the same reason: arpeggi.io could not
 * be reached from here either.
 */
export const MODELS = [
  { id: 'lyria-002', what: 'music', verb: 'predict', note: 'Documented on Google’s own Lyria page. 32.8-second clips, base64 WAV back.' },
  { id: 'lyria-3-pro-preview', what: 'music', verb: 'predict', note: 'Shown on newer pages. Preview, so it may not be on every account. Its documented RESPONSE looks like a Gemini one, so if predict 404s this may want generateContent.' },
  { id: 'veo-3.1-generate-001', what: 'video', verb: 'predictLongRunning', note: 'The full one. $0.20 a second video-only, if the published rate holds.' },
  { id: 'veo-3.1-fast-generate-001', what: 'video', verb: 'predictLongRunning', note: 'The cheap one, and the one worth trying first.' },
  /* ── Nano Banana, where the names are worst ────────────────────

     Carli, 8 October 2026: *"Ek dink ons moet dan lyria, nano banana en veo
     gebruik."*

     Four candidates for one model, because on the day she asked the sources
     contradicted each other about every one of them: Google's own Vertex
     page lists `gemini-3-pro-image-preview`, a guide says the `-preview`
     ids were withdrawn in July 2026 and the GA name is `gemini-3-pro-image`,
     and the original Nano Banana (`gemini-2.5-flash-image`) has two
     different shutdown dates on two Google pages — one of them six days
     ago. Nothing here is worth betting an afternoon on. The probe asks. */
  { id: 'gemini-3-pro-image', what: 'image', verb: 'generateContent', note: 'Nano Banana Pro, the general-availability name per a third-party guide. Unconfirmed on a Google page.' },
  { id: 'gemini-3-pro-image-preview', what: 'image', verb: 'generateContent', note: 'Nano Banana Pro as Google’s own Vertex page lists it. Possibly withdrawn with the other -preview ids.' },
  { id: 'gemini-2.5-flash-image', what: 'image', verb: 'generateContent', note: 'The original Nano Banana. Two Google pages give two shutdown dates, one of which has already passed.' },
  { id: 'gemini-3.1-flash-image', what: 'image', verb: 'generateContent', note: 'Named as the replacement for the above. Id unverified anywhere official.' },
] as const;

export interface Reached {
  readonly model: string;
  readonly what: string;
  readonly status: number;
  readonly answer: 'yes' | 'no' | 'not-allowed' | 'unclear';
  readonly note: string;
}

/**
 * Whether a model answers, asked with a body it must refuse.
 *
 * Deliberately empty. A model that takes a POST and rejects this on its
 * CONTENTS is a model that is there and allowed — and nothing is generated,
 * so nothing is billed. A 404 is the model not being on this account or in
 * this region, and the two have to stay different answers.
 */
export async function reach(model: string): Promise<Reached> {
  const spec = MODELS.find((one) => one.id === model);
  const what = spec?.what ?? 'unknown';
  if (!configured()) {
    return { model, what, status: 0, answer: 'unclear', note: 'No key or no project set.' };
  }
  let response: Response;
  try {
    response = await fetch(addressOf(model, spec?.verb ?? 'predict'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
      body: '{}',
    });
  } catch {
    return { model, what, status: 0, answer: 'unclear', note: 'Could not be reached at all.' };
  }
  const answer = response.status === 400 || response.status === 422
    ? 'yes' as const
    : response.status === 404
      ? 'no' as const
      : response.status === 401 || response.status === 403
        ? 'not-allowed' as const
        : 'unclear' as const;
  const note = answer === 'yes'
    ? 'There, allowed, and refused an empty body on its contents. Use this id.'
    : answer === 'no'
      ? 'Not on this account or not in this region. Try the other id, or another region.'
      : answer === 'not-allowed'
        ? 'The address is there and this key may not use it: a key restriction, a missing role, or a model that needs access requesting.'
        : `Neither a refusal nor an acceptance: ${response.status}.`;
  /* A 2xx would mean something was GENERATED from an empty body, which should
     be impossible and would be a charge nobody asked for. Said loudly rather
     than folded into "unclear". */
  return {
    model,
    what,
    status: response.status,
    answer,
    note: response.status >= 200 && response.status < 300
      ? `UNEXPECTED: an empty body was ACCEPTED (${response.status}). Check the billing page — something may have been generated.`
      : note,
  };
}

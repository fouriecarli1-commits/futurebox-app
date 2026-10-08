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

/**
 * The ids that actually answered on her project, measured 8 October 2026.
 *
 * ── The reading ──────────────────────────────────────────────────────────
 *
 * `/api/google/setup` against `psyched-choir-433408-h0` in `us-central1`:
 *
 *   lyria-002                   400  there
 *   lyria-3-pro-preview         400  there
 *   veo-3.1-generate-001        400  there
 *   veo-3.1-fast-generate-001   400  there
 *   gemini-2.5-flash-image      400  there
 *   gemini-3-pro-image          404
 *   gemini-3-pro-image-preview  404
 *   gemini-3.1-flash-image      404
 *
 * So every guess above is now a fact, and three of them were wrong — which
 * is three afternoons the probe did not cost.
 *
 * ── The one that comes with a clock ──────────────────────────────────────
 *
 * **Nano Banana Pro is not on this account.** All three of its candidate
 * names answered 404. The only image model that works is the ORIGINAL Nano
 * Banana — and that is the one whose shutdown date two Google pages
 * disagree about: 2 October 2026 on the Gemini API, 15 March 2027 on
 * Vertex. The first of those has already passed, and it still answered 400
 * here, so Vertex's date is the one that governs.
 *
 * That is a real dependency with a published end, not a hypothetical. The
 * pictures will have to move before March 2027, and the move is a one-line
 * change here IF the probe is re-run from time to time — which is the
 * argument for keeping `/google` rather than deleting it once it has been
 * used once.
 */
export const CHOSEN = {
  /* ── Corrected 8 October 2026, before it shipped ──────────────────────

     This said `lyria-002`, chosen because it is "the documented one". That
     was picking a name without asking what it DOES.

     `lyria-002` is Lyria 2: **instrumental only, and thirty seconds.**
     Google's own model page says so — "30-second WAV clips, 48 kHz,
     instrumental only", a 32.8-second ceiling, and the modality listed as
     text-to-music (instrumental only).

     This app makes SUNG songs of about two minutes. So lyria-002 could not
     have made one, and the first real press would have come back as half a
     minute of backing track with nobody singing — which is exactly the
     fault `musicplan.ts` already has a long note about, arriving by a new
     door.

     Lyria 3 Pro sings, carries lyrics, and goes to about three minutes.
     That is the song engine. Preview, and worth the preview.

     Said plainly because I got Lyria wrong in the other direction earlier
     in the same week — I read eight instrumental code examples and
     concluded the model could not sing, and Carli corrected me. Examples
     show what a vendor chose to show. A model page says what a model is. */
  music: 'lyria-3-pro-preview',
  /* And the one that was almost the default has a real job: thirty seconds
     of instrumental is a BED, which is what goes under a video. */
  bed: 'lyria-002',
  /* The fast one first, deliberately: $0.08 a second against $0.20, and the
     margin on video is one cent. */
  video: 'veo-3.1-fast-generate-001',
  /* Not a choice. It is the only one of four that answered. */
  image: 'gemini-2.5-flash-image',
} as const;

/**
 * What one call costs us, in micro-dollars.
 *
 * ── Where these come from, and how sure they are ─────────────────────────
 *
 * From the pricing Carli sent on 8 October 2026: Lyria-002 at $0.06 for a
 * 30-second clip, and the clip Google's own page documents is 32.8 seconds.
 * So one press of Lyria is 60 000 micro-dollars.
 *
 * **These are published rates, not an invoice.** The honest version of this
 * number arrives on her first Google bill, and until then `CREDITS.song`
 * cannot be checked against anything. Which is why every call writes down
 * what it was CHARGED AT as well as what ran: when the real invoice lands,
 * the difference between these and it is one query rather than a guess.
 */
export const COSTS = {
  /**
   * One Lyria 3 Pro song, up to about three minutes.
   *
   * $0.08. Written from a secondary source, then **corroborated the same
   * day by Carli from her own reading**: *"Die amptelike/gemiddelde prys is
   * $0.08 (~R1.40 tot R1.50) per gegenereerde liedjie."* Two independent
   * sources agreeing is not an invoice, but it is no longer one blog.
   *
   * ── And her rand figure says something the dollar one does not ────────
   *
   * $0.08 at this app's `RAND_PER_USD = 16` is **R1.28**. She read R1.40 to
   * R1.50, which implies 17.5 to 18.75 rand to the dollar.
   *
   * That gap is not about Lyria. **Every supplier price in this app is
   * converted at 16**, so if the real rate is nearer 18 then every cost is
   * understated by about a seventh — including the video margin that is
   * already one cent. The exchange rate is the single assumption under all
   * of them, and it is four months old. See `docs/OPEN-QUESTIONS.md`.
   */
  music: 80_000,
  /** One Lyria 2 instrumental clip of 30 seconds, at $0.06. Documented. */
  bed: 60_000,
} as const;

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

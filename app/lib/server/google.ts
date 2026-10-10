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
/**
 * Where a model lives, which is not the same for all of them.
 *
 * ── Three engines, three addresses ───────────────────────────────────────
 *
 * Carli's own Model Garden, 9 October 2026, pasted sample by sample:
 *
 *   Veo       us-central1-aiplatform.googleapis.com … /locations/us-central1
 *   Nano      aiplatform.googleapis.com            … /locations/global
 *   Lyria 3   aiplatform.googleapis.com            … /locations/global
 *             and not a publisher model at all — see interactionsAddress()
 *
 * One builder that put the region in both the host and the path was right
 * for exactly one of the three, which is a large part of why a week of
 * probing produced 404s. `where` says which kind a model is, and it is read
 * off `MODELS` rather than guessed per call site.
 */
export const addressOf = (model: string, verb = 'predict'): string => {
  const spec = MODELS.find((one) => one.id === model);
  if (spec?.where === 'global') {
    return `https://aiplatform.googleapis.com/v1/projects/${project()}`
      + `/locations/global/publishers/google/models/${model}:${verb}`;
  }
  return `https://${region()}-aiplatform.googleapis.com/v1/projects/${project()}`
    + `/locations/${region()}/publishers/google/models/${model}:${verb}`;
};

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
/** One candidate: its id, what it makes, how it is called, and where it lives. */
export interface Candidate {
  readonly id: string;
  readonly what: 'music' | 'video' | 'image';
  readonly verb: string;
  /** `global` models use the unregional host and `locations/global`. */
  readonly where?: 'global';
  /**
   * Which API it is on.
   *
   * ── Why this is data and not something read off the id ────────────────
   *
   * Three of these models are not publisher models at all: the two Lyrias
   * and Gemini Omni Flash are on `interactions`, where the model is named in
   * the BODY and there is no verb after a colon. A week of 404s came from one
   * address builder serving both, and `addressOf` is never called for them.
   *
   * Until 10 October 2026 that fact lived in each one's `note` — prose, which
   * nothing can read. So `check:google`'s rule that "a video model asks for a
   * long-running job" went red the moment a video model arrived on
   * `interactions`, and the choice was to weaken the rule or to name the
   * thing it was really about. This is the thing it was really about.
   *
   * `verb` is kept on an interactions model only so the probe's control
   * compares like with like.
   */
  readonly on?: 'interactions';
  /**
   * How Google serves it, off her own Model Garden listing.
   *
   * ── Why this matters more than any other field here ───────────────────
   *
   * **Serverless** means it answers an API call and bills per use. That is
   * the only kind this app can call at all.
   *
   * **Self-deployed** means it does not. It is a model you deploy to an
   * endpoint of your own — a machine that runs and bills by the HOUR whether
   * anything calls it or not. There is no per-call address to post to until
   * somebody deploys it, so a request to one answers 404, which reads
   * exactly like a wrong model name.
   *
   * Carli pasted the whole Model Garden listing on 10 October 2026 and every
   * card carries one badge or the other. Reading those badges answered two
   * things nobody here knew and one that nobody here suspected — see the
   * notes on the Veos and on Nano Banana below.
   *
   * Left undefined where her listing does not show the model at all, which
   * is not the same as either.
   */
  readonly hosting?: 'serverless' | 'self-deployed';
  readonly note: string;
}

export const MODELS: readonly Candidate[] = [
  { id: 'lyria-002', what: 'music', verb: 'predict', hosting: 'serverless', note: 'A real publisher model on :predict \u2014 a different api from the two below. Instrumental only and about 30 seconds, so not the booth\u2019s button.' },
  /* ── The two that are really there, and on another API ────────────
 
     Carli's Model Garden, 9 October 2026. Both of these are `interactions`
     models — `v1beta1`, `locations/global`, model named in the body — and
     neither is a publisher model you can `:predict`. That is why asking
     `models/lyria-3-pro-preview:predict` answered "Publisher model was not
     found": it was a true answer to a question about the wrong API.
 
     `verb` is kept on them only because the probe's control compares like
     with like; nothing calls these through `addressOf`. */
  { id: 'lyria-3-pro-preview', what: 'music', verb: 'predict', hosting: 'serverless', on: 'interactions', note: 'A whole song. On the INTERACTIONS api, not predict \u2014 see interactionsAddress(). Seen on her own Model Garden page.' },
  { id: 'lyria-3-clip-preview', what: 'music', verb: 'predict', hosting: 'serverless', on: 'interactions', note: 'Song CLIPS, same interactions api. Seen on her page beside the pro one. The right one for a short piece rather than a whole song.' },
  /* ── Four Veos on her project, and the app already had the right one ─
 
     Carli walked Model Garden on 9 October 2026 and pasted card after card.
     Four ids came off her own screen, each with the same flow:
 
       veo-3.0-generate-001
       veo-3.1-generate-001
       veo-3.1-lite-generate-001
       veo-3.1-fast-generate-001
 
     ── What I did while she was pasting, which is the lesson ──────────
 
     She sent the 3.0 card first. I concluded her project did not have 3.1,
     changed the chosen model, and wrote that into the code. Then Lite
     arrived and I concluded that `fast` was a name I had invented, and wrote
     THAT into the code. Then the full 3.1 arrived, then Fast arrived, and
     both conclusions were wrong.
 
     The app's original setting — `veo-3.1-fast-generate-001` at $0.08 a
     second — was correct from the start. Two confident "corrections" in
     twenty minutes, each from one more card than the last, each written into
     a file as though settled.
 
     It is the same error as reading a probe's 400 as a fact about a model:
     concluding from a fragment and recording the conclusion as a finding.
     The difference is that this time the fragments were arriving one a
     minute and I kept rewriting rather than waiting for the list to end. */
  { id: 'veo-3.1-fast-generate-001', what: 'video', verb: 'predictLongRunning', note: 'Seen on her Model Garden page, 9 October 2026. The cheap tier, the chosen one, and the id this app had before any of today\u2019s churn.' },
  { id: 'veo-3.1-lite-generate-001', what: 'video', verb: 'predictLongRunning', note: 'Seen on her Model Garden page, 9 October 2026. A second cheap tier; price unread, so not chosen over the one whose rate is known.' },
  { id: 'veo-3.1-generate-001', what: 'video', verb: 'predictLongRunning', note: 'Seen on her Model Garden page, 9 October 2026. The full 3.1, about $0.20 a second.' },
  { id: 'veo-3.0-generate-001', what: 'video', verb: 'predictLongRunning', note: 'Seen on her Model Garden page, 9 October 2026. The older full model.' },
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
  /* Hers, off her own console, with the address her sample uses: the
     UNREGIONAL host and `locations/global`. The four guesses below it are
     kept so the probe keeps asking, but this is the one with evidence. */
  { id: 'gemini-nano-banana-2.1', what: 'image', verb: 'generateContent', hosting: 'self-deployed', where: 'global', note: 'Shown on HER Model Garden page as "Gemini Nano Banana 2.1", 9 October 2026. Takes response_modalities TEXT+IMAGE, an aspect_ratio and an image_size.' },
  { id: 'gemini-3-pro-image', what: 'image', verb: 'generateContent', note: 'Nano Banana Pro, the general-availability name per a third-party guide. Unconfirmed on a Google page.' },
  { id: 'gemini-3-pro-image-preview', what: 'image', verb: 'generateContent', note: 'Nano Banana Pro as Google’s own Vertex page lists it. Possibly withdrawn with the other -preview ids.' },
  { id: 'gemini-2.5-flash-image', what: 'image', verb: 'generateContent', hosting: 'serverless', note: 'The original Nano Banana. Answered 400 to an empty body on 8 October, which on this verb means the name resolved.' },
  { id: 'gemini-3.1-flash-image', what: 'image', verb: 'generateContent', note: 'Named as the replacement for the above. Id unverified anywhere official.' },
  /* ── The one that can CHANGE a video ──────────────────────────────
 
     Carli pasted her own documentation page on 10 October 2026: the
     capability list, the endpoint, the request body and a whole response.
     So this id is read rather than guessed — and it differs from the name
     the Gemini conversation gave on the 9th, which was
     `gemini-omni-flash-1.1`. A name off a chat and a name off the
     documentation differed by a version number.
 
     It is on the INTERACTIONS api, like the two Lyrias — the same endpoint
     `interactionsAddress()` already builds, with the model in the body. So
     `verb` is kept only so the probe's control compares like with like, and
     `addressOf` is never called for it. `lib/server/omni.ts` has the reader
     and the four capabilities, one of which — editing an existing video —
     nothing in this app can do at any price. */
  { id: 'gemini-omni-flash-preview', what: 'video', verb: 'predict', hosting: 'self-deployed', on: 'interactions', note: 'Gemini Omni Flash. Off HER OWN documentation page, 10 October 2026. On the INTERACTIONS api, not predict \u2014 see interactionsAddress(). Text-to-video, image-to-video, reference-to-video and VIDEO EDITING. Priced per token and the rate is unread, so nothing is charged through it yet.' },
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
 *   veo-3.1-generate-001        400  there   (id correct, reading worthless)
 *   veo-3.1-fast-generate-001   400  there   (an id I invented; "there" is
 *                                             the proof the reading was of
 *                                             my request and not her project)
 *   gemini-2.5-flash-image      400  there
 *   gemini-3-pro-image          404
 *   gemini-3-pro-image-preview  404
 *   gemini-3.1-flash-image      404
 *
 * Three of those were facts and five were not, and the five looked exactly
 * like the three.
 *
 * ── What the 400s actually measured, 8 October 2026 ──────────────────────
 *
 * Carli, that evening, with Google's own words on her screen:
 *
 *   Publisher model `…/models/lyria-3-pro-preview` was not found or your
 *   project does not have access to it.
 *
 * For a model this table called "there".
 *
 * The probe asked each model with an EMPTY body and read 400 as "there, and
 * you sent rubbish". That holds for `:generateContent` — the three Nano
 * Banana names really did answer 404, which proves the model is resolved
 * before the body is looked at on that surface. It does NOT hold for
 * `:predict`: there the body is validated FIRST, so an empty one earns a 400
 * from the body check and the model is never looked up at all.
 *
 * So the four `:predict` readings — both Lyrias and both Veos — measured the
 * shape of my own request, not her project. The one sound reading in the
 * table is `gemini-2.5-flash-image`, and the three 404s beside it.
 *
 * This is the repository's recurring fault arriving in the tool built to
 * prevent it: a probe green because it measured the adjacent thing. It is
 * corrected here rather than deleted, because a wrong measurement quietly
 * removed teaches nobody, and the next person to reach for an empty-body
 * probe should meet this paragraph first.
 *
 * `readAddressOf` and `listAddress` below are the honest questions: a GET on
 * the model, and Google's own list of what this project can see. Neither
 * sends a body, so neither can be answered by the body check, and neither
 * generates or bills anything.
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
  /* Back to where it started, now with evidence under it rather than a
     guess. The cheap tier matters commercially: five seconds of the FULL
     model costs about four times what this app charges for a clip, so the
     fast one is the only reason Google video is sellable at this price. */
  video: 'veo-3.1-fast-generate-001',
  /* Not a choice. It is the only one of four that answered. */
  /* Hers, seen in her console, over the one that merely answered a probe. */
  /* ── Flagged 10 October 2026, and NOT changed from here ─────────────

     Carli pasted her whole Model Garden listing, and every card carries a
     badge: **Serverless** or **Self-deployed**. Two of this app's own
     choices read badly against it.

     `Gemini Nano Banana 2.1` — the one on this line — is badged
     **Self-deployed**. A self-deployed model has no per-call address until
     somebody deploys it to an endpoint that bills by the hour, so a request
     to it answers 404 and that 404 reads exactly like a wrong model name.
     `Gemini 2.5 Flash Image (Nano Banana)` is badged **Serverless** on the
     same page, and it is also the only image model that has ever ANSWERED on
     her project — measured on 8 October, written down below.

     So the evidence now points the other way from the choice. It is still
     not changed here, and that is deliberate: this file already carries the
     note about two confident "corrections" in twenty minutes on the Veo
     names, each written in from one more screenshot than the last, and each
     wrong. A badge in a catalogue listing is not a probe.

     `/google` on her own account is the probe, it takes one press, and it
     answers this properly. `docs/OPEN-QUESTIONS.md` carries the question
     with what is known on each side. */
  image: 'gemini-nano-banana-2.1',
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
 * The address of the model as a THING to read, rather than a verb to call.
 *
 * Unscoped on purpose. The project-scoped path answers an HTML 404 to a GET —
 * it exists only to be POSTed to — while this one answers a JSON 401 with no
 * key, which is how a correct address refuses an unauthenticated caller.
 * Measured from this machine on 8 October 2026 against `lyria-002`.
 *
 * An API key identifies the project it belongs to, so this is still asked as
 * her project even though the project is not in the path.
 */
export const readAddressOf = (model: string): string =>
  `https://${region()}-aiplatform.googleapis.com/v1/publishers/google/models/${model}`;

/**
 * Where Lyria 3 actually lives, which is not where the rest of them live.
 *
 * Carli pasted her own Model Garden page on 9 October 2026, and it is a
 * different API in every part:
 *
 *   host      aiplatform.googleapis.com      not {region}-aiplatform…
 *   version   v1beta1                        not v1
 *   location  locations/global               not us-central1
 *   path      /interactions                  not /publishers/google/models/…
 *   model     named in the BODY              not in the URL
 *
 * Which is exactly why `lyria-3-pro-preview:predict` answered *"Publisher
 * model … was not found"*. It is not a publisher model. The 404 was correct
 * and complete, and I read it as "wrong id" for a day.
 */
export const interactionsAddress = (): string =>
  `https://aiplatform.googleapis.com/v1beta1/projects/${project()}/locations/global/interactions`;

/** Every publisher model this project can see. Generates nothing. */
export const listAddress = (): string =>
  `https://${region()}-aiplatform.googleapis.com/v1beta1/publishers/google/models`
  + '?view=PUBLISHER_MODEL_VIEW_BASIC&pageSize=200';

/**
 * Whether a model answers, asked with a body it must refuse.
 *
 * Deliberately empty. A model that takes a POST and rejects this on its
 * CONTENTS is a model that is there and allowed — and nothing is generated,
 * so nothing is billed. A 404 is the model not being on this account or in
 * this region, and the two have to stay different answers.
 */
/**
 * A name that cannot exist, used as a control.
 *
 * ── Why a probe needs one, having now been wrong twice ───────────────────
 *
 * The first probe POSTed an empty body to the generate verb and read 400 as
 * "the model is there". That was a fact about the request, not the project,
 * because `:predict` validates the body before it resolves the name.
 *
 * The second read the model as a resource instead. Carli pressed it on
 * 9 October 2026 and Google answered, for all eight:
 *
 *   API keys are not supported by this API. Expected OAuth2 access token or
 *   other authentication credentials that assert a principal.
 *
 * So that method cannot be used with the credential this app has at all —
 * and every row came back `not-allowed`, which reads as "your key lacks a
 * permission" and is the wrong thing to go and fix.
 *
 * Twice, the probe reported a reading when it was not measuring anything.
 * The fault both times is the same and it is not the method: it is that
 * nothing checked whether the method could tell one answer from another.
 *
 * A control settles it. Ask about a model that certainly does not exist, the
 * same way, in the same breath. If the control answers differently from a
 * candidate, the question is being answered. If it answers the SAME, the
 * probe is blind and must say so instead of printing eight rows that look
 * like findings.
 */
export const NO_SUCH = 'futurebox-no-such-model-001';

export async function reach(model: string, verb?: string): Promise<Reached> {
  const spec = MODELS.find((one) => one.id === model);
  const what = spec?.what ?? 'unknown';
  if (!configured()) {
    return { model, what, status: 0, answer: 'unclear', note: 'No key or no project set.' };
  }
  /* ── Read the model, do not poke it ────────────────────────────────
 
     A GET on the model as a resource. No body, so nothing can be refused
     by the body check before the name is looked up — which is the whole
     fault the old version of this function had: it POSTed `{}` and read
     the 400 that the body check returned as proof the model existed.
 
     A read also cannot generate and cannot bill, which the POST only
     avoided by being malformed. */
  /* The generate verb with an EMPTY body — the only door an API key is
     allowed through, now that the read and the list have both refused one.
     An empty body cannot generate and cannot bill, which was always the
     reason it was chosen; what it could never do on its own is tell a real
     name from a false one, and that is what the control is for. */
  let response: Response;
  try {
    response = await fetch(addressOf(model, verb ?? spec?.verb ?? 'predict'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key() },
      body: '{}',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { model, what, status: 0, answer: 'unclear', note: 'Could not be reached at all.' };
  }
  const said = (await response.text().catch(() => '')).slice(0, 200);

  /* ── "Not allowed" is two different problems ──────────────────────
 
     A 401 saying API KEYS ARE NOT SUPPORTED is this app holding the wrong
     kind of credential for that method — nothing to grant, nothing to
     request, and no amount of looking at roles will help. A 401 or 403
     saying anything else really is a permission. Reporting both as
     "not-allowed, ask for access" sent her to the wrong page. */
  const wrongKind = /API keys are not supported/i.test(said);

  const answer = response.status === 400 || response.status === 422
    ? 'yes' as const
    : response.status === 404
      ? 'no' as const
      : response.status === 401 || response.status === 403
        ? 'not-allowed' as const
        : 'unclear' as const;

  const note = wrongKind
    ? 'This method does not take an API key at all — not a permission, and'
      + ' nothing to request. It needs a service account or OAuth.'
    : answer === 'yes'
      ? 'Answered on its contents rather than on its name — see the control below'
        + ' before trusting that as "the model is there".'
      : answer === 'no'
        ? 'The name was resolved and there is nothing by it. This one is a real'
          + ' answer: a 404 cannot come from an empty body.'
        : answer === 'not-allowed'
          ? 'The address is there and this key may not use it: a key restriction,'
            + ' a missing role, or a model that needs access requesting.'
          : `Neither a refusal nor an acceptance: ${response.status}. ${said}`;

  return { model, what, status: response.status, answer, note };
}

/**
 * Whether the probe can tell a real model from a made-up one, per verb.
 *
 * This is the question that was never asked, and asking it is cheap: the
 * same request, against a name that cannot exist. Both verbs are tried
 * because they behave differently — on 8 October the picture models, which
 * use `generateContent`, really did answer 404 for three names that do not
 * exist, while `predict` answered 400 for everything.
 */
export interface Sighted {
  readonly verb: string;
  readonly status: number;
  /** True when a name that cannot exist is told apart from one that can. */
  readonly canTell: boolean;
  readonly note: string;
}

export async function sighted(): Promise<Sighted[]> {
  const verbs = [...new Set(MODELS.map((one) => one.verb))];
  const out: Sighted[] = [];
  for (const verb of verbs) {
    const control = await reach(NO_SUCH, verb);
    out.push({
      verb,
      status: control.status,
      /* A 404 for a name that cannot exist means the name was looked up,
         which means a 404 for a candidate means something too. Anything
         else means the answer came back before the name was read, and
         every row for this verb is about the request. */
      canTell: control.answer === 'no',
      note: control.answer === 'no'
        ? `A made-up name answers 404 here, so the rows for ${verb} are about the models.`
        : `A made-up name answers ${control.status} here, exactly like a real one would.`
          + ` NOTHING this probe says about ${verb} models is a reading — it is the`
          + ' shape of the request. Open Model Garden in the console instead.',
    });
  }
  return out;
}

/** One model as the list reports it. */
export interface Listed {
  readonly name: string;
  readonly what: 'music' | 'video' | 'image' | 'other';
}

export interface Catalogue {
  readonly ok: boolean;
  readonly status: number;
  /** Only the ones worth reading: the music, video and picture engines. */
  readonly ours: readonly Listed[];
  readonly total: number;
  readonly note: string;
}

const KINDS: readonly { readonly test: RegExp; readonly what: Listed['what'] }[] = [
  { test: /lyria/i, what: 'music' },
  { test: /veo/i, what: 'video' },
  { test: /image|imagen|banana/i, what: 'image' },
];

/**
 * What this project can actually see, asked of Google rather than inferred.
 *
 * This is the question the old probe was trying to answer and could not. A
 * list cannot be faked by a malformed request: either the name is in it or
 * it is not. It generates nothing and bills nothing.
 *
 * The whole list is long and most of it is not ours, so only the music,
 * video and picture engines are handed back — but `total` says how many
 * there were, so a filter that matches nothing can be told apart from a
 * project that really has nothing.
 */
export async function catalogue(): Promise<Catalogue> {
  if (!configured()) {
    return { ok: false, status: 0, ours: [], total: 0, note: 'No key or no project set.' };
  }
  let response: Response;
  try {
    response = await fetch(listAddress(), {
      headers: { 'x-goog-api-key': key() },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { ok: false, status: 0, ours: [], total: 0, note: 'The list could not be reached.' };
  }
  const text = await response.text().catch(() => '');
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      ours: [],
      total: 0,
      /* Google's own words. A sentence invented here would hide the one
         thing worth seeing, which is what they objected to. */
      note: text.slice(0, 300) || `The list answered ${response.status}.`,
    };
  }
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = null; }
  const rows = (body && typeof body === 'object'
    ? (body as { publisherModels?: unknown }).publisherModels
    : null);
  const all = Array.isArray(rows) ? rows : [];
  const ours: Listed[] = [];
  for (const row of all) {
    const name = String((row as { name?: unknown })?.name ?? '');
    if (!name) continue;
    /* `publishers/google/models/veo-3.1-fast-generate-001` → the last part,
       which is the id every other part of this app uses. */
    const id = name.split('/').pop() ?? name;
    const kind = KINDS.find((one) => one.test.test(id));
    if (kind) ours.push({ name: id, what: kind.what });
  }
  return {
    ok: true,
    status: response.status,
    ours,
    total: all.length,
    note: all.length === 0
      ? 'The list came back empty, which is not the same as the engines being absent — check the key is allowed to list models.'
      : `${all.length} models on this project; ${ours.length} of them are ours.`,
  };
}

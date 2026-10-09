/**
 * Which engine makes this one.
 *
 * The member never chooses. They choose a **grade** — standard, better,
 * premium — and the app decides what serves it, because that decision is worth
 * thirteen times the money and they have no way to know that.
 *
 * The order inside a grade is cheapest first, and the list falls through: an
 * engine that is not configured, or whose month is spent, or that refuses the
 * request, hands on to the next one. A member sees one price and one wait
 * however many engines were tried behind it.
 *
 * ── Why standard is not simply the cheapest of everything ────────────────
 *
 * Because grades are a promise about the result, not about the bill. Somebody
 * who paid for premium and quietly got the cheap engine has been sold
 * something. So falling *down* a grade never happens: if every engine in the
 * grade is unavailable, the request is refused and nothing is charged. Falling
 * sideways within a grade is invisible and fine.
 */

import { kling } from './kling.ts';
import { seedance, veo } from './eleven.ts';
import { googleVeo, googleVeoFull, googleVeoLite, googleVeoOldId } from './google.ts';
import { suits, type Grade, type Provider, type StartRequest } from './types.ts';

export * from './types.ts';
export { scheme } from './kling.ts';
/* Named, so the one page that tests Google's own Veo reaches the very engine
   a member's video goes through rather than a hand-written copy of it. */
export { googleVeo, googleVeoFull, googleVeoLite } from './google.ts';
/* The presenter, which shares this broker and nothing else.

   Re-exported here so the desk and the routes reach every video capability
   through one door, even though `creatify-aurora` is not a `Provider` — it
   takes a picture and a voice rather than a prompt and a length, and pretending
   otherwise would mean a grade whose length and shape rows mean nothing. */
export {
  checkPresenter,
  presenterReady,
  startPresenter,
  PRESENTER_AUDIO_MIMES,
  PRESENTER_IMAGE_MIMES,
  PRESENTER_MAX_BYTES,
  type PresenterQuality,
  type PresenterRequest,
} from './eleven.ts';

/**
 * Every engine, cheapest first inside each grade.
 *
 * Costs, per five-second clip, from this project's own invoices rather than
 * from anybody's marketing page: Seedance R2.62, resold Veo R10.72, Google
 * Veo Fast R12.00, Google Veo full R32.00, Google Veo Lite R4.00.
 *
 * Against what each rung TAKES — `videoCost` charges standard once, better
 * twice and premium four times, so R22.35, R44.70 and R89.40 at the cheapest
 * credit tier — every engine on the list earns at least two and a half
 * times what it costs.
 *
 * ── Two Veos, and they are the same picture ─────────────────────────────
 *
 * `veo` is Veo resold by ElevenLabs. `googleVeo` is Veo on Carli's own
 * Vertex project, switched on 8 October 2026. Same model, same grade, and
 * the member cannot tell them apart — which is the point: a grade is a
 * promise about the RESULT, and who bills for it is ours to decide.
 *
 * Google's is first because it is the cheaper of the two at Google's own
 * published rate and because it stops at a ceiling she controls. If it is
 * not configured, or its month is spent, the list falls through to the
 * resold one exactly as it always did — and the first anybody knows about
 * it is nothing at all, which is correct.
 *
 * The two are counted separately, each in its own units, because they are
 * different accounts with different ceilings. `video_spend_this_month`
 * already keys on the provider id, so that came free.
 */
export const PROVIDERS: readonly Provider[] = [
  seedance, googleVeoLite, googleVeo, veo, googleVeoFull,
];

/**
 * Engines that are no longer offered, kept only so old rows can be read.
 *
 * ── Kling, retired 9 October 2026 ───────────────────────────────────────
 *
 * Carli: *"Ons gaan ook nie meer Kling gebruik nie, die video generation
 * deur kling is sleg."* It is not a price decision and it is not arguable
 * from here — she has watched what comes out of it and this app has not.
 *
 * ── Why it is not deleted ───────────────────────────────────────────────
 *
 * Because `video_jobs` rows written yesterday say `provider: 'kling'`, and
 * a job is a charge followed minutes later by a question. An engine deleted
 * out of the list is a clip somebody already paid for that can never be
 * asked about again: the route reads `providerById(row.provider)`, gets
 * nothing, and the job sits unfinished and unrefunded forever.
 *
 * So retired means exactly this: never offered, never charged, still
 * answerable. `candidates` and `gradesAvailable` read `PROVIDERS` and will
 * not find it; `providerById` reads both and will.
 *
 * The free browser visualiser in `kling.ts` is a different thing with an
 * unfortunate address — it generates nothing, costs nothing and stays.
 */
export const RETIRED: readonly Provider[] = [kling];

export function providerById(id: string): Provider | undefined {
  /* The cheap Google rung answered to `google-veo` before the rungs split on
     9 October 2026. Rows carrying that id are still in flight. */
  const wanted = id === googleVeoOldId ? googleVeo.id : id;
  return [...PROVIDERS, ...RETIRED].find((one) => one.id === wanted);
}

/** Grades that have at least one engine behind them right now. */
export function gradesAvailable(): Grade[] {
  const found = new Set<Grade>();
  for (const one of PROVIDERS) if (one.configured()) found.add(one.grade);
  return (['standard', 'better', 'premium'] as const).filter((grade) => found.has(grade));
}

/**
 * The engines that could serve this request, in the order to try them.
 *
 * `spent` answers what a provider has already used this month, so a full one
 * is skipped before it is asked rather than after it refuses.
 */
export function candidates(
  grade: Grade,
  request: StartRequest,
  spent: (provider: Provider) => number,
): Provider[] {
  return PROVIDERS.filter(
    (one) => one.grade === grade && suits(one, request) && spent(one) + one.cost(request.seconds) <= one.ceiling(),
  );
}

export function configured(): boolean {
  return PROVIDERS.some((one) => one.configured());
}

/**
 * What arrived, not just that something did.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * `docs/MUSIEKDENKE.md` §3.3. `lib/hooks.ts` already finds the moment a clip
 * should start at, and already knows *that* something arrived there — it is
 * looking for a rise. What it has never been able to say is **what**: the
 * screen reads "something arrives", which is the one thing anybody could
 * already hear.
 *
 * Naming it is arrangement, taught at the exact moment somebody is choosing
 * where to cut. "The low end comes in" and "the top opens up" and "twice as
 * much is happening" are three different decisions a producer made, and
 * hearing which one is the difference between liking a drop and knowing how
 * one is built.
 *
 * ── Why it is measured against the overall level ────────────────────────
 *
 * A chorus is louder than a verse in every band at once. So a rise in the low
 * end only means "the bass came in" if it is bigger than the rise in
 * everything else — otherwise it is the same music, louder, and saying "the
 * low end comes in" would be a confident wrong answer about the one thing
 * this is for.
 *
 * Everything below is therefore a ratio of a ratio: how much this band grew,
 * against how much the whole thing grew.
 *
 * ── Why the maths takes samples ─────────────────────────────────────────
 *
 * Same reason as `lib/listen.ts`: so it can be checked against a signal built
 * on purpose — a sine at sixty hertz that starts halfway through, a hi-hat
 * pattern that doubles — where the right answer is known. A function that
 * takes an `AudioBuffer` can only be checked in a browser, and a DSP function
 * that is only ever checked in a browser is not checked.
 */

/** What changed at the moment. '' when nothing changed enough to name. */
export type What = '' | 'low' | 'top' | 'fuller' | 'louder';

export interface Arrival {
  readonly what: What;
  /** How much the bottom grew, against how much everything grew. */
  readonly low: number;
  /** The same for the top. */
  readonly top: number;
  /** The same for how often something new starts. */
  readonly fuller: number;
  /** How much louder it got, plainly. */
  readonly louder: number;
}

export const NOTHING: Arrival = { what: '', low: 1, top: 1, fuller: 1, louder: 1 };

/** Where the bottom stops and the top starts, in hertz. */
const LOW_HZ = 150;
const TOP_HZ = 3000;

/**
 * How much more of the band it takes to be a decision rather than a level.
 *
 * A chorus is a little louder in every band, so 1.15 would fire on every
 * chorus in existence and name a band at random. Measured against built
 * signals: a real instrument entering moves its band by two or three times
 * the overall change, and music that is simply louder moves every band by
 * about the same amount.
 */
const ENOUGH_BAND = 1.6;
const ENOUGH_FULLER = 1.5;
/** And how much louder counts as louder at all. */
const ENOUGH_LOUD = 1.25;

/** A one-pole low-pass. Cheap, and good enough to split a kick from a hat. */
function lowPass(samples: Float32Array, rate: number, hz: number): Float32Array {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  const out = new Float32Array(samples.length);
  let held = 0;
  for (let i = 0; i < samples.length; i += 1) {
    held += a * (samples[i] - held);
    out[i] = held;
  }
  return out;
}

function rms(samples: Float32Array, from: number, to: number): number {
  const start = Math.max(0, from);
  const end = Math.min(samples.length, to);
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += samples[i] * samples[i];
  return Math.sqrt(sum / (end - start));
}

/**
 * How often something new starts, per second.
 *
 * A rise in short-window energy that was not rising before. Crude on purpose:
 * what is being compared is a stretch against the stretch beside it, so a
 * detector that misses a third of the onsets misses the same third in both.
 */
function onsets(samples: Float32Array, rate: number, from: number, to: number): number {
  const per = Math.max(1, Math.round(rate * 0.02));
  const start = Math.max(0, from);
  const end = Math.min(samples.length, to);
  if (end - start < per * 3) return 0;
  let last = 0;
  let rising = false;
  let count = 0;
  for (let at = start; at + per <= end; at += per) {
    const level = rms(samples, at, at + per);
    const up = level > last * 1.4 && level > 0.01;
    if (up && !rising) count += 1;
    rising = up;
    last = level;
  }
  return count / ((end - start) / rate);
}

/**
 * A ratio that survives the thing before it being silent.
 *
 * Nothing into something is an arrival, and it is the strongest kind there
 * is; `after / 0` is Infinity, which then loses every comparison against a
 * number. Capped instead, so it stays the biggest finite thing in the room.
 */
function grew(before: number, after: number): number {
  if (before <= 1e-6) return after <= 1e-6 ? 1 : 8;
  return Math.min(8, after / before);
}

/**
 * What arrives at `atSeconds`, judged against the `span` seconds before it.
 *
 * Returns `''` when nothing moved enough to name — which is the honest answer
 * for a steady stretch, and much better than picking whichever band happened
 * to be a few per cent up.
 */
export function arrivalAt(
  samples: Float32Array,
  rate: number,
  atSeconds: number,
  span = 2,
): Arrival {
  const at = Math.round(atSeconds * rate);
  const width = Math.round(span * rate);
  const from = at - width;
  /* Nothing before it is not an arrival, it is the start of the song. A hook
     at 0:00 has nothing to have arrived out of. */
  if (from < 0 || at + width > samples.length) return NOTHING;

  /* Only the four seconds this is about, rather than the whole song.

     `findHooks` asks about three moments, and filtering a four-minute file
     twice for each of them is forty million multiplies on a phone for an
     answer that depends on four seconds of it. The filter loses its warm-up
     state at the cut, which at a hundred-and-fifty-hertz corner settles in a
     few milliseconds — nothing against a two-second window. */
  const slice = samples.subarray(from, at + width);
  const low = lowPass(slice, rate, LOW_HZ);
  const body = lowPass(slice, rate, TOP_HZ);
  /* The top is what the three-kilohertz low-pass did not keep. */
  const top = new Float32Array(slice.length);
  for (let i = 0; i < slice.length; i += 1) top[i] = slice[i] - body[i];
  /* Everything below is indexed inside the slice, where the moment is at
     `width` and the two windows are the halves either side of it. */
  const loudBefore = rms(slice, 0, width);
  const loudAfter = rms(slice, width, slice.length);
  const louder = grew(loudBefore, loudAfter);
  /* Everything is measured against the overall change, so a chorus that is
     simply louder does not read as any instrument arriving. Division by a
     `louder` of zero cannot happen: `grew` never returns less than 1/8 of
     anything, and returns exactly 1 for silence against silence. */
  const lowRatio = grew(rms(low, 0, width), rms(low, width, slice.length)) / louder;
  const topRatio = grew(rms(top, 0, width), rms(top, width, slice.length)) / louder;
  const fullerRatio =
    grew(onsets(slice, rate, 0, width), onsets(slice, rate, width, slice.length)) / louder;

  /* Silence into something is a different question, and needs a different
     answer.

     Every ratio caps at 8 when what came before was silent, so dividing one
     cap by another gives 1 and no band can ever clear its bar — the first
     version of this called a bass note out of nothing "louder", which is true
     and useless. What changed cannot be measured against nothing, so what it
     is *made of* is measured instead: a stretch whose energy is almost all in
     the bottom is the bottom arriving, whatever came before it. */
  if (loudBefore <= 1e-4 && loudAfter > 1e-4) {
    const all = rms(slice, width, slice.length);
    const lowShare = rms(low, width, slice.length) / all;
    const topShare = rms(top, width, slice.length) / all;
    const what: What = lowShare >= 0.6 ? 'low' : topShare >= 0.4 ? 'top' : 'louder';
    return { what, low: lowShare, top: topShare, fuller: fullerRatio, louder };
  }

  const named: ReadonlyArray<readonly [What, number, number]> = [
    ['low', lowRatio, ENOUGH_BAND],
    ['top', topRatio, ENOUGH_BAND],
    ['fuller', fullerRatio, ENOUGH_FULLER],
  ];
  /* The biggest one that clears its own bar, measured in how far past the bar
     it is — the three thresholds are different, so comparing the raw ratios
     would always favour whichever had the lowest bar. */
  let best: What = '';
  let over = 0;
  for (const [what, ratio, bar] of named) {
    if (ratio >= bar && ratio / bar > over) {
      over = ratio / bar;
      best = what;
    }
  }
  if (!best && louder >= ENOUGH_LOUD) best = 'louder';

  return { what: best, low: lowRatio, top: topRatio, fuller: fullerRatio, louder };
}

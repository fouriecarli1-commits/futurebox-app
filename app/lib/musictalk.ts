/**
 * What a measurement means, said the way a musician would say it.
 *
 * ── The idea, and why it costs nothing ───────────────────────────────────
 *
 * `docs/MUSIEKDENKE.md` §3.2. `lib/listen.ts` already measures tempo, key,
 * brightness, weight, density and punch off any piece of audio, and already
 * turns them into style words for the engine. What it has never done is say
 * what any of it *means*, so somebody reads "112 BPM · A minor · brightness
 * 62%" and learns four numbers.
 *
 * One clause each turns the same four numbers into the thing a musician knows:
 *
 *   112 BPM     walking pace, where most pop sits
 *   A minor     the same seven notes as C major, a different home
 *   bright      the energy is up top, where cymbals and a forward voice live
 *   heavy       the kick and the bass are sharing everything under 120 Hz
 *
 * Nobody is taught anything and nothing is added to the screen except a line
 * of text under a number that was already there. It is theory delivered as a
 * fact about their own song, which is the only form of it anybody absorbs.
 *
 * ── Why this returns keys rather than sentences ──────────────────────────
 *
 * The app is Afrikaans as well as English, and `check:afrikaans` refuses an
 * English fallback showing in an Afrikaans screen. So every reading here is
 * an i18n key with its English beside it, and the component says it through
 * `t()`. That also keeps the bands testable without a browser: what this file
 * decides is *which* reading, and the words are somebody else's problem.
 */

import { relativeOf } from './notation';

/** What `lib/listen.ts` measured. Only the fields that get a reading. */
export interface Measured {
  readonly bpm: number;
  readonly key: string;
  readonly brightness: number;
  readonly weight: number;
  readonly density: number;
  readonly punch: number;
}

export interface Reading {
  /** Which measurement this is about. */
  readonly of: 'tempo' | 'key' | 'brightness' | 'weight' | 'density' | 'punch';
  /** The measurement itself, as it should be shown. */
  readonly value: string;
  /** The i18n key for the clause that says what it means. */
  readonly note: string;
  /** Its English, for `t(note, fallback)`. */
  readonly english: string;
  /**
   * A key's relative, appended after the clause by whoever draws this.
   *
   * Kept out of the sentence rather than interpolated into it, because the
   * two languages put it in different places and `t()` takes no arguments.
   */
  readonly then?: string;
}

/* ── Tempo ──────────────────────────────────────────────────────────────
 *
 * The bands are where the music actually is, and the examples are checkable
 * facts rather than opinions: house really does sit at 124–128, amapiano at
 * about 112, and drum and bass at 170–175 counted as half of that. A band
 * with a made-up example in it would be the app teaching something false,
 * which is worse than a band with no example.
 */
const TEMPO: ReadonlyArray<readonly [number, string, string]> = [
  [70, 'talk.tempo.slow', 'Slow. A ballad sits here, and so does most of what gets sung in a church.'],
  [95, 'talk.tempo.walking', 'Walking pace. Soul, reggae and a great deal of Afrikaans music live here.'],
  [120, 'talk.tempo.pop', 'Where most pop sits: fast enough to move to, slow enough to sing over. Amapiano is about 112.'],
  [140, 'talk.tempo.dance', 'Dance tempo. House is 124 to 128 almost exactly, which is why it all mixes together.'],
  [168, 'talk.tempo.fast', 'Fast. Above about 140 the beat is usually felt in half, so it moves rather than races.'],
  [Infinity, 'talk.tempo.double', 'Very fast, and almost always counted at half of it: 174 is drum and bass, felt as 87.'],
];

/* ── Everything else ────────────────────────────────────────────────────
 *
 * Each is a threshold and a consequence. The consequence is the part worth
 * having: "brightness 62%" is a number, "the energy is up top, where a voice
 * has to compete with the cymbals" is something a person can act on.
 */
const BRIGHT: ReadonlyArray<readonly [number, string, string]> = [
  [0.3, 'talk.bright.dark', 'Dark: little up top. Close and warm, or a recording with the top rolled off.'],
  [0.55, 'talk.bright.warm', 'Warm: the energy sits in the middle, where voices and guitars live.'],
  [Infinity, 'talk.bright.bright', 'Bright: the energy is up top, where the cymbals are and where a voice has to compete.'],
];

const WEIGHT: ReadonlyArray<readonly [number, string, string]> = [
  [0.12, 'talk.weight.light', 'Light underneath. It will sound fine on a phone and thin on a big system.'],
  [0.35, 'talk.weight.even', 'Even underneath: enough bottom to feel, not so much that it covers anything.'],
  [Infinity, 'talk.weight.heavy', 'Heavy underneath. The kick and the bass share everything below 120 Hz, and that is what you feel rather than hear.'],
];

const DENSITY: ReadonlyArray<readonly [number, string, string]> = [
  [2, 'talk.density.sparse', 'Sparse: room around everything. This is what a voice needs to sit in.'],
  [6, 'talk.density.even', 'Steady: something new every few beats, which is what an arrangement is supposed to do.'],
  [Infinity, 'talk.density.busy', 'Busy: something new starts several times a second. There is not much room left for a voice.'],
];

const PUNCH: ReadonlyArray<readonly [number, string, string]> = [
  [3, 'talk.punch.flat', 'Squashed flat: loud all the way through. Big at first, and tiring after two minutes.'],
  [6, 'talk.punch.even', 'Normal dynamics: the loud parts are louder, which is what makes a chorus arrive.'],
  [Infinity, 'talk.punch.wide', 'Wide dynamics: a long way between the quiet parts and the loud ones. Room to build.'],
];

/**
 * A key name with its quality as a token rather than an English word.
 *
 * "E♭ major" becomes "E♭ {major}", which whoever draws this replaces with the
 * word in the reader's language. Splitting it here rather than translating
 * the whole string keeps the root — which is a letter and not a word — out of
 * the dictionary, where a hundred key names would be a hundred entries saying
 * nothing.
 */
export function sayKey(key: string): string {
  return key.replace(/\bmajor\b/i, '{major}').replace(/\bminor\b/i, '{minor}');
}

/** The first band a value falls in. The last band is always Infinity. */
function band(
  value: number,
  bands: ReadonlyArray<readonly [number, string, string]>,
): readonly [number, string, string] {
  return bands.find((one) => value < one[0]) ?? bands[bands.length - 1];
}

/**
 * Every measurement, with what it means.
 *
 * A measurement that was not taken is left out rather than given a reading:
 * `keyOf` returns '' when no key was clear and `tempoOf` returns 0 when
 * nothing steady was found, and inventing "C major" for silence is the one
 * thing this whole idea cannot afford to do.
 */
export function readingsOf(heard: Measured): Reading[] {
  const out: Reading[] = [];

  if (heard.bpm > 0) {
    const [, note, english] = band(heard.bpm, TEMPO);
    out.push({ of: 'tempo', value: `${Math.round(heard.bpm)} BPM`, note, english });
  }

  if (heard.key) {
    const minor = /min/i.test(heard.key);
    const relative = relativeOf(heard.key);
    out.push({
      of: 'key',
      /* `keyOf` speaks English — "E♭ major" — and this is shown on a screen
         that may be Afrikaans. `check:afrikaans` cannot see it, because it is
         built at runtime rather than sitting in the dictionary, and
         `audit/heard.mjs` found it on the page. */
      value: sayKey(heard.key),
      note: minor ? 'talk.key.minor' : 'talk.key.major',
      english: minor
        ? 'A minor key. The same seven notes as its relative major, with a different home — which is why a song can move between the two without changing key. Its relative major is'
        : 'A major key. The same seven notes as its relative minor, with a different home — which is why a song can move between the two without changing key. Its relative minor is',
      then: sayKey(relative),
    });
  }

  const bright = band(heard.brightness, BRIGHT);
  out.push({ of: 'brightness', value: `${Math.round(heard.brightness * 100)}%`, note: bright[1], english: bright[2] });

  const weight = band(heard.weight, WEIGHT);
  out.push({ of: 'weight', value: `${Math.round(heard.weight * 100)}%`, note: weight[1], english: weight[2] });

  /* Both of these are shown as the number with its unit rather than as a
     word. "busy" under a heading that says "density" is the same word twice;
     "6.2 a second" is a fact, and the clause beside it is what makes the fact
     mean something — which is the whole point of this file. */
  const density = band(heard.density, DENSITY);
  out.push({ of: 'density', value: `${heard.density.toFixed(1)}/s`, note: density[1], english: density[2] });

  const punch = band(heard.punch, PUNCH);
  out.push({ of: 'punch', value: `×${heard.punch.toFixed(1)}`, note: punch[1], english: punch[2] });

  return out;
}

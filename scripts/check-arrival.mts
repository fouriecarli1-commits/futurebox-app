/**
 * What arrives at a moment, against signals built so the answer is known.
 *
 * `docs/MUSIEKDENKE.md` §3.3. `lib/hooks.ts` has always known *that*
 * something arrives at the moment it picks — it is looking for a rise. The
 * screen said "something arrives", which is the one thing anybody could
 * already hear. Naming it is arrangement, taught at the moment somebody is
 * choosing where to cut.
 *
 * Which makes a wrong name worse than no name, and there are two ways to get
 * one:
 *
 * 1. **Naming a band that did not arrive.** A chorus is louder than a verse
 *    in every band at once, so a rise in the bottom only means "the bass came
 *    in" if it is bigger than the rise in everything else. Without that,
 *    every chorus in existence reads as a bass entering.
 * 2. **Naming something at the start of a song.** A hook at 0:00 has nothing
 *    to have arrived out of, and the honest answer is silence.
 *
 * Every signal below is built here, so the right answer is known rather than
 * assumed — the same reason `lib/listen.ts` keeps its maths off the decoder.
 *
 *   npm run check:arrival
 */
import { arrivalAt } from '../app/lib/arrival';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const RATE = 44100;
const SECONDS = 4;
const N = RATE * SECONDS;
/** Where the change happens in every signal below. */
const AT = 2;

/** A sine, over the whole file or from a moment on. */
function tone(into: Float32Array, hz: number, gain: number, fromSeconds = 0): Float32Array {
  const start = Math.round(fromSeconds * RATE);
  for (let i = start; i < into.length; i += 1) into[i] += gain * Math.sin((2 * Math.PI * hz * i) / RATE);
  return into;
}

/** Short clicks, `per` of them a second, over a stretch. */
function clicks(into: Float32Array, per: number, gain: number, fromSeconds: number, toSeconds: number): Float32Array {
  const step = Math.round(RATE / per);
  const width = Math.round(RATE * 0.01);
  for (let at = Math.round(fromSeconds * RATE); at < Math.round(toSeconds * RATE); at += step) {
    for (let i = 0; i < width && at + i < into.length; i += 1) {
      into[at + i] += gain * Math.sin((2 * Math.PI * 900 * i) / RATE) * (1 - i / width);
    }
  }
  return into;
}

/* ── The bass comes in ─────────────────────────────────────────────────── */
const bass = tone(tone(new Float32Array(N), 900, 0.2), 60, 0.35, AT);
const bassSaid = arrivalAt(bass, RATE, AT);
ok('a sixty-hertz note entering is the low end', bassSaid.what === 'low',
  `${bassSaid.what} · low ${bassSaid.low.toFixed(2)} top ${bassSaid.top.toFixed(2)} loud ${bassSaid.louder.toFixed(2)}`);

/* ── The top opens up ──────────────────────────────────────────────────── */
const hats = tone(tone(new Float32Array(N), 900, 0.2), 9000, 0.3, AT);
const hatsSaid = arrivalAt(hats, RATE, AT);
ok('nine kilohertz entering is the top', hatsSaid.what === 'top',
  `${hatsSaid.what} · low ${hatsSaid.low.toFixed(2)} top ${hatsSaid.top.toFixed(2)}`);

/* ── More happening ────────────────────────────────────────────────────── */
const fuller = clicks(clicks(new Float32Array(N), 3, 0.35, 0, AT), 14, 0.35, AT, SECONDS);
const fullerSaid = arrivalAt(fuller, RATE, AT);
ok('four times as many onsets is a fuller arrangement', fullerSaid.what === 'fuller',
  `${fullerSaid.what} · fuller ${fullerSaid.fuller.toFixed(2)} loud ${fullerSaid.louder.toFixed(2)}`);

/* ── The same thing, louder ────────────────────────────────────────────── */
/* Every band grows by the same amount, so no band arrived. This is the one
   that separates a reading from a level, and a version without the division
   by the overall change names a band here at random. */
const louder = new Float32Array(N);
tone(louder, 900, 0.15);
tone(louder, 60, 0.1);
tone(louder, 9000, 0.08);
for (let i = Math.round(AT * RATE); i < N; i += 1) louder[i] *= 2.2;
const louderSaid = arrivalAt(louder, RATE, AT);
ok('the same music twice as loud is just louder', louderSaid.what === 'louder',
  `${louderSaid.what} · low ${louderSaid.low.toFixed(2)} top ${louderSaid.top.toFixed(2)} loud ${louderSaid.louder.toFixed(2)}`);
ok('and its bands all moved together', Math.abs(louderSaid.low - louderSaid.top) < 0.35,
  `${louderSaid.low.toFixed(2)} vs ${louderSaid.top.toFixed(2)}`);

/* ── Nothing at all ────────────────────────────────────────────────────── */
const steady = tone(tone(new Float32Array(N), 900, 0.2), 60, 0.1);
ok('a steady stretch has nothing arriving in it', arrivalAt(steady, RATE, AT).what === '',
  arrivalAt(steady, RATE, AT).what);

/* ── The start of a song ───────────────────────────────────────────────── */
ok('a moment at the very start says nothing', arrivalAt(bass, RATE, 0).what === '');
ok('and so does one with no room after it', arrivalAt(bass, RATE, SECONDS - 0.5).what === '');
ok('a window longer than the file says nothing', arrivalAt(bass, RATE, AT, 10).what === '');

/* ── Silence into something ────────────────────────────────────────────── */
/* Nothing into something is the strongest arrival there is, and `after / 0`
   is Infinity, which loses every comparison against a number. */
const fromNothing = tone(new Float32Array(N), 60, 0.4, AT);
const nothingSaid = arrivalAt(fromNothing, RATE, AT);
ok('silence into a bass note is still the low end', nothingSaid.what === 'low', nothingSaid.what);
ok('and none of its numbers is infinite',
  Number.isFinite(nothingSaid.low) && Number.isFinite(nothingSaid.louder),
  `${nothingSaid.low} ${nothingSaid.louder}`);

/* ── Silence throughout ────────────────────────────────────────────────── */
const nothing = arrivalAt(new Float32Array(N), RATE, AT);
ok('silence has nothing arriving in it', nothing.what === '', nothing.what);

console.log(
  failures
    ? `\ncheck:arrival — ${failures} assertion(s) failed.`
    : '\ncheck:arrival — a band that arrived is named, and music that is merely louder is not.',
);
process.exit(failures ? 1 : 0);

/**
 * The Pro Booth counts bars, not just seconds.
 *
 * `docs/MUSIEKDENKE.md` §3.6. The transport said `1:24 / 3:02` and nothing in
 * the room ever said the word "bar" with a number after it — in a room whose
 * whole subject is a metronome, a time signature and a bar grid. Somebody
 * working there for a week learned nothing about counting.
 *
 * Two ways to get it wrong, and both are the kind that teach a convention
 * nobody else uses:
 *
 * 1. **Counting from zero.** Every sheet of music ever printed starts at bar
 *    1 beat 1. A room that says bar 0 is teaching somebody to be wrong in
 *    every conversation they ever have with a musician.
 * 2. **Ignoring the time signature.** Bar 2 arrives after four beats in 4/4
 *    and after three in 3/4. A bar count that assumes four is right most of
 *    the time and silently wrong in a waltz.
 *
 *   npm run check:bars
 */
import { DEFAULT_METER, placeAt, sayPlace, type Meter } from '../app/lib/tempo';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const four: Meter = { ...DEFAULT_METER, bpm: 120, beats: 4 };
const waltz: Meter = { ...DEFAULT_METER, bpm: 120, beats: 3 };
const at = (seconds: number, meter: Meter = four) => sayPlace(placeAt(seconds, meter));

/* ── Musicians count from one ──────────────────────────────────────────── */
ok('the top of the song is bar 1 beat 1', at(0) === '1.1', at(0));
ok('and half a beat in is still bar 1 beat 1', at(0.25) === '1.1', at(0.25));
ok('one beat in is bar 1 beat 2', at(0.5) === '1.2', at(0.5));
/* At 120 BPM a beat is half a second, so four beats is two seconds. */
ok('four beats in is bar 2 beat 1', at(2) === '2.1', at(2));
ok('and thirty-two bars in is bar 33', at(64) === '33.1', at(64));

/* ── The time signature is not decoration ──────────────────────────────── */
/* Three beats to a bar: the second bar arrives at 1.5 seconds, not 2. A count
   that assumed four would say 1.4, which is a beat that does not exist. */
ok('a waltz reaches bar 2 after three beats', at(1.5, waltz) === '2.1', at(1.5, waltz));
ok('and has no fourth beat at all', at(1.0, waltz) === '1.3', at(1.0, waltz));
ok('while 4/4 is still on bar 1 at the same moment', at(1.5) === '1.4', at(1.5));

/* ── The tempo, too ────────────────────────────────────────────────────── */
const slow: Meter = { ...DEFAULT_METER, bpm: 60, beats: 4 };
ok('at sixty a beat is a second', at(1, slow) === '1.2', at(1, slow));
ok('and a bar is four', at(4, slow) === '2.1', at(4, slow));

/* ── Before the start ──────────────────────────────────────────────────── */
/* A count-in runs at negative time on this clock. Bar 0 and bar −1 both name
   a place that does not exist. */
ok('a moment before the start is bar 1 beat 1', at(-3) === '1.1', at(-3));
ok('and so is a moment that is not a number', at(Number.NaN) === '1.1', at(Number.NaN));

/* ── Nonsense in the meter ─────────────────────────────────────────────── */
/* `sane` already clamps these; this asserts the counting goes through it
   rather than reading the raw numbers, which is the sort of thing that is
   true when written and quietly not later. */
const silly = { ...DEFAULT_METER, bpm: 0, beats: 0 } as Meter;
ok('a meter of zeroes still counts somewhere', /^\d+\.\d+$/.test(at(5, silly)), at(5, silly));

/* ── And the room actually says it ─────────────────────────────────────── */
import { readFileSync } from 'node:fs';
const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
ok('the transport shows the bar', /sayPlace\(placeAt\(/.test(booth));
/* ── Where the lines are drawn, and why that moved ─────────────────────
 
   This used to assert the bar lines were inside each lane's own canvas, and
   that was right for the layout of the time. A ruler across the room lined up
   with nothing: every lane's wave started after that row's name column and
   stopped before that row's buttons, so each row had its own
   pixels-per-second and bar 2 on the ruler sat nowhere near bar 2 in the
   audio. Drawing the lines inside the wave was the only way to make them
   agree with it.
 
   Carli, 14 September 2026: *"Die timeline van die verskillende layers moet
   reg by en teen mekaar wees."* The layout is the thing that changed. One CSS
   grid with a fixed gutter and one `1fr` column puts the ruler and every lane
   in the SAME column, so there is now a single mapping from seconds to pixels
   for the whole room — and the lines belong on it, once, rather than
   re-derived inside each waveform.
 
   So this asserts the same property against the new shape: the lines, the
   clips and the playhead are all placed as a percentage of one `total`. If
   they ever stop sharing it, they stop agreeing, which is the fault this
   check has always been about. */
const line = readFileSync('app/components/BoothTimeline.tsx', 'utf8');
ok('the bar lines are spaced by the meter', /const bar = barSeconds\(meter\);/.test(line));
ok('  and placed on the same axis as the clips and the playhead',
  /\{bars\.map\(\(second\) => \(/.test(line) && /left: `\$\{percent\(second\)\}%`/.test(line),
  'a second measured one way for the grid and another for the sound is the old fault back');
ok('  from the one function that turns a second into a place on it',
  /const percent = \(seconds: number\): number =>/.test(line));
ok('and the timeline is given the meter to draw them from', /readonly meter: Meter;/.test(line));

console.log(
  failures
    ? `\ncheck:bars — ${failures} assertion(s) failed.`
    : '\ncheck:bars — counted from one, in the time signature that is set.',
);
process.exit(failures ? 1 : 0);

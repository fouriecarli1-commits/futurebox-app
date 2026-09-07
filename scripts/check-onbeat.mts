/**
 * The cuts land on the beat, and nothing is quietly ruined getting there.
 *
 * A cut half a beat late does not read as slightly worse. It reads as an
 * accident, and it is the difference between a music video and a slideshow
 * with a song over it. So the arithmetic is worth holding to, because it is
 * the kind that looks right in the code and is off by one beat on the screen.
 *
 * The cases below are the ones that go wrong in practice: a clip shorter than
 * it was asked for, a window that would snap past the end of its own clip, a
 * tempo read at half or double, and a shot too short to hold a single beat.
 */
import { snapped, beatOf, sane, runsFor, SLOWEST, FASTEST } from '../app/lib/onbeat.ts';

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}
const near = (a: number, b: number) => Math.abs(a - b) < 0.001;

/* ── The tempo itself ──────────────────────────────────────────────────── */

ok('120 bpm is half a second a beat', near(beatOf(120), 0.5));
ok('90 bpm is two thirds of a second', near(beatOf(90), 2 / 3));
ok(`${SLOWEST} and ${FASTEST} are inside the range`, sane(SLOWEST) && sane(FASTEST));
ok('and nothing musical lives outside it', !sane(SLOWEST - 1) && !sane(FASTEST + 1) && !sane(NaN));

/* ── Snapping ──────────────────────────────────────────────────────────── */

{
  /* A five-second clip at 120bpm: ten beats exactly, so nothing to do. */
  const same = snapped({ from: 0, to: 5 }, 5, 120);
  ok('a window already on the beat is left alone', same === null);
}
{
  /* 4.8 seconds at 120bpm is 9.6 beats. Ten beats would be 5s, past the end,
     so it comes down to nine — 4.5s — rather than clamping to 4.8. */
  const cut = snapped({ from: 0, to: 4.8 }, 4.8, 120);
  ok('a clip shorter than it was asked for still lands on a beat', cut !== null && near(cut.to ?? 0, 4.5),
    cut ? String(cut.to) : 'nothing');
}
{
  /* Never past the end of the clip: that is a frozen frame, not a cut. */
  const cut = snapped({ from: 0, to: 10 }, 4.8, 120);
  ok('and never past the end of its own clip', cut === null || (cut.to ?? 0) <= 4.8,
    cut ? String(cut.to) : 'nothing');
}
{
  /* 2.8s at 120bpm is 5.6 beats. Rounding gives six — 3.0s — and flooring
     gives five. Every earlier case here had a fraction under a half, where
     round and floor agree, so swapping one for the other passed the whole
     file: every cut would have come out a beat short and nothing would have
     said so. */
  const cut = snapped({ from: 0, to: 2.8 }, 5, 120);
  ok('a window past the half beat rounds up rather than down', cut !== null && near(cut.to ?? 0, 3),
    cut ? String(cut.to) : 'nothing');
}
{
  const cut = snapped({ from: 1, to: 3.2 }, 5, 120);
  ok('a window that starts late snaps from where it starts', cut !== null && near(cut.to ?? 0, 3),
    cut ? String(cut.to) : 'nothing');
}
{
  /* A shot too short to hold one beat at this tempo. Snapping it would take it
     to nothing or stretch it past its end, so it is left as it is. */
  const cut = snapped({ from: 0, to: 0.3 }, 0.3, 60);
  ok('a clip too short for one beat is left alone', cut === null, cut ? String(cut.to) : '');
}
{
  ok('an unusable tempo changes nothing', snapped({ from: 0, to: 5 }, 5, 0) === null);
  ok('and neither does a clip of no length', snapped({ from: 0, to: 5 }, 0, 120) === null);
}
{
  /* Half and double. Both are musical answers; the point is that the app is
     not silently sure which one it heard, and that both produce whole beats. */
  const slow = snapped({ from: 0, to: 5 }, 5, 70);
  const fast = snapped({ from: 0, to: 5 }, 5, 140);
  const whole = (one: { to?: number } | null, bpm: number) =>
    one === null || near(((one.to ?? 0) / beatOf(bpm)) % 1, 0) || near(((one.to ?? 0) / beatOf(bpm)) % 1, 1);
  ok('a tempo heard at half still lands on whole beats', whole(slow, 70));
  ok('and one heard at double does too', whole(fast, 140));
}

/* ── The film's length ─────────────────────────────────────────────────── */

ok(
  'the run time is the sum of the windows, not of the clips',
  near(runsFor([{ from: 0, to: 4.5 }, { from: 1, to: 3 }], [5, 5]), 6.5),
);
ok(
  'and an untrimmed shot counts as its whole clip',
  near(runsFor([{}, { from: 0, to: 2 }], [5, 5]), 7),
);

if (failures > 0) {
  console.log(`\ncheck:onbeat — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:onbeat — every cut lands on a beat, and none past the end of its clip.');
}

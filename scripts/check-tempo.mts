/**
 * The sums under the metronome, the grid and the transport clock.
 *
 * Four features share one set of arithmetic, and every one of them is wrong in
 * the same way when it is wrong: a click and a snap that disagree by a few
 * milliseconds put a take a hair behind the grid it was played to. That is
 * audible and invisible, which is the combination worth a gate.
 */
import {
  DEFAULT_METER, barSeconds, beatSeconds, clicksIn, countInSeconds, displayOf,
  positionOf, sane, secondsOf, snapped, type Meter,
} from '../app/lib/tempo.ts';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

const four4: Meter = { bpm: 120, beats: 4, unit: 4, key: 'C' };
const three4: Meter = { bpm: 90, beats: 3, unit: 4, key: 'G' };
const six8: Meter = { bpm: 120, beats: 6, unit: 8, key: 'D' };

// ── The two numbers everything else rests on ─────────────────────────────
check('120 bpm is half a second a beat', near(beatSeconds(four4), 0.5), String(beatSeconds(four4)));
check('and a 4/4 bar is two seconds', near(barSeconds(four4), 2));
check('a 3/4 bar at 90 is two seconds too', near(barSeconds(three4), 2), String(barSeconds(three4)));
/* The one that is easy to get wrong: in 6/8 the tempo counts quavers, so a bar
   is six of them, not four. A version that assumed crotchets would make this
   bar half as long and the metronome would be in a different time. */
check('6/8 at 120 counts quavers, so a bar is three seconds', near(barSeconds(six8), 3), String(barSeconds(six8)));

// ── The transport reading ────────────────────────────────────────────────
check('the session starts at bar one, beat one', displayOf(0, four4) === '001 01', displayOf(0, four4));
check('two seconds in is bar two', displayOf(2, four4) === '002 01', displayOf(2, four4));
check('half a second in is beat two', displayOf(0.5, four4) === '001 02', displayOf(0.5, four4));
check('and bars are padded to three digits', displayOf(secondsOf(91, 1, four4), four4) === '091 01',
  displayOf(secondsOf(91, 1, four4), four4));
check('a negative time does not produce bar zero', displayOf(-5, four4) === '001 01', displayOf(-5, four4));

// Round trip: the two directions have to agree, or the playhead lands
// somewhere the ruler does not say it is.
for (const [bar, beat] of [[1, 1], [2, 3], [17, 4], [91, 2]] as const) {
  const at = secondsOf(bar, beat, four4);
  const back = positionOf(at, four4);
  check(`bar ${bar} beat ${beat} reads back as itself`,
    back.bar === bar && back.beat === beat && back.into < 1e-9,
    `${back.bar}/${back.beat}/${back.into}`);
}

// ── Snapping ─────────────────────────────────────────────────────────────
check('off leaves a position exactly alone', snapped(1.234, four4, 'off') === 1.234);
check('beat rounds to the nearest half second', near(snapped(1.4, four4, 'beat'), 1.5), String(snapped(1.4, four4, 'beat')));
check('bar rounds to the nearest two seconds', near(snapped(2.9, four4, 'bar'), 2), String(snapped(2.9, four4, 'bar')));
/* Smart is a stated rule, not a feeling: within a beat of a bar line it takes
   the bar, otherwise the beat. Both sides of that line are pinned, because a
   snap nobody can predict is worse than no snap. */
check('smart takes the bar when it is within a beat of one',
  near(snapped(2.4, four4, 'smart'), 2), String(snapped(2.4, four4, 'smart')));
check('and the beat when it is not',
  near(snapped(3.1, four4, 'smart'), 3), String(snapped(3.1, four4, 'smart')));
check('snapping never moves something already on the grid',
  near(snapped(4, four4, 'smart'), 4) && near(snapped(0.5, four4, 'beat'), 0.5));

// ── The metronome ────────────────────────────────────────────────────────
{
  const clicks = clicksIn(0, 2, four4, '1/1');
  check('a 4/4 bar has four clicks', clicks.length === 4, String(clicks.length));
  check('the first is the downbeat', clicks[0]?.downbeat === true && clicks[0]?.at === 0);
  check('and the others are not', clicks.slice(1).every((one) => !one.downbeat));
}
{
  const clicks = clicksIn(0, 2, four4, '1/8');
  check('an eighth of a beat gives eight clicks per beat', clicks.length === 32, String(clicks.length));
  check('four of them are on the beat', clicks.filter((one) => one.onBeat).length === 4,
    String(clicks.filter((one) => one.onBeat).length));
  check('and exactly one is the downbeat', clicks.filter((one) => one.downbeat).length === 1);
}
{
  /* The bug this function exists to not have. Scheduling happens in windows,
     and a closed interval emits the click on the boundary in both of them —
     two clicks milliseconds apart, which is a flam and is the classic error in
     every metronome ever written. */
  const first = clicksIn(0, 1, four4, '1/1');
  const second = clicksIn(1, 2, four4, '1/1');
  const times = [...first, ...second].map((one) => one.at);
  check('windows that meet do not click twice on the boundary',
    new Set(times).size === times.length, times.join(','));
  check('and between them they lose nothing',
    times.length === clicksIn(0, 2, four4, '1/1').length, `${times.length}`);
}
{
  /* Counted from zero rather than added a step at a time. Adding accumulates
     float error; at 1/8 over four minutes that is enough drift to hear. */
  const late = clicksIn(240, 240.5, four4, '1/8');
  check('a click four minutes in is still exactly on the grid',
    late.every((one) => near(one.at / (beatSeconds(four4) / 8), Math.round(one.at / (beatSeconds(four4) / 8)))),
    late.map((one) => one.at).join(','));
}
check('a backwards window asks for nothing', clicksIn(2, 1, four4, '1/1').length === 0);
check('an empty window asks for nothing', clicksIn(1, 1, four4, '1/1').length === 0);

// ── Counting in ──────────────────────────────────────────────────────────
check('no count-in is no time at all', countInSeconds(0, four4) === 0);
check('one bar of 4/4 at 120 is two seconds', near(countInSeconds(1, four4), 2));
check('two bars is four', near(countInSeconds(2, four4), 4));
check('and a count-in follows the time signature', near(countInSeconds(1, three4), 2));

// ── What is refused ──────────────────────────────────────────────────────
check('a tempo of zero is not accepted', sane({ ...four4, bpm: 0 }).bpm === DEFAULT_METER.bpm,
  String(sane({ ...four4, bpm: 0 }).bpm));
check('nor a negative one', sane({ ...four4, bpm: -60 }).bpm === 20, String(sane({ ...four4, bpm: -60 }).bpm));
check('nor one faster than the ear separates', sane({ ...four4, bpm: 5000 }).bpm === 300);
check('a time signature of zero beats is refused', sane({ ...four4, beats: 0 }).beats === 4);
check('and an impossible unit is refused', sane({ ...four4, unit: 5 }).unit === 4);
check('a tempo of zero cannot divide by zero downstream',
  Number.isFinite(beatSeconds({ ...four4, bpm: 0 })) && beatSeconds({ ...four4, bpm: 0 }) > 0);

if (bad) {
  console.error(`\ncheck:tempo — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:tempo — the click, the grid and the clock agree, in any time signature.');

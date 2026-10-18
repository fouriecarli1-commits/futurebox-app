/**
 * The looper's arithmetic: `lib/looper.ts`.
 *
 *   npm run check:looper
 *
 * The owner, 18 October 2026: a looper in the jam room, and a plus on
 * everybody else's screen while somebody loops. What is held here is the part
 * a screen cannot show: that a loop is the length its tempo says, that a hit
 * lands where it was played, that a loop arriving from somebody else is
 * cleaned before it is kept or played, and that adding theirs to yours keeps
 * yours and stays within the limit.
 */
import {
  BARS, BEATS_PER_BAR, MOST_HITS, MOST_LAYERS, MOST_VOICE_CHARS,
  addInto, beatSeconds, cleanLoop, loopSeconds, placeIn, rateFor, roundsFor, snap, type Layer,
} from '../app/lib/looper.ts';
import { MOST_REPEATS, passesOf } from '../app/lib/session.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

/* ── Length and place ─────────────────────────────────────────────────── */
ok('two bars of four at 120 BPM is four seconds', near(loopSeconds(120), 4), String(loopSeconds(120)));
ok('  and at 100 BPM, 4.8', near(loopSeconds(100), 4.8));
ok('  and the loop really is two bars of four', BARS === 2 && BEATS_PER_BAR === 4);
ok('a beat at 120 is half a second, which is how fast the plus pulses', near(beatSeconds(120), 0.5));
ok('a moment one second into a 4-second loop is a quarter of the way',
  near(placeIn(11, 10, 120), 0.25), String(placeIn(11, 10, 120)));
ok('  and the second pass starts again at nought', near(placeIn(14, 10, 120), 0));
ok('  and a moment before the start still lands inside the loop',
  near(placeIn(9, 10, 120), 0.75), String(placeIn(9, 10, 120)));

/* ── Snapping ─────────────────────────────────────────────────────────── */
ok('a hit a hair late is put on the sixteenth', near(snap(0.126), 0.125), String(snap(0.126)));
ok('  and one a hair early too', near(snap(0.249), 0.25));
ok('  and one at the very end of the loop goes to the start, not past it', snap(0.999) === 0);

/* ── Tempo ────────────────────────────────────────────────────────────── */
ok('a recording made at 100 plays at 1.2× in a loop at 120', near(rateFor(100, 120), 1.2));
ok('  and at its own tempo, at 1×', near(rateFor(90, 90), 1));

/* ── Cleaning a loop that arrives ─────────────────────────────────────── */
ok('nothing is not a loop', cleanLoop(null) === null && cleanLoop('loop') === null);
ok('a loop with no tempo is not a loop', cleanLoop({ layers: [] }) === null);
ok('a tempo nobody plays at is refused', cleanLoop({ bpm: 900, layers: [{ kind: 'pads', hits: [{ pad: 'kick', at: 0 }] }] }) === null);
ok('a loop with no layers worth playing is not a loop',
  cleanLoop({ bpm: 100, layers: [{ kind: 'pads', hits: [{ pad: 'cowbell', at: 0.1 }] }] }) === null);

const messy = cleanLoop({
  bpm: 100,
  layers: [
    { id: 'a', kind: 'pads', from: '<b>Thandi</b>', hits: [
      { pad: 'kick', at: 0 }, { pad: 'snare', at: 0.5 }, { pad: 'cowbell', at: 0.25 },
      { pad: 'hihat', at: 1.5 }, { pad: 'hihat', at: -0.1 }, { pad: 'riser', at: 'x' },
    ] },
    { id: 'b', kind: 'voice', audio: 'AAAA', type: 'audio/webm;codecs=opus', bpm: 90 },
    { id: 'c', kind: 'voice', audio: 'not base64!', type: 'audio/webm' },
    { id: 'd', kind: 'voice', audio: 'AAAA', type: 'text/html' },
    { id: 'e', kind: 'video', src: 'x' },
  ],
});
const pads = messy?.layers[0];
ok('a pad that is not one of the four, and a hit outside the loop, are dropped',
  pads?.kind === 'pads' && pads.hits.length === 2, JSON.stringify(pads));
ok('  and a name is made plain text', pads?.from === 'b Thandi /b', String(pads?.from));
ok('a recording that is audio and base64 is kept, with the tempo it was made at',
  messy?.layers[1]?.kind === 'voice' && (messy.layers[1] as { bpm: number }).bpm === 90);
ok('  and one that is not base64, or not audio, or not a layer at all, is not',
  messy?.layers.length === 2, `${messy?.layers.length} layers`);
ok('a recording too long to share is refused',
  cleanLoop({ bpm: 100, layers: [{ kind: 'voice', audio: 'A'.repeat(MOST_VOICE_CHARS + 4), type: 'audio/webm' }] }) === null);
const crowded = cleanLoop({
  bpm: 100,
  layers: Array.from({ length: MOST_LAYERS + 4 }, () => ({ kind: 'pads', hits: [{ pad: 'kick', at: 0 }] })),
});
ok(`a loop is cut to ${MOST_LAYERS} layers`, crowded?.layers.length === MOST_LAYERS, String(crowded?.layers.length));
const busy = cleanLoop({
  bpm: 100,
  layers: [{ kind: 'pads', hits: Array.from({ length: MOST_HITS + 50 }, (_, i) => ({ pad: 'hihat', at: (i % 32) / 32 })) }],
});
ok(`and a pad layer to ${MOST_HITS} hits`, busy?.layers[0]?.kind === 'pads' && busy.layers[0].hits.length === MOST_HITS);

/* ── Adding theirs to yours ───────────────────────────────────────────── */
const mine: Layer[] = [{ id: 'm1', kind: 'pads', hits: [{ pad: 'kick', at: 0 }] }];
const theirs = cleanLoop({ bpm: 120, layers: [
  { id: 't1', kind: 'pads', hits: [{ pad: 'snare', at: 0.25 }] },
  { id: 't2', kind: 'pads', from: 'Sipho', hits: [{ pad: 'hihat', at: 0.5 }] },
] });
const both = theirs ? addInto(mine, theirs, 'Lerato', 'x') : [];
ok('yours stays first and theirs follows', both.length === 3 && both[0].id === 'm1');
ok('  and each added layer says who made it, keeping a name it already had',
  both[1]?.from === 'Lerato' && both[2]?.from === 'Sipho', `${both[1]?.from} / ${both[2]?.from}`);
ok('  and gets an id of its own, so adding the same loop twice does not collide',
  new Set(both.map((one) => one.id)).size === both.length && theirs !== null
    && addInto(both, theirs, 'Lerato', 'y').every((one, at, all) => all.findIndex((other) => other.id === one.id) === at));
const full: Layer[] = Array.from({ length: MOST_LAYERS - 1 }, (_, at) => ({ id: `f${at}`, kind: 'pads', hits: [{ pad: 'kick', at: 0 }] }));
ok('a full loop takes only as much as fits', theirs !== null && addInto(full, theirs, 'Lerato', 'z').length === MOST_LAYERS);

/* ── The booth: a looped take, and a loop sent to it ──────────────────── */
/* Three seconds of count-in and round trip, then a 2-second piece sung round
   three and a half times. */
const passes = passesOf(3 + 2 * 3.5, 3, 2);
ok('a take sung round a 2-second piece three and a half times is three passes and a half one',
  passes.length === 4 && passes[0].from === 3 && passes[0].to === 5 && passes[2].to === 9,
  JSON.stringify(passes));
ok('  and the half pass at the end is kept, cut to what was sung', passes[3]?.from === 9 && passes[3]?.to === 10);
ok('  but a pass barely started is not a take',
  passesOf(3 + 2 * 3.2, 3, 2).length === 3, JSON.stringify(passesOf(3 + 2 * 3.2, 3, 2)));
ok('  and a take that never reached the piece has no passes', passesOf(2.5, 3, 2).length === 0);
ok('a loop sent to the booth goes round to the end of a 3-minute song',
  roundsFor(180, loopSeconds(100), MOST_REPEATS) === 38, String(roundsFor(180, loopSeconds(100), MOST_REPEATS)));
ok('  and never more often than a lane may repeat', roundsFor(3600, 4, MOST_REPEATS) === MOST_REPEATS);
ok('  and eight times when there is no song length to go by', roundsFor(0, 4, MOST_REPEATS) === 8);

if (bad) {
  console.error(`\ncheck:looper — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:looper — a loop is the length its tempo says, hits land where they were played, a loop from the room is cleaned before it is kept, and adding one keeps yours.');

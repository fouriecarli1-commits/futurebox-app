/**
 * ProBooth's studio basics added 29 October 2026, held to what they say:
 * reverse plays backwards, normalise lands the loudest sample at -1 dB and
 * leaves silence alone, sends reach the shared room and echo in playback,
 * in the mixdown and in a stem alike, and every lane and the master has a
 * meter that reads real sound.
 */
import { readFileSync } from 'node:fs';
import { NORMAL_PEAK, normalisedCopy, reversedCopy, valueAt } from '../app/lib/session.ts';
import { valueOfY, yOfValue } from '../app/components/BoothAuto.tsx';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

/* A stand-in for an AudioBuffer and the context that makes one: enough for
   the two functions under test, which only read channels and make buffers. */
const bufferOf = (channels: number[][], rate = 8000) => {
  const data = channels.map((one) => Float32Array.from(one));
  return {
    numberOfChannels: data.length,
    length: data[0].length,
    sampleRate: rate,
    getChannelData: (c: number) => data[c],
  } as unknown as AudioBuffer;
};
const ctx = {
  createBuffer: (channels: number, length: number, rate: number) =>
    bufferOf(Array.from({ length: channels }, () => new Array(length).fill(0)), rate),
} as unknown as BaseAudioContext;

const back = reversedCopy(bufferOf([[1, 2, 3, 4], [5, 6, 7, 8]]), ctx);
ok('reverse plays every channel backwards', Array.from(back.getChannelData(0)).join() === '4,3,2,1' && Array.from(back.getChannelData(1)).join() === '8,7,6,5');

const quiet = normalisedCopy(bufferOf([[0.1, -0.25, 0.05], [0.2, 0, -0.1]]), ctx);
const top = Math.max(...[0, 1].flatMap((c) => Array.from(quiet.getChannelData(c)).map(Math.abs)));
ok('normalise lands the loudest sample at -1 dB, across both channels', Math.abs(top - NORMAL_PEAK) < 1e-6, String(top));
ok('  and keeps the shape: every sample scaled by the same number', Math.abs(quiet.getChannelData(1)[0] / quiet.getChannelData(0)[0] - 2) < 1e-6);
const silent = normalisedCopy(bufferOf([[0, 0, 0]]), ctx);
ok('  and leaves silence silent rather than turning up nothing', Array.from(silent.getChannelData(0)).every((v) => v === 0));

/* Automation: straight lines between points, flat beyond them. */
const line = [{ t: 2, v: 0 }, { t: 4, v: 1 }];
ok('an automation line is flat before its first point and after its last', valueAt(line, 0, 1) === 0 && valueAt(line, 9, 1) === 1);
ok('  and runs straight between them', Math.abs(valueAt(line, 3, 1) - 0.5) < 1e-9 && Math.abs(valueAt([...line].reverse(), 3.5, 1) - 0.75) < 1e-9);
ok('  and no points is the fader as set', valueAt([], 3, 0.7) === 0.7 && valueAt(undefined, 3, 0.7) === 0.7);
ok('a point near the foot of a volume line is silence, near the top the fader', valueOfY('gain', 0.97) === 0 && valueOfY('gain', 0.03) === 1 && Math.abs(valueOfY('gain', 0.5) - 0.5) < 1e-9);
ok('  and near the middle of a pan line is the centre, left at the top', valueOfY('pan', 0.52) === 0 && valueOfY('pan', 0) === -1 && valueOfY('pan', 1) === 1);
ok('  and drawing puts every value back where it was read from', [0, 0.25, 0.5, 1].every((v) => Math.abs(valueOfY('gain', yOfValue('gain', v)) - v) < 0.09));

const session = withoutComments(readFileSync('app/lib/session.ts', 'utf8'));
const booth = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
const timeline = withoutComments(readFileSync('app/components/BoothTimeline.tsx', 'utf8'));
ok('the sends reach the returns in the mixdown', /wireLane\(offline, lane, bus, returns\)/.test(session) && /wireReturns\(offline, bus, master\.bpm\)/.test(session));
ok('  in a stem', /wireLane\(offline, \{ \.\.\.lane, muted: false, soloed: false \}, bus, returns\)/.test(session));
ok('  and in what is heard while it plays', /wireLane\(ctx, lane, ear, returns\)/.test(booth) && /wireReturns\(ctx, bus, meter\.bpm\)/.test(booth));
ok('  post-fader, after the pan, as a desk sends', /out = place;[\s\S]{0,700}out\.connect\(send\)\.connect\(returns\[which\]\)/.test(session));
ok('the echo is a beat at the session tempo, and the tempo is on the master', /60 \/ Math\.max\(30, Math\.min\(300, bpm\)\)/.test(session) && /\{ \.\.\.was, bpm: meter\.bpm \}/.test(booth));
ok('the sends are saved with the lane and read back', /sends: \{ \.\.\.lane\.sends \}/.test(readFileSync('app/lib/keepsession.ts', 'utf8')) && /\{ sends: lane\.sends \}/.test(booth));
ok('  and change the mix signature, so a changed send is a new mix to pay for', /JSON\.stringify\(one\.sends \?\? null\)/.test(booth));
ok('every playing lane has an ear for its meter, on the lane after its own chain', /ear\.connect\(bus\);[\s\S]{0,120}laneEars\.current\.set\(lane\.id, ear\)/.test(booth));
ok('  shown on its header in the timeline and on its mixer strip', /<LaneMeter[\s\S]{0,80}earOf\(lane\.id\)/.test(timeline) && /<LaneMeter[\s\S]{0,120}earOf\(lane\.id\)/.test(booth));
ok('  and the master has one, reading the sound as it leaves', /<LaneMeter[\s\S]{0,80}scopeRef\.current/.test(booth));
ok('reverse and normalise are region tools that go on the undo stack', /id: 'reverse'/.test(booth) && /id: 'normalise'/.test(booth) && /const regionBake[\s\S]{0,400}commit\(/.test(booth));

ok('the automation is laid onto the lane where it starts, so playback and every render follow it',
  /RIDES\.set\(source, \{ level, base: lane\.gain, place \}\)/.test(session)
    && /const rides = RIDES\.get\(source\);[\s\S]{0,200}ride\(rides\.level\.gain, lane\.auto\.gain, rides\.base/.test(session)
    && /ride\(rides\.place\.pan, lane\.auto\.pan, 1/.test(session));
ok('  and is saved with the lane, read back, and part of the mix signature',
  /auto: \{ gain: lane\.auto\.gain\?\.map/.test(readFileSync('app/lib/keepsession.ts', 'utf8')) && /\{ auto: lane\.auto \}/.test(booth) && /JSON\.stringify\(one\.auto \?\? null\)/.test(booth));
ok('  and a lane drawn down to silence is not reported as a broken speaker', /valueAt\(one\.auto\.gain, from, 1\) <= 0\.001/.test(booth));

ok('punch in starts the take before the mark, so the singer hears the run-up', /const from = span \? span\.from : punch \? Math\.max\(0, punch\.from - PUNCH_RUNUP\) : at;/.test(booth) && /const PUNCH_RUNUP = 2;/.test(booth));
ok('  keeps only the marked piece, with a hair of fade at each join', /from: inFrom,\s*to: inTo,[\s\S]{0,120}fadeIn: PUNCH_FADE,\s*fadeOut: PUNCH_FADE/.test(booth));
ok('  cuts the marked piece out of the open lane under it, never the song itself', /one\.id === punch\.into && !one\.backing/.test(booth) && /carveLane\(under, punch\.from, punch\.to\)/.test(booth));
ok('  and is one undoable step', /remember\(t\('undo\.punch'/.test(booth));

if (bad) {
  console.error(`\ncheck:dawtools — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:dawtools — reverse, normalise, sends and meters do what they say.');

/**
 * The song's beat on the film's clock, and the cuts landed on it
 * (`app/lib/beatgrid.ts`, docs/VIDEO-EDITOR-ROADMAP.md gap 1).
 *
 * Held against a click track whose tempo AND first beat are known, because a
 * tempo alone says how far apart the beats are and not where they fall, and a
 * cut a third of a beat late is the off-beat cut this exists to remove.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { tempoOf } from '../app/lib/listen.ts';
import { filmBeats, onTheBeat, phaseOf, retimed } from '../app/lib/beatgrid.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

/* A click every beat at `bpm`, the first at `first` seconds, over a quiet hum. */
const clicks = (bpm: number, first: number, seconds: number, rate = 22050): Float32Array => {
  const out = new Float32Array(Math.round(seconds * rate));
  for (let i = 0; i < out.length; i += 1) out[i] = 0.02 * Math.sin((2 * Math.PI * 110 * i) / rate);
  for (let at = first; at < seconds; at += 60 / bpm) {
    const s = Math.round(at * rate);
    for (let j = 0; j < 400 && s + j < out.length; j += 1) out[s + j] += 0.9 * Math.exp(-j / 80) * Math.sin(j * 0.9);
  }
  return out;
};

for (const [bpm, first] of [[120, 0.13], [96, 0.31], [140, 0.05]] as const) {
  const song = clicks(bpm, first, 20);
  const heard = tempoOf(song, 22050);
  ok(`a click track at ${bpm} is heard at ${bpm} (or its half or double)`, [bpm, bpm / 2, bpm * 2].some((one) => Math.abs(heard - one) < 2), String(heard));
  const phase = phaseOf(song, 22050, bpm);
  ok(`  and its first beat is found at ${first}s`, Math.abs(phase - first) < 0.025, phase.toFixed(3));
}

const grid = { bpm: 120, phase: 0.1 };
const plain = filmBeats(grid, [{ at: 0, from: 0, long: 3 }]);
ok('the beats land on the film where they fall in the song', JSON.stringify(plain) === JSON.stringify([0.1, 0.6, 1.1, 1.6, 2.1, 2.6]), JSON.stringify(plain));
const later = filmBeats(grid, [{ at: 0, from: 10, long: 1 }]);
ok('  from wherever in the song the film starts', JSON.stringify(later) === JSON.stringify([0.1, 0.6]), JSON.stringify(later));
const skipped = filmBeats(grid, [{ at: 0, from: 0, long: 1 }, { at: 1, from: 5.35, long: 1 }]);
ok('  and past a stretch cut out of the song, on the new stretch\'s own beat', JSON.stringify(skipped) === JSON.stringify([0.1, 0.6, 1.25, 1.75]), JSON.stringify(skipped));
const faster = filmBeats(grid, [{ at: 0, from: 0, long: 1 }], 2);
ok('  and twice as often when the song plays twice as fast', faster.length === 4 && Math.abs(faster[1] - 0.3) < 1e-6, JSON.stringify(faster));
ok('half and double the tempo keep the first beat inside one beat', retimed(grid, 0.5)?.bpm === 60 && retimed({ bpm: 100, phase: 0.5 }, 2)?.bpm === 200 && (retimed({ bpm: 100, phase: 0.5 }, 2)?.phase ?? 1) < 0.3 && retimed({ bpm: 150, phase: 0 }, 2) === null);

const beats = filmBeats({ bpm: 120, phase: 0 }, [{ at: 0, from: 0, long: 20 }]);
const moved = onTheBeat([
  { id: 'a', from: 0, to: 1.8, real: 5 },
  { id: 'b', from: 1, to: 2.2, real: 1.6 },
  { id: 'c', from: 0, to: 1.8, speed: 2, real: 10 },
], beats);
ok('a shot ending at 1.8s ends on the beat at 2.0s', moved.get('a') === 2, JSON.stringify([...moved]));
ok('  the next is only made as long as its clip allows (to 1.5s of a 1.6s clip)', moved.get('b') === 1.5, JSON.stringify([...moved]));
ok('  and a sped-up shot is measured in film seconds (0.9s of film at 2x ends on the beat at 3.5s: 2.0s of clip)', moved.get('c') === 2, JSON.stringify([...moved]));
const none = onTheBeat([{ id: 'x', from: 0, to: 0.1, real: 0.1 }], [0.5]);
ok('a clip too short to reach any beat is left alone', none.size === 0);

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
ok('the Video Editor hears the song\'s beat', /hearGrid\(/.test(room));
ok('  marks it on the music lane', /data-editorbeatmark/.test(room));
ok('  and lands every cut on it from one button', /data-editoronbeat/.test(room) && /onTheBeat\(/.test(room));
ok('  with the tempo shown and halved or doubled by hand', /data-editorbeathalf/.test(room) && /data-editorbeatdouble/.test(room));

if (bad) {
  console.error(`\ncheck:beatgrid — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:beatgrid — the song\'s beat is found, put on the film\'s clock, and every cut lands on it.');

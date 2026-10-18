/**
 * The best moments of a shot, without a browser.
 *
 *   npm run check:highlights
 *
 * The owner, 16 October 2026: a clipper that finds the best moments and arranges
 * them. What has to hold is that the loud, rising parts are the ones taken,
 * that they add up to about what was asked for, that none overlaps another
 * or leaves the shot, that they come back in the order they happened, that a
 * shot with no sound is spread evenly rather than refused, and that the reel
 * on the clock is the same shot cut into those moments.
 */
import { readFileSync } from 'node:fs';
import { TENTH, bestMoments, evenly, loudness, momentLength, reel } from '../app/lib/highlights.ts';
import type { Edit } from '../app/lib/videoedit.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* Two minutes of quiet room with four bursts in it, at 20, 50, 80 and 100 s. */
const SECONDS = 120;
const env = new Float32Array(SECONDS / TENTH).fill(0.02);
const bursts = [[20, 4, 0.9], [50, 3, 0.6], [80, 5, 1], [100, 3, 0.5]] as const;
for (const [at, long, level] of bursts) for (let i = at / TENTH; i < (at + long) / TENTH; i += 1) env[i] = level;

const fifteen = bestMoments(env, 0, SECONDS, 15);
ok('a fifteen-second reel is five moments of three seconds', fifteen.length === 5 && momentLength(15) === 3, JSON.stringify(fifteen));
const hits = (m: { from: number; to: number }): boolean => bursts.some(([at, long]) => m.from < at + long && at < m.to);
const thirty = bestMoments(env, 0, SECONDS, 30);
ok('the bursts are the moments taken', bursts.every(([at, long]) => thirty.some((m) => m.from < at + long && at < m.to)), JSON.stringify(thirty));
ok('  the loudest first in strength', thirty.find((m) => m.from <= 81 && m.to >= 81)?.score === 1);
ok('  and each burst is caught from just before it starts, not from its middle', bursts.every(([at, long]) => {
  const first = fifteen.filter((m) => hits(m) && m.from < at + long && at < m.to)[0];
  return first && first.from <= at && first.from >= at - 0.25;
}), JSON.stringify(fifteen));
ok('they come back in the order they happened', thirty.every((m, k) => k === 0 || m.from >= thirty[k - 1].to));
ok('  none overlaps another or leaves the shot', thirty.every((m) => m.from >= 0 && m.to <= SECONDS && m.to - m.from >= 1));
const total = thirty.reduce((sum, m) => sum + (m.to - m.from), 0);
ok('they add up to about what was asked for', total > 22 && total < 40, total.toFixed(1));
ok('only the part of the shot that is showing is read', bestMoments(env, 60, 120, 15).every((m) => m.from >= 60 && m.to <= 120));
ok('a shot shorter than the reel is the whole reel', JSON.stringify(bestMoments(env, 3, 12, 15)) === JSON.stringify([{ from: 3, to: 12, score: 1 }]));

const silent = bestMoments(new Float32Array(600), 0, 60, 15);
ok('a shot with no sound is spread evenly, not refused', silent.length === 5 && silent.every((m) => m.score === 0 && Math.abs(m.to - m.from - 3) < 0.01)
  && JSON.stringify(silent) === JSON.stringify(evenly(0, 60, 3, 5)));

/* Loudness from samples: a quiet second then a loud one. */
const rate = 8000;
const samples = new Float32Array(rate * 2);
for (let i = rate; i < rate * 2; i += 1) samples[i] = Math.sin(i / 3) * 0.8;
const read = loudness(samples, rate);
ok('loudness is read in tenths of a second', read.length === 20 && read[5] === 0 && read[15] > 0.5);

/* The reel on the clock. */
const blob = new Blob(['x']);
const edit: Edit = { pieces: [
  { id: 'a', clip: blob, name: 'before', from: 0, to: 2 },
  { id: 'long', clip: blob, name: 'the long one', from: 0, to: 120, look: 'warm' },
  { id: 'z', clip: blob, name: 'after', from: 0, to: 2 },
] } as Edit;
const made = reel(edit, 'long', thirty);
ok('the long shot becomes its moments, in its place', made.pieces.length === 2 + thirty.length && made.pieces[0].id === 'a' && made.pieces.at(-1)?.id === 'z');
ok('  each the same material cut to its moment, with its look kept', made.pieces.slice(1, -1).every((p, k) => p.clip === blob && p.from === thirty[k].from && p.to === thirty[k].to && p.look === 'warm'));
ok('  with ids of their own', new Set(made.pieces.map((p) => p.id)).size === made.pieces.length);
ok('an unknown shot, or no moments, changes nothing', reel(edit, 'nope', thirty) === edit && reel(edit, 'long', []) === edit);

const bench = readFileSync('app/components/BestMoments.tsx', 'utf8');
const editor = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('the clip bench reads the shot\'s sound with these functions', /loudness\(/.test(bench) && /bestMoments\(/.test(bench) && /<BestMoments\s/.test(editor));
ok('  and lays the reel down through the editor\'s own history, so Undo puts it back', /commit\(\(was\) => reel\(was, piece\.id, moments\)\)/.test(editor) && /setPicked\(`\$\{piece\.id\}-m1`\)/.test(editor));

if (bad) {
  console.error(`\ncheck:highlights — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\ncheck:highlights — the loud, rising parts are taken, in order, clear of each other, and laid on the clock as the same shot cut.');

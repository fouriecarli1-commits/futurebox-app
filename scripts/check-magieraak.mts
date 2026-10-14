/**
 * The photo editor's magic touch, and grabs that can be seen.
 *
 * Carli, 14 October 2026: *"Ek dink ook daar moet 'n magic mouse tool wees
 * wat op dele kliek en Ai kan dan die gedeelte verbeter (daar moet dan seker
 * opsies wees)."* And of the grabs: they must be visible, and a thing found
 * must be able to be changed by the AI.
 *
 * What matters most is held first: only the tapped part is sent, and what
 * comes back is laid into that part — the rest of her photograph never
 * leaves the phone and never changes.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { padded, spotRect } from '../app/lib/magicedit.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const room = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));

/* ── 1. The arithmetic of a part ──────────────────────────────────────── */
const spot = spotRect(0.5, 0.5, 0.1, 1000, 800);
ok('a tapped spot is a square round the tap', spot.left === 420 && spot.top === 320 && spot.width === 160 && spot.height === 160,
  JSON.stringify(spot));
const edge = spotRect(0, 0, 0.1, 1000, 800);
ok('  and it never leaves the photograph', edge.left === 0 && edge.top === 0 && edge.width === 80, JSON.stringify(edge));
const grown = padded({ left: 100, top: 100, width: 100, height: 100 }, 1000, 800, 0.2);
ok('a found thing is sent with some room round it', grown.left === 80 && grown.width === 140, JSON.stringify(grown));

/* ── 2. Only the part goes, only the part comes back ──────────────────── */
ok('the magic touch sends the cropped part, not the photograph',
  /packLed\(cropOf\(picture, rect\), \[\]\)/.test(room));
ok('  and lays the answer back into the same place',
  /laidIn\(picture, wide, tall, img, rect, shape\)/.test(room));
ok('  with a step back before it', /before\(t\('post\.stepMagic'/.test(room));

/* ── 3. It is a tool she can find, and it offers choices ──────────────── */
ok('Magic touch is one of the tools on the bar', /POST_MAGIC/.test(room) && /magic: magicBench/.test(room));
ok('  a tap marks the part while it is open', /bench === 'magic' && picture\)[\s\S]{0,200}setMagicSpot\(put\)/.test(room));
ok('  and the options are better, change into, and take away',
  /data-postmagicbetter/.test(room) && /data-postmagicchange/.test(room) && /data-postmagicfill/.test(room));
ok('  and what it becomes can be said, not only typed',
  /data-postmagicinto[\s\S]{0,700}<SpeakButton/.test(room));

/* ── 4. The grabs can be seen, and changed ────────────────────────────── */
ok('a found thing has its name on its box', /ctx\.fillText\(name, box\.left/.test(room));
ok('  and the AI options are offered for it', /things\.current\.has\(picked\.id\) && magicButtons\(picked\)/.test(room));
ok('the ring and the labels repaint when they change', /marks, markOn, bench, magicSpot, magicSize\]/.test(room));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

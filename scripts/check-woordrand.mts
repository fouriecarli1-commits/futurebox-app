/**
 * Words on a film have an edge, and it is the same weight at every size.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Ek dink ook daar moet heelwat 'n verskeidenheid
 * van teks opsies wees."*
 *
 * Measuring before adding found something worse than a short list. Words
 * burned into a film had **no outline and no shadow at all** — `stitch.ts`
 * set a fill colour and called `fillText`, and that was the whole of it.
 *
 * Which is fine on the shot it was tried on and invisible on the next one:
 * white words over a bright sky are gone, black words over a dark room are
 * gone. The caption box hid it, because at 62% black behind every caption
 * there is always contrast — so the fault only showed on the one setting
 * that exists precisely to have no box, a title card. The photo editor has
 * had a shadow since it was written; the cutting room never did.
 *
 * ── Why the arithmetic is held and not the canvas ────────────────────────
 *
 * A canvas is not something a check can read, and the thing that can be
 * wrong here is a number. A stroke too thin vanishes at 1080p; one too thick
 * closes the counters of an `e` and turns a word into a smudge. Both look
 * like a font problem rather than a width problem, and neither throws.
 *
 * So the widths live in `lib/wordsedge.ts` and are driven here at the sizes
 * a film is actually rendered at — and what is asserted is the SHARE rather
 * than the pixels, because the same edge in pixels is a hairline at 160px
 * and a slab at 24px.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { EDGES, EDGE_DEFAULT, paintedFor } from '../app/lib/wordsedge.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nWords on a film have an edge, at every size\n');

/* The range a caption is actually rendered at: a phone export at 720 and a
   4K one, with the sizes this app's own ladder produces in between. */
const SIZES = [24, 32, 48, 64, 96, 160];

/* ── 1. The weight is the same at every size ─────────────────────────── */

const shares = SIZES.map((size) => paintedFor('outline', size).stroke / size);
ok('the stroke is the same share of the text at every size',
  Math.max(...shares) - Math.min(...shares) < 0.03,
  `${shares.map((one) => `${(one * 100).toFixed(1)}%`).join(', ')} — a stroke`
  + ' fixed in pixels is a hairline on a 4K export and a smudge on a phone,'
  + ' and both read as a font problem rather than a width problem');

ok('  and never thin enough to disappear',
  SIZES.every((size) => paintedFor('outline', size).stroke >= 2),
  `${SIZES.map((size) => paintedFor('outline', size).stroke).join(', ')} — a`
  + ' stroke under two pixels is one the canvas draws as a grey suggestion,'
  + ' which is the setting doing nothing at exactly the size it is needed'
  + ' most');

ok('  and never thick enough to close a letter',
  SIZES.every((size) => paintedFor('outline', size).stroke / size < 0.12),
  `${shares.map((one) => `${(one * 100).toFixed(1)}%`).join(', ')} — past about`
  + ' a tenth the stroke closes the counters of an e and an a, and the word'
  + ' becomes a smudge');

/* ── 2. Each setting does what it says ───────────────────────────────── */

ok('"none" paints nothing',
  paintedFor('none', 48).stroke === 0 && paintedFor('none', 48).blur === 0,
  'the setting that exists to have no edge has one');

ok('  "outline" is a stroke and not a shadow',
  paintedFor('outline', 48).stroke > 0 && paintedFor('outline', 48).blur === 0,
  'the two settings do the same thing, which makes one of them a lie');

ok('  "shadow" is a shadow and not a stroke',
  paintedFor('shadow', 48).blur > 0 && paintedFor('shadow', 48).stroke === 0,
  'as above, the other way round');

ok('  and "both" is both',
  paintedFor('both', 48).stroke > 0 && paintedFor('both', 48).blur > 0,
  'the setting named for having both has one');

ok('  and a shadow that falls somewhere',
  paintedFor('shadow', 48).drop > 0,
  'a shadow with no offset is a glow, which reads as a blurred word rather'
  + ' than a lit one');

/* ── 3. The default is the fix, not the old behaviour ────────────────── */

ok('a film with nothing stored gets an edge',
  paintedFor(undefined, 48).stroke > 0,
  'an edit made before this existed renders exactly as it did — which was'
  + ' the bug. The default is deliberately a change to how old edits look');

ok('  and the default is named rather than implied',
  EDGE_DEFAULT !== 'none' && EDGES.some((one) => one.id === EDGE_DEFAULT),
  'the default is not one of the settings offered, so the room cannot show'
  + ' which one is on');

ok('  and every setting is offered in both languages',
  EDGES.length >= 4 && EDGES.every((one) => one.en.trim() && one.af.trim()),
  `${EDGES.length} setting(s) — a control with an English-only label is one`
  + ' half of this app cannot read');

/* ── 4. The painter actually uses it ─────────────────────────────────── */

const stitch = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));

ok('the film painter strokes the letters',
  /strokeText\(/.test(stitch) && /paintedFor\(/.test(stitch),
  'the arithmetic exists and the canvas still only fills — which is the'
  + ' state this whole file is about');

ok('  with a round join, so a capital A has no spike out of it',
  /lineJoin = 'round'/.test(stitch),
  'a mitre join at these widths shoots a spike out of every sharp corner,'
  + ' most visibly on an A or a W, which is most of a headline');

ok('  and clears the shadow after the words',
  /shadowBlur = 0/.test(stitch),
  'the shadow stays on the context and falls under the logo and everything'
  + ' else painted after — a bug that looks like the logo being wrong');

const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
ok('  and the words bench offers it',
  /data-editorwordsedge=/.test(room),
  'there is no control, so every film gets the default and nothing else');

const edit = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));
ok('  and the setting reaches the render',
  /edge: one\.wordsEdge/.test(edit),
  'the control sets a value the renderer never receives, so the button'
  + ' highlights and the film does not change');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

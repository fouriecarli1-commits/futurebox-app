/**
 * The caption palette: enough colours, all of them real, and the renderer and
 * the preview agreeing about what they draw.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Onthou dat die teks 'n kleur keuse ook moet hê, en
 * 'n keuse van agtergrond vir woorde, 'n square, 'n square met ronde punte, 'n
 * verfkwas. Die agtergrond moet ook kleur keuse hê. Daar moet 'n goeie variety
 * van kleur keuses wees."*
 *
 * Four things, and the fourth — "a good variety" — is the one that looks like
 * taste and is not. A palette of twenty near-identical greens is twenty
 * choices and one colour. Variety is measurable: how far apart the swatches
 * are, and how much of the circle they cover.
 *
 * ── And the rule that matters more than any of it ────────────────────────
 *
 * A caption nobody can read is worse than no caption. The default pairing has
 * to clear the 4.5:1 the rest of this app is held to, and the box's 62% is
 * what makes most pairings work — so the contrast is measured against the
 * COMPOSITED box, over a mid-grey frame, which is what she will actually see.
 */
import {
  BACK_DEFAULT, BOXES, BOX_DEFAULT, INK_DEFAULT, PAINTS, brushPath, isBox,
  paintFor, roundFor,
} from '../app/lib/videopaint';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = (c: readonly number[]): number => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: readonly number[], b: readonly number[]): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** The box at 62% over whatever is behind it, which is what the eye gets. */
const over = (back: string, frame: readonly number[]): number[] =>
  rgb(back).map((c, i) => Math.round(c * 0.62 + frame[i] * 0.38));

/* ── Enough colours, and really different ones ─────────────────────────── */

ok('there are enough colours to be a choice rather than a list',
  PAINTS.length >= 16,
  `${PAINTS.length} swatches — "a good variety" is a number, and under about a`
  + ' dozen is a row of defaults with a couple of extras');

ok('  and every one of them is a real six-digit colour',
  PAINTS.every((one) => /^#[0-9a-f]{6}$/.test(one.hex)),
  PAINTS.filter((one) => !/^#[0-9a-f]{6}$/.test(one.hex)).map((one) => one.id).join(', '));

ok('  and no two of them are the same colour twice',
  new Set(PAINTS.map((one) => one.hex)).size === PAINTS.length,
  'two ids on one colour is two choices that do the same thing');

ok('  and no two are so close that choosing between them is nothing',
  (() => {
    for (let i = 0; i < PAINTS.length; i += 1) {
      for (let j = i + 1; j < PAINTS.length; j += 1) {
        const [a, b] = [rgb(PAINTS[i].hex), rgb(PAINTS[j].hex)];
        const far = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
        if (far < 60) return false;
      }
    }
    return true;
  })(),
  'twenty swatches that are four shades of three colours is three choices');

/* The spread, which is what "variety" actually means: a palette can satisfy
   every rule above and still be all blues. */
const hues = PAINTS.map((one) => {
  const [r, g, b] = rgb(one.hex).map((v) => v / 255);
  const hi = Math.max(r, g, b);
  const lo = Math.min(r, g, b);
  if (hi - lo < 0.08) return -1;
  let h = 0;
  if (hi === r) h = ((g - b) / (hi - lo)) % 6;
  else if (hi === g) h = (b - r) / (hi - lo) + 2;
  else h = (r - g) / (hi - lo) + 4;
  return ((h * 60) + 360) % 360;
}).filter((h) => h >= 0);

const sixths = new Set(hues.map((h) => Math.floor(h / 60)));
ok('  and they cover the whole circle rather than one corner of it',
  sixths.size === 6,
  `${sixths.size} of 6 sixths of the hue circle — reds, oranges, yellows,`
  + ' greens, blues and purples all have to be reachable');

ok('  with neutrals as well, because most captions are set in one',
  PAINTS.filter((one) => {
    const [r, g, b] = rgb(one.hex);
    return Math.max(r, g, b) - Math.min(r, g, b) < 24;
  }).length >= 3,
  'white, black and a grey are what a caption is usually set in, and a palette'
  + ' of pure hues makes the common case the hard one');

/* ── Readable, which is the rule that outranks the rest ────────────────── */

const FRAME = [128, 128, 128];
const ink = paintFor('white')?.hex ?? INK_DEFAULT;
const back = paintFor('black')?.hex ?? BACK_DEFAULT;

ok('what a caption is set in by default is readable on any picture',
  ratio(rgb(ink), over(back, FRAME)) >= 4.5,
  `${ratio(rgb(ink), over(back, FRAME)).toFixed(2)}:1 — white on the black box`
  + ' at 62% over a mid-grey frame, which is the pairing nobody has to choose');

/* ── Three, not four and a half, and the reason is the size ────────────

   4.5:1 is the bar for BODY text. A caption here is `height * 0.048` at its
   default — fifty-two pixels on a 1080-tall film, and the smallest the slider
   goes is still far above the 24px that counts as large text. WCAG's own bar
   for large text is 3:1, and it is lower for a reason rather than as a
   concession: a stroke four pixels wide carries a colour a one-pixel stroke
   cannot.

   This was written at 4.5 and failed six swatches — red, rust, teal, blue,
   violet and pink, which is to say every saturated mid-tone. That is a true
   statement about body text and the wrong question to have asked: holding a
   caption to the body-text bar would mean no red captions in an app whose
   whole business is video. The DEFAULT pairing is still held at 4.5 above, and
   clears it at 13:1, because that is the one nobody chooses. */
const LARGE = 3;

ok('  and every swatch has something in the palette it is readable on',
  PAINTS.every((one) => PAINTS.some(
    (other) => ratio(rgb(one.hex), over(other.hex, FRAME)) >= LARGE,
  )),
  PAINTS.filter((one) => !PAINTS.some(
    (other) => ratio(rgb(one.hex), over(other.hex, FRAME)) >= LARGE,
  )).map((one) => one.id).join(', ')
  + ' — a colour that cannot be read on ANY of the twenty backgrounds at the'
  + ' large-text bar is a colour that only ever produces an unreadable caption');

/* ── The four shapes she named ─────────────────────────────────────────── */

ok('all four shapes she asked for are on offer',
  BOXES.length === 4 && ['none', 'square', 'round', 'brush'].every(
    (id) => BOXES.some((one) => one.id === id),
  ),
  BOXES.map((one) => one.id).join(', ')
  + ' — "’n square, ’n square met ronde punte, ’n verfkwas", and no box at all');

ok('  and a square really is square',
  roundFor('square') === 0,
  `${roundFor('square')} — a square with rounded corners is the OTHER button`);

ok('  and the rounded one really is rounded',
  roundFor('round') > 0.2,
  `${roundFor('round')}`);

ok('  and isBox turns away anything that is not one of them',
  isBox('square') && isBox('brush') && !isBox('circle') && !isBox('') && !isBox(null),
  'a saved edit carrying a shape this app does not draw must not reach the'
  + ' renderer as one');

/* ── The brush is a stroke, not a rectangle ────────────────────────────── */

/* Drawn against a recording context, so this reads the path that is really
   built rather than trusting the arithmetic in the function's comment. */
const drawn: string[] = [];
const fake = {
  beginPath() { drawn.push('begin'); },
  moveTo(x: number, y: number) { drawn.push(`move ${Math.round(x)},${Math.round(y)}`); },
  lineTo(x: number, y: number) { drawn.push(`line ${Math.round(x)},${Math.round(y)}`); },
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
    drawn.push(`curve ${Math.round(cx)},${Math.round(cy)} ${Math.round(x)},${Math.round(y)}`);
  },
  closePath() { drawn.push('close'); },
} as unknown as CanvasRenderingContext2D;

brushPath(fake, 100, 200, 300, 60);

ok('the brush is a closed path with curved long edges',
  drawn.filter((one) => one.startsWith('curve')).length === 2
  && drawn[drawn.length - 1] === 'close',
  drawn.join(' | ').slice(0, 110)
  + ' — two straight long edges is a rectangle however ragged its ends are');

ok('  and it overhangs the words rather than stopping at them',
  (() => {
    const move = /move (-?\d+),/.exec(drawn.find((one) => one.startsWith('move')) ?? '');
    return move !== null && Number(move[1]) < 100;
  })(),
  drawn.find((one) => one.startsWith('move')) ?? ''
  + ' — paint goes past what it covers; a stroke that stops exactly at the'
  + ' text is a box with bad corners');

ok('  and it is the same stroke every frame',
  (() => {
    const again: string[] = [];
    const second = { ...fake,
      beginPath() { again.push('begin'); },
      moveTo(x: number, y: number) { again.push(`move ${Math.round(x)},${Math.round(y)}`); },
      lineTo(x: number, y: number) { again.push(`line ${Math.round(x)},${Math.round(y)}`); },
      quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
        again.push(`curve ${Math.round(cx)},${Math.round(cy)} ${Math.round(x)},${Math.round(y)}`);
      },
      closePath() { again.push('close'); },
    } as unknown as CanvasRenderingContext2D;
    brushPath(second, 100, 200, 300, 60);
    return again.join('|') === drawn.join('|');
  })(),
  'a stroke built from Math.random is a caption that boils, because this is'
  + ' drawn once per frame for the whole length of a shot');

/* ── Both ends draw the same thing ─────────────────────────────────────── */

const render = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the renderer paints the chosen colours rather than the old literals',
  /set\?\.ink \?\? '#ffffff'/.test(render) && /tint\(set\?\.back/.test(render),
  "the box was rgba(0, 0, 0, 0.62) and the text '#ffffff', both written in");

ok('  and keeps the box see-through at the same 62%',
  /tint\(set\?\.back \?\? '#000000', 0\.62\)/.test(render),
  'a chosen colour that becomes an opaque slab has taken the picture away,'
  + ' which is the opposite of what a caption box is for');

ok('  and draws the brush rather than approximating it with a radius',
  /brushPath\(/.test(render),
  'the one shape a border radius cannot be');

ok('  and never draws a box at all when she picked none',
  /shape !== 'none'/.test(render),
  'a title card is words on the picture, and "no box" has to mean no box');

/* `wordsNow.said` and not `piece` since 5 October: a caption may now run past
   its own shot, so the words on the frame belong to whichever piece's caption
   is up rather than to the selected one. The rule is still the same rule —
   the preview resolves its colours through `paintFor`. */
ok('the preview reads the same palette the renderer does',
  /paintFor\(wordsNow\.said\.wordsInk/.test(room)
  && /paintFor\(wordsNow\.said\.wordsBack/.test(room),
  'two tables of colours is two palettes the first time one is retuned');

ok('  and shows the box at the renderer’s 62% too',
  /tintOf\([\s\S]{0,140}?,\s*0\.62\)/.test(room),
  'a preview that is more solid than the film is a preview that lies about'
  + ' what she will get');

if (bad) {
  console.error(`\ncheck:videopaint — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:videopaint — ${PAINTS.length} colours across all six sixths of the hue`
  + ' circle, four shapes behind the words, every swatch readable on something,'
  + ' and the preview and the film drawing the same thing.',
);

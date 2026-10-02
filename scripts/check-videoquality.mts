/**
 * The export's quality is a real choice, and it reaches the file.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"Die export moet ook 'n keuse van kwaliteit hê
 * waarin dit export."*
 *
 * The trap in a setting like this is that it is easy to build the picker and
 * never wire it: three buttons that move a value nothing downstream reads, and
 * a 480p film that comes out at 1080p and the same size as before. Nothing
 * about the screen would look wrong. So half of this file is about the picker
 * being connected rather than about the numbers.
 */
import {
  BITS_PER_PIXEL, GRADES, GRADE_DEFAULT, RATES, RATE_DEFAULT,
  bitsFor, gradeFor, rateFor, sizeFor, weighs,
} from '../app/lib/videoquality';
import { SHAPES } from '../app/lib/videoedit';
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/* ── The rungs ─────────────────────────────────────────────────────────── */

ok('there is more than one quality to choose from',
  GRADES.length >= 3 && RATES.length >= 3,
  `${GRADES.length} sizes and ${RATES.length} rates`);

ok('  and the one nobody chooses is the one every platform wants',
  gradeFor(undefined).id === GRADE_DEFAULT && GRADE_DEFAULT === '1080',
  `${gradeFor(undefined).id} — a default that quietly posts 480p is a default`
  + ' that costs her the look of everything she makes');

ok('  and an unknown grade falls back rather than throwing or picking the first',
  gradeFor('4k').id === GRADE_DEFAULT && gradeFor('').id === GRADE_DEFAULT,
  `${gradeFor('4k').id} — a saved edit from a later version must not render at`
  + ' 480p because its grade is not in this list');

ok('  and the same for a frame rate',
  rateFor(undefined) === RATE_DEFAULT && rateFor(7) === RATE_DEFAULT
  && rateFor(60) === 60,
  `${rateFor(7)} for a rate nothing can record at`);

/* ── A grade is a way DOWN, never up ───────────────────────────────────── */

for (const [name, shape] of Object.entries(SHAPES)) {
  const full = sizeFor(shape, '1080');
  ok(`a ${name} film at 1080p is the film's own size`,
    full.width === shape.width && full.height === shape.height,
    `${full.width}×${full.height} against ${shape.width}×${shape.height}`);

  const small = sizeFor(shape, '480');
  ok(`  and at 480p its short side really is 480`,
    Math.min(small.width, small.height) === 480,
    `${small.width}×${small.height} — a grade names the SHORT side so it means`
    + ' the same amount of detail whichever way round the film is');

  ok('  and the shape is kept rather than squashed',
    Math.abs((small.width / small.height) - (shape.width / shape.height)) < 0.02,
    `${(small.width / small.height).toFixed(3)} against`
    + ` ${(shape.width / shape.height).toFixed(3)}`);

  ok('  and both sides come out even',
    small.width % 2 === 0 && small.height % 2 === 0
    && full.width % 2 === 0 && full.height % 2 === 0,
    `${small.width}×${small.height} — an odd dimension is rejected or silently`
    + ' rounded by the encoder, which is how a film grows a one-pixel edge');
}

/* ── The bitrate follows the picture, which is the whole reason it is derived ── */

const tall = SHAPES.tall;
ok('a smaller picture is written at a smaller bitrate',
  bitsFor(...Object.values(sizeFor(tall, '480')) as [number, number], 30)
    < bitsFor(...Object.values(sizeFor(tall, '1080')) as [number, number], 30),
  'the same bits spread over four times the pixels is a worse picture, so a'
  + ' bitrate that does not follow the frame is a setting that makes 1080p'
  + ' look worse than 720p');

ok('  and a higher frame rate asks for more of them',
  bitsFor(1080, 1920, 60) > bitsFor(1080, 1920, 30),
  `${bitsFor(1080, 1920, 60)} against ${bitsFor(1080, 1920, 30)}`);

/* Measured well clear of the floor and the ceiling, which is where the
   coefficient is the only thing deciding. The first version of this used
   1000x1000 at 10fps — 900 kbps raw, which the 1 Mbps floor lifts, so it was
   measuring the clamp and reporting 0.1. */
ok('  and it is bits per pixel per frame rather than a table',
  Math.abs(bitsFor(1000, 1000, 30) / (1000 * 1000 * 30) - BITS_PER_PIXEL) < 1e-6,
  `${(bitsFor(1000, 1000, 30) / (1000 * 1000 * 30)).toFixed(4)} against`
  + ` ${BITS_PER_PIXEL} — one coefficient covers every rung, so a new rung`
  + ' needs no new number');

ok('  with a floor and a ceiling, so no film is unencodable or unuploadable',
  bitsFor(2, 2, 24) >= 1_000_000 && bitsFor(4000, 4000, 60) <= 24_000_000,
  `${bitsFor(2, 2, 24)} and ${bitsFor(4000, 4000, 60)}`);

/* ── The size she is shown before she presses ──────────────────────────── */

ok('a longer film is said to weigh more',
  weighs(60, 8_000_000) > weighs(10, 8_000_000),
  `${weighs(60, 8_000_000)} MB against ${weighs(10, 8_000_000)} MB`);

ok('  and the arithmetic is bits to bytes to megabytes',
  weighs(10, 8_000_000) === 10,
  `${weighs(10, 8_000_000)} — ten seconds at 8 Mbps is 10 MB`);

ok('  and a film of no length weighs nothing rather than NaN',
  weighs(0, 8_000_000) === 0 && weighs(Number.NaN, 8_000_000) === 0,
  `${weighs(Number.NaN, 8_000_000)}`);

/* ── And all of it actually reaches the file ───────────────────────────── */

const edit = withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8'));
const render = withoutComments(readFileSync('app/lib/stitch.ts', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));

ok('the cut is built at the chosen size, not at the shape’s',
  /width: frame\.width/.test(edit) && /height: frame\.height/.test(edit)
  && /sizeFor\(shape, edit\.grade\)/.test(edit),
  'a picker that moves a value nothing reads is three buttons and a 1080p file');

ok('  and the grade is applied before the renderer, never inside it',
  !/sizeFor|gradeFor/.test(render),
  'the renderer measures the caption, the letterbox and the logo as shares of'
  + ' the frame — scaling at the end would draw a caption sized for one frame'
  + ' into another');

ok('  and the recorder is told the frame rate she picked',
  /captureStream\(cut\.fps \?\? 30\)/.test(render),
  'asking for 24 while sampling at 30 writes a 30fps file with duplicated'
  + ' frames: the size of 30 and the motion of 24');

ok('  and the bitrate too, when there is one',
  /videoBitsPerSecond: cut\.bits/.test(render),
  'without it the browser picks, and the picker is decoration');

ok('the room offers both choices',
  /data-editorgrade/.test(room) && /data-editorfps/.test(room),
  'and on the film bench, which is where the export lives');

ok('  and says what the file will weigh before the press',
  /data-editorweight/.test(room) && /weighs\(/.test(room),
  'a number afterwards is a surprise, and on a metered connection a surprise'
  + ' about size is the same kind of problem as a surprise about money');

if (bad) {
  console.error(`\ncheck:videoquality — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:videoquality — ${GRADES.length} sizes and ${RATES.length} frame rates,`
  + ' the bitrate derived from the frame rather than guessed at, and every one of'
  + ' them reaching the recorder.',
);

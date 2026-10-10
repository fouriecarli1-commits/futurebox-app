/**
 * A starting point for a film that does not start somebody off wrong.
 *
 *   npm run check:filmstart
 *
 * ── The one thing a template must not do ─────────────────────────────────
 *
 * Put its words where the platform prints its own. The strictest safe band
 * across the three platforms is a tenth down from the top and a fifth up
 * from the bottom — `lib/safezones.ts` knows the numbers — and a title the
 * APP suggested that comes out behind a username is worse than no title: it
 * is the app's own handwriting, on her film, covered.
 *
 * The cutting room already warns when SHE drags a caption there, which is
 * the right behaviour for a choice somebody made and the wrong behaviour for
 * a choice the app made on her behalf. That difference is why this is a
 * check and not a warning.
 *
 * ── Why three lines and not one ──────────────────────────────────────────
 *
 * `drawCaption` wraps, and shrinks twice before it wraps, and stops at
 * `CAPTION_LINES`. So the honest bound on how tall a template's caption can
 * become is its own size times that ceiling — not the one line the English
 * happens to fit on. The Afrikaans of the same sentence is longer almost
 * every time, and a bound measured off the English would pass here and come
 * out covered on her phone.
 *
 * Both numbers are imported from the renderer rather than typed here. A 3
 * copied into a check is a bound that quietly stops being true the day the
 * renderer allows a fourth line.
 *
 * ── And the rest, which are all one fault wearing hats ───────────────────
 *
 * A template naming a look, a face, a join or a shape that does not exist,
 * or a key with no Afrikaans. Every one of them ships, renders something,
 * and is found by a person rather than by us.
 */
import { STARTS, dressed, startOf, type FilmWords } from '../app/lib/filmstart.ts';
import { CAPTION_LINES, CAPTION_STEP } from '../app/lib/stitch.ts';
import { ALL, boxOf } from '../app/lib/safezones.ts';
import { SHAPES, type Piece } from '../app/lib/videoedit.ts';
import { FILTERS } from '../app/lib/videofilters.ts';
import { FONTS } from '../app/lib/videofonts.ts';
import { JOINS } from '../app/lib/videojoins.ts';
import { BOXES } from '../app/lib/videopaint.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* ── 1. They exist, and each is its own thing ───────────────────────── */
ok('there are starting points at all', STARTS.length >= 4, String(STARTS.length));
ok('  and each has an id of its own',
  new Set(STARTS.map((one) => one.id)).size === STARTS.length,
  STARTS.map((one) => one.id).join(', '));
ok('  and each can be found by it',
  STARTS.every((one) => startOf(one.id)?.id === one.id),
  'a bench that presses an id the room cannot look up is a press that does nothing');
ok('  and every one of them actually does something to the film',
  STARTS.every((one) => one.title || one.signOff),
  'a look and a join and no words at all is a filter with a name, not a'
  + ' starting point');

/* ── 2. Everything they name exists ─────────────────────────────────── */
const looks = new Set(FILTERS.map((one) => one.id));
const faces = new Set(FONTS.map((one) => one.id));
const joins = new Set(JOINS.map((one) => one.id));
const boxes = new Set(BOXES.map((one) => one.id));
const wordsOf = (one: typeof STARTS[number]): readonly FilmWords[] =>
  [one.title, one.signOff].filter((w): w is FilmWords => Boolean(w));

ok('  and no two of them dress a film the same way',
  (() => {
    /* A starting point IS its shape, its look and how the shots arrive. Two
       with the same three are two names for one press, and a row of twelve
       that does three things is a menu with one dish on it — which is what a
       person means when they say the templates all look the same. */
    const dressings = STARTS.map((one) => `${one.shape}/${one.look}/${one.join}`);
    const twice = dressings.filter((one, at) => dressings.indexOf(one) !== at);
    if (twice.length) console.log(`         the same twice: ${[...new Set(twice)].join(', ')}`);
    return twice.length === 0;
  })(),
  'twelve names for three effects is what makes a row of templates feel'
  + ' fake');

ok('every shape a starting point names is one the room has',
  STARTS.every((one) => one.shape in SHAPES),
  STARTS.filter((one) => !(one.shape in SHAPES)).map((one) => `${one.id}: ${one.shape}`).join(', '));
ok('  and every look',
  STARTS.every((one) => looks.has(one.look)),
  STARTS.filter((one) => !looks.has(one.look)).map((one) => `${one.id}: ${one.look}`).join(', '));
ok('  and every join',
  STARTS.every((one) => joins.has(one.join)),
  STARTS.filter((one) => !joins.has(one.join)).map((one) => `${one.id}: ${one.join}`).join(', '));
ok('  and every face',
  STARTS.every((one) => wordsOf(one).every((w) => faces.has(w.font))),
  'a face id the renderer does not know falls back to plain, so a title set'
  + ' in a serif comes out in the system sans and nobody is told');
ok('  and every shape behind the words',
  STARTS.every((one) => wordsOf(one).every((w) => boxes.has(w.box))),
  'a box shape the renderer does not know draws nothing, so a white title'
  + ' lands on a white sky with no band under it');

/* ── 3. Nothing lands where the platform draws its own ──────────────── */
const safe = boxOf(ALL);
const covered: string[] = [];
for (const one of STARTS) {
  for (const w of wordsOf(one)) {
    /* The block is centred on `at.y` and runs to `CAPTION_LINES` of
       `size * CAPTION_STEP`, so half of that height sits either side of the
       centre. Measured at the ceiling on purpose: this has to hold for the
       Afrikaans of the same sentence, which is longer nearly every time. */
    const tall = CAPTION_LINES * w.size * CAPTION_STEP;
    const top = w.at.y - tall / 2;
    const bottom = w.at.y + tall / 2;
    if (top < safe.top || bottom > safe.top + safe.height) {
      covered.push(`${one.id}: ${top.toFixed(3)}–${bottom.toFixed(3)}`);
    }
  }
}
ok('no starting point puts its words where the platform prints its own',
  covered.length === 0,
  `${covered.join(', ')} against the safe band`
  + ` ${safe.top.toFixed(3)}–${(safe.top + safe.height).toFixed(3)} at`
  + ` ${CAPTION_LINES} lines — the app's own suggestion, coming out covered`);
ok('  and every one of them is centred across the frame',
  STARTS.every((one) => wordsOf(one).every((w) => w.at.x === 0.5)),
  'a caption is drawn centred on `at.x` and wraps to 0.86 of the width, so'
  + ' anything but the middle hangs one side of it off the frame');

/* ── 4. The words are in both languages, and are sentences ──────────── */
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');
const keys = STARTS.flatMap((one) => [one.name[0], one.what[0],
  ...wordsOf(one).map((w) => w.says[0])]);
const absent = keys.filter((key) => !dict.includes(`"${key}"`));
ok('every word a starting point writes on a film is in the dictionary',
  absent.length === 0,
  `${absent.join(', ')} — an English fallback on a template is the app`
  + ' writing English onto an Afrikaans person’s film');

const shouty = STARTS.flatMap((one) => wordsOf(one)
  .filter((w) => /your (text|headline|name here)|headline here|text here|lorem|xxx+/i
    .test(w.says[1]))
  .map((w) => `${one.id}: ${w.says[1]}`));
ok('  and they are real sentences rather than placeholders',
  shouty.length === 0,
  `${shouty.join(', ')} — a placeholder is a second job: it hands back the`
  + ' same blank film with more steps');

/* ── 5. Dressing a film ─────────────────────────────────────────────── */
const shot = (id: string, from: number, to: number, extra: Partial<Piece> = {}): Piece => ({
  id,
  clip: new Blob([]),
  name: `${id}.webm`,
  from,
  to,
  ...extra,
} as Piece);

const show = startOf('show')!;
const three = [shot('a', 0, 6), shot('b', 0, 4), shot('c', 0, 5)];
const out = dressed(show, three, (_key, en) => en);

ok('dressing a film puts one look across every shot',
  out.every((one) => one.look === show.look),
  out.map((one) => one.look).join(', ') + ' — six phones in a row is what an'
  + ' unfiltered cut looks like, and one look is most of what makes it read'
  + ' as one film');
ok('  and the join on every shot but the first',
  out[0].join === undefined && out.slice(1).every((one) => one.join === show.join),
  out.map((one) => one.join ?? 'none').join(', ') + ' — a join on the first'
  + ' shot arrives from nothing, which in a dissolve is a fade up from black'
  + ' nobody asked for');
ok('  and the title on the first shot, from its start',
  out[0].words === show.title!.says[1] && out[0].wordsFrom === 0
    && out[0].wordsTo === show.title!.forSeconds,
  `${out[0].words} ${out[0].wordsFrom}–${out[0].wordsTo}`);
ok('  and the sign-off at the end of the last',
  out[2].words === show.signOff!.says[1]
    && out[2].wordsTo === 5
    && out[2].wordsFrom === 5 - show.signOff!.forSeconds,
  `${out[2].words} ${out[2].wordsFrom}–${out[2].wordsTo}`);
ok('  and nothing on the shots in between',
  (out[1].words ?? '') === '',
  `${out[1].words} — a caption on every shot is a film that reads like a`
  + ' slideshow with subtitles');

/* ── 6. The four ways it could be wrong quietly ─────────────────────── */
const hers = dressed(show, [shot('a', 0, 6, { words: 'My own line' }), shot('b', 0, 4)],
  (_k, en) => en);
ok('a caption she typed is left alone',
  hers[0].words === 'My own line',
  `${hers[0].words} — the shots are hers and anything written over them was`
  + ' typed while looking at them, so a template that wiped a caption is the'
  + ' app overruling the one part of the film it did not make');

const short = dressed(show, [shot('a', 0, 1)], (_k, en) => en);
ok('a title is never held longer than the shot it is on',
  (short[0].wordsTo ?? 0) <= 1,
  `${short[0].wordsTo} on a one-second shot — a caption that outlives its own`
  + ' picture is a number the renderer has to guess at');
ok('  and on a one-shot film the title wins over the sign-off',
  short[0].words === show.title!.says[1],
  `${short[0].words} — both written into one caption field means the second`
  + ' one silently wins, and which one that is depends on the order of an'
  + ' object literal');

const fast = dressed(show, [shot('a', 0, 6), shot('b', 0, 8, { speed: 4 })], (_k, en) => en);
ok('  and a shot playing fast is timed by how long it LASTS, not how long it was',
  fast[1].wordsTo === 2,
  `${fast[1].wordsTo} — an eight-second take at four times is two seconds of`
  + ' film, and a sign-off timed off the trim would start six seconds after'
  + ' the film ended');

ok('and an empty room is handed back untouched',
  dressed(show, [], (_k, en) => en).length === 0,
  'a template needs a shot in the room, and nothing here may invent one');

if (bad) {
  console.error(`\ncheck:filmstart — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmstart — every starting point dresses the film she brought in'
  + ' with a look, a join and words the room has, in both languages, and puts'
  + ' none of them where a platform prints its own or past the end of a shot.',
);

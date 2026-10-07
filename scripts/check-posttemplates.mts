/**
 * A starting point that does not start somebody off wrong.
 *
 *   npm run check:posttemplates
 *
 * ── The one thing a template must not do ─────────────────────────────────
 *
 * Put words where the platform prints its own. A story has a caption, a send
 * box and a row of buttons over its bottom quarter — `lib/safezones.ts` knows
 * where — and a template that lands its words there is worse than no
 * template: it is the app's own suggestion, in the app's own voice, coming
 * out covered.
 *
 * The room already warns when SHE puts words there, which is the right
 * behaviour for a choice somebody made. It is the wrong behaviour for a
 * choice the app made on her behalf, and the difference is why this is a
 * check and not a warning.
 *
 * ── And the rest, which are all the same fault wearing hats ──────────────
 *
 * A template naming a shape that does not exist, a face that does not exist,
 * or a key with no Afrikaans. Every one of them ships, renders something, and
 * is found by a person rather than by us.
 */
import { TEMPLATES, templateOf } from '../app/lib/posttemplates.ts';
import { POST_SIZES, boxFor, clashes, sizeById } from '../app/lib/posttext.ts';
import { readFileSync } from 'node:fs';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* The box the room really draws, imported rather than copied.
 
   It was copied here, out of `PostStudio.tsx`, with an assertion that the
   copy still matched — and the copy was how this check found that every line
   of words on a story was over the safe right margin. `boxFor` lives in
   `posttext.ts` now, beside `clashes`, so there is one box and the check and
   the room cannot disagree about it. */
const studio = readFileSync('app/components/PostStudio.tsx', 'utf8');
ok('the room draws its words in the one box this check measures',
  /boxFor as boxOfSpot/.test(studio) && /boxOfSpot\(one\.spot, size\)/.test(studio),
  'a second box inside the component is a check measuring somewhere the room'
  + ' does not draw, which is the quietest way to stop being about anything');

ok('there are templates at all', TEMPLATES.length >= 4, String(TEMPLATES.length));
ok('  and each has an id of its own',
  new Set(TEMPLATES.map((one) => one.id)).size === TEMPLATES.length,
  TEMPLATES.map((one) => one.id).join(', '));
ok('  and one can be found by it',
  TEMPLATES.every((one) => templateOf(one.id)?.id === one.id)
  && templateOf('nothing-like-this') === null);

/* ── 1. Every shape and face a template names really exists ──────────── */
const noSize = TEMPLATES.filter((one) => !POST_SIZES.some((size) => size.id === one.size));
ok('every template starts in a shape the room has',
  noSize.length === 0,
  noSize.map((one) => `${one.id} → ${one.size}`).join(', ')
  + ' — `sizeById` falls back to the first shape, so this ships as a template'
  + ' that quietly ignores the thing it chose');
/* Read out of the source rather than imported. `postfaces.ts` builds its
   three with `next/font`, which only exists inside a Next build — importing
   it here dies with "Anton is not a function", which is a statement about
   this check's own environment and not about the app. */
const faces = [...readFileSync('app/lib/postfaces.ts', 'utf8')
  .matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((hit) => hit[1]);
ok('  there are faces to name', faces.length >= 3, faces.join(', '));
const noFace = TEMPLATES.flatMap((one) => one.words
  .filter((word) => !faces.includes(word.face))
  .map((word) => `${one.id} → ${word.face}`));
ok('  and every line in a face it has', noFace.length === 0, noFace.join(', '));

/* ── 2. And none of them puts words under the platform's furniture ──── */
const covered = TEMPLATES.flatMap((one) => {
  const size = sizeById(one.size);
  if (!size) return [];
  return one.words
    .filter((word) => clashes(boxFor(word.spot, size), size))
    .map((word) => `${one.id}: "${word.says[1]}" at ${word.spot} of ${size.id}`);
});
ok('no template puts its own words where the platform prints its own',
  covered.length === 0,
  `${covered.join(' | ')} — the room warns when SHE does this, which is right`
  + ' for a choice somebody made and wrong for one the app made for her');

/* ── 3. Every sentence is in both languages ──────────────────────────── */
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
const keys = TEMPLATES.flatMap((one) => [one.name[0], one.what[0],
  ...one.words.map((word) => word.says[0])]);
const absent = keys.filter((key) => !words.includes(`"${key}"`));
ok('every word a template puts on a picture is in the dictionary',
  absent.length === 0,
  `${absent.join(', ')} — an English fallback on a template is the app`
  + ' writing English onto an Afrikaans person’s post');

/* ── 4. The words are sentences, not placeholders ────────────────────── */
const shouty = TEMPLATES.flatMap((one) => one.words
  /* "in your phone" is a sentence; "YOUR TEXT HERE" is not. The first
     version matched the word `your` on its own and reported a real line. */
  .filter((word) => /your (text|headline|name here)|headline here|text here|lorem|xxx+/i
    .test(word.says[1]))
  .map((word) => `${one.id}: ${word.says[1]}`));
ok('  and they are real sentences rather than placeholders',
  shouty.length === 0,
  `${shouty.join(', ')} — a placeholder is a second job: it hands back the`
  + ' same blank page with more steps');

if (bad) {
  console.error(`\ncheck:posttemplates — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:posttemplates — every template starts in a shape and a face the'
  + ' room has, says its words in both languages, and puts none of them where'
  + ' the platform prints its own.',
);

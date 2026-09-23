/**
 * Her own filming, on the board, and the grade that goes on it.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 23 September 2026: *"Ek het byvoorbeeld nou 'n bemarking wat ek moet
 * bou vir 'n funksie, ek wil sniplets uit my videos gebruik vir bemarking"*,
 * and then *"Ek wonder of dit moontlik is om 'n basic video editor te bou?
 * … Ook met 'n paar filter moontlikhede."*
 *
 * ── Why these rules and not others ───────────────────────────────────────
 *
 * Every one of them is a place where this could ship looking finished and be
 * wrong in a way she would find before any test did:
 *
 * - A piece she filmed generated over. That is not a bug that shows a wrong
 *   colour, it is her footage replaced by an invention, and charged for.
 * - The film graded and the per-piece download not. Two cut paths, one
 *   change: the exact shape of `check:paymeta`'s fault, and of the advert
 *   card's, and of half of the rest of this repository's history.
 * - A grade left on while the caption is painted. The words come out tinted
 *   and nothing says why.
 * - Her recording evicted from storage while shots still point at it. The
 *   board looks whole and cuts to nothing.
 * - A filter row in English in an Afrikaans app.
 */

import { readFileSync } from 'node:fs';
import { FILTERS, NO_FILTER, filterCss } from '../app/lib/videofilters';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const board = readFileSync('app/components/Storyboard.tsx', 'utf8');
const strip = readFileSync('app/components/OwnFootage.tsx', 'utf8');
const cutter = readFileSync('app/lib/stitch.ts', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── The catalogue ───────────────────────────────────────────────────── */

ok(`there are looks to choose from — ${FILTERS.length}`, FILTERS.length >= 5,
  'a "few filter possibilities" is not two');

const CANVAS_FILTERS = /^(?:(?:grayscale|sepia|saturate|contrast|brightness|invert|opacity|blur|hue-rotate)\([^)]+\)\s*)+$/;
const bad = FILTERS.filter((one) => one.id !== NO_FILTER && !CANVAS_FILTERS.test(one.css));
ok('  and every one of them is something a canvas will actually do', bad.length === 0,
  `${bad.map((one) => `${one.id}: "${one.css}"`).join('; ')} — a value the canvas refuses leaves the piece ungraded and says nothing`);

ok('  with the one that means "leave it alone" carrying no value at all',
  filterCss(NO_FILTER) === '' && filterCss(undefined) === '',
  'the cut must be able to leave the canvas filter untouched, which is not the same as setting it to none');

/* An id nobody knows must come out empty rather than out as itself: the id
   dropped into `context.filter` is a value the canvas refuses, and a canvas
   that refuses a filter draws the frame ungraded without complaining. */
ok('  and an unknown look grades nothing rather than passing its own name through',
  filterCss('not_a_real_look') === '', filterCss('not_a_real_look'));

/* Both languages. A row of looks is the most visible thing in this whole
   feature and the easiest to leave in English. */
const untranslated = FILTERS.filter((one) =>
  !new RegExp(`"filter\\.${one.id}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`  named in Afrikaans too — ${FILTERS.length}`, untranslated.length === 0,
  untranslated.map((one) => one.id).join(', '));

/* ── The grade reaches the picture, and stops before the words ───────── */

ok('the cut puts the grade on before the picture', /if \(grade\) context\.filter = grade;[\s\S]{0,400}?context\.drawImage\(video,/.test(cutter),
  'the grade is set after the frame is drawn, which grades nothing');

ok('  and the blurred fill behind it as well',
  /if \(grade\) context\.filter = grade;[\s\S]{0,200}?backdrop\(context,/.test(cutter),
  'a black-and-white shot sitting in a wash of the colour it just had taken out');

ok('  and takes it off before the words and the mark go on',
  /if \(grade\) context\.filter = 'none';[\s\S]{0,300}?drawCaption\(/.test(cutter),
  'the caption comes out tinted, and the one thing a grade must not touch is the text somebody has to read');

/* ── Both cut paths, not one ─────────────────────────────────────────── */

const cuts = [...board.matchAll(/scenes:\s*\[|\.map\(\(clip, index\)/g)].length;
const graded = [...board.matchAll(/grade:\s*filterCss\(/g)].length;
ok('every way a piece is cut carries its grade', graded >= 2,
  `${graded} of ${cuts} cut paths grade the picture — a piece downloaded on its own that came out ungraded `
  + 'is a different picture from the one in the film above it');

/* ── Her footage is never generated over ─────────────────────────────── */

ok('a piece she filmed is never generated over', /if \(shot\?\.mine\) return;/.test(board),
  'the copilot can reach this room, and a generation against her own footage replaces it and charges for it');

ok('  and the button that would do it is not drawn for one',
  /\{shot\.mine \? \([\s\S]{0,400}?\) : \(\s*<button[\s\S]{0,300}?shoot\(shot\.id\)/.test(board),
  'the lock holds and the button still says "Make it again" over her own recording');

ok('  and the board does not call it "Made"', /shot\.mine \? \([\s\S]{0,600}?board\.mine/.test(board),
  'saying Made over footage she filmed is the board taking credit for it, and the one word that invites a press of Make it again');

ok('  and it costs nothing', /one\.makeId \? sum : sum \+ videoCost/.test(board),
  'a piece with bytes already in hand is priced as a generation');

/* ── The things that make it usable ──────────────────────────────────── */

ok('her own recording keeps its sound', /spoke: true,/.test(strip),
  'the stitcher mutes a clip unless told, which is right for a generated shot and throws away the whole point of hers');

ok('  and cannot be evicted while shots still point at it', /favourite: true,/.test(strip),
  'the history evicts the oldest, and a shot whose bytes went with it is a board that looks whole and cuts to nothing');

/* Read out of the call rather than off three lines that happen to be near
   each other: the first version of this rule spanned two hundred characters
   and a comment grew past it, so it failed a correct file. A rule a right
   answer cannot pass is worse than no rule. */
const adds = /onAdd\(\{[\s\S]*?\n {4}\}\);/.exec(strip)?.[0] ?? '';
ok('  and one upload backs many pieces',
  /makeId: make\.id,/.test(adds) && /\bfrom,/.test(adds) && /\bto,/.test(adds)
  && !/cutHook\(|stitch\(/.test(strip),
  adds
    ? 'a piece that does not point at the recording with its own window is a piece re-encoded into its own file, in real time, before she has seen whether the cut works'
    : 'no onAdd call found in OwnFootage.tsx at all');

const OWN = [...new Set([...strip.matchAll(/t\('(own\.[a-zA-Z]+)'/g)].map((one) => one[1]))];
const noAf = OWN.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`  and the strip speaks Afrikaans — ${OWN.length} keys`, OWN.length >= 8 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${OWN.length} keys is fewer than the strip has sentences`);

/* ── The subtitles stay a choice ─────────────────────────────────────── */

/* She asked for this outright: *"Die onderskrifte moet 'n opsie wees."* The
   switch already existed for generated films; the rule is here because this
   is the feature that would have been the reason to make them automatic —
   words over her own footage are the obvious default and are still not one. */
/* Every place the switch is read, not one of them. `board.captions` appears
   five times in this file — the translation step, the film's scenes, the
   per-piece download, the editor row and the switch itself — so a rule that
   asked whether the file mentions it stayed green with one of them turned
   into `true &&`, which is the whole fault it exists to catch. */
const reads = [...board.matchAll(/board\.captions\b/g)].length;
/* Both shapes a gate can be forced into. The first version of this looked
   only for `true &&`, and `board.captions ? captionOf(shot)` turned into
   `true ? captionOf(shot)` sailed past it — a rule that catches one spelling
   of a wrong answer is a rule about spelling, which is the note
   `check:longshot` already carries for the same reason. */
const forced = /(?:^|[^.\w])true\s*(?:&&|\?)\s*(?:captions|captionOf|subtitleLang)/.test(board);
ok(`the words on the film are still a choice — read in ${reads} places`,
  reads >= 4 && !forced && /captions: next\.on/.test(board),
  forced ? 'one of the caption gates was replaced by a constant, so the switch no longer turns it off'
  : reads < 4 ? `${reads} reads: a caption path that does not consult the switch burns words on regardless`
  : 'there is no switch writing `captions` at all');

if (failures) {
  console.error(`\ncheck:ownfootage — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:ownfootage — her own footage cuts in beside the generated shots, `
  + `with ${FILTERS.length} looks that the film and the per-piece download both honour.`,
);

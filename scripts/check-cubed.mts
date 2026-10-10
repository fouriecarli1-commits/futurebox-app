/**
 * Cubed: three to a masterclass, sixty to the guest, and the mark is woven.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Die masterclass section wil ek rename na Cubed
 * classes… Die rede vir cubed gaan oor die mag 3. Ek wil elke masterclass 3
 * klasse lank maak. Ons moet dit ook so uit stipuleer vir ons gaste. Ons gaan
 * 'n 60/40 winsverdeling doen. Dus 60% vir die gas."* And: *"Ek soek ook 'n
 * Logo waar twee cubes in mekaar vervleg is met 'n sterk yster tipe look."*
 *
 * ── Why the number is checked rather than trusted ────────────────────────
 *
 * The name IS the rule. "Cubed" means three, and a series published with two
 * classes in it is a promise broken to the person who sat down for the third —
 * quietly, because nothing on a screen counts for you. So the three is one
 * constant, every screen reads it, and a series that is not three fails the
 * build.
 *
 * ── And why the split is checked hardest of all ──────────────────────────
 *
 * Because it is quoted TO GUESTS, in public, before they agree. A number that
 * says 60 on the invitation and 55 in the agreement is not a bug, it is the
 * thing that ends a relationship with somebody whose name was on three
 * classes. One constant, derived house share, and every sentence on the page
 * built from it.
 *
 * ── The logo ─────────────────────────────────────────────────────────────
 *
 * Four were drawn here and every one was sent back. Iron bars; then one cube
 * turned; then bands instead of strokes; then a trace of her own line work,
 * which looked like hers and was still mine. *"Ek wil nie jou design gebruik
 * nie. Ek wil my designs gebruik. Ek wil nie hê jy moet dit remake nie."*
 *
 * She is right that a trace is a remake: it is a reconstruction of her lines
 * and it differs from them wherever the tracing was imperfect. So there is no
 * drawing of a logo in this repository at all. There is her file.
 *
 * What is checked is therefore not a shape but a promise: that the bytes on
 * disk are the bytes that arrived, that nothing in the app draws a logo, that
 * her file is shown at its own proportions, and that the places too small for
 * it carry a plain glyph rather than her logo cropped down. The hash is the
 * load-bearing one — an image step that re-compresses on build would remake
 * her artwork without a line of code changing anywhere.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  CLASSES_IN_A_SERIES, GUEST_SHARE, GUEST_TERMS, HOUSE_SHARE, SERIES,
  minutesOf, seriesById, splitAsSaid,
} from '../app/lib/cubed.ts';
import { createHash } from 'node:crypto';
import { LOGO, LOGO_TALL, LOGO_WIDE, MARK } from '../app/components/CubedMark.tsx';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/CubedRoom.tsx', 'utf8'));
const mark = withoutComments(readFileSync('app/components/CubedMark.tsx', 'utf8'));
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const css = readFileSync('app/globals.css', 'utf8');

/* ── 1. The rule the name means ───────────────────────────────────────── */

ok('a masterclass is three classes',
  CLASSES_IN_A_SERIES === 3,
  'the name is the rule — "die rede vir cubed gaan oor die mag 3"');

ok('  and every series really has three',
  (() => {
    const wrong = SERIES
      .filter((one) => one.parts.length !== CLASSES_IN_A_SERIES)
      .map((one) => `${one.id} has ${one.parts.length}`);
    for (const one of wrong) console.log(`         ${one}`);
    return wrong.length === 0;
  })(),
  'a series published with two is a promise broken to the person who sat'
  + ' down for the third, and nothing on a screen counts for them');

ok('  and they are numbered one, two, three',
  SERIES.every((one) => one.parts.every((part, at) => part.part === at + 1)),
  'a series whose parts are 1, 2, 2 reads as a list and not as an order');

ok('  and each part says what it is for',
  SERIES.every((one) => one.parts.every((part) =>
    part.outcome[0].trim().length > 20 && part.outcome[1].trim().length > 20
    && part.minutes > 0)),
  'a class with no outcome is a lecture, and the whole shape of three is'
  + ' that each one leaves somebody able to do something');

ok('  and the length adds up',
  SERIES.every((one) => minutesOf(one) === one.parts.reduce((s, p) => s + p.minutes, 0)),
  'a total that is not the sum of the parts is a number the page invented');

/* ── 2. The split, which is quoted to guests ──────────────────────────── */

ok('sixty per cent goes to the guest',
  GUEST_SHARE === 0.6,
  'her number, and the direction matters: the guest has the audience and the'
  + ' reputation at stake');

ok('  and the two halves cannot stop adding up',
  Math.abs(GUEST_SHARE + HOUSE_SHARE - 1) < 1e-9,
  'the house share is derived rather than typed, so there is no second number'
  + ' to forget');

ok('  and it is said the way a person says it',
  splitAsSaid() === '60/40',
  splitAsSaid());

ok('  and the guest terms quote the real numbers',
  (() => {
    const one = GUEST_TERMS.map((term) => term[0]).join(' ');
    return one.includes('60%') && one.includes('40%')
      && one.includes(`${CLASSES_IN_A_SERIES} sessions`);
  })(),
  'a number in a conversation is a number two people remember differently; a'
  + ' number on the page a guest read before saying yes is an agreement');

ok('  and every term is written in both languages',
  GUEST_TERMS.every((term) => term[0].trim() && term[1].trim() && term[0] !== term[1]),
  'a guest reading Afrikaans is being asked to agree to something in another'
  + ' language');

ok('  and the room prints the split rather than a number of its own',
  /splitAsSaid\(\)/.test(room) && /Math\.round\(GUEST_SHARE \* 100\)/.test(room)
  && !/\b60\/40\b/.test(room),
  'a 60/40 typed into the page is a number that stays 60/40 the day the'
  + ' constant moves');

ok('  and the room says the terms out loud',
  /data-cubedterms/.test(room) && /GUEST_TERMS\.map/.test(room),
  '"Ons moet dit ook so uit stipuleer vir ons gaste" — in public, before the'
  + ' conversation');

/* ── 3. Nothing is promised that is not arranged ──────────────────────── */

ok('every series says where it stands',
  SERIES.every((one) => ['planned', 'recording', 'open'].includes(one.stage)),
  'a room full of classes nobody can press reads as broken rather than as a'
  + ' calendar');

ok('  and the room says the rest are still being arranged',
  /data-cubedmore/.test(room) && /cubed\.more/.test(room),
  'she is arranging them — a room listing six imaginary guests would be the'
  + ' landing page promising something, which is the fault this app already'
  + ' has a check about');

ok('  and an id that is not there answers nothing',
  seriesById('no-such-series') === undefined);

/* ── 4. The logo, which is hers and is not touched ────────────────────── */

/**
 * The file she sent, pinned.
 *
 * Not a hash of whatever happens to be there — the hash of what ARRIVED, on
 * 10 October 2026, written down the day it arrived. The two are only the same
 * while nobody has re-saved, re-compressed or "optimised" it, and every one of
 * those is a silent change to somebody else's artwork. A build step that
 * squeezes images would do it without being asked.
 */
const HERS = 'e2b4c985555ac4dd92203f100287f1ceae18b77d88bcb91d99cf11e0cb9ff8ce';
const HER_BYTES = 701_191;

const onDisk = (() => {
  try {
    return readFileSync(`public${LOGO}`);
  } catch {
    return null;
  }
})();

ok('her logo file is in the app',
  onDisk !== null,
  `public${LOGO} — the Cubed room points at it`);

ok('  and it is the file she sent, byte for byte',
  onDisk !== null
  && onDisk.length === HER_BYTES
  && createHash('sha256').update(onDisk).digest('hex') === HERS,
  'her words: "Ek wil nie jou design gebruik nie. Ek wil my designs gebruik.'
  + ' Ek wil nie hê jy moet dit remake nie." A re-save at 90% quality is a'
  + ' remake nobody can see and nobody signed off');

ok('  and nothing in the app redraws it',
  (() => {
    /* Four marks were drawn here before hers. The check that they are gone
       is that nothing left in the app builds paths for one. */
    const drawn = /<path\b/.test(mark) || /viewBox/.test(mark);
    return !drawn && /<img/.test(mark) && new RegExp(`src=\\{LOGO\\}`).test(mark);
  })(),
  'a trace is a redrawing: it is this app\'s reconstruction of her lines and'
  + ' it differs from them wherever the tracing was imperfect. She asked for'
  + ' her file, so the app shows her file');

ok('  and it is drawn at her file’s own proportions',
  /height=\{Math\.round\(\(width \* LOGO_TALL\) \/ LOGO_WIDE\)\}/.test(mark)
  && LOGO_WIDE === 1408 && LOGO_TALL === 768,
  'squashing somebody’s logo into a square is the one thing about a logo'
  + ' everybody notices and nobody can say');

ok('  and the room shows it big enough to read',
  /<CubedMark width=\{4\d\d\}/.test(room),
  'her file is BOTH marks with a word under each. Below about four hundred'
  + ' pixels wide it is a smudge of two logos rather than a logo');

ok('  and the small places do not shrink the lockup instead',
  !/<CubedMark/.test(page),
  'her lockup is BOTH marks with a word under each. At 48 pixels it is a'
  + ' smudge of two logos, so the door carries the single mark instead');

/* ── 4b. The mark on its own, which she asked for ─────────────────────── */

const markFile = (() => {
  try {
    return readFileSync(`public${MARK}`);
  } catch {
    return null;
  }
})();

ok('the mark on its own is in the app',
  markFile !== null && markFile.length > 1_000,
  `public${MARK} — "Gaan nou vir my die een mark sonder woorde maak"`);

ok('  and it is really see-through',
  (() => {
    if (!markFile) return false;
    /* A PNG says its colour type in the IHDR, 25 bytes in: 6 is RGBA and
       4 is grey+alpha. Anything else has no alpha channel at all, which is
       the whole point of this file and is invisible on a white page. */
    const kind = markFile[25];
    return kind === 6 || kind === 4;
  })(),
  'a mark with no alpha channel looks right on every light page and arrives'
  + ' as a white box the moment it is put on a dark one — which is both of'
  + ' the places it goes');

ok('  and it is square, so it can be an icon',
  (() => {
    if (!markFile) return false;
    const wide = markFile.readUInt32BE(16);
    const tall = markFile.readUInt32BE(20);
    return wide === tall && wide >= 512;
  })(),
  'a store icon is square, and one that is not gets letterboxed or cropped'
  + ' by whoever is showing it');

ok('  and the door sets it on something it can be seen against',
  /data-cubedchip/.test(mark) && /<CubedChip size=\{48\}/.test(page)
  && /bg-zinc-100/.test(mark),
  'her mark is navy and that tile is near-black. The two ways out are a'
  + ' chip to put it on, or recolouring her artwork — and the second is the'
  + ' thing she asked me not to do');

/* ── 5. The room is dark through the theme, not around it ─────────────── */

ok('the room declares its darkness to the theme',
  /\[data-cubed\]/.test(css) && /data-cubed/.test(room),
  '`white` in this app is `--fb-ink`, which follows the theme — so a room'
  + ' that paints its own black and writes `text-white` on top draws every'
  + ' heading near-black on near-black under the light theme. It compiled, it'
  + ' read correctly, and it was invisible');

ok('  and it paints its background with a class that exists',
  /className="min-h-screen bg-zinc-950"/.test(room),
  'the second version used `bg-page`, which is not a utility: it compiled,'
  + ' produced rgba(0,0,0,0), and let the light body through');

ok('  and no inline colour is left fighting the tokens',
  !/style=\{\{ background: INK \}\}/.test(room)
  && !/borderColor: 'rgba/.test(room),
  'a room with half its colours in tokens and half in style attributes is a'
  + ' room that is wrong in one theme and nobody knows which');

ok('  and the palette reaches the footer the layout renders',
  /body:has\(\[data-cubed\]\)/.test(css),
  'the site footer is a SIBLING of the page, so a selector on the room alone'
  + ' ends a near-black room in a white band');

/* ── 6. Her button ───────────────────────────────────────────────────── */

ok('the classes section has its own door into the room',
  /data-cubeddoor/.test(page) && /href="\/cubed"/.test(page),
  'her words: "Die masterclass button moet ook sy eie button hê en wanneer'
  + ' iemand daar op click vat dit jou ook na ’n futuristic kamer toe"');

ok('  and the door carries her mark',
  /<CubedChip size=\{48\}/.test(page),
  'the tile is the button’s own argument: a row with nothing on its left is'
  + ' another row');

ok('  and the section is called what she called it',
  /t\('tab\.classes', 'Cubed classes'\)/.test(page),
  '"Die masterclass section wil ek rename na Cubed classes"');

console.log(bad === 0
  ? '\n  Three to a masterclass, sixty to the guest, said in public — and her\n'
    + '  own logo is on the page, as the file she sent and not as a drawing of it.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

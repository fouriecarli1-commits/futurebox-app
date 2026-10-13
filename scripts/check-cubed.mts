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
import { before } from './order.mts';
import {
  CLASSES_IN_A_SERIES, GUEST_SHARE, GUEST_TERMS, HOUSE_SHARE, SERIES,
  minutesOf, seriesById, splitAsSaid,
} from '../app/lib/cubed.ts';
import { createHash } from 'node:crypto';
import {
  LOCKUP, LOGO, LOGO_AF, LOGO_EN, LOGO_TALL, LOGO_WIDE, MARK, lockupFor,
} from '../app/components/CubedMark.tsx';
import { SERIES_RAND, guestRand, randSaid, seriesRand } from '../app/lib/cubed.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/CubedRoom.tsx', 'utf8'));
const mark = withoutComments(readFileSync('app/components/CubedMark.tsx', 'utf8'));
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const css = readFileSync('app/globals.css', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

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

/* ── 2. The split, which is NOT quoted to guests ──────────────────────

   It was, until Carli, 12 October 2026: "Die Cubed classes kan nie die
   winsverdeling wys tussen my en die persoon wat die klas aanbied nie." The
   number stays in `lib/cubed.ts` for the written agreement, and the room,
   the page's metadata and the dictionary say the series is shared and that
   the terms are written down — never what the share is. */

ok('sixty per cent goes to the guest, in the agreement',
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

ok('the guest terms say the series is shared, without the number',
  (() => {
    const all = GUEST_TERMS.map((term) => `${term[0]} ${term[1]}`).join(' ');
    return /shared with you/.test(all) && /written into your agreement/.test(all)
      && !/%/.test(all) && !/\b60\b|\b40\b/.test(all)
      && all.includes(`${CLASSES_IN_A_SERIES} sessions`);
  })(),
  '"Die Cubed classes kan nie die winsverdeling wys ... nie" — the share is'
  + ' in the agreement, not on the page');

ok('  and every term is written in both languages',
  GUEST_TERMS.every((term) => term[0].trim() && term[1].trim() && term[0] !== term[1]),
  'a guest reading Afrikaans is being asked to agree to something in another'
  + ' language');

const cubedPage = withoutComments(readFileSync('app/cubed/page.tsx', 'utf8'));
const cubedRows = words.split('\n').filter((line) => /^\s*"cubed\./.test(line)).join('\n');

ok('the room does not print the split, by name or by number',
  !/splitAsSaid|GUEST_SHARE|HOUSE_SHARE|guestRand|data-cubedsplit/.test(room)
  && !/\b60\s*\/\s*40\b|\b60\s*% (of|van)|sixty per ?cent/i.test(room),
  'the split is quoted TO GUESTS nowhere public');

ok('  nor does the page’s description, nor the dictionary',
  !/\b60\s*%|\b60\s*\/\s*40\b|going to the guest/.test(cubedPage)
  && !/\b60\s*%|\b60\s*\/\s*40\b|keeps \{g\}|hou \{g\}/.test(cubedRows),
  'a number in the metadata is a number in every search result');

ok('  and the room says the terms out loud',
  /data-cubedterms/.test(room) && /GUEST_TERMS\.map/.test(room),
  '"Ons moet dit ook so uit stipuleer vir ons gaste" — in public, before the'
  + ' conversation');

/* ── 2b. The third class, and the opening line ────────────────────────

   Carli, 12 October 2026: "klas nommer 3 moet nie gaan oor what goes wrong
   nie, eerder, what is next" — and, of the top of the page, "iets soos dive
   into the future and attend a class curated by a professional". */

ok('the third class is about what is next, not what goes wrong',
  SERIES.every((one) => {
    const third = one.parts.find((part) => part.part === 3);
    return Boolean(third) && /what is next/i.test(third!.title[0]) && /volgende/i.test(third!.title[1])
      && !/wrong|verkeerd/i.test(`${third!.title.join(' ')} ${third!.outcome.join(' ')}`);
  }),
  '"klas nommer 3 moet nie gaan oor what goes wrong nie, eerder, what is next"');

ok('  and nothing public still says "what goes wrong"',
  !/goes wrong|verkeerd loop/i.test(room) && !/goes wrong/i.test(cubedPage) && !/goes wrong|verkeerd loop/i.test(cubedRows)
  && !GUEST_TERMS.some((term) => /goes wrong|verkeerd loop/i.test(term.join(' '))),
  'the old shape of three, left in one place, is a page that disagrees with itself');

ok('the room opens with her line, in both languages',
  /data-cubedlead/.test(room) && /t\('cubed\.lead'/.test(room)
  && /"cubed\.lead": \{ en: "Dive into the future and attend a class curated by a professional\."/.test(words)
  && /"cubed\.lead": \{[^\n]*af: "Duik die toekoms in/.test(words),
  '"iets soos dive into the future and attend a class curated by a professional"');

ok('  above the three-classes line',
  before(room, 'data-cubedlead', "'cubed.what'"),
  'the invitation first, then what the three classes are');

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
    return !drawn && /<img/.test(mark) && /src=\{lockupFor\(lang\)\}/.test(mark);
  })(),
  'a trace is a redrawing: it is this app\'s reconstruction of her lines and'
  + ' it differs from them wherever the tracing was imperfect. She asked for'
  + ' her file, so the app shows her file');

ok('  and it is drawn at her file’s own proportions',
  /width=\{width\}\s*\n\s*height=\{width\}/.test(mark) && LOCKUP === 1080,
  'her per-language files are square, so width and height are the same'
  + ' number. Squashing somebody’s logo is the one thing about a logo'
  + ' everybody notices and nobody can say');

ok('  and the room shows it big enough to read',
  /<CubedMark width=\{4\d\d\}/.test(room),
  'below about four hundred pixels wide the word under the mark is a smudge');

ok('  and the small places do not shrink the lockup instead',
  !/<CubedMark/.test(page),
  'her lockup is BOTH marks with a word under each. At 48 pixels it is a'
  + ' smudge of two logos, so the door carries the single mark instead');

/* ── 4a. One language each, and a ground to read them against ────────── */

/**
 * Her two files, pinned the day they arrived — 11 October 2026.
 *
 * Same reasoning as the lockup above: the hash of what ARRIVED. These are
 * PNGs with alpha, and a build step that "optimises" images would flatten
 * or re-quantise them without being asked, which is a silent change to
 * somebody else's artwork.
 */
const HER_PAIR: Record<string, { readonly sha: string; readonly bytes: number }> = {
  [LOGO_EN]: {
    sha: '72e2bbba621763d67d5f8b7defc9401ea70aae57a11b9a525190d738d30fb733',
    bytes: 419_627,
  },
  [LOGO_AF]: {
    sha: 'cee32cbf5fbe7fd46a48b33049282c3d99e817a6018efd1829a24cea6c37bc2b',
    bytes: 432_319,
  },
};

for (const [path, want] of Object.entries(HER_PAIR)) {
  const bytes = (() => {
    try { return readFileSync(`public${path}`); } catch { return null; }
  })();
  ok(`${path} is in the app`, bytes !== null);
  ok('  and it is the file she sent, byte for byte',
    bytes !== null
    && bytes.length === want.bytes
    && createHash('sha256').update(bytes).digest('hex') === want.sha,
    'her words, twice: "Ek wil nie hê jy moet dit remake nie"');
  ok('  and it really is see-through',
    /* Colour type 6 is RGBA, 4 is grey+alpha; the byte sits 25 in. A
       lockup without an alpha channel brings a white rectangle with it and
       lands as a white card on a near-black page. */
    bytes !== null && (bytes[25] === 6 || bytes[25] === 4),
    `colour type ${bytes ? bytes[25] : 'unreadable'}`);
}

ok('an English reader is shown CLASS and an Afrikaans reader KLAS',
  lockupFor('en') === LOGO_EN && lockupFor('af') === LOGO_AF,
  'the lockup she first sent carries BOTH marks and BOTH words, so every'
  + ' reader was shown the other language beside their own');

ok('  and anything unexpected falls to English rather than to nothing',
  lockupFor('') === LOGO_EN && lockupFor('de') === LOGO_EN,
  'a blank src is a broken picture where the logo should be');

ok('  and the room hands it the language it is reading in',
  /<CubedMark[^>]*lang=\{lang\}/.test(room),
  'the component defaults to English, so a room that does not say which'
  + ' language it is in shows CLASS to an Afrikaans reader and nothing'
  + ' anywhere reports it');

/* ── Her navy, on a ground it can be seen against ───────────────────── */

ok('her lockup carries no ground of its own',
  !/background: PAPER/.test(mark) && !/bg-(white|zinc-(50|100|200))/.test(
    /data-cubedmark[\s\S]{0,400}/.exec(mark)?.[0] ?? '',
  ),
  'Carli, 11 October 2026: "Gebruik die transparent weergawe, die logo'
  + ' moenie \u2019n wit agtergrond h\u00ea nie." A panel under a see-through'
  + ' file is the white background she asked not to have, drawn by us'
  + ' instead of baked into the picture');

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

ok('the room declares its own light to the theme',
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

/**
 * Her ink, and the arithmetic for whether anything can be read on anything.
 *
 * `7,27,47` is the darkest pixel in both of her files, measured rather than
 * taken from a brand sheet nobody has.
 */
const HER_INK = [7, 27, 47];
const channel = (one: number): number => {
  const part = one / 255;
  return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
};
const lit = (rgb: readonly number[]): number =>
  0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);

/**
 * The room is light, and light enough for her navy.
 *
 * Carli, 11 October 2026: *"Maak die kamer lig."* Her mark is navy line
 * work and measured 1.15:1 against the near-black this room used to be —
 * a logo nobody can see. The page is the only thing that was allowed to
 * move: a panel under the mark she refused, and recolouring her lines she
 * has twice asked nobody to do.
 *
 * So the rule is not "the page is pale", which is a taste anybody can
 * argue with. It is that HER INK reads on it, which is arithmetic.
 */
const cubedBlock = (() => {
  const at = css.indexOf('[data-cubed],');
  return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
})();
const stop = (name: string): number[] | null => {
  const found = new RegExp(`--fb-${name}:\\s*(\\d+) (\\d+) (\\d+)`).exec(cubedBlock);
  return found ? [Number(found[1]), Number(found[2]), Number(found[3])] : null;
};
const pageRgb = stop('page');

/* Carli, 13 October 2026, with the room Google drew: the page is obsidian
   again, by her own instruction this time, and her navy cannot read on
   obsidian. So the room sets the lockup on a pale plate — `bg-zinc-50`,
   the 50 stop of this block — and the thing measured is the plate, which
   is what her ink actually sits on. */
const plateRgb = stop('surface-50');

ok('her navy reads on the plate the room sets it on',
  (() => {
    if (!plateRgb) return false;
    const against = (Math.max(lit(plateRgb), lit(HER_INK)) + 0.05)
      / (Math.min(lit(plateRgb), lit(HER_INK)) + 0.05);
    return against >= 4.5;
  })(),
  'the plate went dark and her mark is a ghost on it — which does not'
  + ' look broken, it looks like a design choice, and nobody files a bug');

ok('  and the room actually sets the lockup on that plate',
  /data-cubedplate[^>]*\bbg-zinc-50\b/.test(room) && /<CubedMark/.test(room.slice(room.indexOf('data-cubedplate'))),
  'the plate is the only reason her navy reads in an obsidian room, and a'
  + ' lockup drawn outside it is navy on near-black');

ok('  and the page is what `bg-zinc-950` paints, not a second number',
  (() => {
    const surface = stop('surface-950');
    return Boolean(pageRgb && surface
      && surface.every((one, at) => Math.abs(one - pageRgb[at]) <= 2));
  })(),
  'the room paints itself with `bg-zinc-950` and the theme paints the body'
  + ' with `--fb-page`. Two numbers for one surface is a seam down the page'
  + ' that only shows where one of them ends');

ok('  and the dimmest text in the room still clears AA on its own card',
  (() => {
    const page = pageRgb;
    const card = stop('surface-900');
    const dim = stop('surface-600');
    if (!page || !card || !dim) return false;
    /* The card is `bg-zinc-900/60` over the page, which is what the room
       actually writes on. Solving against the app's global worst case
       instead flattens 400, 500 and 600 onto one grey. */
    const over = card.map((one, at) => one * 0.6 + page[at] * 0.4);
    const against = (Math.max(lit(over), lit(dim)) + 0.05)
      / (Math.min(lit(over), lit(dim)) + 0.05);
    return against >= 4.5;
  })(),
  'this room uses `text-zinc-600` six times, and on the raw light ramp that'
  + ' stop lands at 3.4:1 — readable on the screen it was designed on and'
  + ' not on a laptop in daylight');

ok('  and the three text stops keep their order after the solve',
  (() => {
    const four = stop('surface-400');
    const five = stop('surface-500');
    const six = stop('surface-600');
    if (!four || !five || !six) return false;
    return lit(four) < lit(five) && lit(five) < lit(six);
  })(),
  'solving three stops against one floor pushes them all onto the same grey,'
  + ' and a page where emphasis and aside are the same colour has no'
  + ' hierarchy left to read');

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

ok('  and the pill is called what she called it',
  /t\('tab\.classes', 'Cubed Class'\)/.test(page)
  && /"tab\.classes": \{ en: "Cubed Class", af: "Kubieke Klas" \}/.test(words),
  'Carli, 11 October 2026: "daai button se naam moet Cubed Class wees, of in'
  + ' Afrikaans Kubieke Klas"');

ok('  and pressing it opens the room rather than filtering the page',
  /data-classdoor/.test(page) && /<Link key=\{tab\.id\} href="\/cubed"/.test(page),
  '"As jy op daai button click dan moet die cubed kamer dadelik oopmaak."'
  + ' A press that filters this page is a different thing from a door, and'
  + ' the room is where the brand, the terms and the price are');

ok('  and the listing it used to show is still reachable',
  /searchParams\.get\('tab'\)/.test(page) && /data-cubedlisting/.test(room)
  && /href="\/\?tab=masterclasses"/.test(room),
  'the pill was the only way to that listing. A door that orphans a page is'
  + ' a page quietly deleted, and nothing anywhere would say so');

/* ── 7. What a masterclass costs ────────────────────────────────────── */

ok('the room says what a masterclass costs',
  /data-cubedprice/.test(room) && /randSaid\(seriesRand\(\)\)/.test(room),
  'Carli, 11 October 2026: "Ek beplan om R949 vir \u2019n cubed class te'
  + ' vra." A guest deciding whether three evenings are worth it cannot work'
  + ' that out from a percentage');

ok('  and it is the price she said, for all three classes together',
  SERIES_RAND === 949 && seriesRand() === SERIES_RAND,
  'Carli, 12 October 2026: "al drie klasse is gelykstaande aan R949"');

ok('  and nothing multiplies it into a per-class price or a series total',
  !/CLASS_RAND|\* CLASSES_IN_A_SERIES|CLASSES_IN_A_SERIES \*/.test(room)
  && !/949/.test(room) && !/2847|2 847/.test(room)
  && /"cubed\.aClass": \{ en: "for all three classes"/.test(words)
  && !/"cubed\.(price|aClass|fee|priceWhat)": \{[^\n]*\ba class\b/.test(words),
  'a price typed into a page, or a page that does the arithmetic the other'
  + ' way, is a page that disagrees with the agreement');

ok('  and what the guest keeps follows the split that is on the same page',
  guestRand() === Math.round(seriesRand() * GUEST_SHARE),
  `${guestRand()} is not ${Math.round(seriesRand() * GUEST_SHARE)} — the page`
  + ' shows a split and a number, and a guest who adds them up and gets a'
  + ' third answer stops trusting both');

ok('  and a price reads as this country writes one',
  randSaid(949) === 'R949' && randSaid(2847) === 'R2 847',
  randSaid(2847));

console.log(bad === 0
  ? '\n  Three to a masterclass, the terms said in public and the split kept for the agreement — and her\n'
    + '  own logo is on the page, as the file she sent and not as a drawing of it.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

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
 * ── The mark ─────────────────────────────────────────────────────────────
 *
 * The first version of it was two cubes drawn one over the other and called
 * interwoven. It was rendered, looked at, and thrown away — a thing drawn
 * second is in front everywhere, which is overlapping. Woven needs the far
 * cube to come BACK over the near one somewhere, and that is a specific pass
 * this file holds, because a mark without it still looks deliberate and is
 * simply the wrong drawing.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  CLASSES_IN_A_SERIES, GUEST_SHARE, GUEST_TERMS, HOUSE_SHARE, SERIES,
  minutesOf, seriesById, splitAsSaid,
} from '../app/lib/cubed.ts';

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

/* ── 4. The mark, and the one pass that makes it woven ────────────────── */

ok('the mark draws two cubes',
  /const FAR = cubeBars\(/.test(mark) && /const NEAR = cubeBars\(/.test(mark),
  'her words: "twee cubes in mekaar vervleg"');

ok('  and the near one erases what it crosses',
  /bars\(NEAR, back, CASING\)/.test(mark),
  'without the erasing pass the near cube is simply drawn on top, and lines'
  + ' show through it');

ok('  and the far one comes BACK over the near one',
  /bars\(OVER\.map\(\(at\) => FAR\[at\]\), back, CASING\)/.test(mark)
  && /bars\(OVER\.map\(\(at\) => FAR\[at\]\), iron, BAR\)/.test(mark),
  'this is the whole of the word. Without it the far cube is merely behind,'
  + ' and behind is overlapping rather than woven — which is exactly what the'
  + ' first version of this mark was');

ok('  and the casing is wider than the bar it hides',
  (() => {
    const bar = Number(mark.match(/export const BAR = ([\d.]+)/)?.[1] ?? 0);
    const casing = Number(mark.match(/export const CASING = ([\d.]+)/)?.[1] ?? 0);
    return bar > 0 && casing > bar + 1;
  })(),
  'a casing the same width as the bar leaves the line it was meant to hide'
  + ' showing along both edges');

ok('  and the background is given rather than assumed',
  /readonly back\?: string;/.test(mark) && /back = '#/.test(mark)
  /* And the rooms that draw it pass their own, rather than letting the
     default stand on a surface it does not match. */
  && /back=\{INK\}/.test(room) && /back="#0b0b0e"/.test(page),
  'the erasing pass is painted in the page’s own colour, so a mark that'
  + ' assumes black has black gashes through it on a white page');

ok('  and the iron is one gradient across the whole mark',
  /gradientUnits="userSpaceOnUse"/.test(mark),
  'a gradient per bar lights every bar from its own direction, and eighteen'
  + ' separately lit bars read as eighteen objects rather than two cubes');

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

ok('  and the door carries the mark',
  /<CubedMark size=\{48\}/.test(page),
  'the mark is the only thing on that page with a surface, which is what'
  + ' makes it read as a door into somewhere else rather than another row');

ok('  and the section is called what she called it',
  /t\('tab\.classes', 'Cubed classes'\)/.test(page),
  '"Die masterclass section wil ek rename na Cubed classes"');

console.log(bad === 0
  ? '\n  Three to a masterclass, sixty to the guest, said in public — and the two\n'
    + '  cubes really do pass through each other.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

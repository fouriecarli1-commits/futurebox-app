/**
 * What a film costs, read with numbers.
 *
 * ── Why the examples are in here and not in a comment ────────────────────
 *
 * Carli, 3 October 2026, asking for every element in the cutting room to carry
 * credits — and in the same message setting the constraint the whole design
 * has to meet: *"Nie te hoë krediete nie, dit moet bekostigbaar wees om 'n
 * video uiteindelik te export."*
 *
 * "Affordable" is not a feeling, it is a number of films a month. So the four
 * worked examples below are assertions rather than prose: a bare film, an
 * advert, a long clip and a fully dressed music video, each with what it costs
 * and how many of them a Maker's ninety buys. Change any price in `credits.ts`
 * and whichever of those stops being true says so by name.
 *
 * A table of examples in a comment goes stale the first time a price moves and
 * nothing notices. This repository has had that three times.
 */
import { CREDITS, perMinute } from '../app/lib/credits';
import { TIER_CREDITS } from '../app/lib/credits';
import {
  NOTHING_IN_IT, billFor, billForEdit, inTheFilm, type InTheFilm,
} from '../app/lib/filmcost';
import { readFileSync } from 'node:fs';
import type { Edit, Piece } from '../app/lib/videoedit';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/** What a credit is worth, for saying prices in money. */
const RAND = 149 / 90;
const rand = (credits: number): string => `R${(credits * RAND).toFixed(2)}`;
const perMonth = (credits: number): number => Math.floor(TIER_CREDITS.maker / credits);

/* ── Nothing at all ────────────────────────────────────────────────────── */

ok('a film of no length costs nothing, rather than a minimum',
  billFor(NOTHING_IN_IT).total === 0,
  'the one-minute floor is right for a film and wrong for an empty clock');

ok('  and carries no rows to show',
  billFor(NOTHING_IN_IT).lines.length === 0);

/* ── The four films that have to stay affordable ───────────────────────── */

const film = (over: Partial<InTheFilm>): InTheFilm => ({ ...NOTHING_IN_IT, ...over });

const BARE = film({ seconds: 20 });
const ADVERT = film({ seconds: 20, words: 1, looks: 1, joins: 1, mark: true, under: true });
const LONGER = film({ seconds: 90, words: 3, looks: 3, joins: 2, mark: true, under: true });
const DRESSED = film({ seconds: 180, words: 6, looks: 6, joins: 5, mark: true, under: true });

const bareBill = billFor(BARE);
ok('a bare twenty-second film costs what it always did',
  bareBill.total === CREDITS.filmOut,
  `${bareBill.total} credits · ${rand(bareBill.total)} · ${perMonth(bareBill.total)} a month on Maker`);

ok('  so nothing anybody already makes got dearer',
  bareBill.total === perMinute(20, CREDITS.filmOut),
  'a new price that raises the simplest case is a price rise wearing a feature');

const advertBill = billFor(ADVERT);
ok('an advert with words, a look, a join, a logo and a track costs six',
  advertBill.total === 6,
  `${advertBill.total} credits · ${rand(advertBill.total)} · ${perMonth(advertBill.total)} a month on Maker`);

const longerBill = billFor(LONGER);
ok('a minute and a half, fully dressed, costs twelve',
  longerBill.total === 12,
  `${longerBill.total} credits · ${rand(longerBill.total)} · ${perMonth(longerBill.total)} a month on Maker`);

const dressedBill = billFor(DRESSED);
ok('a three-minute music video with everything on it costs eighteen',
  dressedBill.total === 18,
  `${dressedBill.total} credits · ${rand(dressedBill.total)} · ${perMonth(dressedBill.total)} a month on Maker`);

/* ── And "affordable" as a number rather than a feeling ────────────────── */

ok('a Maker can make at least ten adverts a month and still have credits left',
  perMonth(advertBill.total) >= 10,
  `${perMonth(advertBill.total)} adverts at ${advertBill.total} credits from ${TIER_CREDITS.maker}`);

ok('  and at least three full music videos',
  perMonth(dressedBill.total) >= 3,
  `${perMonth(dressedBill.total)} at ${dressedBill.total} credits`);

ok('  and the dearest film costs less than two full songs',
  dressedBill.total < CREDITS.song * 2,
  `${dressedBill.total} against a song's ${CREDITS.song}`
  + ' — a browser-rendered film costing more than two songs we actually pay for'
  + ' would be a price with nothing behind it');

/* ── The ceiling, which is what keeps the last one true ────────────────── */

ok('the elements never cost more than the film itself',
  [BARE, ADVERT, LONGER, DRESSED].every((one) => billFor(one).elements <= billFor(one).base),
  'the one sentence this whole design rests on');

ok('  so the dearest film is exactly twice the cheapest of the same length',
  billFor(film({
    seconds: 180, words: 99, looks: 99, joins: 99, mark: true, under: true,
  })).total === billFor(film({ seconds: 180 })).total * 2,
  'whatever somebody piles on, the price has a known top');

ok('  and the ceiling says so when it is doing something',
  billFor(ADVERT).ceiling === true && billFor(BARE).ceiling === false,
  'a discount nobody is told about is a price nobody can check');

ok('  while each row still shows what that element really comes to',
  billFor(ADVERT).lines.filter((one) => one.id !== 'film')
    .reduce((all, one) => all + one.credits, 0) === billFor(ADVERT).asked,
  'a row reading "3 looks · 2 credits" because the ceiling took a third off the'
  + ' middle of it is a row nobody can check against the price beside it');

/* ── Longer films are dearer, which is the thing that should move it ───── */

ok('length is what moves the price',
  billFor(film({ seconds: 30 })).total < billFor(film({ seconds: 150 })).total,
  'and not how hard somebody worked in a room whose value is that they do');

ok('  by the minute, floored at one',
  billFor(film({ seconds: 1 })).total === CREDITS.filmOut
  && billFor(film({ seconds: 61 })).total === CREDITS.filmOut * 2);

/* ── Counting what is in an edit ───────────────────────────────────────── */

const CLIP = { size: 1, type: 'video/mp4' } as unknown as Blob;
const piece = (id: string, over: Partial<Piece> = {}): Piece => ({
  id, clip: CLIP, name: id, from: 0, to: 10, ...over,
});

const edit: Edit = {
  pieces: [
    piece('a', { words: 'Hallo', look: 'warm' }),
    piece('b', { look: 'cold', join: 'dissolve' }),
    piece('c', { words: '   ', join: 'cut' }),
  ],
  under: CLIP,
};
const counted = inTheFilm(edit, true);

ok('an edit is counted per piece that carries the thing',
  counted.words === 1 && counted.looks === 2,
  `${counted.words} with words, ${counted.looks} with a look`);

ok('  and blank words are not words',
  counted.words === 1,
  'three spaces in a text box is not a caption, and the renderer draws nothing for it');

ok('  and a straight cut is not a transition',
  counted.joins === 1,
  `${counted.joins} joins where only one is not a hard cut`);

ok('  and the first piece has no join to charge for',
  inTheFilm({ pieces: [piece('a', { join: 'dissolve' })] }, false).joins === 0,
  'the renderer ignores it because there is nothing behind it to arrive from,'
  + ' and charging for something never drawn is charging for nothing');

ok('  and a piece of no length is counted in nothing',
  inTheFilm({ pieces: [piece('a', { to: 0, words: 'Hallo', look: 'warm' })] }, false).words === 0,
  'cutFrom leaves it out of the render, so it is not in the film to charge for');

ok('  and the mark and the track are each counted once',
  counted.mark === true && counted.under === true
  && billFor(counted).lines.filter((one) => one.id === 'mark')[0]?.count === 1);

ok('  and billForEdit agrees with billFor on the same edit',
  billForEdit(edit, true).total === billFor(counted).total);

/* ── A browser never sends a price ─────────────────────────────────────── */

const route = readFileSync('app/api/madehere/route.ts', 'utf8');
ok('the route works the price out itself',
  /billFor\(/.test(route),
  'a price that arrives from a browser is a price a browser chose');

ok('  and reads no credits off the request',
  !/body\.(credits|price|total|cost)/.test(route),
  'the one rule: the client says what is in the film, the server says what it costs');

const room = readFileSync('app/components/VideoEditor.tsx', 'utf8');
ok('and the screen shows the same bill the route will charge',
  /billForEdit\(/.test(room),
  'two copies of a price is two prices, and the one on the button is the one'
  + ' somebody agreed to');

if (bad) {
  console.error(`\ncheck:filmcost — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:filmcost — an advert is six credits and a full music video eighteen,'
  + ' the elements never cost more than the film itself, and the price is worked'
  + ' out by the server rather than sent by the browser.',
);

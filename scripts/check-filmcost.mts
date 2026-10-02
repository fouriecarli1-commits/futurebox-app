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
import { CREDITS } from '../app/lib/credits';
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
ok('a bare twenty-second film is one half-minute at the film rate',
  bareBill.total === CREDITS.filmOut,
  `${bareBill.total} credits · ${rand(bareBill.total)} · ${perMonth(bareBill.total)} a month on Maker`);

ok('  and a floor of one unit, so the shortest work is not free',
  billFor(film({ seconds: 1 })).total === CREDITS.filmOut);

const advertBill = billFor(ADVERT);
ok('a twenty-second advert using all five functions is 35',
  advertBill.total === 35,
  `${advertBill.total} credits · ${rand(advertBill.total)} · ${perMonth(advertBill.total)} a month on Maker`);

const longerBill = billFor(LONGER);
ok('a minute and a half using all five is 55',
  longerBill.total === 55,
  `${longerBill.total} credits · ${rand(longerBill.total)} · ${perMonth(longerBill.total)} a month on Maker`);

const dressedBill = billFor(DRESSED);
ok('a three-minute music video using all five is 85',
  dressedBill.total === 85,
  `${dressedBill.total} credits · ${rand(dressedBill.total)} · ${perMonth(dressedBill.total)} a month on Maker`);

/* ── And "affordable" as a number rather than a feeling ────────────────── */

/* ── The one that has to hold, at any price she sets ────────────────────

   A plan has to afford at least one of the films it is sold for. Maker's card
   says "3 music videos"; a Maker who cannot finish ONE dressed three-minute
   film has been sold something the plan cannot do, and that is the failure this
   assertion exists for — not "is it cheap", which is hers to decide.

   At 10 a half minute and 5 a function it is 85 against 90. It fits by five
   credits, which is tight and is worth knowing rather than discovering. */
ok('a Maker can afford at least one fully dressed three-minute film',
  dressedBill.total <= TIER_CREDITS.maker,
  `${dressedBill.total} credits against Maker's ${TIER_CREDITS.maker}`
  + ' — a card that sells three music videos on a plan that cannot finish one'
  + ' is a card that lies');

ok('  and a Studio member can afford at least two',
  dressedBill.total * 2 <= TIER_CREDITS.studio,
  `${dressedBill.total * 2} against Studio's ${TIER_CREDITS.studio}`);

/* ── Per FUNCTION, not per use, which is the whole shape of it ─────────── */

ok('words on six shots cost the same as words on one',
  billFor(film({ seconds: 60, words: 6 })).total === billFor(film({ seconds: 60, words: 1 })).total,
  'what is charged for is reaching for the text tool, not each caption —'
  + ' a room that charged per caption would be charging most to the people'
  + ' using it most');

ok('  and the same for looks and transitions',
  billFor(film({ seconds: 60, looks: 9, joins: 9 })).total
    === billFor(film({ seconds: 60, looks: 1, joins: 1 })).total);

ok('  so the dearest film of a length is the base plus five functions',
  billFor(film({
    seconds: 180, words: 99, looks: 99, joins: 99, mark: true, under: true,
  })).total === billFor(film({ seconds: 180 })).total + CREDITS.filmWords * 5,
  'whatever somebody piles on, the price has a known top');

ok('  and each row still says how many shots carry it',
  billFor(film({ seconds: 60, words: 3 })).lines.find((one) => one.id === 'words')?.count === 3,
  'the price asks whether any shot has words; the ROW has to say three, because'
  + ' that is what somebody needs in order to decide what to take off');

/* ── Longer films are dearer, which is the thing that should move it ───── */

ok('length is what moves the price',
  billFor(film({ seconds: 30 })).total < billFor(film({ seconds: 150 })).total,
  'and not how hard somebody worked in a room whose value is that they do');

ok('  by the half minute, floored at one',
  billFor(film({ seconds: 1 })).total === CREDITS.filmOut
  && billFor(film({ seconds: 31 })).total === CREDITS.filmOut * 2
  && billFor(film({ seconds: 30 })).total === CREDITS.filmOut,
  `30s is ${billFor(film({ seconds: 30 })).total}, 31s is ${billFor(film({ seconds: 31 })).total}`);

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
  '\ncheck:filmcost — ten credits a half minute and five a function, so a'
  + ' twenty-second advert is 35 and a dressed three-minute film is 85 against'
  + " Maker's 90; words on six shots cost what words on one cost, and the price"
  + ' is worked out by the server rather than sent by the browser.',
);

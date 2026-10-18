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
 * and how many of them a Maker's hundred buys. Change any price in `credits.ts`
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
const RAND = 149 / TIER_CREDITS.maker;
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
const ADVERT = film({ seconds: 20, words: 1, looks: 1, joins: 1, mark: true, under: true, motions: 1 });
const LONGER = film({ seconds: 90, words: 3, looks: 3, joins: 2, mark: true, under: true, motions: 2 });
const DRESSED = film({ seconds: 180, words: 6, looks: 6, joins: 5, mark: true, under: true, motions: 4 });

const bareBill = billFor(BARE);
ok('a bare twenty-second film is one half-minute at the film rate',
  bareBill.total === CREDITS.filmOut,
  `${bareBill.total} credits · ${rand(bareBill.total)} · ${perMonth(bareBill.total)} a month on Maker`);

ok('  and a floor of one unit, so the shortest work is not free',
  billFor(film({ seconds: 1 })).total === CREDITS.filmOut);

const advertBill = billFor(ADVERT);
ok('a twenty-second advert using all six functions is 46',
  advertBill.total === 46,
  `${advertBill.total} credits · ${rand(advertBill.total)} · ${perMonth(advertBill.total)} a month on Maker`);

const longerBill = billFor(LONGER);
ok('a minute and a half using all six is 66',
  longerBill.total === 66,
  `${longerBill.total} credits · ${rand(longerBill.total)} · ${perMonth(longerBill.total)} a month on Maker`);

const dressedBill = billFor(DRESSED);
ok('a three-minute music video using all six is 96',
  dressedBill.total === 96,
  `${dressedBill.total} credits · ${rand(dressedBill.total)} · ${perMonth(dressedBill.total)} a month on Maker`);

/* ── And "affordable" as a number rather than a feeling ────────────────── */

/* ── The one that has to hold, at any price she sets ────────────────────

   A plan has to afford at least one of the films it is sold for. Maker's card
   says "3 music videos"; a Maker who cannot finish ONE dressed three-minute
   film has been sold something the plan cannot do, and that is the failure this
   assertion exists for — not "is it cheap", which is hers to decide.

   At 10 a half minute and the five functions as they were then — three
   each — it was 75 against 100. It fits with
   twenty-five over, which is the room the 4 October price change was for: at
   five a function it was 85 against 90 and a Maker who made one film had four
   credits left for the whole month. */
/* ── Moved with her prices, 15 October 2026 ────────────────────────────
   Carli set Maker at R1.80 a credit — 83 credits for R149 — and a dressed
   three-minute film (90) no longer fits in one Maker month; it takes a
   seven-credit top-up, and she was told so in as many words. What a Maker
   CAN still finish inside the month is a dressed minute and a half (60),
   and that is what is held here, so the next change to Maker's credits
   cannot quietly take that away too. The card's own line says what each
   film costs; it does not say a Maker month covers the three-minute one. */
ok('a Maker can afford at least one fully dressed minute-and-a-half film',
  longerBill.total <= TIER_CREDITS.maker,
  `${longerBill.total} credits against Maker's ${TIER_CREDITS.maker}`
  + ' — a plan sold for making films has to finish one');

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

/* ── The five stopped costing the same on 11 October 2026 ──────────────
 
   This read the ceiling as the base plus `filmWords` times five, which was
   right while every function cost three credits and became wrong the hour
   Carli priced them apart — a look at six, her own logo at fifteen. The
   ceiling is still a known number; it is just the sum of five different
   ones now. */
const FIVE = CREDITS.filmWords + CREDITS.filmLook + CREDITS.filmJoin
  + CREDITS.filmMark + CREDITS.filmUnder + CREDITS.filmMotion;

ok('  so the dearest film of a length is the base plus all six functions',
  billFor(film({
    seconds: 180, words: 99, looks: 99, joins: 99, mark: true, under: true, motions: 99,
  })).total === billFor(film({ seconds: 180 })).total + FIVE,
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

/* ── And the cards say the same numbers ────────────────────────────────── */

/* The prices above are only half the promise. The other half is the sentence
   on the packages screen, which quotes them in words — "plus 3 for each
   function you used … a twenty-second advert using all five is 25; a dressed
   three-minute film is 75".

   That sentence is prose, so nothing in TypeScript makes it true. It has gone
   stale before: the cards carried "plus 5 … 35 … 85" for the whole time the
   constants said something else would be charged, which is a card that lies
   about a price somebody is about to pay. So the numbers in it are read back
   out of the file and held against the bills. */

const cards = readFileSync('app/lib/plans.ts', 'utf8');
const quoted = (what: string, re: RegExp): number[] =>
  [...cards.matchAll(re)].map((m) => Number(m[1]));

/* ── And the card lists five prices rather than one ────────────────────
 
   It used to say "plus 3 for each function", and this read that one number
   back. Now that the five differ, a card saying one number would be a card
   lying about four of them — so it names each, and each is held against
   its own constant. A card that quotes a price somebody is about to pay is
   the one piece of copy that cannot be approximately right. */
const eachSaid: [string, RegExp, number][] = [
  ['words', /words (\d+)/g, CREDITS.filmWords],
  ['a look', /a look (\d+)/g, CREDITS.filmLook],
  ['a transition', /a transition (\d+)/g, CREDITS.filmJoin],
  ['your logo', /your logo (\d+)/g, CREDITS.filmMark],
  ['a track under it', /a track under it (\d+)/g, CREDITS.filmUnder],
  ['movement', /movement (\d+)/g, CREDITS.filmMotion],
];
for (const [what, re, charged] of eachSaid) {
  const said = quoted(what, re);
  ok(`every card quotes what ${what} costs, and it is what is charged`,
    said.length >= 3 && said.every((n) => n === charged),
    `cards say ${said.join(', ') || 'nothing'}; the file charges ${charged}`);
}

const advertSaid = quoted('advert', /advert using all six is (\d+)/g);
ok('  and the advert they quote is the advert they will be billed',
  advertSaid.length >= 3 && advertSaid.every((n) => n === advertBill.total),
  `cards say ${advertSaid.join(', ')}; the bill is ${advertBill.total}`);

const dressedSaid = quoted('dressed', /dressed three-minute film is (\d+)/g);
ok('  and the dressed three-minute film likewise',
  dressedSaid.length >= 3 && dressedSaid.every((n) => n === dressedBill.total),
  `cards say ${dressedSaid.join(', ')}; the bill is ${dressedBill.total}`);

const half = quoted('half minute', /(\d+) credits per 30 seconds/g);
ok('  and the base, per thirty seconds, on every card that names it',
  half.length >= 3 && half.every((n) => n === CREDITS.filmOut),
  `cards say ${half.join(', ')}; the file charges ${CREDITS.filmOut}`);

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
/* Said with the numbers rather than about them. This sentence was written out
   in full once and then carried "35 … 85 … 90" for the whole time the file
   charged something else — a summary line that lies is worse than none. */
console.log(
  `\ncheck:filmcost — ${CREDITS.filmOut} credits a half minute and`
  + ` the five functions priced apart (${FIVE} for all of them), so a twenty-second advert is`
  + ` ${advertBill.total} and a dressed three-minute film is ${dressedBill.total}`
  + ` against Maker's ${TIER_CREDITS.maker}; words on six shots cost what words`
  + ' on one cost, the cards quote the same numbers, and the price is worked out'
  + ' by the server rather than sent by the browser.',
);

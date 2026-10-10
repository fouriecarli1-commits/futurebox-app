/**
 * Google draws the Cubed mark, and nothing we drew is sent to it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Vra ons google partner om vir ons logo te maak?
 * Joune is baie primitief."* And then, looking at what came back: *"Het jy vir
 * google gevra sonder jou voorbeelde?"*
 *
 * ── Why that question needs a check and not an answer ────────────────────
 *
 * Because "I did not send it a picture" is a sentence, and she has no way to
 * see whether it is true. `makePicture` takes a reference image as its second
 * argument; passing one is a single word, it is the normal thing to do
 * everywhere else in this app, and it would be invisible from outside — the
 * pictures would simply come back looking like ours, which is exactly the
 * complaint she made.
 *
 * So the thing handed to Google is a VALUE, not an absence. `askFor` builds
 * it, this file runs `askFor` for every take and reads what comes out, and
 * the route is pinned to passing that value and nothing else — one call site,
 * matched exactly, with a count so a second one cannot be added beside it.
 *
 * The first version of this tried to drive the whole route with a stand-in
 * Google underneath it. The stand-in never arrived: tsx loads the route as
 * CommonJS, so the module hook that was supposed to swap Google out was never
 * consulted, and the check sat there reporting a 401 it had written itself.
 * It is recorded because a check that cannot reach the thing it is checking
 * is the failure this whole file exists to prevent, and it very nearly
 * shipped.
 *
 * ── And the brief itself ─────────────────────────────────────────────────
 *
 * The prompts are what Google actually hears, so the things she asked for out
 * loud — two cubes, one of them turned, nothing symmetrical, no lettering —
 * are checked as words in them. A take that quietly dropped "one of them
 * rotated" would come back as two cubes side by side and look like a model
 * that did not understand, when it was us that did not ask.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { BRIEF, TAKES, askFor, takeById } from '../app/lib/cubedwords.ts';
import { takesAsked } from '../app/api/cubed/mark/route.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const route = withoutComments(readFileSync('app/api/cubed/mark/route.ts', 'utf8'));
const lab = withoutComments(readFileSync('app/components/MarkLab.tsx', 'utf8'));

/* ── 1. The brief says what she said ──────────────────────────────────── */

ok('the brief asks for two cubes inside one another',
  /two cubes/i.test(BRIEF) && /interlock|through one another|chain/i.test(BRIEF),
  'her words, twice: "twee cubes in mekaar vervleg" and "nog meer in mekaar"');

ok('  and for one of them to be turned',
  /rotated|turned/i.test(BRIEF) && /different angle/i.test(BRIEF),
  '"die een moet half gedraai wees… en dan meer hoeke het, omdat die een'
  + ' gedraai is". Left out, what comes back is two cubes side by side and it'
  + ' looks like the model did not understand, when it was us that did not ask');

ok('  and says no lettering',
  /no text|no lettering|no words/i.test(BRIEF),
  'an image model asked for a logo writes a company name on it nine times out'
  + ' of ten, in letters that are not letters');

ok('  and it is one brief, said before every take',
  TAKES.length >= 3 && new Set(TAKES.map((one) => one.words)).size === TAKES.length,
  'four takes that say the same thing are one take asked for four times,'
  + ' which is four times the money for one answer');

ok('  and every take is named in both languages',
  TAKES.every((one) => one.said[0].trim() && one.said[1].trim() && one.said[0] !== one.said[1]),
  'she reads the Afrikaans');

ok('  and an id that is not there answers nothing',
  takeById('no-such-take') === undefined);

ok('  and no take quietly asks for a reference',
  TAKES.every((one) => !/like the|as shown|attached|reference|example/i.test(one.words))
  && !/like the|as shown|attached|reference|example/i.test(BRIEF),
  'a prompt that says "like the attached" is a prompt that sends a picture'
  + ' without passing one');

/* ── 2. What is handed to Google, run and read ────────────────────────── */

const asks = TAKES.map((take) => askFor(take));

ok('every take is asked for with NOTHING WE DREW',
  asks.length === TAKES.length && asks.every((one) => one.from === undefined),
  'her question, and the reason this file exists: "Het jy vir google gevra'
  + ' sonder jou voorbeelde?" An image model handed a drawing reproduces it,'
  + ' and what would be reproduced is the mark she has already turned down'
  + ' twice');

ok('  and carries the whole brief, not just its own half',
  asks.every((one) => one.words.startsWith(BRIEF) && one.words.length > BRIEF.length + 40),
  'a take sent without the brief is a take about nothing');

ok('  and every one of them is a different ask',
  new Set(asks.map((one) => one.words)).size === asks.length,
  'four takes that say the same thing are one take asked for four times,'
  + ' which is four times the money for one answer');

ok('  and asks for a square',
  asks.every((one) => one.aspect === '1:1'),
  'left off, the engine picks, and a wide logo cannot be an app icon');

ok('  and the route hands Google that and nothing else',
  (() => {
    const calls = route.match(/makePicture\(/g) ?? [];
    return calls.length === 1
      && /const ask = askFor\(take\);/.test(route)
      && /makePicture\(ask\.words, ask\.from, ask\.aspect\)/.test(route);
  })(),
  'the call site is pinned, and counted, so a second one cannot be added'
  + ' beside it with a picture in it');

/* ── 2b. What it will and will not draw, run ──────────────────────────── */

ok('pressing it plain asks for every take',
  (takesAsked({}) ?? []).length === TAKES.length,
  'four at a time is what makes it a choice rather than a guess');

ok('  and one can be asked for again on its own',
  (() => {
    const one = takesAsked({ take: TAKES[1].id });
    return one?.length === 1 && one[0] === TAKES[1].id;
  })(),
  'four at a time to choose, one at a time to settle — a page that can only'
  + ' redraw all four spends four times the money on a change of mind about'
  + ' one');

ok('  and a take that does not exist is refused rather than drawn',
  takesAsked({ take: 'not-a-take' }) === null
  && takesAsked({ take: 42 }) === null
  && takesAsked({ take: '' }) === null,
  'an unknown name that fell through would be asked for as `undefined` and'
  + ' come back as whatever the engine makes of that, having been paid for');

/* ── 3. It is hers, and it is metered ─────────────────────────────────── */

ok('the route is the operator’s alone',
  /callerIsOwner\(caller\)/.test(route) && /status: 403/.test(route)
  && /status: 401/.test(route),
  'anybody else pressing this would be spending her Google budget on her'
  + ' logo');

ok('  and it asks the ceiling before it asks Google',
  (() => {
    const ceiling = route.indexOf("enough('image'");
    const asking = route.indexOf('makePicture(');
    return ceiling > 0 && asking > ceiling;
  })(),
  'the budget alert she asked for on 10 October is not a formality: a tool'
  + ' that draws four pictures a press is exactly the kind that runs a month'
  + ' into a day');

ok('  and it asks for four pictures of room, not one',
  /enough\('image', PER_PICTURE \* wanted\.length/.test(route),
  'reserving one picture and then drawing four is a ceiling that is wrong by'
  + ' a factor of four in the direction that costs money');

ok('  and writes down what it cost once the picture is in hand',
  (() => {
    const made = route.indexOf('if (made.ok)');
    const wrote = route.indexOf("note('image'");
    return made > 0 && wrote > made;
  })(),
  'a call that failed cost nothing, and a ceiling that counts failures closes'
  + ' early for a reason nobody can see');

ok('  and one engine refusing does not throw the rest away',
  /ok: false, message: made\.message/.test(route),
  'a page that returns nothing because the fourth failed is a page that looks'
  + ' broken when three of the four are sitting there');

/* ── 4. The bench ─────────────────────────────────────────────────────── */

ok('the bench can save what comes back',
  /download=\{`cubed-\$\{take\.id\}\.png`\}/.test(lab),
  'a picture she can see and cannot keep is a picture she has to ask for'
  + ' again, and asking again costs');

ok('  and says, on the page, that nothing of ours was sent',
  /Google is given the brief in words and nothing else/.test(lab),
  'she asked the question; the page she presses should answer it without her'
  + ' having to ask again');

console.log(bad === 0
  ? '\n  Google is asked for the mark in her words, four ways, and is handed\n'
    + '  nothing we ever drew.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

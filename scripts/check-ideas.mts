/**
 * Does the app ask "want to do more with it?" at the right moments, and
 * not so often that it becomes a nag?
 *
 * The owner, 27 October 2026: *"bou notifications in wat vra of hulle nie
 * iets met die image wil doen nie, dit is deel van ons in app bemarking en
 * om kliente aan te moedig."* The rationing is `app/lib/ideas.ts`; this holds
 * its rules, that every offer carries a price, and that each moment is
 * really asked from the place it belongs to.
 *
 *   npm run check:ideas
 */
import { readFileSync } from 'node:fs';
import {
  IDEAS, IDEA_GAP, IDEA_MOMENTS, IDEA_REST, IDEAS_A_DAY, NOTHING_SEEN, asked, mayAsk, notNow, tookIt,
} from '../app/lib/ideas.ts';
import { BECOMES } from '../app/lib/becomes.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const NOON = new Date(2026, 10, 2, 12, 0, 0).getTime();
const MIN = 60_000;

/* ── The rules ────────────────────────────────────────────────────────── */
ok('a phone that was never asked is asked', mayAsk('postSaved', NOON, NOTHING_SEEN));
let seen = asked('postSaved', NOON, NOTHING_SEEN);
ok('the same moment is not asked again within ten minutes', !mayAsk('postSaved', NOON + IDEA_GAP - MIN, seen));
ok('  but after ten minutes it is', mayAsk('postSaved', NOON + IDEA_GAP, seen));
ok('  and another moment may come straight after', mayAsk('stickerPeeled', NOON + MIN, seen));

seen = NOTHING_SEEN;
for (let n = 0; n < IDEAS_A_DAY; n += 1) seen = asked(IDEA_MOMENTS[n % IDEA_MOMENTS.length], NOON + n * IDEA_GAP, seen);
ok(`no more than ${IDEAS_A_DAY} a day`, !mayAsk('coverKept', NOON + 5 * IDEA_GAP, seen));
ok('  and the next day it starts again', mayAsk('coverKept', NOON + 24 * 60 * MIN, seen));

seen = notNow('photoOpened', NOON, NOTHING_SEEN);
ok('one "Not now" is not a rest', mayAsk('photoOpened', NOON + IDEA_GAP, seen));
seen = notNow('photoOpened', NOON + IDEA_GAP, seen);
ok('two "Not now"s rest that moment for three days', !mayAsk('photoOpened', NOON + 2 * IDEA_GAP, seen)
  && !mayAsk('photoOpened', NOON + IDEA_GAP + IDEA_REST - MIN, seen));
ok('  and only that moment', mayAsk('postSaved', NOON + 2 * IDEA_GAP, seen));
ok('  and after three days it may come again', mayAsk('photoOpened', NOON + IDEA_GAP + IDEA_REST, seen));
seen = tookIt('photoOpened', notNow('photoOpened', NOON, NOTHING_SEEN));
ok('a yes clears the "Not now"s', (seen.nots.photoOpened ?? 0) === 0);

/* ── Every offer is a real press, with a price ────────────────────────── */
for (const moment of IDEA_MOMENTS) {
  const idea = IDEAS[moment];
  ok(`${moment}: offers something, each with a price`, idea.offers.length > 0 && idea.offers.every((id) => BECOMES[id] && BECOMES[id].credits > 0));
}

/* ── Asked from where it belongs ──────────────────────────────────────── */
const photo = readFileSync('app/components/PostStudio.tsx', 'utf8');
const sleeve = readFileSync('app/components/Sleeve.tsx', 'utf8');
const bench = readFileSync('app/components/BecomeBench.tsx', 'utf8');
ok('the Photo Editor asks when a photo opens', /offerIf\('photoOpened'\)/.test(photo));
ok('  and after a save', /offerIf\('postSaved'\)/.test(photo));
ok('  and after a sticker is peeled', /offerIf\('stickerPeeled'\)/.test(photo));
ok('a song cover, once kept, is offered movement', /offerIf\('coverKept'\)/.test(sleeve));
ok('  but never a bought piece, which is the artist’s', /word\.bought !== true/.test(sleeve));
ok('"Not now" is counted everywhere it can be said', (photo.match(/saidNotNow\(/g) ?? []).length >= 2 && /saidNotNow\('coverKept'\)/.test(sleeve));
ok('every card and chip shows the price on the offer', (bench.match(/creditsSaid\(BECOMES\[id\]\.credits, t\)/g) ?? []).length >= 3);

console.log(bad === 0
  ? '\ncheck:ideas — offered at the right moments, priced, and rationed so it never nags.'
  : `\ncheck:ideas — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * A child's allowance is a number the parent chose and the server enforces.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"Let the parent give an allowance on an opening
 * page."* And: *"Gee dan net vir die ouer 'n raamwerk van wat krediete kan
 * doen per liedjie, per video, per story mode."*
 *
 * ── The two ways this goes wrong, and neither announces itself ───────────
 *
 * **It becomes decoration.** An allowance the ROOM enforces is not an
 * allowance: the child is on the parent's phone, signed into the parent's
 * account, and a limit the page applies is one that a reload does not. The
 * only place a spending limit means anything is where the spending happens,
 * so the assertions below read `charge()` and insist the limit is applied
 * there — before the balance moves, and given back if the balance refuses.
 * `check:sqlruns` drives the function itself against real Postgres and
 * proves it stops the credit past the allowance; this file proves the app
 * ever asks it.
 *
 * **The framework stops being true.** The page tells a parent what a song
 * costs, what a video costs and what a story costs. Every one of those is
 * derived from the same table the routes charge from, and this holds them
 * there — because the way that breaks is somebody typing `12` into the page
 * when `CREDITS.song` moves to eleven, and a page quoting a price the app
 * does not honour is the one mistake about money that cannot be argued away
 * afterwards.
 *
 * ── And the row that is honest about not existing ────────────────────────
 *
 * She asked for story mode in the framework; story mode is not built. The
 * story row therefore carries `ready: false`, and the last assertion holds
 * that nothing marked ready is a thing the room cannot do — so a price list
 * cannot quietly become a promise.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS, readCost, videoCost } from '../app/lib/credits.ts';
import {
  ALLOWANCE_MAX, ALLOWANCE_STEPS, KID_PRICES, STORY_PAGES, STORY_PAGE_CHARS,
  VIDEO_SECONDS, howMany, sane,
} from '../app/lib/kidsallowance.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log("\nA child's allowance is chosen by a parent and enforced by the server\n");

/* ── 1. Every price in the framework is the app's own ────────────────── */

const priceOf = (id: string): number => KID_PRICES.find((one) => one.id === id)?.credits ?? -1;

/* A song and NOT a song with a cover. This asserted the sum of the two for
   an afternoon: `/api/cover` needs a saved `trackId`, the kids room does not
   save to her library, so the room cannot make the picture and the price list
   must not include one. The correction is recorded in `kidsallowance.ts`. */
ok('a song on the parent page costs what a song costs',
  priceOf('song') === CREDITS.song,
  `the page says ${priceOf('song')} and the table says ${CREDITS.song}`
  + ' — a parent shown the wrong number sets the wrong allowance');

ok('  and does not quietly include a picture the room cannot make',
  priceOf('song') !== CREDITS.song + CREDITS.cover,
  'the song row is priced with a cover in it, and `/api/cover` needs the song'
  + ' saved to the library first — which this room does not do, so the parent'
  + ' is paying attention to a promise');

ok('  and a video costs what a video costs',
  priceOf('video') === videoCost('standard', VIDEO_SECONDS),
  `the page says ${priceOf('video')} and \`videoCost\` says`
  + ` ${videoCost('standard', VIDEO_SECONDS)} for ${VIDEO_SECONDS} seconds at`
  + ' the plain grade');

ok('  and a story costs what its pages cost',
  priceOf('story') === (readCost(STORY_PAGE_CHARS) + CREDITS.repaint) * STORY_PAGES,
  `the page says ${priceOf('story')} and ${STORY_PAGES} pages of`
  + ` ${STORY_PAGE_CHARS} characters read aloud with a picture each is`
  + ` ${(readCost(STORY_PAGE_CHARS) + CREDITS.repaint) * STORY_PAGES}`);

ok('  and the framework names all three things she asked for',
  ['song', 'video', 'story'].every((id) => priceOf(id) > 0),
  'one of per-song, per-video, per-story is missing or free — a free row on'
  + ' this page is a button a child presses forty times');

/* ── 2. The steps are whole songs, and the rule is one rule ──────────── */

ok('every allowance offered is a whole number of songs',
  ALLOWANCE_STEPS.every((step) => step % priceOf('song') === 0),
  `${ALLOWANCE_STEPS.join(', ')} against a song at ${priceOf('song')} — a step`
  + ' that is two and a half songs is a step whose leftovers buy nothing, and'
  + ' the parent is the one who has to work that out');

ok('  and the steps rise rather than repeat',
  new Set(ALLOWANCE_STEPS).size === ALLOWANCE_STEPS.length
  && ALLOWANCE_STEPS.every((step, i) => i === 0 || step > ALLOWANCE_STEPS[i - 1]),
  `${ALLOWANCE_STEPS.join(', ')} — two steps the same, or a step that goes`
  + ' backwards, is a choice with nothing behind it');

ok('  and the largest step is the most the server will take',
  sane(ALLOWANCE_MAX) && !sane(ALLOWANCE_MAX + 1),
  `the page offers up to ${ALLOWANCE_MAX} and the server's own rule disagrees`
  + ' — so either a step the page shows is refused, or a number past every'
  + ' step is accepted');

ok('  and nothing silly is accepted',
  !sane(-1) && !sane(1.5) && sane(0),
  'a negative allowance, or half a credit, is taken as a number — and zero,'
  + ' which is a parent handing over nothing, must be allowed because it is'
  + ' the honest way to open the room read-only');

ok('  and what a step buys is counted down, not up',
  howMany(priceOf('song') * 2, 'song') === 2 && howMany(priceOf('song') - 1, 'song') === 0,
  'a part of a song counts as one — so the page promises a song the allowance'
  + ' cannot pay for, and the child is refused at the press');

/* ── 3. The limit is applied where the money moves ──────────────────── */

/* Comments blanked AND whitespace collapsed, because the two assertions below
   measure how close two calls are to each other and `withoutComments` leaves
   a comment behind as its own length in spaces. The first version of this
   file reddened on code that was correct: a thirteen-line note between
   `refund`'s first line and its release call put them 300 characters apart,
   and 300 characters of nothing is not distance. Comment length is not the
   thing being measured here, so it is removed from the measurement. */
const tight = (text: string): string => withoutComments(text).replace(/\s+/g, ' ');

const credits = tight(readFileSync('app/lib/server/credits.ts', 'utf8'));

const asksKids = credits.indexOf('kidsSpend(');
const spends = credits.indexOf('spend(caller.id');
ok('the allowance is asked before the balance is spent',
  asksKids > 0 && spends > 0 && asksKids < spends,
  asksKids < 0
    ? '`charge()` never asks — the allowance is a number nothing reads, which'
      + ' is the whole failure this room could have shipped with'
    : 'it is asked after the balance moves, so a refused child has already'
      + " cost the parent credits for a song that was not made");

ok('  and given back when the balance refuses',
  /spend\(caller\.id[\s\S]{0,120}?kidsRelease\(caller\.id/.test(credits),
  'a charge counted against the allowance and then refused for want of'
  + ' credits leaves the child short for nothing at all');

ok('  and given back when a generation fails',
  /export async function refund[\s\S]{0,400}?kidsRelease\(/.test(credits),
  '`refund()` puts the credits back on the account and not on the allowance,'
  + " so a child pays for the engine's bad afternoon");

/* The door the parent uses, and the one thing it must not do. */
const route = tight(readFileSync('app/api/kids/route.ts', 'utf8'));
ok('  and the parent\'s own door never charges for setting a number',
  !/\bcharge\s*\(/.test(route),
  'writing down what a child may spend takes credits, which is a charge for'
  + ' nothing — the spending it limits is charged later, where it happens');

ok('  and takes the account from the token rather than the body',
  /callerFrom\s*\(/.test(route) && !/body[^\n]*owner/.test(route),
  'the account is read off the request body, so a request can set somebody'
  + " else's allowance");

/* ── 4. Nothing marked ready is a thing the room cannot do ──────────── */

/* ── What `ready` means, corrected ──────────────────────────────────────
 
   This measured `existsSync('app/components/StoryRoom.tsx')`, on the
   reasoning that the day a story room landed the row would stop claiming it
   did not exist on its own.
 
   The day it landed, this reddened — and it was right to, but not for the
   reason it gave. `ready` is not "a story room exists somewhere in the app".
   It is "the CHILD'S room can do this", which is the only thing a parent
   reading that price list is being told. A story room at its own address
   that the kids room cannot reach is both things at once: real, and not
   reachable from here.
 
   So the measurement is reachability from `KidsRoom.tsx`, which is the fact
   the row actually asserts. And the kids room cannot reach it today for a
   reason that is itself held by a check: `check:kinderkamer` forbids
   anything typed into in there, and a story is typed. The grown-up writes
   it; the shelf of finished ones for the child is the next piece. */
const kidsRoom = readFileSync('app/components/KidsRoom.tsx', 'utf8');
const reachable = /StoryRoom|story/i.test(withoutComments(kidsRoom));
const story = KID_PRICES.find((one) => one.id === 'story');

ok('the story row says whether the CHILD can reach it, not whether a file exists',
  story?.ready === reachable,
  reachable
    ? 'the kids room reaches story mode now and the framework still says it'
      + ' cannot — a parent is being told they cannot do a thing they can'
    : 'story mode is marked ready and the child\'s room has no way to it, so'
      + ' the page is quoting a price for something that cannot be pressed'
      + ' from where the parent is standing');

/* And the room it is NOT reachable from is the one that cannot have a story
   typed into it, which is why. Asserted so that "ready: false" stays a
   consequence of a rule rather than a line somebody forgot to update. */
ok('  and the child\'s room is still the one with nothing to type into',
  !/<textarea|<input(?![^>]*type="checkbox")/.test(withoutComments(kidsRoom)),
  'the kids room grew somewhere to type, so the reason story mode is not in'
  + ' it no longer holds — and `check:kinderkamer` should have caught that'
  + ' first');

/* ── One rule, not a list ────────────────────────────────────────────────
 
   This was `['song', 'video'].includes(one.id)` — a hand-written list of what
   the room could do, which went stale the first time the room could do
   something else, on 9 October, about four hours after it was written. A list
   of what is true today is a list that is wrong tomorrow and says nothing
   when it goes.
 
   The rule is the same one the story row is measured by, applied to all of
   them: `ready` says the CHILD can reach it, so every row marked ready has to
   be findable in the child's room and every row that is not must not be. */
for (const priced of KID_PRICES) {
  const mentioned = new RegExp(priced.id, 'i').test(withoutComments(kidsRoom))
    || (priced.id === 'song' && /makeKidSong/.test(withoutComments(kidsRoom)))
    || (priced.id === 'video' && /startKidVideo/.test(withoutComments(kidsRoom)));
  ok(`  and the ${priced.id} row says whether the child can reach it`,
    priced.ready === mentioned,
    mentioned
      ? `the room reaches ${priced.id} and the price list says it cannot — a`
        + ' parent is being told they cannot do a thing they can'
      : `${priced.id} is marked ready and the child's room has no way to it,`
        + ' so the page quotes a price for something that cannot be pressed');
}

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

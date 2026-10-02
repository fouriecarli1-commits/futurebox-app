/**
 * A room that charges says what it costs before the press, not after.
 *
 * ── Why this rule, on this day ───────────────────────────────────────────
 *
 * The cutting room started charging on 1 October 2026. Carli: *"Onthou dat
 * hierdie ook 'n betaalde produk is wat krediete werd is."*
 *
 * Everything in that room is free — the trimming, the splitting, the fades,
 * the looks, the words, the sound bed, the zoom, however long somebody sits
 * there. Exactly one press costs anything. A room shaped like that is the
 * easiest possible place to meet a charge you did not expect: nothing has
 * cost money for twenty minutes, so nothing feels like it is about to.
 *
 * A surprise about money is the thing that makes somebody stop trusting a
 * room, and they do not come back to check whether it was fair.
 *
 * ── What is measured ─────────────────────────────────────────────────────
 *
 * Three things that together mean "it said so":
 *
 *   1. The price is read from `CREDITS`, not typed. A number typed beside a
 *      button is a number that is right on the day it is typed.
 *   2. It is shown in the same control that spends it.
 *   3. The charge is asked for AFTER the film exists, which is what makes a
 *      failed render free. `app/api/filmout` is written around that order
 *      and its own comment explains why reversing it needs a refund path
 *      that cannot be made safe.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { code, withoutComments } from './prose.mts';
import { before } from './order.mts';

const ROOM = join('app', 'components', 'VideoEditor.tsx');
const BOOTH = join('app', 'components', 'ProBooth.tsx');
const ROUTE = join('app', 'api', 'madehere', 'route.ts');

/* Two readings of the same file, and the difference is not a detail.
   `code()` blanks comments AND string bodies, which is what a rule about the
   SHAPE of the code needs. `withoutComments()` blanks only the comments,
   which is what a rule looking FOR a string needs — and the first draft of
   this check used `code()` for both and reported that the room never calls
   `/api/filmout`, while reading the one line that does. The same mistake
   `check:earsopen` made in September. */
const roomRaw = readFileSync(ROOM, 'utf8');
const room = code(roomRaw);
const roomText = withoutComments(roomRaw);
const boothRaw = readFileSync(BOOTH, 'utf8');
const booth = code(boothRaw);
const boothText = withoutComments(boothRaw);
const route = code(readFileSync(ROUTE, 'utf8'));

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) bad += 1;
};

/* ── Written as the rule, 3 October 2026 ──────────────────────────────────

   These two pinned the exact expression `perMinute(total, CREDITS.filmOut)` and
   went red the day the price stopped being that — not because anything about
   the rule broke, but because the room now asks `billForEdit`, which is the
   same table read through one more function and is strictly better than what
   was pinned.

   The fourth time this week a check has held an implementation still instead of
   a behaviour: `check:logomark` pinned a one-line call, `check:ownfootage`
   pinned a gap of three hundred characters, `check:editor` pinned a block
   count. The rule here is "the number is worked out, not typed, and it is on
   the button that spends" — so that is what is asked.

   Stronger than before, too: it now also insists the room and the ROUTE read
   the same module, which is the thing that actually guarantees the figure
   somebody agreed to is the figure charged. */
ok('the room works its price out from the table rather than printing one',
  /billForEdit\(/.test(room),
  'a number typed beside a button is right on the day it is typed and never checked again');

ok('  from the same module the route charges from',
  /from '\.\.\/lib\/filmcost'/.test(roomText) && /filmcost'/.test(readFileSync(ROUTE, 'utf8')),
  'two copies of a price is two prices, and the one on the button is the one somebody agreed to');

/* The same control. A price in a note three cards away is a price nobody
   read, and this rule exists because that is the easy way to satisfy the
   first one without satisfying the person. */
const button = /data-editormake[\s\S]{0,2000}?<\/button>/.exec(room)?.[0] ?? '';
ok('  and shows it on the button that spends it',
  /data-editorprice/.test(button) && /bill\.total/.test(button),
  'a price in a note three cards away is a price nobody read');

/* ── And the press that spends is the one after the number ────────────────

   Carli, 3 October 2026: *"hulle moet dan confirm of hulle wil voortgaan."*

   The button that used to start the render now opens the bill. That is the
   difference between a price said and a price agreed to, and it is held here
   rather than only in a browser because a probe can only ever walk the one path
   the room happened to be in. */
ok('  and pressing it opens the bill rather than starting the render',
  /data-editormake[\s\S]{0,900}?setAsking\(true\)/.test(room)
  && !/data-editormake[\s\S]{0,900}?onClick=\{\(\) => void preview\(\)\}/.test(room),
  'a confirm screen that appears while the thing it confirms is already running is not a confirm screen');

ok('  and the bill is itemised rather than one number',
  /data-editorbillline/.test(room) && /bill\.lines\.map/.test(room),
  'a number on its own is something to accept or refuse; a list is something to'
  + ' change your mind about');

ok('the charge is asked for after the film exists, so a failed render is free',
  /stitch\(\{[\s\S]*?\/api\/madehere/.test(roomText),
  'charging first needs a refund path, and a refund path needs an amount the browser would have to be trusted for');

ok('  and the route prices by the table and by the minute',
  /film:\s*CREDITS\.filmOut/.test(route) && /perMinute\(\s*seconds\s*,\s*rate\s*\)/.test(route),
  'the room and the server must not be able to disagree about what a film costs');

/* `before` and not two `indexOf` calls compared against each other, which is
   what this was and what `check:ordering` exists to stop: a missing brake
   answers -1, and -1 is less than everything, so the version of this line
   that read `indexOf(...) < indexOf(...)` would have PASSED a route with no
   brake in it at all. The rule caught it on the first run. */
/* ── And the Pro Booth, under the same rule ──────────────────────

   Both rooms that charge are held here, and that is the point of widening it
   rather than writing a second file: a rule that covers one of two rooms is
   a rule somebody satisfies by building the next room somewhere else. */
ok('the Pro Booth works its price out from the table too',
  /perMinute\(\s*longest\s*,\s*CREDITS\.mixOut\s*\)/.test(booth),
  'a number typed beside a button is right on the day it is typed');

/* The COMPUTED value has to be in the markup, not just the hook beside a
   typed number. The first version of this looked only for the attribute and
   passed a span reading "1 credit" with the price hard-coded — which is the
   editor's half of this rule catching the same thing one file over, and the
   reason that one reads the button's contents rather than its name. */
const bounce = /data-proboothprice[\s\S]{0,260}?<\/span>/.exec(booth)?.[0] ?? '';
ok('  and shows it on the button that bounces',
  /bounceCost/.test(bounce),
  'everything in that room is free except this press, which makes it the easiest place to meet a charge nobody expected — and a typed number is right only on the day it is typed');

ok('  and charges after the mix exists, not before',
  /mixSession\([\s\S]{0,400}?payFor\(/.test(booth),
  'charging first needs a refund path, and a refund path needs an amount the browser would have to be trusted for');

/* The Booth has TWO doors — the Library and the phone — and they are one
   mix. The reference is a signature of the mix rather than of the moment, so
   both presses carry the same one and `spend_credits` takes it once. Without
   this, keeping a song and then also wanting it on a phone is charged twice,
   and the second charge is for a download. */
ok('  and both ways out of it share one reference, so one mix is one charge',
  /ref:\s*signature\(/.test(boothText)
    && (boothText.match(/payFor\(mixed\.duration\)/g) ?? []).length === 2,
  'the Library and the phone are two doors onto one mix');

ok('  and brakes before it charges',
  before(route, 'refuseIfTooMany', 'charge('),
  'a retry loop has to be stopped before the money');

if (bad > 0) {
  console.log(`\ncheck:saysprice — ${bad} thing(s) about the price are not said before the press.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:saysprice — the one press that costs says so, in the table’s own number, before it is pressed.');
}

/**
 * The money in the art market adds up, and the artist's share is on profit.
 *
 * ── Why this is a check and not a comment ────────────────────────────────
 *
 * Carli, 20 September 2026: *"70% van wins vir kunstenaar, 30% wins vir
 * ons."* Wins — profit. Somebody reading "70%" a year from now will
 * reasonably compute it on the sticker price, and be wrong by the gateway's
 * cut every single time: R6.30 of the artist's money on a R200 piece, paid
 * out of money that never arrived.
 *
 * That error is invisible. Nothing on a screen changes, no test of the room
 * fails, and it is discovered by an artist doing their own arithmetic — at
 * which point the app has been quietly underpaying the people it is meant
 * to be for. So the rule is held here, in numbers, rather than in the
 * sentence above the function.
 *
 * The other half is the one that bites in the other direction: three
 * numbers that do not add up to what was paid. A cent created is a
 * shortfall that grows, and a bank finds it rather than a test.
 */

import {
  split, START_RAND, UNIQUE_RAND, ARTIST_SHARE, WINDOWS,
  AUCTION_HOURS, BID_STEP, SNIPE_MINUTES, BIDDER_RAND, endsAt, nextBid,
} from '../app/data/artmarket';
import { gatewayFee } from '../app/lib/plans';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── Her numbers, as she said them ────────────────────────────────────── */

ok('a piece starts at R200', START_RAND === 200, `${START_RAND}`);
ok('a one-off costs R500', UNIQUE_RAND === 500, `${UNIQUE_RAND}`);
ok('the artist takes 70%', ARTIST_SHARE === 0.7, `${ARTIST_SHARE}`);
ok(
  'and an artist picks from four windows, not a typed date',
  WINDOWS.map((one) => one.days).join(',') === '2,4,6,14',
  WINDOWS.map((one) => one.days).join(','),
);
ok(
  '  each named in both languages',
  WINDOWS.every((one) => one.en.trim() && one.af.trim()),
);

/* ── Nothing is created and nothing is lost ───────────────────────────── */

/**
 * Every price a person could actually be charged, plus the awkward ones.
 *
 * Swept rather than sampled: a rounding rule is exactly the kind of thing
 * that is right at R200 and R500 and wrong at R333.33, and two hand-picked
 * cases would have proved nothing.
 */
const PRICES: number[] = [];
for (let rand = 1; rand <= 2000; rand += 1) PRICES.push(rand);
for (const odd of [0, 0.01, 1.5, 33.33, 99.99, 200.005, 12345.67]) PRICES.push(odd);

const uneven = PRICES.filter((paid) => {
  const s = split(paid);
  return Math.round((s.gateway + s.artist + s.house) * 100) !== Math.round(s.paid * 100);
});
ok(
  'the gateway, the artist and the house add up to exactly what was paid',
  uneven.length === 0,
  `${uneven.length} prices are out, first: R${uneven[0]}`,
);

const negative = PRICES.filter((paid) => {
  const s = split(paid);
  return s.artist < 0 || s.house < 0 || s.profit < 0;
});
ok(
  '  and nobody is ever owed a negative amount',
  negative.length === 0,
  `R${negative[0]} — a price below the gateway's own fee`,
);

/* ── On profit, not on the sticker ────────────────────────────────────── */

/**
 * The assertion this file exists for.
 *
 * Stated as the difference it would make rather than as a formula: at R200
 * the wrong reading pays the artist R140 and the right one pays R133.70.
 * Somebody breaking this sees the six rand thirty, which is the number that
 * makes the mistake obvious.
 */
const at200 = split(200);
const onTheSticker = Math.round(200 * ARTIST_SHARE * 100) / 100;
ok(
  "the artist's share is taken off the profit, not off the sticker price",
  at200.artist < onTheSticker,
  `both come to R${at200.artist}`,
);
ok(
  `  which at R200 is R${at200.artist.toFixed(2)} and not R${onTheSticker.toFixed(2)}`,
  Math.abs(at200.artist - 133.7) < 0.01,
  `R${at200.artist}`,
);
ok(
  '  because the gateway comes off first',
  Math.abs(at200.gateway - gatewayFee(200)) < 0.005,
  `${at200.gateway} against ${gatewayFee(200)}`,
);

/* ── One formula for the fee, not two ─────────────────────────────────── */

/**
 * The fee is imported, never re-typed.
 *
 * This app has twice had two meanings for one word — `arrival`, `watermark`
 * — and both were caught late. Two formulas for a payment fee is that same
 * fault with money on it: they agree on the day they are written and drift
 * the first time one is updated.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(path)) out.push(path);
  }
  return out;
}
const defines = [...walk('app'), ...walk('scripts')].filter((path) =>
  /export function gatewayFee/.test(readFileSync(path, 'utf8')),
);
ok(
  'the gateway fee is written down once in the whole app',
  defines.length === 1,
  defines.join(', '),
);

/* ── The check can fail, shown rather than claimed ────────────────────── */

/**
 * The wrong reading, run.
 *
 * Not "imagine somebody did this" — the sum is done here, and the assertion
 * is that it comes out different from what the app pays. A rule proved
 * against a number it cannot produce is a rule nobody has tested.
 */
const wrong = (paid: number): number => Math.round(paid * ARTIST_SHARE * 100) / 100;
ok(
  '  and the mistake it guards against really is a different number',
  wrong(500) !== split(500).artist && wrong(500) - split(500).artist > 10,
  `the sticker reading pays R${wrong(500)}, the app pays R${split(500).artist}`,
);

/* ── The conversation has no keyboard in it ────────────────────────────────

   Carli: *"Daai dm moet net buttons hê wat hulle kan kies … Geen tik
   moontlikhede nie. Ek as eienaar van die app moet bewus wees van dit, sodat
   kunstenaar nie agter my rug kan kunswerk verkoop nie."*

   `check:artroom` presses this in a real browser, and on a run with no
   approved artist there is no pop-out to open — it says so out loud rather
   than passing silently. This is what holds the rule on those runs, which is
   every run in CI until there are real artists in the project.

   Two halves, because either alone rots. The schema half is the stronger one:
   a message needs somewhere to live, and there is nowhere — a column that
   exists is a column somebody eventually wires a box to. The component half
   catches the box wired to something else.

   Read off the `Popout` function's own body rather than the whole file: the
   artist's desk has a name, a price and an about, and is allowed them. That
   is a person describing themselves to us, not a message to a buyer. */
const popout = (() => {
  const source = readFileSync('app/components/ArtMarket.tsx', 'utf8');
  const at = source.indexOf('function Popout(');
  if (at < 0) return null;
  const next = source.indexOf('\nfunction ', at + 1);
  return source.slice(at, next < 0 ? source.length : next);
})();
ok('the artist pop-out exists to be checked', popout !== null,
  'ArtMarket.tsx no longer has a Popout — the rule below is measuring nothing');
if (popout) {
  ok('  and there is nowhere in it to type a message',
    !/<input\b|<textarea\b|contentEditable/i.test(popout),
    'a box in the pop-out is a phone number swapped and the deal done elsewhere');
}

const schema = readFileSync('supabase/albumart.sql', 'utf8');
ok('and the request table has nowhere to put a message either',
  !/\b(message|body|note|text_body)\s+text/i.test(
    schema.slice(schema.indexOf('create table if not exists public.art_requests'),
                 schema.indexOf('create index if not exists art_requests_artist_idx')),
  ),
  'art_requests gained a free-text column — the room can now be talked through');

/* ── The auction ──────────────────────────────────────────────────────────

   Carli, 20 September 2026: *"Die R200 is die begin vir 'n bee rate, mense
   moet op die bee, en die hoogste bee wen die art binne 36 hours."*

   R200 stopped being a price that day and became a floor. That is a small
   sentence and a large change: every place that reads `rand` as "what this
   costs" is now wrong, and the one that matters is the till. */
ok('bidding opens at the floor and not a cent under',
  nextBid(null) === START_RAND, `the first bid may be R${nextBid(null)}`);
ok('  and each bid after it has to beat the last by a real amount',
  nextBid(START_RAND) === START_RAND + BID_STEP && BID_STEP >= 10,
  `the step is R${BID_STEP} — under ten rand an auction is decided by whoever types R200.01`);
ok('  and the clock runs for 36 hours', AUCTION_HOURS === 36, `${AUCTION_HOURS} hours`);

/* Worked with a pencil: 36 hours is 129,600,000 milliseconds. */
{
  const from = new Date('2026-09-20T12:00:00.000Z');
  const shuts = new Date(endsAt(from)).getTime() - from.getTime();
  ok('  and it is measured from when the piece is hung',
    shuts === 129_600_000, `${shuts} ms rather than 129600000`);
}

ok('  and a late bid pushes the clock out', SNIPE_MINUTES >= 1,
  'without it the thirty-six hours is theatre and the auction is one second long');

/* ── The till charges the WINNING bid ─────────────────────────────────────

   This is the expensive one. `art_works.rand` is where the bidding opened,
   and a till that charges it sells a piece that went to R900 for R200 —
   the artist's money, every time, silently.

   Read off the route rather than asserted about it: the rule is which
   column the price comes from, and only the source can say. */
{
  const till = readFileSync('app/api/checkout/route.ts', 'utf8');
  const at = till.indexOf("want.kind === 'art'");
  const branch = at < 0 ? '' : till.slice(at, at + 1800);
  ok('the till prices a piece at the winning bid, not the opening one',
    /art_top_bids/.test(branch),
    'the art branch of /api/checkout no longer reads the standing bid');
  ok('  and only the person who won it may pay',
    /won_by !== who/.test(branch),
    'anybody who can name a work id can buy it out from under the winner');
}

/* And the split is computed on what was actually paid, which is now a bid
   and not a fixed number. A worked case: a piece that opened at R200 and
   went to R900. */
{
  const won = split(900);
  ok('  and the artist is paid on the bid, not on the opening price',
    Math.abs(won.artist - 606.55) < 0.005,
    `R${won.artist.toFixed(2)} on a R900 winning bid`);
  ok('    which is far more than the opening price would have paid',
    won.artist > split(START_RAND).artist * 4,
    `R${won.artist.toFixed(2)} against R${split(START_RAND).artist.toFixed(2)}`,
  );
}

/* ── The STATEMENT is on what was paid, not on the opening bid ──────

   The till was fixed to charge the winning bid, and that made this the next
   place the old number hides: the payout statement added up `art_works.rand`,
   which is still where the bidding OPENED. A piece that closed at R900 would
   have told her to pay the artist R133.70 instead of R606.55 — and unlike a
   wrong charge, nothing about a wrong statement is visible to anybody except
   the artist, months later.

   The same number in the other direction for a commission: the row `deliver`
   creates has to clear the table's R200 floor, so a R500 commission was
   written down as R200 and paid out as one.

   So there is a second column, `paid_rand`, written by the only two places
   that know what actually changed hands, and read by the statement. Held as
   three reads of the source, because the rule is which column each place
   touches and only the source can say that. */
{
  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  ok('the payout statement pays on what was paid, not on the opening bid',
    /split\(one\.paid_rand \?\? one\.rand\)/.test(route),
    'the statement is summing art_works.rand, which is where the bidding opened');
  /* Off WORK_COLUMNS rather than off the `.select(...)` call, which no
     longer carries a literal list: the select is built from that array so
     the diagnostic and the query cannot ask for different things. The
     rule is the same one — a column the statement reads has to be a
     column the query fetched, or every row has it undefined. */
  ok('  and it asks the database for that column',
    /const WORK_COLUMNS = \[[\s\S]*?'paid_rand'/.test(route)
      && /\.select\(WORK_COLUMNS\.join/.test(route),
    'paid_rand is read off rows that were never fetched with it — every one is undefined');

  /* A commission never goes through the wall, so its price reaches the
     statement only if `deliver` writes it — and only if the offer it copies
     from was read with `rand` on it. Both halves, because the second one was
     missing and the first looked right. */
  const at = route.indexOf("case 'deliver'");
  const deliver = at < 0 ? '' : route.slice(at, route.indexOf("case 'wear'", at));
  ok("  and a commission's own price is carried onto the work it creates",
    /paid_rand: \(offer as OfferRow\)\.rand/.test(deliver),
    'a R500 commission is written down at the R200 floor and paid out as one');
  ok('    from an offer that was actually read with its price on it',
    /\.select\('id, request, state, rand'\)/.test(deliver),
    "deliver selects the offer without `rand`, so the price it writes is undefined");
}

{
  const hook = readFileSync('app/api/payments/webhook/route.ts', 'utf8');
  const at = hook.indexOf("meta.kind === 'art'");
  const branch = at < 0 ? '' : hook.slice(at, at + 1600);
  ok('  and the webhook writes down what the winner was actually charged',
    /paid_rand: Math\.round\(cents \/ 100\)/.test(branch),
    'the only place that knows the winning price does not record it');
}

/* ── The buy-in is not the artist's money ───────────────────────

   Carli, 20 September 2026: *"Die kunstenaar kry nie geld vir die by in nie,
   net vir die wen prys."*

   Twelve people paying R50 to bid on one piece is R600 that has nothing to do
   with the piece, and a statement that swept it in would be paying 70% of it
   away silently. It is true today by construction — the statement walks
   `art_works` and `art_bidders` is a different table — and "true by
   construction" is exactly the kind of true that a helpful edit undoes.

   Two halves. The statement may not touch the bidders' table at all, and the
   room has to SAY so, in both languages, where the money is discussed. */
{
  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  const at = route.indexOf('let owing: unknown = null;');
  const statement = at < 0 ? '' : route.slice(at, route.indexOf('const worksOf', at));
  ok('the payout statement exists to be checked', statement.length > 100,
    'the owing block has moved — the rule below is measuring nothing');
  ok('  and the buy-in never enters it', !/art_bidders|bidderRand|BIDDER_RAND/.test(statement),
    "the R50 door fee is being added to what an artist is owed");

  const sql = readFileSync('supabase/albumart.sql', 'utf8');
  const view = sql.lastIndexOf('create or replace view public.art_owing');
  ok('  and the view behind it does not join them either',
    view >= 0 && !/art_bidders/.test(sql.slice(view, sql.indexOf(';', view))),
    'art_owing joins the bidders table');
  ok('  and that view reads the paid price, not the opening one',
    view >= 0 && /coalesce\(w\.paid_rand, w\.rand\)/.test(sql.slice(view, sql.indexOf(';', view))),
    'art_owing still lists art_works.rand, which is where the bidding opened');
}

{
  const words = readFileSync('app/lib/i18n.tsx', 'utf8');
  const at = words.indexOf('"art.paidOnWin"');
  const both = at < 0 ? '' : words.slice(at, at + 1200);
  ok('  and the artist is told so where they set the opening bid',
    /none of it comes to you/i.test(both) && /niks daarvan kom na jou toe nie/i.test(both),
    'art.paidOnWin does not say the buy-in is not theirs, in both languages');

  /* The BUYER is deliberately not told this, and that is a decision and
     not an omission. Carli, looking at the room: *"dit is onnodige
     inligting."* How the studio and the artist divide the money is
     between the studio and the artist — it is in clause 6 of both
     signed agreements, where the person it concerns will read it. A
     buyer needs to know the R50 is not part of the price, which the
     line still says, and nothing more. */
  const why = words.indexOf('"art.passWhy"');
  const pass = why < 0 ? '' : words.slice(why, why + 1600);
  ok("    and the buyer is told the R50 is not part of the price",
    /not part of what you pay/i.test(pass) && /nie deel van wat jy .* betaal nie/i.test(pass),
    'somebody could read the R50 as a deposit against the work');
  ok("      and is not told the artist's terms, which are not theirs to read",
    !/goes to the artist|na die kunstenaar/i.test(pass),
    'the buyer is being shown how the studio and the artist split the money');
  ok(`    and it is R${BIDDER_RAND} on both sides`, BIDDER_RAND === 50, `${BIDDER_RAND}`);
}

/* ── Every sheet has a way out, and it clears the tab bar ────────────────

   Two faults Carli found in one minute, on the same three sheets, both
   invisible to every check in this repository:

     *"Wanneer mens binne artist se profile kyk is daar nie 'n back knoppie
     nie."* There was one — a 40 x 4 pixel grab handle whose only word was
     an `aria-label`, painted in the border colour. The gallery theme made
     that near-black on near-black. A control nobody can see is not a
     control, and an `aria-label` satisfies a linter while satisfying
     nobody holding the phone.

     *"Ask them for your own, val onder die hoof buttons heel onder. Dit is
     nie sienbaar nie."* The sheet is bottom-aligned on a phone and the tab
     bar is fixed on top of it, so the last thing in the sheet — which is
     always the button the sheet exists for — sat underneath it. This app
     has had `barClearance()` for exactly this since the night two panels
     were eaten the same way; these three never used it.

   Held as source rules rather than as pixels: the browser probe cannot
   open a sheet on a run with no artists in the database, which is every
   unattended run, so a measurement here would be one that never executes.
   §AC is the file full of those. */
{
  const room = readFileSync('app/components/ArtMarket.tsx', 'utf8');

  const at = room.indexOf('function SheetTop(');
  const top = at < 0 ? '' : room.slice(at, room.indexOf('\nfunction ', at + 1));
  ok('every sheet shares one top', at >= 0,
    'SheetTop is gone — each sheet draws its own way out again, and they drifted last time');
  if (at >= 0) {
    ok('  and the way out is a word, not only a handle',
      /t\('art\.back'\)/.test(top),
      'the only way out is an icon or a bar again — which is what she could not find');
    ok('  on a target a thumb can hit',
      /min-h-\[44px\]/.test(top),
      'under 44px, which this app has already been through once');
  }

  /* All three, counted. Two of three would have left her exactly where she
     started, on whichever one she happened to open. */
  const tops = (room.match(/<SheetTop\b/g) ?? []).length;
  ok('  and all three sheets use it', tops === 3, `${tops} of 3`);

  /* Counted on the sheets' own scrolling body, not on every use of the
     helper in the file: the room's root has carried clearance since it was
     built, and counting that too made this read 4 of 3 — a check that is
     wrong in the passing direction the moment anything else is padded. */
  /* On the OVERLAY, which is what actually keeps the sheet off the bar.
     The first fix padded the scrolling body instead, so the button was
     reachable by scrolling rather than on the screen — and this check
     passed on it, which is why the rule now names the element. */
  const cleared = (room.match(/paddingBottom: barClearance\(0\)/g) ?? []).length;
  ok('and no sheet reaches under the tab bar', cleared === 3,
    `${cleared} of 3 overlays stop above it — the last button in the sheet is the one the sheet is for`);
}

/* ── An artist who cannot sign in still gets answered ────────────────────

   Carli, having brought a painter in and then commissioned him:
   *"Because I have added the artist I am supposed to approve this
   artwork. I want to test it."*

   A house artist has `owner` null by design — a real painter, not an app
   member — so nobody can ever sign in as them. A commission addressed to
   one therefore waited forever on somebody who does not exist. The route
   had always allowed the owner to act for them; only the screen did not
   offer it, which is the same shape as the upload gap before it.

   Four rules, and the last two are the ones that would rot quietly: the
   inbox has to be ONE component (three copies of a sheet handle is how
   all three sheets lost their way out on the same night), and the owner
   must not be handed the inbox of an artist who CAN answer for
   themselves — that is reading somebody else's post. */
{
  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  ok('the owner is given the inbox of every artist with no account',
    /asHouse/.test(route),
    'a commission to a house artist waits on somebody who cannot sign in');
  ok('  and only of those, never of an artist who can answer for themselves',
    /const houses = new Set\(artists\.filter\(\(one\) => !one\.owner\)/.test(route),
    "the owner is being shown the post of artists who have their own account");
  ok('    and only for the owner',
    /if \(callerIsOwner\(caller\)\) \{\s*const houses/.test(route),
    'anybody signed in can read what house artists have been asked for');

  const room = readFileSync('app/components/ArtMarket.tsx', 'utf8');
  ok('  and the two screens draw the same inbox',
    /function Inbox\(/.test(room) && (room.match(/<Inbox\b/g) ?? []).length === 2,
    'the owner has a second copy of the inbox markup, which is how two of them drift');
  /* Anchored to the <Inbox> call, not searched across the file.
     `/artist=\{one\.id\}/` alone matched `data-anyartist={one.id}` forty
     lines above it — the prop could be deleted outright and this stayed
     green. A pattern loose enough to hit the wrong line is a pattern that
     is not measuring the rule. */
  const call = room.slice(room.indexOf('<Inbox', room.indexOf('function BringArtist(')));
  ok('    with the house artist named on every write',
    /^[\s\S]{0,400}?\bartist=\{one\.id\}/.test(call) && /what: 'offer',\s*artist,/.test(room),
    'the owner answers as themselves, and the route refuses it');
}

/* ── The heading carries the claim, and the room is for every medium ─────

   Carli, in one message, twice: *"Ek voel nogsteeds die hoofopskrif moet
   sê, Album art by real artists"* … *"Jy het ook nie by gesê: Album art
   by real artists nie."* She had to say it twice because I put it in the
   line under the heading and counted that as done. A claim in the body
   text is a claim most people scroll past; the heading is the one string
   on the screen everybody reads.

   And, also twice: *"Die woorde moet ook nie sê painted by hand nie, maar
   created by hand (omdat daar verskillende mediums is)."* A painter is
   one kind of artist. Somebody working in ink, collage, photography or
   thread reads the narrower word as a room that is not for them — and
   this is a room she is recruiting into, so that word costs her artists.

   Held in both languages, because a narrowing like that comes back the
   next time somebody rewrites a line and reaches for the vivid word. */
{
  const words = readFileSync('app/lib/i18n.tsx', 'utf8');
  const at = words.indexOf('"art.title"');
  const title = at < 0 ? '' : words.slice(at, at + 200);
  ok('the heading says whose work this is',
    /by real artists/i.test(title) && /deur regte kunstenaars/i.test(title),
    'art.title is back to naming the thing instead of the claim');

  /* Across the whole dictionary rather than one key: the word is wrong
     wherever it appears, and the line it was in has already moved once. */
  const narrow = [...words.matchAll(/"(art\.[\w.]+)":[^}]*?\b(painted|geskilder)\b/gi)]
    .map((one) => one[1]);
  ok('  and no line in the room says painted',
    narrow.length === 0,
    `${narrow.join(', ')} — a painter is one kind of artist, and this room is for all of them`);
}

/* ── The buy-in is PER PIECE ─────────────────────────────────────────────

   Carli, 20 September 2026: *"Jy het dit ook verkeerd R50 buy in is per
   piece. Dit is nie vir elke bidding nie."*

   I built it once-and-for-all and wrote a paragraph arguing for that. Her
   reading is the stronger one: a once-off R50 buys the right to push every
   price in the room for the rest of somebody's life — the exact person the
   fee exists to stop, admitted permanently for the price of one piece.

   This is the kind of rule that slides back without anybody meaning it,
   because "once" is the simpler thing to write at every one of the four
   places it lives. So all four are held here: the table's key, the read,
   the refusal, and the till. A screen showing the right words over a
   once-off charge would look completely correct.

   `check:ooreenkoms` holds the same rule in both signed agreements. */
{
  const sql = readFileSync('supabase/albumart.sql', 'utf8');
  ok('the buy-in is keyed to the person AND the piece',
    /primary key \(owner, work\)/.test(sql),
    'art_bidders is still one row per person — one R50 and they may bid on everything, forever');

  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  ok('  and a bid is refused unless they bought into THAT piece',
    /\.from\('art_bidders'\)[\s\S]{0,240}?\.eq\('work', work\.id\)/.test(route),
    'the bid check asks only whether they have ever bought in, which is the rule she corrected');
  ok('  and each sleeve says whether this person may bid on it',
    /mineToBid: boughtIn\.has\(one\.id\)/.test(route),
    'the room is told once for the whole wall, so every piece looks the same as the first');

  const till = readFileSync('app/api/checkout/route.ts', 'utf8');
  const at = till.indexOf("want.kind === 'bidpass'");
  const branch = at < 0 ? '' : till.slice(at, at + 1400);
  ok('  and the till charges it against a named piece',
    /\.eq\('work', work\)/.test(branch),
    'a second R50 is refused for the wrong reason, or taken for no piece at all');
  /* The REFUSAL, not merely the word. `/sold_to/` passed on a branch that
     fetched the column and then ignored it — which is the version that
     charges R50 to bid on a piece that sold yesterday, and it went green.
     A check that cannot fail on the bug it is named after is §AC. */
  ok('    which has to be a piece that is still for sale',
    /if \(!piece \|\|[\s\S]{0,80}?\.sold_to\) return null;/.test(branch),
    'R50 can be charged to bid on a piece that is already sold, or on a work id somebody invented');

  const hook = readFileSync('app/api/payments/webhook/route.ts', 'utf8');
  const hat = hook.indexOf("meta.kind === 'bidpass'");
  const hbranch = hat < 0 ? '' : hook.slice(hat, hat + 1400);
  ok('  and the webhook writes it against that piece',
    /onConflict: 'owner,work'/.test(hbranch) && /meta\.work/.test(hbranch),
    'the payment lands as a room-wide pass again, whatever the till charged for');

  const words = readFileSync('app/lib/i18n.tsx', 'utf8');
  const wat = words.indexOf('"art.passWhy"');
  const said = wat < 0 ? '' : words.slice(wat, wat + 1600);
  ok('  and the room says so before anybody pays',
    /once for that piece/i.test(said) && /een keer vir daardie werk/i.test(said),
    'somebody pays R50 believing it covers the whole room, in one language or both');
}

/* ── A failed read says which column is missing ──────────────────────────

   Two evenings went to a migration that half landed. The Supabase editor
   runs a script as one transaction, so a statement failing at the bottom
   silently rolls back the twenty above it, and the room could only say
   that something could not be read.

   The names come from the route's own list and never from Postgres'
   sentence — see `missingFrom` — so this can be on a screen while
   `check:aifault` stays satisfied. Both halves are held: the route has to
   work the columns out, and the room has to print them. */
{
  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  ok('a failed read works out which columns are missing',
    /async function missingFrom\(/.test(route),
    'the room can say a read failed but not why — which is a hand-written information_schema query, every time');
  ok('  from our own list of columns, never from the error text',
    /WORK_COLUMNS/.test(route) && !/error\.message\.match|parse.*error\.message/.test(route),
    "the column names are being read out of Postgres' words, which is what check:aifault forbids");
  ok('  and it only counts a refusal that really is a missing column',
    /'42703'/.test(route) && /'42P01'/.test(route),
    'a timeout or a permission error would be reported to her as a missing column');

  const room = readFileSync('app/components/ArtMarket.tsx', 'utf8');
  ok('  and the room prints them', /said\?\.missing/.test(room),
    'the route works it out and nothing shows it — the answer stays in a server log');
}

/* ── An artist may not bid up their own work ──────────────────────────────
   The one rule an auction cannot do without. One comparison, and without
   it every price in this room is a number somebody invented. */
{
  const route = readFileSync('app/api/artmarket/route.ts', 'utf8');
  ok('an artist cannot bid on their own work',
    /your_own/.test(route),
    'nothing stops a seller bidding their own piece up');
  ok('  and a bid is refused once the clock has run out',
    /error: 'over'/.test(route),
    'a stale page can bid on an auction that ended ten minutes ago');
  ok('  and the clock is read off the row, not off the request',
    /work\.ends_at \? new Date\(work\.ends_at\)/.test(route),
    'the end time is being taken from whatever the browser sent');
}

if (failures) {
  console.error(
    '\ncheck:artmarket — a share computed on the sticker price pays an artist out of money'
    + ' that never arrived, and nothing on a screen would say so.\n',
  );
  process.exit(1);
}
console.log(
  `\ncheck:artmarket — bidding opens at R${START_RAND} in steps of R${BID_STEP} over ${AUCTION_HOURS} hours,`
  + ` R${UNIQUE_RAND} for a one-off, 70/30 on the profit, and every cent accounted for`
  + ` across ${PRICES.length} prices.`,
);

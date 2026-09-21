/**
 * Paying takes you back to the room you paid from.
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Kyk na die redirect na betalings. Met die
 * album art wanneer die betaling terug kom is dit nie in dieselfde kamer
 * nie. Ek betaal die R50 om die bid te begin, maar dan gebeur daar niks
 * nie. Daar is nie 'n countdown nie en nie 'n teen bid button nie."*
 *
 * Three complaints and one fault. Every checkout told Paystack to come back
 * to `/?paid=1`, and nothing in the app had ever read `paid` — so a real R50
 * was taken at a real till and she was put down on the front page, in a
 * studio that looked exactly as it had before. The countdown and the bid
 * button were both built, both correct, and both behind a room she had been
 * walked out of.
 *
 * ── And the half that is easy to leave out ───────────────────────────────
 *
 * Arriving is not enough. The webhook is what marks the buy-in and it lands
 * on the server while the browser is still being redirected, so the room's
 * own first read can be the state from BEFORE the payment. A room she is
 * returned to that then shows her the old wall is the same nothing with a
 * shorter walk. So the return has to tell the room to read again.
 *
 * ── The line the till may not cross ──────────────────────────────────────
 *
 * The room is worked out from WHAT was bought. A room name that arrives in
 * the request is a room name somebody chose, and the till is the last place
 * in this app that should accept one.
 */

import { readFileSync } from 'node:fs';
import { SURFACES, isSurfaceId } from '../app/lib/surfaces';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const till = readFileSync('app/api/checkout/route.ts', 'utf8');
const page = readFileSync('app/page.tsx', 'utf8');
const wall = readFileSync('app/components/ArtMarket.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── The till says where to come back to ─────────────────────────────── */

/* The whole line, not the backticks' contents: the value is a template
   literal with another template literal nested inside it, so a lazy match
   on backticks stops halfway through and reports a callback with no room
   in it. Which it did, on a correct one. */
const callback = /^\s*callback_url:.*$/m.exec(till)?.[0]?.trim() ?? '';
ok('the till names a room to come back to', /room=/.test(callback), callback || 'no callback_url found');
ok('  and still says a payment happened', /paid=1/.test(callback), callback);

/* Worked out from the kind, never read off the request. `want.kind` is
   already checked; a `room` in the body is not. */
ok('  and works the room out from what was bought',
  /want\.kind === 'bidpass'/.test(till) && /'albumart'/.test(till),
  'the three album-art kinds are the ones that must come back to the wall');
ok('  rather than taking a room name off the request',
  !/body\.room|asked\.room|want\.room/.test(till),
  'a room name that arrives over the wire is one somebody chose, and this is the till');

/* And the name it sends has to be a room that exists. Read from the
   registry rather than trusted: a typo here is a payment that lands
   nowhere, and it would look exactly like the fault being fixed. */
const named = /room=\$\{back\}/.test(callback);
ok('  and the name it can send is a real room',
  named ? isSurfaceId('albumart') : false,
  named ? 'albumart is not in the registry' : 'the callback names no room at all');
ok('  which is the one the wall is in', Boolean(SURFACES.albumart));

/* ── The studio reads it, opens the room, and asks for a fresh read ──── */

ok('the studio reads the flag when it comes back',
  /searchParams\.get\('paid'\)/.test(page),
  'nothing read it, which is why a real payment changed nothing on screen');
ok('  and opens the room the till named',
  /resolveSurfaceId\(here\.searchParams\.get\('room'\)/.test(page),
  'resolved, so an unknown name leaves her where she is rather than nowhere');
ok('  and tells that room to read itself again',
  /copilotBus\.handoff\(room, 'paid', ''\)/.test(page),
  'the webhook lands while she is being redirected, so the first read is the old wall');
ok('  by handing off, because that room has not mounted yet',
  /handoff\(room, 'paid'/.test(page) && !/dispatch\(room, 'paid'/.test(page),
  'dispatch reaches a mounted room, and this fires on the first render');
ok('  and cleans the address, so a reload is not a second arrival',
  /replaceState/.test(page) && /searchParams\.delete\('paid'\)/.test(page),
  'left in place, every refresh says a payment just landed');

/* ── The wall takes it, re-reads, and says so ─────────────────────────── */

ok('the wall takes the payment and reads itself again',
  /paid: \(\) => \{[\s\S]{0,200}?void read\(\)/.test(wall),
  'arriving at the state from before the payment is the same nothing, one tap closer');
ok('  and says the money landed, where the money was spent',
  /art\.paidBack/.test(wall) && words.includes('"art.paidBack"'),
  'she had just been sent out to a till and back; silence is what she reported');
ok('  in both languages',
  /"art\.paidBack": \{ en: "[^"]+", af: "[^"]+" \}/.test(words),
  'an Afrikaans app that falls back to English at the till');

if (failures) {
  console.error(`\ncheck:paidback — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:paidback — the till sends back the room it was paid from, worked out from what was'
  + ' bought and never from the request; the studio opens it, asks it for a fresh read and cleans'
  + ' the address; and the wall re-reads and says the money landed.',
);

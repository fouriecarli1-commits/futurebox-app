/**
 * What she pays every month, kept true.
 *
 * Carli: "ek wil net hê ons moet konstant in ag neem wat ek alles maandelliks
 *  betaal want dit help nie ek maak nie 'n wins nie."
 *
 * ── Why a check and not just a page ──────────────────────────────────────
 *
 * The monthly figure existed as a bare total — `R6 284` — written four times
 * into `docs/KOSTE-EN-WINS.md` and itemised nowhere, while the per-service
 * numbers sat in prose in a different document. A number with no derivation
 * drifts the first time a service is added, and the way that shows up is not
 * an error: it is a profit sum that is quietly wrong.
 *
 * So three rules:
 *
 *   1. Every host the *server* calls appears in the table. A service wired
 *      into the code and missing from the bill is the whole failure.
 *   2. The itemised lines add up to the totals the profit sums use. If they
 *      do not, one of the two documents is lying and there is no telling
 *      which from the outside.
 *   3. Anything that needs a key says which key, and that key is in
 *      `docs/SWITCH-ON.md` — otherwise it is a cost with no way to switch it
 *      on, or a switch with no cost against it.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const page = readFileSync('docs/MAANDELIKSE-KOSTE.md', 'utf8');
/**
 * The service table alone, not the whole page.
 *
 * Renaming `Music.ai` out of the table did not turn this red, because the
 * name still appears in the prose two sections further down — so the rule was
 * asking whether the document mentions a service, which is not the question.
 * Being on the bill means being on the bill.
 */
const table = page.slice(
  page.indexOf('| # | Diens'),
  page.indexOf('### Die vaste totaal'),
);
const sums = readFileSync('docs/KOSTE-EN-WINS.md', 'utf8');
const switchOn = readFileSync('docs/SWITCH-ON.md', 'utf8');

let failures = 0;
const ok = (label: string, good: boolean, detail = '') => {
  console.log(`  ${good ? 'ok ' : '✗'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

/* ── 1. Every host the server calls is on the bill ──────────────────────── */

function serverFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...serverFiles(path));
    else if (/\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

/** What each outbound host is called on the bill. */
const NAMED: Record<string, string> = {
  'api.elevenlabs.io': 'ElevenLabs',
  'api.music.ai': 'Music.ai',
  'api.paystack.co': 'Paystack',
  'api.resend.com': 'Resend',
  'api.spotify.com': 'Spotify',
  'accounts.spotify.com': 'Spotify',
  'api-singapore.klingai.com': 'Kling',
  /* Kits.AI's API lives on their older name. Matched on the host the code
     actually dials, not on the brand — a service renamed on the bill and left
     alone in the code is exactly the drift this rule exists for. */
  'arpeggi.io': 'Kits.AI',
};

const hosts = new Set<string>();
for (const path of [...serverFiles('app/api'), ...serverFiles('app/lib/server')]) {
  const source = readFileSync(path, 'utf8');
  for (const [, host] of source.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/g)) {
    if (NAMED[host]) hosts.add(host);
  }
  /* The SDK, which never writes its own URL down. */
  if (/@anthropic-ai\/sdk/.test(source)) hosts.add('anthropic');
}
NAMED.anthropic = 'Anthropic';

const missing = [...hosts].filter((one) => !table.includes(NAMED[one]));
ok('every service the server calls is on the bill',
  missing.length === 0,
  missing.map((one) => `${one} → ${NAMED[one]}`).join(', ') || `${hosts.size} checked`);

/* Supabase and Vercel are reached through a client and an environment rather
   than a URL in the source, so they are named directly. */
for (const one of ['Supabase', 'Vercel']) {
  ok(`${one} is on the bill`, table.includes(one));
}

/* ── 2. The lines add up to the totals the profit sums use ──────────────── */

/**
 * A rand figure, in Afrikaans, out of a table cell.
 *
 * Cents are new here. Every line on this bill was a whole rand until Zoho
 * arrived at R241,50 — a figure that comes off a bank statement rather than a
 * price page, which is precisely the kind that has cents in it. A cost table
 * that cannot express them is a cost table that rounds quietly, and a table
 * that rounds quietly is the thing this whole check exists to prevent.
 *
 * The comma is the decimal point, because the page is written in Afrikaans and
 * says `R241,50`. The thousands separator is a space.
 */
function money(raw: string): number {
  return Number(raw.replace(/\s/g, '').replace(',', '.'));
}

/** A rand figure out of the derivation table: `| Vercel | 400 |`. */
function randFor(label: string): number | null {
  const found = new RegExp(`\\|\\s*${label}\\s*\\|\\s*([\\d\\s]+(?:,\\d{2})?)\\s*\\|`).exec(page);
  return found ? money(found[1]) : null;
}

/** Cents, compared as cents. Two sums of rands and cents are equal when they
    are equal to the cent; floating point is not the thing being tested here. */
const cents = (value: number): number => Math.round(value * 100);

/* Zoho joined this list on 8 September 2026. It was on no cost page at all
   until Carli named it — not a sum that was wrong, a line that did not exist,
   and the kind nobody sees until the bank takes it. */
const lines = ['Anthropic', 'Vercel', 'Supabase', 'Resend', 'Kits.AI', 'Zoho'];
const parts = lines.map(randFor);
ok('every fixed line has a rand figure', parts.every((one) => one !== null),
  lines.filter((_, at) => parts[at] === null).join(', ') || parts.join(' + '));

const base = parts.reduce((sum: number, one) => sum + (one ?? 0), 0);
const workshops = randFor('Werkswinkels') ?? 0;
const eleven = randFor('ElevenLabs Business') ?? 0;

/* The three totals the profit sums quote, taken from `KOSTE-EN-WINS.md`
   itself rather than typed here — otherwise this only checks that two numbers
   I wrote agree with each other. */
const quoted = (what: RegExp): number | null => {
  const found = what.exec(sums);
  return found ? money(found[1]) : null;
};
const withoutShops = quoted(/Vaste koste sonder ElevenLabs: R([\d\s]+,\d{2}) \(sonder werkswinkels\)/);
const withShops = quoted(/Vaste koste sonder ElevenLabs: R([\d\s]+,\d{2}) \(werkswinkels ingesluit\)/);

ok('the lines add up to what the profit sums call fixed costs',
  withoutShops !== null && cents(base) === cents(withoutShops),
  `${base} against ${withoutShops}`);
ok('and to the figure with the workshops in it',
  withShops !== null && cents(base + workshops) === cents(withShops),
  `${base} + ${workshops} against ${withShops}`);
/* Read as a number rather than matched as a formatted string. The first
   version built `22 124` with `toLocaleString` and compared the text, which
   fails on a thin space, a comma, or a different locale — a check that goes
   red over typography while the arithmetic is right is worse than none. */
const everything = /\|\s*\*\*Alles saam\*\*\s*\|\s*\*\*R?([\d\s]+(?:,\d{2})?)\*\*\s*\|/.exec(page);
const stated = everything ? money(everything[1]) : null;
ok('the everything-in total is the sum of its own parts',
  stated !== null && cents(stated) === cents(base + workshops + eleven),
  `${base} + ${workshops} + ${eleven} = ${base + workshops + eleven}, the table says ${stated}`);

/* ── 3. Every paid service has a key, and the key is documented ─────────── */

const KEYED: Record<string, string> = {
  ElevenLabs: 'ELEVENLABS_API_KEY',
  Anthropic: 'ANTHROPIC_API_KEY',
  'Music.ai': 'MUSIC_AI_API_KEY',
  Paystack: 'PAYSTACK_SECRET_KEY',
  Resend: 'MAIL_API_KEY',
  Supabase: 'SUPABASE_SERVICE_ROLE_KEY',
  'Kits.AI': 'KITS_API_KEY',
};
const undocumented = Object.entries(KEYED)
  .filter(([service]) => table.includes(service))
  .filter(([, key]) => !switchOn.includes(key));
ok('every paid service on the bill has its key written down',
  undocumented.length === 0,
  undocumented.map(([service, key]) => `${service} → ${key}`).join(', ') || 'all of them');

/* ── And the one that decides the shape of the business ─────────────────── */

/* The share is read off the page and compared with the arithmetic, rather
   than both being typed here. The first version asserted `page.includes('72%')`
   with the range hard-coded around it, so adding one line to the bill would
   have turned it red over a rounding rather than over anything being wrong —
   and worse, a page that had drifted to a wrong percentage while still saying
   "72%" would have passed. */
const share = eleven / (base + workshops + eleven);
const claimed = /is R[\d\s]+(?:,\d{2})? van R[\d\s]+(?:,\d{2})? — (\d{1,3})%/.exec(page);
ok('the bill says plainly which line decides everything',
  claimed !== null && Number(claimed[1]) === Math.round(share * 100) && share > 0.5,
  claimed
    ? `the page says ${claimed[1]}%, the table works out to ${(share * 100).toFixed(1)}%`
    : 'the page never says what share ElevenLabs is');

if (failures) {
  console.error(
    `\ncheck:koste — ${failures} problem(s). The monthly bill and the profit sums` +
      '\nhave to agree, or one of them is quietly wrong and there is no telling which.\n',
  );
  process.exit(1);
}
console.log('\ncheck:koste — every service the code calls is on the bill, and the bill adds up.');

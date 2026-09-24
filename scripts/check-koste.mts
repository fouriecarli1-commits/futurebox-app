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
import { gatewayFee, GATEWAY_RATE, GATEWAY_FIXED, TIER_SPECS } from '../app/lib/plans.ts';
import { FIXED_CORE } from './fixedcosts.mts';
/* Comments blanked before either rule below reads a file. The first run of
   the 11-million rule reported `plans.ts` — while reading the paragraph that
   explains why the 11 million was deleted. A check that reads its own
   explanation as evidence is measuring something adjacent to the real thing,
   and this is the third time in two days. */
import { withoutComments } from './prose.mts';

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
const lines = ['Anthropic', 'Vercel', 'Supabase', 'Resend', 'Kits.AI', 'Zoho', 'Domeine', 'Spaceship'];
const parts = lines.map(randFor);
ok('every fixed line has a rand figure', parts.every((one) => one !== null),
  lines.filter((_, at) => parts[at] === null).join(', ') || parts.join(' + '));

/* ── Every line, by name, against the generator's own list ────────────────

   Added 16 September 2026, because the sum below let a real fault through.

   The totals agreed while Vercel and Supabase carried each other's figures:
   R320 and R400 add to R720 whichever way round they are, so the page named
   the wrong amount against the wrong service and this check stayed green. A
   sum that adds up is not the same thing as lines that are right.

   So each line is now matched to `fixedcosts.mts` by name. The names differ
   between the two — the page says "Vercel", the list says "Vercel Pro" —
   which is why it matches on the page's label being a prefix of the list's
   rather than on equality; tightening that to exact names would be a rename
   in two places for no gain. */
{
  const byName = new Map(Object.entries(FIXED_CORE));
  for (const [at, label] of lines.entries()) {
    const onPage = parts[at];
    const key = [...byName.keys()].find((one) => one.startsWith(label) || label.startsWith(one));
    const inList = key === undefined ? undefined : byName.get(key);
    ok(
      `${label} is the same figure on the bill and in the sums`,
      onPage !== null && inList !== undefined && cents(onPage) === cents(inList),
      inList === undefined
        ? `${label} is on the bill but in no line of fixedcosts.mts`
        : `the bill says ${onPage}, the generator says ${inList}`,
    );
  }
}

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
/* A decimal is allowed. The first version demanded a whole number, so writing
   the MORE precise 70,3% failed a page that was right — a check dictating how
   its subject rounds, which is not its business. Compared to one decimal
   place, so either 70% or 70,3% passes and 71% does not. */
const claimed = /is R[\d\s]+(?:,\d{2})? van R[\d\s]+(?:,\d{2})? — (\d{1,3}(?:,\d)?)%/.exec(page);
const said = claimed ? Number(claimed[1].replace(',', '.')) : NaN;
ok('the bill says plainly which line decides everything',
  claimed !== null && Math.abs(said - share * 100) < 0.55 && share > 0.5,
  claimed
    ? `the page says ${claimed[1]}%, the table works out to ${(share * 100).toFixed(1)}%`
    : 'the page never says what share ElevenLabs is');

/* ── ElevenLabs may not be charged twice ──────────────────────────────────

   Added 16 September 2026, after finding that it was.

   `costs-eleven.mts` computed break-even as (fixed costs + the ElevenLabs
   plan) divided by a per-member margin that had ALREADY had that member's
   ElevenLabs credit consumption subtracted from it. The same rands, counted
   on both sides of one division.

   The plan is prepaid capacity. R18 216 buys 6 000 000 credits, and a member
   spending them costs nothing further until the plan runs out — which is what
   the capacity column measures, and where that subtraction belongs.

   It cost 18 members of break-even in the realistic case, and it leaned
   pessimistic, which is the direction a money model can be wrong in for
   months without anybody noticing.

   So the rule, asserted rather than described: the profit per paying member
   is the subscription minus the payment gateway, and nothing else. Any
   future edit that quietly starts deducting supplier cost from that figure
   turns this red. */
{
  const MIX = { maker: 0.6, studio: 0.3, label: 0.1 } as const;
  const RAND = { maker: 149, studio: 349, label: 899 } as const;
  const expected = (Object.keys(MIX) as (keyof typeof MIX)[]).reduce(
    (sum, tier) => sum + (RAND[tier] - gatewayFee(RAND[tier])) * MIX[tier],
    0,
  );
  /* Every scenario row carries the same figure now, because the plan no
     longer enters it. Reading them all and requiring agreement is what
     catches a half-applied fix. */
  const stated = [...sums.matchAll(/\| (?:Creator|Pro|Scale|Business) \| R([\d\s]+,\d{2}) \|/g)].map(
    (m) => Number(m[1].replace(/\s/g, '').replace(',', '.')),
  );
  ok(
    'profit per member is the subscription less the gateway, and nothing else',
    stated.length > 0 && stated.every((one) => Math.abs(one - expected) < 0.01),
    stated.length === 0
      ? 'no per-member profit figures found in docs/KOSTE-EN-WINS.md'
      : `the sums say ${[...new Set(stated)].join(' / ')}, the plans work out to ${expected.toFixed(2)} — ` +
        'a supplier cost is being deducted from a figure the plan already pays for',
  );
}

/* ── 4. One bill list, and only one ───────────────────────────────────────

   `fixedcosts.mts` exists because the same monthly bill was written in two
   places — a document and a generator — and they disagreed about which
   service R64 belonged to. Its own header says a total that adds up is not
   the same thing as lines that add up.

   On 24 September 2026, working out every sum for a budget, it turned out to
   have happened a SECOND time. `app/lib/plans.ts` carried a complete rival
   cost model: `FIXED_MONTHLY`, `FIXED_TOTAL`, `SONG_COST`, `marginOf`,
   `breakEvenMembers` and a `RAND_PER_CREDIT` built on 11 000 000 credits when
   ElevenLabs' own email says 6 000 000. It listed GitHub, which costs nothing,
   and omitted Kits.AI, Zoho, the domains and Spaceship — R1 259.74 a month of
   real bills missing from a list called "monthly fixed costs".

   Nothing read it, which is exactly why it survived. It was not a bug, it was
   a landmine: `plans.ts` is the obvious file to open to ask what the business
   costs, and it gave a confident, itemised, wrong answer.

   So the rule is not "the lists agree" — it is that there is only one list.
   A second one cannot be wrong if it cannot exist. */

const NAMES = Object.keys(FIXED_CORE);

/** Everywhere a second bill list could hide. */
const SOURCES: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.next') walk(full);
    } else if (/\.(ts|tsx|mts)$/.test(entry)) {
      SOURCES.push(full);
    }
  }
};
walk('app');
walk('scripts');

/* The generator and the list itself are allowed to name suppliers with money
   beside them. So are the checks that read them — including this one. */
const MAY = new Set([
  join('scripts', 'fixedcosts.mts'),
  join('scripts', 'costs-eleven.mts'),
  join('scripts', 'check-koste.mts'),
  join('scripts', 'check-kredietkoste.mts'),
]);

const rivals: string[] = [];
for (const file of SOURCES) {
  if (MAY.has(file)) continue;
  const text = withoutComments(readFileSync(file, 'utf8'));
  /* A supplier name with a number beside it — `Resend: 64`, `'Vercel Pro': 320`
     — which is what a bill list looks like and what prose does not. Two or
     more of them in one file is a list rather than a mention. */
  const priced = NAMES.filter((name) => {
    const bare = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`['"\`]?${bare}['"\`]?\\s*:\\s*[0-9]`).test(text);
  });
  if (priced.length >= 2) rivals.push(`${file} prices ${priced.join(', ')}`);
}

ok('the monthly bill is written down in exactly one place',
  rivals.length === 0,
  `${rivals.join('; ')} — a second bill list cannot be kept in step, and the one that is wrong is the one nobody reads`);

/* And no second answer to what an ElevenLabs credit costs. The rival model's
   worst number was this one: $990 for 11 000 000 credits, when their own
   email of 9 September says 6 000 000. It made a song look 45% cheaper than
   it is, which is the single number the whole business rests on. */
const wrongAnchor = SOURCES.filter((file) => {
  if (MAY.has(file)) return false;
  const text = withoutComments(readFileSync(file, 'utf8'));
  return /11[_\s]?000[_\s]?000/.test(text) && /990/.test(text);
});
ok('nothing carries the old 11-million-credit anchor',
  wrongAnchor.length === 0,
  `${wrongAnchor.join(', ')} — ElevenLabs' own email says 6 000 000, and 11 000 000 makes a song look 45% cheaper than it is`);

/* ── 5. One gateway rate ──────────────────────────────────────────────────

   The bill page said 2.9% + R1 and marked it checked; `gatewayFee` charged
   3.5% + R2 and that is what reached every margin sum. R1.90 a member a
   month, in the direction that understates the profit.

   Held on the numbers rather than on the sentence: the page may explain the
   discrepancy however it likes, but whatever figure it presents as the one
   the sums use has to be the figure the sums use. */
{
  const page = readFileSync('docs/MAANDELIKSE-KOSTE.md', 'utf8');
  const pct = (GATEWAY_RATE * 100).toFixed(1).replace('.', ',');
  const fixed = String(GATEWAY_FIXED);
  ok('the bill page quotes the gateway rate the sums actually charge',
    page.includes(`${pct}% + R${fixed}`),
    `the page does not say "${pct}% + R${fixed}" anywhere — gatewayFee charges it on every subscription`);

  /* And the worked example on that page has to be this arithmetic, not a
     number somebody typed once. Maker is the cheapest plan and therefore the
     one the fixed R2 hurts most, which is why it is the example. */
  const maker = gatewayFee(TIER_SPECS.maker.rand);
  ok('  and its worked example is what gatewayFee returns on Maker',
    page.includes(`R${maker.toFixed(2).replace('.', ',')}`),
    `the page should show R${maker.toFixed(2).replace('.', ',')} for Maker's R${TIER_SPECS.maker.rand}`);
}

/* ── 6. The fixed total, wherever it is quoted ────────────────────────────

   Supabase went from an assumed $25 to her real $34 on 24 September 2026, and
   the R144 a month landed in four documents at once. Three of them were
   carrying their own copy of the total — `DIENSTE-EN-KOSTE.md`,
   `ELEVENLABS-SALES.md` and `OPSIE-E.md` — each stated confidently, each
   stale the moment one bill moved.

   That is the same fault as the two bill lists and the two gateway rates, in
   its third form in one afternoon: a derived number copied rather than
   derived. So any document that names a fixed-cost total has to name the
   live one.

   Matched on the phrase that introduces it, so a figure that merely appears
   near the words is not caught — only one presented AS the fixed total. */
{
  const base = Object.values(FIXED_CORE).reduce((a, b) => a + b, 0);
  /* Four totals are legitimate and a document may quote any of them: the
     base, the base with workshops, and either of those with ElevenLabs in.
     The first version accepted only the base and called the with-workshops
     figure stale — a check that is wrong in the alarming direction, which is
     the kind that gets switched off. */
  const money = (value: number): string =>
    value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, ' ');
  const legitimate = [base, base + workshops, base + eleven, base + workshops + eleven].map(money);
  const live = legitimate.join(' / ');
  const QUOTES = /(?:[Vv]aste koste(?:\s+sonder\s+ElevenLabs)?|Fixed costs excluding ElevenLabs)[^.!?]{0,60}?R([\d\s]+,\d{2})/g;

  const stale: string[] = [];
  for (const file of readdirSync('docs').filter((one) => one.endsWith('.md'))) {
    const text = readFileSync(join('docs', file), 'utf8');
    for (const hit of text.matchAll(QUOTES)) {
      const said = hit[1].trim();
      /* A line that says what a figure USED to be is history, not a claim.
         `OPSIE-E.md` carries one on purpose so the change is legible. */
      const before = text.slice(Math.max(0, (hit.index ?? 0) - 60), hit.index ?? 0);
      if (/\bWas\b|\bwas\b tot|voorheen/.test(before)) continue;
      if (!legitimate.includes(said)) stale.push(`${file} says R${said}`);
    }
  }

  ok(`every document that names a fixed total names a current one (${live})`,
    stale.length === 0,
    `${stale.join('; ')} — one bill moved and a copy of the total went quietly wrong`);
}

if (failures) {
  console.error(
    `\ncheck:koste — ${failures} problem(s). The monthly bill and the profit sums` +
      '\nhave to agree, or one of them is quietly wrong and there is no telling which.\n',
  );
  process.exit(1);
}
console.log('\ncheck:koste — every service the code calls is on the bill, and the bill adds up.');

/**
 * Nothing reaches a supplier for free by accident.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * Carli, 5 October 2026: *"Onthou dat ons probooth ook moet monotize, nie te
 * duur nie."*
 *
 * The rule she set on 24 September is already in `credits.ts`: **entering a
 * room is included, generating in it costs credits.** The Pro Booth comes
 * with every paid plan, and the model calls inside it come out of the same
 * wallet as a song. That part is decided.
 *
 * What is not held anywhere is the other half: a route that reaches a
 * supplier and charges NOTHING. There are twelve of them today and every one
 * is deliberate — a setup page, a stock sample that is a static file on their
 * side, a stem streamed back through our own origin. Each explains itself in
 * its own header, which is the right place for a reason and the wrong place
 * for a list: nothing compares those twelve headers against the routes that
 * actually exist, so a thirteenth joins them by being written.
 *
 * That is how a free feature happens. Not by a decision to give something
 * away — by somebody adding a route, calling a supplier, and nobody counting.
 * And a bill that grows without a feature to explain it is the hardest kind
 * to find, because every individual call is correct.
 *
 * ── What this is not ─────────────────────────────────────────────────────
 *
 * It does not say anything is priced right. `check:kredietkoste` holds the
 * prices against their upstream cost and `check:koste` holds the bill
 * together. This one asks a smaller question with a yes or no answer: does
 * every route that can spend our money either take credits, or appear below
 * with a reason somebody wrote down.
 *
 * It also cannot see a room. A button that calls a charging route twice is
 * two charges and this check is happy; that is `audit/` work.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { code, withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

/**
 * The modules that can put something on a bill.
 *
 * By module rather than by hostname, because `suppliers.ts` is the only place
 * a host is written now and a route reaches it through an import. Listed
 * rather than inferred: a module that merely reads our own database is not a
 * supplier, and treating every import as one would make this check noise.
 */
const SPENDS = [
  'server/suppliers', 'server/eleven', 'server/musicai', 'server/kits',
  'server/cover', 'server/video/eleven', 'server/sayit',
  /* TONE3000 costs us nothing and is here anyway. "Spends" is the wrong
     word for it and the right list: the question this file asks is whether
     a route reaching OUT is accounted for, and a supplier that is free
     today is a supplier whose terms can change. Left out, the three
     TONE3000 routes would be invisible to the one rule that counts them. */
  'server/tone3000session',
];

/**
 * What a file imports, as specifiers rather than as text it happens to hold.
 *
 * The first version searched the whole file for the module name, after
 * `withoutComments`. It named two innocent routes and both failures were
 * mine, in different ways:
 *
 *   `afrikaans/route.ts` mentions `server/sayit` in a comment and again
 *   inside a string of advice printed to the owner. `withoutComments` blanks
 *   comments and leaves string bodies; `code` blanks both, which is what a
 *   rule about what code DOES needs.
 *
 *   `checkout/route.ts` imports `server/elevenroom`, which contains
 *   `server/eleven` as a substring and is not a supplier at all — it decides
 *   which room to sell. `server/cover` would have swallowed a `coverart` the
 *   same way.
 *
 * Both would have been noise, and noise is how a check gets switched off.
 * Worse, the substring fault runs the other way too: a module could be named
 * so that it never matches and spends in silence.
 */
function imports(src: string): string[] {
  /* `withoutComments` and NOT `code` here, even though `code` is the stricter
     one. `code` blanks string BODIES, and an import's path is a string — it
     erased every specifier in the file and the walk found nothing at all,
     cheerfully, in zero of seventy-six routes. The precision comes instead
     from anchoring on `from '…'`, so a module named in prose does not count:
     the sentence that caused this, in `afrikaans/route.ts`, is advice to the
     owner that happens to contain a path. */
  return [...withoutComments(src).matchAll(/from\s+'([^']+)'/g)]
    .map((m) => m[1].replace(/^@\/app\/lib\//, '').replace(/^(\.\.\/)+lib\//, ''))
    .map((one) => (one.startsWith('server/') ? one : ''))
    .filter(Boolean);
}

/**
 * Routes that reach a supplier and take no credits, and why.
 *
 * A route absent from here and absent from `charge()` is the thing this file
 * is for. A route present here that has started charging is a line that has
 * gone stale, and is reported too — a reason nobody re-reads is how a list
 * stops describing the app.
 */
const FREE: Record<string, string> = {
  'app/api/watch/route.ts':
    'the health letter. It runs on a secret, for the owner, and it asks the'
    + ' suppliers what they have spent rather than spending anything',
  'app/api/eleven/dictionary/route.ts':
    "puts the pronunciation rules onto the account from the repo — our own"
    + ' setup, on a secret, not a member action',
  'app/api/eleven/prices/route.ts':
    'reads their invoice to answer whether we charge enough. Reading a bill'
    + ' is not adding to one',
  'app/api/eleven/pronounce/route.ts':
    'the Afrikaans test read. It DOES generate, and it is the one here that'
    + ' costs real money — guarded by a secret and meant for the owner alone,'
    + ' which is why it takes no credits and why it must never lose that'
    + ' guard',
  'app/api/voice/route.ts':
    'what this person may do with voices and which ones they have. A listing,'
    + ' so the studio can draw itself correctly on first paint',
  'app/api/voice/preview/route.ts':
    'a stock voice sample, which is a static file on their storage. Passed'
    + ' through our origin so their host stays off the media policy. Charging'
    + ' for it would price the one step that stops somebody buying the wrong'
    + ' voice',
  'app/api/account/route.ts':
    'deleting an account and everything in it. Nobody pays to leave',
  'app/api/analyse/part/route.ts':
    'one stem streamed back through our own origin. The job that made it was'
    + ' charged when it ran; this is collection, not work',
  'app/api/analyse/setup/route.ts':
    "lists the Music.ai workflows actually on the account. A setup page on a"
    + ' secret',
  'app/api/allowance/route.ts':
    'where the allowances stand. Reading a meter',
  'app/api/kits/face/route.ts':
    'the picture for a singing voice, passed through this app rather than'
    + ' linked, for the same policy reason as the voice sample',
  'app/api/tone3000/start/route.ts':
    'sends her to TONE3000 to choose an amp. Their fees are waived for us and'
    + ' she signs in with her OWN account, so there is no bill behind any of'
    + " this — and the capture runs in her browser through lib/nam.ts, not on"
    + ' anything we pay for',
  'app/api/tone3000/callback/route.ts':
    'where they send her back. It trades a code for tokens on her behalf and'
    + ' spends nothing doing it',
  'app/api/tone3000/tone/route.ts':
    'fetches the capture she chose, on her own token. Free for the same'
    + ' reason as the two above: this supplier has no account key and sends'
    + ' us no invoice',
  'app/api/kits/setup/route.ts':
    'lists what is on the Kits account. A setup page on a secret',
};

/* ── Walk ──────────────────────────────────────────────────────────────── */

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((it) => {
    const here = join(dir, it.name);
    if (it.isDirectory()) return walk(here);
    return it.isFile() && it.name === 'route.ts' ? [here] : [];
  });

const routes = walk('app/api');
const reaches: string[] = [];
const charges = new Set<string>();
for (const file of routes) {
  const src = readFileSync(file, 'utf8');
  const from = imports(src);
  if (!SPENDS.some((one) => from.includes(one))) continue;
  reaches.push(file);
  if (/\bcharge\(/.test(code(src))) charges.add(file);
}

const silent = reaches.filter((one) => !charges.has(one) && !(one in FREE));
ok(`every route that can reach a supplier is accounted for (${reaches.length} of ${routes.length})`,
  silent.length === 0,
  silent.length
    ? `${silent.join(', ')} — each takes no credits and gives no reason. Add`
      + ' `charge()`, or a line to FREE in this file saying what makes it free.'
      + ' A free feature nobody decided on is a bill with no feature behind it'
    : '');

const stale = Object.keys(FREE).filter((one) => charges.has(one));
ok('  and nothing listed as free has quietly started charging',
  stale.length === 0,
  stale.length
    ? `${stale.join(', ')} — remove the line. A reason nobody re-reads is how`
      + ' a list stops describing the app'
    : '');

const gone = Object.keys(FREE).filter((one) => !reaches.includes(one));
ok('  nor names a route that no longer reaches one',
  gone.length === 0,
  gone.length ? `${gone.join(', ')} — deleted, renamed, or it stopped calling out` : '');

ok('  and every reason is a sentence rather than a word',
  Object.values(FREE).every((why) => why.length > 25),
  'a one-word reason is a tick in a box. The point of the list is that'
  + ' somebody had to write why, and that the next person can disagree');

/* ── The one that actually spends ──────────────────────────────────────── */

const OWNERS_ONLY = 'app/api/eleven/pronounce/route.ts';
ok("the one free route that really generates is still behind a secret",
  (() => {
    const src = code(readFileSync(OWNERS_ONLY, 'utf8'));
    return /POST_SECRET|CRON_SECRET|WATCH_SECRET|timingSafeEqual/.test(src);
  })(),
  'every other line above is free because it costs nothing. This one costs'
  + ' real money per call and takes no credits, which is only defensible'
  + ' while it is the owner reaching it. Lose the secret and it is an open'
  + ' tap');

if (bad) {
  console.error(`\ncheck:gratis — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:gratis — of ${reaches.length} routes that can reach a supplier,`
  + ` ${charges.size} take credits and ${Object.keys(FREE).length} are free`
  + ' on purpose, each with a reason somebody wrote.',
);

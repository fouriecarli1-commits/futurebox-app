/**
 * One door out to a supplier, and nobody slipping past it.
 *
 * ── Why this check and not a convention ──────────────────────────────────
 *
 * Carli, 5 October 2026, on ElevenLabs: *"'n kwotasie en wat hulle ceiling
 * is, want ek wil groot gaan en baie kliënte aanneem."*
 *
 * The thing that makes that hard is not the unanswered email. It is that
 * nobody could say what the app buys. The count was thirteen capabilities in
 * the morning, read off the files importing the shared client. It was wrong:
 * `lib/server/cover.ts` and `lib/server/video/eleven.ts` each carried their
 * OWN client, with their own host and their own auth header, so nothing
 * reading the shared one could see them. Sixteen, once the pronunciation
 * dictionary — a third private client — was found as well.
 *
 * Those three were not hidden. They were ordinary, and each was written by
 * somebody solving the problem in front of them. That is why this is a check
 * and not a note in a style guide: the next one will be written the same way,
 * by somebody equally reasonable, and the only thing that reliably catches it
 * is the build failing with the file named.
 *
 * ── What it cannot do ────────────────────────────────────────────────────
 *
 * It cannot tell whether a capability could actually be served by somebody
 * else. Suppliers differ in the SHAPE of what they take and return, and this
 * seam is layer one — the vocabulary, the routing, the credentials. A file
 * that passes every rule here is reachable and named; it is not yet portable.
 * Saying otherwise would be the exact fault this repo keeps finding: a check
 * that is green because it measures something adjacent.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';
import { CAPABILITIES, SUPPLIERS, serves, type Capability } from '../app/lib/server/suppliers';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const SEAM = 'app/lib/server/suppliers.ts';
const seam = withoutComments(readFileSync(SEAM, 'utf8'));

/* ── Every capability has somebody ─────────────────────────────────────── */

const orphans = CAPABILITIES.filter(
  (one) => !SUPPLIERS.some((who) => who.serves.includes(one)),
);
ok(`all ${CAPABILITIES.length} capabilities have a supplier`,
  orphans.length === 0,
  orphans.length
    ? `${orphans.join(', ')} — a capability nobody serves is a room that is`
      + ' off the air the moment somebody presses the button'
    : '');

ok('  and the list and the type cannot drift apart',
  CAPABILITIES.every((one) => seam.includes(`| '${one}'`) || seam.includes(`= '${one}'`)
    || new RegExp(`\\|\\s*'${one}'`).test(seam)),
  'the union is what a caller is type-checked against and the array is what'
  + ' this check walks — a name in one and not the other is a capability that'
  + ' compiles and is never looked at');

ok('  and there is no switch that cannot work yet',
  !/SUPPLIER_/.test(seam) && !/process\.env\[/.test(seam),
  'the first draft had `SUPPLIER_STEMS=musicai`, which would have sent one'
  + " supplier's request body to another supplier's host and called the"
  + ' failure theirs. Routing is layer one; switching needs layer two. A'
  + ' switch that looks like it works is worse than none, because somebody'
  + ' reaches for it on the day something is already wrong');

/* ── Nobody writes a host or a key but the seam ────────────────────────── */

/** Every .ts under app/, which is where a server call can be written. */
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
  .flatMap((it) => {
    const here = join(dir, it.name);
    if (it.isDirectory()) return walk(here);
    return it.isFile() && here.endsWith('.ts') ? [here] : [];
  });

const files = walk('app').filter((one) => one !== SEAM);
const hosts = SUPPLIERS.map((one) => one.base.replace(/^https?:\/\//, ''));
const headers = [...new Set(SUPPLIERS.map((one) => one.keyHeader))];
const keys = [...new Set(SUPPLIERS.map((one) => one.keyFrom))];

const writesHost: string[] = [];
const writesHeader: string[] = [];
const readsKey: string[] = [];
for (const file of files) {
  const code = withoutComments(readFileSync(file, 'utf8'));
  if (hosts.some((host) => code.includes(host))) writesHost.push(file);
  if (headers.some((one) => code.includes(`'${one}'`))) writesHeader.push(file);
  if (keys.some((one) => code.includes(one))) readsKey.push(file);
}

ok(`no file but the seam writes a supplier's host (${files.length} walked)`,
  writesHost.length === 0,
  writesHost.length
    ? `${writesHost.join(', ')} — this is the rule that would have caught`
      + ' cover.ts and video/eleven.ts, which each carried their own client'
      + ' and were therefore invisible to the count'
    : '');

ok('  nor its auth header',
  writesHeader.length === 0,
  writesHeader.join(', '));

ok('  nor reads its key out of the environment',
  readsKey.length === 0,
  readsKey.length
    ? `${readsKey.join(', ')} — one place reads the key, which is also what`
      + ' lets `check:security` say where it can and cannot go'
    : '');

/* ── And the door itself is built right ────────────────────────────────── */

ok('the door takes a capability, so no call is anonymous',
  /export function call\(\s*what: Capability,/.test(seam),
  'a call that does not name what it is for cannot be routed, billed, or'
  + ' counted against a ceiling — which is the whole question she asked');

ok('  and the auth header goes on last',
  /headers\.set\(supplier\.keyHeader/.test(seam)
  && !/\.\.\.init\.headers\s*\}\s*\)/.test(seam),
  'merged the other way round, a caller that sets its own key header'
  + ' silently replaces the real one, and the failure reads as the supplier'
  + ' rejecting us rather than as our own bug');

ok('  a person\'s own token can be carried, and wins over the account key',
  /asPerson\?: string/.test(seam)
  && /headers\.set\(supplier\.keyHeader, asPerson \?\? supplier\.key\(\)\)/.test(seam),
  'every supplier so far is one account we pay for, with one key in the'
  + ' environment. TONE3000 is not: each member signs in to their own and the'
  + ' token reads THEIR favourites and THEIR private tones. Sending ours'
  + ' alongside theirs would be asking two questions at once');

ok('  and the seam still does not know who is asking',
  !/callerFrom|caller\.id|request/.test(seam),
  'the route knows, and hands the token down. A credentials layer that'
  + ' reaches for the request is a credentials layer that has become a'
  + ' second router');

ok('  and the key is read by its literal name, never a computed one',
  !/sk_|xi_[a-z0-9]{8}/.test(seam)
  && /key: \(\) => process\.env\.[A-Z_]+/.test(seam)
  && !/process\.env\[/.test(seam),
  'the first draft wrote `process.env[supplier.keyFrom]`, which is shorter and'
  + ' wrong: `check:envdoc` caught it within the hour. A variable read through'
  + ' a computed name is invisible to every rule that asks whether it is'
  + ' written down where she works from, and that fails as a feature quietly'
  + ' taking the off path on a machine where nobody set it');

if (bad) {
  console.error(`\ncheck:seam — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:seam — ${CAPABILITIES.length} capabilities, ${SUPPLIERS.length} supplier(s),`
  + ` and across ${files.length} files nothing but the seam writes a host, an`
  + ' auth header or a key.',
);

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
import {
  CAPABILITIES, SUPPLIERS, authFor, call, callGiven, serves, type Capability,
} from '../app/lib/server/suppliers';

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

/* The next few open the door for real rather than reading it. A regex on
   `headers.set(...)` was what stood here, and it said nothing about what
   actually lands in the header — which is the whole question. */
const sent: { url: string; headers: Headers }[] = [];
const real = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  sent.push({ url: String(url), headers: new Headers(init?.headers) });
  return new Response('{}');
}) as typeof globalThis.fetch;
try {
  process.env.ELEVENLABS_API_KEY = 'ours';
  await call('speak', '/v1/text-to-speech');
  await call('speak', '/v1/text-to-speech', {}, 'theirs');
} finally {
  globalThis.fetch = real;
}

ok('  a person\'s own token can be carried, and wins over the account key',
  /asPerson\?: string/.test(seam)
  && sent[0]?.headers.get('xi-api-key') === 'ours'
  && sent[1]?.headers.get('xi-api-key') === 'theirs',
  'every supplier so far is one account we pay for, with one key in the'
  + ' environment. TONE3000 is not: each member signs in to their own and the'
  + ' token reads THEIR favourites and THEIR private tones. Sending ours'
  + ' alongside theirs would be asking two questions at once');

ok('  and the key arrives with its scheme in front of it, not bare',
  authFor({ keyPrefix: 'Bearer ', key: () => 'ours' }) === 'Bearer ours'
  && authFor({ keyPrefix: 'Bearer ', key: () => 'ours' }, 'theirs') === 'Bearer theirs'
  && authFor({ keyPrefix: '', key: () => 'ours' }) === 'ours',
  'ElevenLabs has no scheme and TONE3000 wants `Authorization: Bearer'
  + ' <token>`. Sent bare there, the 401 that comes back talks about the'
  + ' token, so the hour goes on the token instead of on the one missing'
  + ' word in front of it. This is exercised with a scheme that is NOT'
  + " empty on purpose: the first version read the real supplier's header"
  + " back, whose scheme is '', and passed with the scheme deleted from the"
  + ' door — green, and measuring nothing');

ok('  and both doors compose the header in one place, which fetches once',
  (seam.match(/headers\.set\(/g) ?? []).length === 1
  && (seam.match(/\bfetch\(/g) ?? []).length === 1
  && /headers\.set\(supplier\.keyHeader, authFor\(supplier, asPerson\)\)/.test(seam),
  'the arithmetic above is only worth something if the doors actually go'
  + ' through it — a second place that joins the two strings itself is a'
  + ' second place to forget the scheme, and a second fetch is a second'
  + ' place to forget the header entirely');

ok('  and a supplier using Authorization has to say which scheme',
  SUPPLIERS.every((one) => one.keyHeader.toLowerCase() !== 'authorization'
    || /^\S+ $/.test(one.keyPrefix)),
  'this rule is here before the supplier that needs it, which is the only'
  + ' order in which it is worth anything: on the day the TONE3000 entry is'
  + ' written, a bare token in that header does not compile past this check');

const throws = (go: () => unknown): boolean => {
  try {
    void go();
    return false;
  } catch {
    return true;
  }
};

ok('  and a whole address handed to the path door is refused',
  ['https://x.amazonaws.com/t.zip', 'http://x/t.zip', '//x/t.zip']
    .every((one) => throws(() => call('speak', one))),
  'their download endpoint answers with a temporary link to a zip on'
  + " somebody else's storage and says no auth header is needed. This door"
  + ' always adds one, so a whole address through it sends a member\'s'
  + ' TONE3000 token to a host that is not TONE3000, and nothing downstream'
  + ' would complain');

/* ── The second door, for an address the supplier itself handed back ───── */

const own = SUPPLIERS[0].base;
sent.length = 0;
const real2 = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  sent.push({ url: String(url), headers: new Headers(init?.headers) });
  return new Response('{}');
}) as typeof globalThis.fetch;
try {
  await callGiven('speak', `${own}/v1/models/x.nam`, {}, 'theirs');
} finally {
  globalThis.fetch = real2;
}

ok("an address the supplier gave us is fetched with our credential on it",
  sent[0]?.url === `${own}/v1/models/x.nam`
  && sent[0]?.headers.get('xi-api-key') === 'theirs',
  'TONE3000 `Model.model_url` is fetched WITH the Bearer token — their own'
  + ' sample does that, and step 6 of the chain depends on it. The first'
  + ' version of this seam refused every whole address, which made that'
  + ' step unreachable through the only place allowed to write the header:'
  + ' a check faithfully guarding a rule that was wrong');

ok('  but only when it is on the supplier\'s own host',
  ['https://x.amazonaws.com/t.zip', 'https://tone3000.com.evil.test/t',
    'http://api.elevenlabs.io/v1/x']
    .every((one) => throws(() => callGiven('speak', one))),
  'the signed zip link and the model url are both whole addresses from the'
  + ' same supplier with OPPOSITE rules, and nothing in the string says'
  + ' which is which. The origin does. A scheme that does not match counts'
  + " too: http where the base is https is somebody else's wire");

ok('  and a path handed to that door is refused as well',
  ['/v1/models/x.nam', 'v1/models/x.nam'].every((one) => throws(() => callGiven('speak', one))),
  'the two doors are not interchangeable, and a path that silently became'
  + ' `https://base/v1/...` here would make the origin test meaningless');

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

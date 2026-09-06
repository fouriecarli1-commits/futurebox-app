/**
 * The security claims, as assertions rather than prose.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * `docs/GOING_LIVE.md` answered "is this safe to take money on" with a table of
 * claims, each naming how it was checked. One of them was badly wrong: it
 * described two build-time advisories in a transitive dependency where the real
 * answer was sixteen advisories in the framework itself, including cross-site
 * scripting, cache poisoning, request smuggling and an unauthenticated
 * disclosure of internal endpoints. It had been that wrong for weeks, because a
 * claim written once is a claim nobody re-runs.
 *
 * Everything here was checked by hand afterwards and held. This file is so that
 * staying true is not a matter of somebody remembering.
 *
 * ── What it deliberately does not do ─────────────────────────────────────
 *
 * It does not check `npm audit`. That has to be a separate decision: a new
 * advisory against a dependency is not a reason a pull request touching the
 * copilot should fail, and a check that blocks work for something the author
 * cannot fix is a check that gets disabled. Run `npm audit --omit=dev`
 * deliberately, and read the list rather than the summary line — reading the
 * summary line is the whole reason this file exists.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const fail = (what: string, detail: string) => {
  failures += 1;
  console.error(`  ✗ ${what}\n      ${detail}`);
};
const pass = (what: string) => console.log(`  ok  ${what}`);

function walk(dir: string, out: string[] = [], match = /\.tsx?$/): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out, match);
    else if (match.test(path)) out.push(path);
  }
  return out;
}

/* ── 1. Row-level security on every table ──────────────────────────────────
   A table created without it is readable and writable by anyone holding the
   anon key, which is public by design — so this is the difference between the
   database being private and being a public API over everybody's rows.

   The pattern is whitespace-tolerant on purpose: the first version of this
   check required exactly one space and reported two tables as unprotected
   because `live.sql` aligns its statements. A check that cries wolf is a check
   somebody switches off. */
for (const file of walk('supabase', [], /\.sql$/)) {
  const sql = readFileSync(file, 'utf8');
  const tables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)]
    .map((m) => m[1].toLowerCase());
  for (const table of new Set(tables)) {
    const on = new RegExp(`alter\\s+table\\s+(public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
    if (!on.test(sql)) fail(`RLS on ${table}`, `${file} creates it and never enables row level security`);
  }
}
if (!failures) pass('every table in supabase/ enables row level security');

/* ── 2. No dangerous sinks ─────────────────────────────────────────────────
   The Content-Security-Policy still carries 'unsafe-inline' and 'unsafe-eval'
   for Next's own bootstrap, so these three are the app's own guard against the
   XSS that policy cannot stop by itself. */
const before2 = failures;
for (const file of walk('app')) {
  const src = readFileSync(file, 'utf8');
  // Comments talk about these on purpose; code must not use them.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const sink of ['dangerouslySetInnerHTML', 'eval(', 'new Function(']) {
    if (code.includes(sink)) fail(`no ${sink}`, `${file} uses it`);
  }
}
if (failures === before2) pass('no dangerouslySetInnerHTML, eval or new Function in app/');

/* ── 3. Secret names never reach the browser ───────────────────────────────
   Skipped when there is no build to look at, rather than passing quietly: a
   check that reports success without having looked is worse than no check. */
const before3 = failures;

/**
 * Every server-only variable, read out of the code rather than listed here.
 *
 * This was nine names typed by hand, and six real secrets were not among them
 * — `POST_SECRET`, `WATCH_SECRET`, `CRON_SECRET`, `MAIL_API_KEY`,
 * `MUSIC_AI_API_KEY` and `SPOTIFY_CLIENT_SECRET`. Not carelessness: each was
 * added in a commit about something else, and updating this list was a
 * separate step nobody was reminded of, which is the same way seventeen checks
 * ended up running nowhere.
 *
 * So it is derived. Every `process.env.X` in `app/` that is not
 * `NEXT_PUBLIC_`-prefixed is server-only by definition, and a server-only name
 * in a client chunk is the leak. The next secret is covered the moment it is
 * read, with nothing to remember.
 */
function serverOnlyNames(): string[] {
  const found = new Set<string>();
  for (const file of walk('app')) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) found.add(m[1]);
    for (const m of src.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g)) found.add(m[1]);
  }
  found.delete('NEXT_PUBLIC_');
  return [...found].filter((one) => !one.startsWith('NEXT_PUBLIC_')).sort();
}
const SECRETS = serverOnlyNames();

if (existsSync('.next/static')) {
  /* And the bundle has to be newer than the code, or this proves nothing.
 
     This check does not build — CI builds before it. Run by hand after an
     edit it reads whatever `.next/static` last happened to contain, and
     reports a pass about code that was never compiled. It fooled me for three
     runs while I concluded the rule was toothless; it was reading yesterday's
     bundle. A stale pass is the failure mode this section's own comment calls
     worse than no check, so it is now a failure rather than a pass. */
  const newest = (dir: string, match: RegExp) =>
    walk(dir, [], match).reduce((at, f) => Math.max(at, statSync(f).mtimeMs), 0);
  if (newest('app', /\.(ts|tsx)$/) > newest('.next/static', /\.js$/)) {
    fail(
      'the bundle was built from this code',
      'app/ has changed since the last `npx next build` — run it, or this reads a stale bundle',
    );
  }
  const bundle = walk('.next/static', [], /\.js$/).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const secret of SECRETS) {
    if (bundle.includes(secret)) fail(`${secret} out of the client bundle`, 'found in .next/static');
  }
  if (failures === before3) pass(`no secret name in the client bundle (${SECRETS.length} checked)`);
} else {
  console.log('  --  client bundle not checked: no .next/static. Run `npm run build` first.');
}

/* ── 4. Service-key routes are scoped to the caller ────────────────────────
   `admin()` bypasses row-level security, so a route holding it and not
   mentioning the caller is a route that can read or write anybody's rows. */
const before4 = failures;
/** Routes that are anonymous by design, and why. */
const ANONYMOUS: Record<string, string> = {
  'app/api/here/route.ts': 'a presence counter — a random visitor id and a timestamp, no personal data',
  'app/api/events/route.ts': 'visit counters, keyed on the same random visitor id',
  'app/api/stats/route.ts': 'reads those counters back as totals',
  /* The queue's worker, which is the one route here that is *meant* to act
     across every account — it is a scheduler, and a scheduler scoped to one
     caller would be a scheduler that only ever runs for whoever poked it.

     What stands in for the caller check is a secret compared in constant time,
     and a route that refuses without one rather than defaulting to open. It is
     the same arrangement as `/api/watch`, which is not on this list only
     because it never touches the database. */
  'app/api/post/route.ts':
    'the posting queue worker — acts for every account by design, guarded by POST_SECRET instead',
  /* The charts on Spotlight. Public by nature — a chart scoped to whoever is
     looking at it is not a chart — and it holds nothing personal because it
     reads only what its makers opted into showing.

     It was written without that clause and this check is what found it:
     plays are counted one per person per song per day, so somebody playing
     their own song once a day for a month reaches the top, and a song they
     never shared would have been published with its title and their name on
     it. The `shared` filter is asserted below rather than trusted, because
     the day it is deleted this line stops being true and nothing else would
     notice. */
  'app/api/charts/route.ts':
    'the public charts — no caller to scope to, and it reads only tracks their maker set shared',
};
for (const file of walk('app/api')) {
  if (!file.endsWith('route.ts')) continue;
  const src = readFileSync(file, 'utf8');
  if (!/\badmin\(\)/.test(src)) continue;
  if (ANONYMOUS[file]) {
    /* Listed here is not a way out of the rule, it is a different rule. A
       route that acts for everybody must either hold nothing personal — the
       three counters above — or be behind a secret. Without this, adding a
       line to the list above is how the next unscoped route gets waved
       through. */
    const counter = /here|events|stats|charts/.test(file);
    /* The charts' whole safety is one clause in one query. Named here so that
       deleting it fails the security check rather than quietly publishing
       songs nobody shared. */
    if (/charts/.test(file) && !/\.eq\('shared', true\)/.test(src)) {
      fail(
        'the public charts read only shared tracks',
        `${file} builds a public chart without filtering on shared`,
      );
    }
    if (!counter && !/SECRET/.test(src)) {
      fail(
        'an anonymous service-key route is behind a secret',
        `${file} is listed as anonymous but checks no secret`,
      );
    }
    continue;
  }
  if (!/caller\.id/.test(src)) {
    fail('service-key route scoped to its caller', `${file} calls admin() and never mentions caller.id`);
  }
}
if (failures === before4) pass('every service-key route is scoped to its caller, or listed as anonymous');

/* ── 5. Interpolated PostgREST filters are shape-checked ───────────────────
   `or()` takes one string and has no parameterised form, so it is built by
   interpolation. Today every value is a UUID we produced, which is safe and is
   safe two lookups away from where it is used. The guard makes it local. */
const before5 = failures;
for (const file of walk('app/api')) {
  const src = readFileSync(file, 'utf8');
  if (!/\.or\(/.test(src)) continue;
  if (!/filterSafe/.test(src)) {
    fail('interpolated .or() is shape-checked', `${file} builds a PostgREST filter without filterSafe`);
  }
}
if (failures === before5) pass('every interpolated PostgREST filter is shape-checked');

/* ── 6. The security headers are still declared ────────────────────────────
   Not that they are served — that needs a running app, and `audit/` checks it
   there. This catches somebody deleting one from the config. */
const before6 = failures;
const config = existsSync('next.config.mjs') ? readFileSync('next.config.mjs', 'utf8') : '';
for (const header of [
  'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options',
  'Referrer-Policy', 'Permissions-Policy',
]) {
  if (!config.includes(header)) fail(`${header} declared`, 'missing from next.config.mjs');
}
for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'"]) {
  if (!config.includes(directive)) fail(`CSP keeps ${directive}`, 'missing from next.config.mjs');
}
if (failures === before6) pass('every security header and the three load-bearing CSP directives are declared');

/* ── 7. No mailbox reaches the browser ─────────────────────────────────────

   There is one inbox behind this whole app and it belongs to one person.
   Printed on a public page it is scraped within days, and a support mailbox
   drowning in spam misses the message that mattered — which is why contact is
   `/help`, a form that reaches the same inbox with the sender's own address as
   reply-to and no address rendered anywhere.

   That is exactly the kind of decision that quietly un-makes itself. The
   natural way to write an error message is "…or write to us at X", and the
   natural way to write a support page is to put the address at the bottom
   "just in case". Both were there and both came out; this stops them coming
   back.

   Scanned: everything the browser can reach — components, pages, and the
   strings any route hands back. The server may of course hold the address, so
   `lib/server/email.ts` (which sends to it) and the letters (which go *to*
   somebody, not out on a page) are where it is allowed to live. */
const before7 = failures;
const MAILBOX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
/** Where an address is the point, not a leak. */
const MAY_HOLD_IT = new Set([
  'app/lib/server/email.ts',
  /* The supplier's own particulars, which section 43 of ECTA requires to be
     published before a South African buys anything. Server-side, and read from
     the environment rather than written down here — so the address reaches the
     page without reaching the client bundle, which is what this rule was
     actually protecting against. See `app/legal/page.tsx`. */
  'app/lib/server/entity.ts',
]);
for (const file of [...walk('app/api'), ...walk('app/components'), ...walk('app/lib')]) {
  if (MAY_HOLD_IT.has(file)) continue;
  const raw = readFileSync(file, 'utf8');
  // Comments explain this rule and would otherwise trip it, the same way they
  // did in check:afrikaans.
  const src = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  // Example addresses in placeholders are not a leak — they are nobody's.
  const withoutExamples = src
    .split('voorbeeld.co.za').join('')
    .split('example.com').join('')
    .split('example.test').join('');
  const found = MAILBOX.exec(withoutExamples);
  if (found) {
    fail('no mailbox reaches the browser', `${file} contains ${found[0]}`);
  }
  if (/mailto:/.test(src)) {
    fail('no mailto: link is rendered', `${file} builds a mailto: link`);
  }
}
if (failures === before7) pass('no mailbox or mailto: link reaches the browser');

/* ── 8. And the one page the law requires still says who is selling ────────

   Rule 7 above says no address reaches the browser, and for a year that was
   read as "no address anywhere". It is not the same claim, and the difference
   matters: section 43 of the Electronic Communications and Transactions Act
   requires a supplier selling to South Africans to make its name, legal
   status, registration number, physical address and telephone number
   available to a consumer *before* they transact.

   So this rule is not a relaxation of rule 7. It is the other half of it. Rule
   7 keeps an address out of every screen somebody works in; this one refuses
   to let the single page that must carry it quietly disappear — which is
   exactly what would happen the next time somebody tidies up, because from
   inside the codebase it looks like the one file breaking a rule.

   What is checked is the page, the link to it from the footer, and that the
   particulars come from the environment rather than being typed in. */
const before8 = failures;
const LEGAL_PAGE = 'app/legal/page.tsx';
if (!existsSync(LEGAL_PAGE)) {
  fail('the supplier disclosure page exists', `${LEGAL_PAGE} is missing`);
} else {
  const page = readFileSync(LEGAL_PAGE, 'utf8');
  for (const wanted of ['Registered name', 'Registration number', 'Registered address', 'Telephone']) {
    if (!page.includes(wanted)) {
      fail('the disclosure page carries what ECTA asks for', `no "${wanted}" on ${LEGAL_PAGE}`);
    }
  }
  if (!page.includes("from '../lib/server/entity'")) {
    fail('the particulars are read on the server', `${LEGAL_PAGE} does not read lib/server/entity`);
  }
}
const footer = existsSync('app/components/SiteFooter.tsx')
  ? readFileSync('app/components/SiteFooter.tsx', 'utf8')
  : '';
if (!footer.includes('href="/legal"')) {
  fail('the disclosure page is reachable from every page', 'SiteFooter does not link /legal');
}
/* Typed in rather than configured is the failure that matters here: a
   registration number hard-coded into a page is one somebody has invented, or
   one that will be wrong the day the company changes anything. */
const entitySrc = existsSync('app/lib/server/entity.ts')
  ? readFileSync('app/lib/server/entity.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  : '';
if (/\b\d{4}\/\d{6}\/\d{2}\b/.test(entitySrc)) {
  fail('no registration number is hard-coded', 'app/lib/server/entity.ts contains one');
}
if (failures === before8) pass('the supplier disclosure page exists, is linked, and is configured not typed');

console.log(
  failures === 0
    ? '\ncheck:security — every claim in docs/GOING_LIVE.md §1 still holds.'
    : `\n${failures} security claim(s) no longer hold. Fix them, or correct the document.`,
);
process.exit(failures === 0 ? 0 : 1);

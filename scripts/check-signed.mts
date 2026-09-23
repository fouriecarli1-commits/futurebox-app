/**
 * A call to a route that reads the caller carries the caller.
 *
 * ── The bug, twice ───────────────────────────────────────────────────────
 *
 * `callerFrom` reads the `Authorization` header and nothing else — no cookie,
 * no session, no fallback. So a browser call that does not send one has no
 * caller at all, however properly the person is signed in, and a route that
 * charges answers 401 to everybody.
 *
 * It shipped twice in one day. `heardFor` posted the words button unsigned and
 * failed in silence; `PromptCards` posted the talking cards unsigned and had
 * never worked against a real deployment at all. Both had probes. Neither
 * probe could catch it, because a probe stubs the route: it proves the screen
 * sends what it means to send, and cannot prove the real route would take it.
 *
 * Nothing else would have caught it either. A typecheck cannot see a missing
 * header, and the failure needs a deployed app with accounts switched on — the
 * one thing that cannot be run from here.
 *
 * ── Named rather than guessed ────────────────────────────────────────────
 *
 * A route can read a caller on one method and be public on another: the music
 * engine's GET is a capability probe, and an invite link is handed to
 * strangers by definition. Rather than teach this file to read methods, an
 * unsigned call is allowed when it is on the list below with a reason — the
 * same posture `check:security` takes with service-key routes, and for the
 * same purpose: to make each one a decision somebody wrote down instead of an
 * omission nobody noticed.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/** Unsigned on purpose. The key is `file:route`, the value is why. */
const ALLOWED: Record<string, string> = {
  'app/lib/engines.ts:music':
    'a capability probe — "is the music engine switched on", which is true or false for everybody and is answered before anybody has signed in',
  'app/lib/collab.ts:collab/invite':
    'reading an invite link, which is handed to strangers by definition — the whole point is that somebody with no account can see who sent it',
  'app/lib/signal.ts:events':
    'counting what happened, for signed-out visitors as much as signed-in ones — the route takes the caller as optional and writes a null owner when there is none. It stays unsigned for a second reason worth being explicit about: it is a `keepalive` beacon fired as the page is closing, and putting an async token read in front of it trades a number that is always counted for an `owner` column that is only sometimes useful',
  'app/components/Presenter.tsx:presenter':
    'a capability probe — "is the presenter engine switched on", which is the same answer for everybody and is asked before the panel draws anything. The POST below it, which makes a presenter and is charged for, is signed. This entry exists because the GET was never signed and was passing by reading the header of the fetch underneath it; the window that allowed that is fixed below',
};

/* ── Which routes read a caller ─────────────────────────────────────────── */

function routesUnder(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) routesUnder(path, found);
    else if (name === 'route.ts' && readFileSync(path, 'utf8').includes('callerFrom')) {
      found.push(relative(join(ROOT, 'app/api'), dirname(path)).replace(/\\/g, '/'));
    }
  }
  return found;
}

const needs = new Set(routesUnder(join(ROOT, 'app/api')));
ok('there are routes that read a caller', needs.size > 0, `${needs.size}`);

/* ── And every browser call to one of them is signed ────────────────────── */

function sources(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'server') sources(path, found);
    } else if (/\.tsx?$/.test(name)) found.push(path);
  }
  return found;
}

const files = [
  ...sources(join(ROOT, 'app/components')),
  ...sources(join(ROOT, 'app/lib')),
];

let checked = 0;
/** Every file-and-route that really does go out unsigned, for the rule below. */
const unsigned = new Set<string>();
for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  /* Prose blanked, and the offsets kept.
 
     The walk below reads quotes so a bracket inside a url cannot end a call
     early. Prose is full of apostrophes — "the room's own address" — and to
     a quote-reader an apostrophe in a comment opens a string that never
     closes, which swallows the rest of the file. The first version of this
     did exactly that and reported a properly signed call as unsigned.
 
     Replaced with spaces rather than removed, so every index still points
     where it did and the reported file positions stay true. */
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, (had) => had.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before + ' '.repeat(had.length - before.length));
  const where = relative(ROOT, file).replace(/\\/g, '/');
  for (const call of source.matchAll(/fetch\(\s*[`'"]\/api\/([a-z/]+)/g)) {
    const route = call[1].replace(/\/$/, '');
    if (!needs.has(route)) continue;
    checked += 1;
    /* ── This call's own arguments, not the next four hundred characters ──
 
       It was a fixed window of 400 characters, described as an honest
       heuristic. It was honest about being a window and not about what the
       window contained: a `fetch('/api/presenter')` with no options at all
       passed for months because the NEXT fetch, a few lines below it,
       carried an Authorization header. The unsigned call was reading its
       neighbour's.
 
       Found on 23 September 2026 by a comment. Fourteen lines of prose were
       inserted between the two calls for an unrelated fix, the header slid
       out of the window, and the check finally said what had been true all
       along. A rule that a comment can change the answer of is a rule about
       the file's layout.
 
       So: walk from the opening paren to its match, and read only what is
       actually inside it. Strings are skipped, because a url with a bracket
       in it would otherwise end the call early. */
    const from = source.indexOf('(', call.index);
    let depth = 0;
    let end = from;
    let quote = '';
    for (let at = from; at < source.length && at < from + 4000; at += 1) {
      const ch = source[at];
      if (quote) {
        if (ch === '\\') at += 1;
        else if (ch === quote) quote = '';
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) { end = at; break; }
      }
    }
    const args = source.slice(from, end + 1);
    /* Signed here, or signed by whatever this call is handed.
 
       The rule used to be `Authorization in the args, OR the word "headers"
       anywhere near`. The second half is what let an unsigned call pass by
       carrying a Content-Type and nothing else.
 
       Taking it out entirely was wrong too, and the app said so in three
       different voices at once:
 
         fetch(url, { headers })                  — one object, several calls
         fetch(url, { headers: await headers() }) — a helper on the component
         fetch(url, { ...(await authed()) })      — a helper in a library
 
       All three are signed, all three are tidier than repeating the header,
       and none of them says the word in the call. So a name used in a header
       position is followed to where it is made, and it counts only if THAT
       carries an Authorization. A helper that carries nothing does not, which
       is the whole of what the old rule was missing.
 
       Still a heuristic, and still in this file rather than a parser — but
       one whose failure is a false ALARM rather than a false pass, which is
       the direction a rule about signing should fail in. */
    const named = new Set<string>();
    for (const found of args.matchAll(
      /headers:\s*(?:await\s+)?([A-Za-z_$][\w$]*)|[,{]\s*(headers)\s*[,}]|\.\.\.\(\s*(?:await\s+)?([A-Za-z_$][\w$]*)\s*\(/g,
    )) {
      const who = found[1] ?? found[2] ?? found[3];
      if (who) named.add(who);
    }
    const built = [...named].some((who) =>
      new RegExp(
        `(?:const|let|var|function|async function)\\s+${who}\\b[\\s\\S]{0,500}?[Aa]uthorization`,
      ).test(source));
    const signed = /[Aa]uthorization/.test(args) || built;
    const key = `${where}:${route}`;
    if (!signed) unsigned.add(key);
    ok(
      `${where} → /api/${route}`,
      signed || Boolean(ALLOWED[key]),
      'sends no Authorization header, and is not on the allowed list with a reason',
    );
  }
}

ok('every call was looked at', checked > 0, `${checked}`);

/* And nothing is excused that no longer needs excusing.
 
   Asked of what the scan actually found, not of whether the file mentions the
   route anywhere. The weaker version passed for `Presenter.tsx:presenter`
   while the unsigned GET it excuses was deleted, because the file still holds
   a SIGNED post to the same route further down — so the list would have gone
   on carrying a reason for a call that no longer exists, which is how a list
   like this stops meaning anything. */
for (const key of Object.keys(ALLOWED)) {
  ok(
    `the exemption for ${key} is still about a real unsigned call`,
    unsigned.has(key),
    'that call is signed now, or gone — take the line out',
  );
}

if (failures) {
  console.error(`\ncheck:signed — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(`\ncheck:signed — all ${checked} calls to a route that reads its caller carry one.`);

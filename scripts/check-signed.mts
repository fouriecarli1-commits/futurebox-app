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
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const where = relative(ROOT, file).replace(/\\/g, '/');
  for (const call of source.matchAll(/fetch\(\s*[`'"]\/api\/([a-z/]+)/g)) {
    const route = call[1].replace(/\/$/, '');
    if (!needs.has(route)) continue;
    checked += 1;
    /* The options object, which is what carries the header. Bounded rather
       than parsed: every call in this codebase puts its headers within a few
       lines of the url, and a window is honest about being a heuristic where a
       parser would pretend not to be. */
    const window = source.slice(call.index, (call.index ?? 0) + 400);
    const signed = /[Aa]uthorization/.test(window) || /headers/.test(window);
    const excused = ALLOWED[`${where}:${route}`];
    ok(
      `${where} → /api/${route}`,
      signed || Boolean(excused),
      'sends no Authorization header, and is not on the allowed list with a reason',
    );
  }
}

ok('every call was looked at', checked > 0, `${checked}`);

/* And nothing is excused that no longer needs excusing. A stale exemption is
   how a list like this stops meaning anything. */
for (const key of Object.keys(ALLOWED)) {
  const [file, route] = key.split(':');
  const source = readFileSync(join(ROOT, file), 'utf8');
  ok(
    `the exemption for ${key} is still about a real call`,
    source.includes(`/api/${route}`),
    'remove it',
  );
}

if (failures) {
  console.error(`\ncheck:signed — ${failures} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(`\ncheck:signed — all ${checked} calls to a route that reads its caller carry one.`);

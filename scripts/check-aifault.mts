/**
 * No route may put a supplier's own error on a member's screen.
 *
 * ── The one that shipped ─────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, a photograph of Make a song. Where four written
 * ideas belong, the room had printed a raw Anthropic 400 — the billing
 * sentence, the JSON around it, and our own request_id — in English, in an
 * Afrikaans room, telling her to go and buy credits on an account she has no
 * login for.
 *
 * One line did it, in one route out of eleven:
 *
 *     detail: `${error.status}: ${error.message}`
 *
 * The other ten were fine. That is exactly the problem: ten hand-written
 * catches that happen to be careful, and nothing at all stopping the eleventh
 * from being written the same way next week.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 * Two rules, both about the same thing from different sides:
 *
 *   1. A route that imports the Anthropic SDK must hand its failures to
 *      `aiFault`, not sort them out itself. `Anthropic.APIError` and friends
 *      appear in exactly one file, `app/lib/server/aifault.ts`.
 *   2. Nothing in `app/api` may interpolate an error's own `.message` into a
 *      response body. Supabase errors leak the same way — a message there can
 *      name a table, a column or a constraint.
 *
 * Rule 2 has known exceptions and they are named below rather than pattern-
 * matched, so adding one is a decision somebody writes down.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (path.endsWith('.ts')) out.push(path);
  }
  return out;
}

const routes = walk('app/api');

/* ── Rule 1: one place sorts out a model failure ───────────────────────── */

const MAPPER = 'app/lib/server/aifault.ts';
const sortingItOut: string[] = [];
const notUsingIt: string[] = [];

for (const path of routes) {
  const src = readFileSync(path, 'utf8');
  if (/Anthropic\.(APIError|BadRequestError|AuthenticationError|RateLimitError|NotFoundError|PermissionDeniedError)/.test(src)) {
    sortingItOut.push(path);
  }
  if (/from '@anthropic-ai\/sdk'/.test(src) && !/from '@\/app\/lib\/server\/aifault'/.test(src)) {
    notUsingIt.push(path);
  }
}

ok('every model failure goes through one mapper', sortingItOut.length === 0, sortingItOut.join(', '));
ok('every route that calls the model imports it', notUsingIt.length === 0, notUsingIt.join(', '));
ok('and the mapper is there to import', readFileSync(MAPPER, 'utf8').includes('export function aiFault'));

/* ── Rule 2: an error's own words never reach a body ───────────────────── */

/**
 * Where a supplier's message is deliberately passed on, and why.
 *
 * Each of these is a message a member cannot see or one they need. Adding to
 * this list is fine; doing it silently is not, which is why the reason sits
 * beside the file rather than in a commit message.
 */
const ALLOWED: Record<string, string> = {
  'app/api/eleven/prices/route.ts': 'owner-only page; the message names the .sql file to run',
  'app/api/creator/route.ts': 'a duplicate-handle error, already reworded before it is sent',
  'app/api/afrikaans/route.ts': 'owner-only report on whether a migration ran',
};

const leaking: string[] = [];
for (const path of routes) {
  if (ALLOWED[path]) continue;
  const src = readFileSync(path, 'utf8');
  for (const [index, line] of src.split('\n').entries()) {
    if (!/Response\.json|\bmessage:|\bdetail:/.test(line)) continue;
    if (/\b(error|err|problem|fault)\.message\b/.test(line)) leaking.push(`${path}:${index + 1}`);
  }
}
ok("no route sends a thrown error's own words", leaking.length === 0, leaking.join(', '));

/* ── The check can fail, shown rather than claimed ─────────────────────── */

const SAMPLE = "    return Response.json({ error: 'api_error', detail: `${error.status}: ${error.message}` }, { status: 502 });";
ok(
  '  and it recognises the line that shipped',
  /\b(error|err|problem|fault)\.message\b/.test(SAMPLE) && /Response\.json/.test(SAMPLE),
  'the exact line from songwriter/route.ts must match the rule that now forbids it',
);

/* And the sentence a member reads for an empty account must exist in both
   languages — the whole point of giving it its own code rather than letting
   it come out as "that request could not be read". */
const said = readFileSync('app/lib/apierror.ts', 'utf8');
ok('an empty model account has its own words, in both languages', /no_credit:\s*\{\s*\n\s*en:/.test(said) && said.includes("af: 'Die skryfhulp"));

if (failures) {
  console.error(
    '\ncheck:aifault — a supplier error on a member’s screen is three faults at once: it is'
    + ' in the wrong language, it names an account that is not theirs, and it carries our request id.\n',
  );
  process.exit(1);
}
console.log('\ncheck:aifault — every model failure is answered in our own words, in the reader’s language.');

/**
 * The fixed part of a prompt is sent once, and we know whether it worked.
 *
 * ── Why this check exists ────────────────────────────────────────────────
 *
 * Prompt caching fails silently in three different ways, and all three look
 * exactly like success from the outside:
 *
 *   1. The prompt is under the model's floor — 512 tokens here — so no cache
 *      entry is ever created. No error. No warning.
 *   2. A single byte of the prefix changes between calls, so every call
 *      writes a fresh entry and reads none. A name, a date, a count.
 *   3. Nobody put the marker on at all.
 *
 * None of those shows on a screen, in a test, or in a typecheck. They show on
 * the bill, a month later, as a number nobody can explain.
 *
 * So the rules below are about keeping the prefix stable, and the log line in
 * `aicache.ts` is about proving it worked. Neither substitutes for the other:
 * this check cannot tell you the cache hit, and the log cannot tell you the
 * prompt is about to stop being stable.
 *
 * ── What is checked ──────────────────────────────────────────────────────
 *
 *   · Every route that calls the model marks its system prompt cached, and
 *     does it through `cachedSystem` rather than by hand.
 *   · Every one of them reads the result back with `notecache`. A cache
 *     nobody measures is a cache nobody can claim a saving from.
 *   · The system prompt is a module-level constant, never built inside the
 *     handler out of anything per-request. This is rule 2 above, and it is
 *     the one that would be introduced by accident.
 *   · The named list below records which prompts are big enough to cache at
 *     all, so nobody reads "caching is on" as "caching is happening".
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

const model = walk('app/api').filter((path) => /from '@anthropic-ai\/sdk'/.test(readFileSync(path, 'utf8')));

ok('there are model routes to check', model.length > 0, 'nothing matched app/api');

/* ── The marker, the measurement, and one place that writes both ───────── */

const unmarked: string[] = [];
const unmeasured: string[] = [];
const byHand: string[] = [];

for (const path of model) {
  const src = readFileSync(path, 'utf8');
  if (!/system:\s*cachedSystem\(/.test(src)) unmarked.push(path);
  if (!/notecache\(/.test(src)) unmeasured.push(path);
  if (/cache_control/.test(src)) byHand.push(path);
}

ok('every model route caches its system prompt', unmarked.length === 0, unmarked.join(', '));
ok('every model route reads back what the cache did', unmeasured.length === 0, unmeasured.join(', '));
ok('and none of them writes the marker by hand', byHand.length === 0, byHand.join(', '));

/* ── The prefix must not be built per request ──────────────────────────── */

/**
 * A system prompt assembled inside the handler out of the request is the
 * silent killer: it typechecks, it reads correctly, it answers correctly, and
 * it never caches. Caught by requiring the argument to `cachedSystem` to be a
 * bare identifier or a call taking only the body — never a template literal
 * and never string concatenation at the call site.
 */
const built: string[] = [];
for (const path of model) {
  const src = readFileSync(path, 'utf8');
  for (const [index, line] of src.split('\n').entries()) {
    const at = line.indexOf('cachedSystem(');
    if (at === -1 || line.trimStart().startsWith('*')) continue;
    const arg = line.slice(at + 'cachedSystem('.length).replace(/\),?\s*$/, '').trim();
    if (!/^[A-Za-z_$][\w$]*(\(body\))?$/.test(arg)) built.push(`${path}:${index + 1} — ${arg}`);
  }
}
ok('no system prompt is assembled at the call site', built.length === 0, built.join('; '));

/* ── Which prompts are actually big enough ─────────────────────────────── */

/**
 * The floor is 512 tokens on this model, and a shorter prompt caches nothing
 * while looking identical. Measured in characters, because there is no way to
 * count this model's tokens without calling it; the ratio is deliberately
 * pessimistic (4.5 characters per token rather than the usual ~4) so this
 * list under-promises rather than over-promises.
 *
 * Being under the floor is NOT a failure. The marker is harmless there and
 * becomes live the day the prompt grows. What would be a failure is writing
 * down a saving for a route in the bottom half of this list.
 */
const FLOOR_CHARS = 512 * 4.5;

const sizes: Array<{ readonly route: string; readonly chars: number }> = [];
for (const path of model) {
  const src = readFileSync(path, 'utf8');
  const at = src.indexOf('\nconst SYSTEM');
  if (at === -1) continue;
  const rest = src.slice(at);
  const ends = [/\]\s*\.join\([^)]*\);/.exec(rest), /^`;/m.exec(rest)]
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m.index + m[0].length);
  const body = rest.slice(0, Math.min(...ends, rest.length));
  const parts = [...body.matchAll(/'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)];
  sizes.push({ route: path.split('/')[2], chars: parts.reduce((sum, m) => sum + (m[1] ?? m[2] ?? '').length, 0) });
}

const over = sizes.filter((one) => one.chars >= FLOOR_CHARS).map((one) => one.route);
const under = sizes.filter((one) => one.chars < FLOOR_CHARS).map((one) => one.route);
ok(`${over.length} of ${sizes.length} prompts clear the floor on their own text`, sizes.length > 0);
console.log(`        caching: ${over.join(', ') || 'none'}`);
console.log(`        too short to cache today: ${under.join(', ') || 'none'} (harmless; the marker waits)`);

/* ── The check can fail, shown rather than claimed ─────────────────────── */

const SAMPLE = '      system: cachedSystem(`You are a helper for ${body.name}.`),';
const at = SAMPLE.indexOf('cachedSystem(');
const arg = SAMPLE.slice(at + 'cachedSystem('.length).replace(/\),?\s*$/, '').trim();
ok(
  '  and it catches a prompt built out of the request',
  !/^[A-Za-z_$][\w$]*(\(body\))?$/.test(arg),
  'a template literal at the call site must not pass',
);

if (failures) {
  console.error(
    '\ncheck:caching — a cache that never hits is indistinguishable from one that always does,'
    + ' except on the bill a month later.\n',
  );
  process.exit(1);
}
console.log('\ncheck:caching — every model route caches its fixed prompt, and says what the cache did.');

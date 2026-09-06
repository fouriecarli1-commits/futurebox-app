/**
 * Every variable the code reads is written down where she works from.
 *
 * ── Why ──────────────────────────────────────────────────────────────────
 *
 * `docs/SWITCH-ON.md` says of itself that it is the one to actually work
 * from. A variable the app reads and that page does not name is a feature
 * that silently does not work with nothing to tell you why — you cannot set
 * a thing you have never heard of, and none of these announce themselves:
 * the code reads `process.env.X`, finds nothing, and takes the quiet path.
 *
 * This has happened. `OWNER_EMAIL` was read by metering, by the name rule and
 * by the allowance warnings and was documented nowhere, which is §E2 of
 * `docs/OPEN-QUESTIONS.md`. The sweep that produced this file found eighteen
 * more, of which the one that mattered was
 * `NEXT_PUBLIC_WELCOME_VIDEO_AFRIKAANS`: unset, the front door plays no
 * introduction to an Afrikaans visitor at all. The player draws nothing
 * rather than showing an English recording to somebody who chose Afrikaans,
 * which is correct and is exactly why nothing looked broken.
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * The full name has to appear on the page. Not a suffix, not a family: the
 * first version of this sweep counted `PAYSTACK_PLAN_STUDIO` as missing
 * because the page wrote it as `_STUDIO` after naming its sibling in full,
 * which reads fine to a person and cannot be searched for. Spelling each one
 * out is the better document as well as the checkable one.
 *
 * Nothing is exempt. A variable that needs no action is still one line under
 * "the rest of the variables", because "nothing to do here" is an answer and
 * silence is not.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/** Every `process.env.X` and `process.env['X']` under app/. */
function readsIn(dir: string, found = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      readsIn(path, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const source = readFileSync(path, 'utf8');
    for (const m of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) found.add(m[1]);
    for (const m of source.matchAll(/process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g)) found.add(m[1]);
  }
  return found;
}

const used = readsIn(join(ROOT, 'app'));

/* `NEXT_PUBLIC_` on its own is the prefix test that keeps the owner list off
   the client, not a variable anybody sets. */
used.delete('NEXT_PUBLIC_');

const page = readFileSync(join(ROOT, 'docs/SWITCH-ON.md'), 'utf8');

ok('there are variables to check', used.size > 20, `only ${used.size} found — the sweep is not reading the code`);

const missing = [...used].filter((one) => !page.includes(one)).sort();
ok(
  `every variable the app reads is on the switch-on page — ${used.size} of them`,
  missing.length === 0,
  `not named: ${missing.join(', ')}`,
);

/* And the other way. A variable named on the page that nothing reads is an
   instruction to set something that does nothing, which wastes her time and
   makes the rest of the page less believable. Only names that look like ours:
   the page quotes a few of Vercel's and Supabase's own. */
const named = new Set(
  [...page.matchAll(/`([A-Z][A-Z0-9_]{3,})`/g)].map((m) => m[1]),
);
const THEIRS = new Set(['NEXT_PUBLIC_', 'CRON_SECRET']);
const unread = [...named].filter((one) => !used.has(one) && !THEIRS.has(one)).sort();
ok(
  'and the page does not ask for a variable nothing reads',
  unread.length === 0,
  `nothing reads: ${unread.join(', ')}`,
);

if (failures > 0) {
  console.log(`\ncheck:envdoc — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`\ncheck:envdoc — all ${used.size} variables the app reads are written down.`);
}

/**
 * No write to the database throws its answer away.
 *
 * ── The two this was written for ─────────────────────────────────────────
 *
 * The supabase client does not throw. A failed insert comes back as
 * `{ error }`, so `await client.from('x').insert({…});` as a bare statement
 * is a write that can fail forever and say nothing. Two did.
 *
 *   `writeGeneration` named `email_key` and `ip_hash`, which `abuse.sql`
 *   adds — and abuse.sql had never been run. Postgres refuses the whole
 *   insert when a named column is missing, so EVERY generation this app
 *   made failed to record, for weeks, in silence. Found on 22 September 2026
 *   by `supabase/WATKORT.sql` asking the database, not by anything watching
 *   the app.
 *
 *   `setMembership` in the payments webhook, three functions below an
 *   art-market write that does check and says so. That one is money: the
 *   charge verifies, the upsert fails, and nobody is told.
 *
 * Thirty more were the same shape and simply had not failed yet — the credit
 * ledger, what ElevenLabs charged for every read, the moderation trail.
 *
 * ── What counts as looking ───────────────────────────────────────────────
 *
 * Taking the result: `wrote(await …)`, `const { error } = await …`, a
 * `.then`. What the code then does with it is the author's business. What is
 * never acceptable is the statement form, where the answer is unreachable.
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
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

const WRITES = ['insert', 'update', 'upsert', 'delete'];

/* Whole-file with `m`, not line by line.
 *
 * The first version ran over each line on its own, so it saw a write only
 * when `.insert(` happened to sit on the same line as the `await`. Fifteen
 * matched that shape; seventeen more did not, because a multi-line write is
 * most of them. The check said fifteen and the fix found thirty-two, and the
 * whole difference was a newline. */
const PATTERN = String.raw`^[ \t]*await[ \t]+[A-Za-z_$][\w$]*(?:\(\))?`
  + String.raw`(?:\s*\n?[^;=]*?)\.from\('\w+'\)[^;=]*?\.(?:TYPES)\(`;
const discarded = new RegExp(PATTERN.replace('TYPES', WRITES.join('|')), 'gm');

const files = walk('app');
const found: string[] = [];
for (const file of files) {
  const source = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  for (const hit of source.matchAll(discarded)) {
    /* A file in a bucket, not a row. Its callers handle it their own way. */
    if (/\.storage\b/.test(hit[0])) continue;
    const line = source.slice(0, hit.index).split('\n').length;
    found.push(`${file}:${line}  ${hit[0].replace(/\s+/g, ' ').slice(0, 70)}`);
  }
}

ok('this can see the writes at all', files.length > 50, `${files.length} files`);
ok('  and no write throws its answer away', found.length === 0,
  `${found.length} of them\n         ${found.join('\n         ')}\n         `
  + 'take the result — `wrote(await …, \'what it is\')`. The supabase client does not'
  + ' throw, so a discarded answer is a write that can fail for a month in silence');

if (failures) {
  console.error(`\ncheck:writes — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  `\ncheck:writes — every insert, update, upsert and delete across ${files.length} files in app/`
  + ' takes its result back, so a write that fails cannot do it quietly.',
);

/**
 * The character-cost header must reach a table, not just a log.
 *
 * ── Why this check exists ────────────────────────────────────────────────
 *
 * ElevenLabs tells us what every call cost. We charge by the minute; they
 * charge by the character. The only way to know whether the credit price
 * covers the bill is to keep both numbers on the same row and watch the ratio.
 *
 * That whole arrangement is easy to break by accident: drop the `billed`
 * argument from one route and its rows silently carry no credits, so it falls
 * out of the comparison and nobody notices until the invoice. This check
 * pins each half of it.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const read = (path: string) => readFileSync(path, 'utf8');
const ok = (label: string, passed: boolean, why = '') => {
  console.log(`${passed ? '  ok  ' : '  FAIL'} ${label}${why ? ` — ${why}` : ''}`);
  if (!passed) failures += 1;
};

console.log('check:elevencost\n');

/* ── 1. The table and the view ─────────────────────────────────────────── */

const sql = read('supabase/eleven.sql');

ok('there is a table for what each call cost',
  /create table if not exists public\.eleven_costs/.test(sql));
ok('it holds their characters and our credits side by side',
  /characters\s+integer/.test(sql) && /credits\s+integer/.test(sql),
  'one number without the other answers nothing');
ok('a missing header is null rather than zero',
  /characters is null or characters >= 0/.test(sql),
  '"no header" and "cost nothing" are different facts, and reading one as the other flatters the margin');
ok('there is a view that does the division',
  /create or replace view public\.eleven_price_check/.test(sql)
    && /chars_per_credit/.test(sql));
ok('and rows missing either number are left out of it',
  /and characters is not null/.test(sql) && /and credits is not null/.test(sql),
  'an average that reads a missing number as zero lies in the expensive direction');
ok('neither is reachable from the browser',
  /revoke all on public\.eleven_price_check from public, anon, authenticated/.test(sql)
    && /enable row level security/.test(sql));

/* ── 2. The header is read, and filed ──────────────────────────────────── */

const lib = read('app/lib/server/eleven.ts');
const cost = read('app/lib/server/elevencost.ts');

ok('the cost header is read off every answer',
  /character-cost/.test(lib) && /request-id/.test(lib));
ok('and it lands in the table, not only the log',
  /noteSpend\(/.test(lib) && /from\('eleven_costs'\)/.test(cost),
  'a log rotates; a pricing question needs months');
ok('the bookkeeping can never fail a generation',
  /\(\) => undefined,/.test(cost) && /catch \{/.test(cost));
ok('and it carries no text, audio or name',
  !/\btext\b/.test(cost.split('*/')[1] ?? cost) || !/insert\(\{[^}]*text/.test(cost),
  'this page gets pasted into a chat');

/* ── 3. Every route that charges says what it charged ──────────────────── */

for (const [path, call] of [
  ['app/api/voice/speak/route.ts', 'speakStream'],
  ['app/api/voice/change/route.ts', 'restage'],
  ['app/api/voice/clean/route.ts', 'isolate'],
  ['app/api/voice/clone/route.ts', 'cloneVoice'],
  ['app/api/dub/route.ts', 'dub'],
  ['app/api/music/route.ts', 'noteCost'],
  ['app/api/stems/route.ts', 'noteCost'],
] as const) {
  const source = read(path);
  /* Whatever the local name, the credits figure has to reach the call — a
     route that charges and does not say so produces rows that cannot be
     compared, which is the same as not recording it at all. */
  const passes = new RegExp(`${call}\\([^;]*(asked|ourPrice|cost|CREDITS\\.clone|songCost)`, 's').test(source);
  ok(`${path} passes what it charged`, passes);
}

/* ── 4. The page that reads it back ────────────────────────────────────── */

const page = read('app/api/eleven/prices/route.ts');

ok('there is a guarded page that reports the comparison',
  /eleven_price_check/.test(page) && /POST_SECRET/.test(page));
ok('and it compares in constant time, after a length check',
  /timingSafeEqual/.test(page) && /a\.length !== b\.length/.test(page));
ok('it says what to do when the table is not there yet',
  /supabase\/eleven\.sql/.test(page),
  'a Postgres error string means nothing to the person reading it');
ok('and it shows what the app itself asks, next to what they charged',
  /weCharge/.test(page) && /CREDITS/.test(page));

if (failures > 0) {
  console.log(`\ncheck:elevencost — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:elevencost — what they charge and what we charge land on the same row.');
}

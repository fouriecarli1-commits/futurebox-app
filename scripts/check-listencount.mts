/**
 * The listen count: whose numbers, and how many of them.
 *
 * "En as ons top liedjies uitwys uit ons eie engine, track dit dan die
 *  hoeveelheid listens per liedjie?"
 *
 * It does now, and two properties of it are worth more than the feature.
 *
 * ── One person is not forty people ───────────────────────────────────────
 *
 * `events` carries a unique index over (kind, visitor, ref, day). That index
 * is what makes the chart honest — it is why somebody cannot press their own
 * song to the top — and it is also what threw the repeats away, so "played 47
 * times" had nowhere to come from. The fix was a counter on the row that
 * already existed, which means **both numbers exist and both are shown**:
 * `listens` is the sum of the counters, `listeners` is the number of rows.
 *
 * Showing only the first would make a song one person played forty times look
 * like a song forty people heard. That is the exact lie the index exists to
 * prevent, reintroduced one layer up, and it is the kind of number that ends
 * up in a pitch deck.
 *
 * ── Her songs, and nobody else's ─────────────────────────────────────────
 *
 * `listens_for` takes an owner and joins `tracks` on it. Lose that join and
 * the route hands any signed-in caller everybody's numbers. The function is
 * `security definer`, so it runs past row-level security by design — the join
 * *is* the access control, and it is one word long.
 *
 * None of this was checked. The SQL appeared in the bundler and nowhere else.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const sql = readFileSync(join(ROOT, 'supabase/listens.sql'), 'utf8');
const route = readFileSync(join(ROOT, 'app/api/listens/route.ts'), 'utf8');
const card = readFileSync(join(ROOT, 'app/components/Channel.tsx'), 'utf8');

/* ── A repeat play is counted, not discarded ───────────────────────────── */

ok(
  'a play the index has seen before increments rather than being thrown away',
  /on conflict[\s\S]{0,120}do update set\s+times\s*=\s*public\.events\.times\s*\+\s*1/i.test(sql),
  'the repeat is dropped again, and "played 47 times" has nowhere to come from',
);

ok(
  'and the conflict is still once per person per song per day',
  /on conflict\s*\(\s*kind\s*,\s*visitor\s*,\s*coalesce\(ref,\s*''\)\s*,\s*day\s*\)/i.test(sql),
  'a different conflict target changes who can push a song up the chart',
);

/* ── Both numbers, never one ───────────────────────────────────────────── */

ok(
  'the times are summed into listens',
  /sum\(e\.times\)[\s\S]{0,40}as\s+listens/i.test(sql),
  'the raw number is gone',
);
ok(
  'and the rows are counted into listeners',
  /count\(\*\)[\s\S]{0,40}as\s+listeners/i.test(sql),
  'how many people is gone, which is the number the chart is built on',
);

/*
 * And on the card. Matched on the two together: the failure worth catching is
 * not "the number is missing" but "one of the two is", which reads perfectly
 * well and says something untrue.
 */
ok(
  'the card prints both, in one line, or neither',
  /listens\}[\s\S]{0,200}\{listeners\}/.test(card) ||
    /\{listens\}[\s\S]{0,200}\{listeners\}/.test(card),
  'one number on its own makes forty plays by one person look like forty people',
);

/* ── Her songs, and nobody else's ──────────────────────────────────────── */

ok(
  'listens_for is scoped to the owner it was given',
  /join\s+public\.tracks\s+t\s+on\s+t\.id\s*=\s*e\.ref[\s\S]{0,300}t\.owner\s*=\s*want_owner/i.test(sql),
  'without the join every signed-in caller can read everybody’s numbers',
);

ok(
  'and the route gives it the caller’s own id, not something from the request',
  /want_owner:\s*caller\.id/.test(route) &&
    !/want_owner:\s*(said|body|form|url|request|params|searchParams)/.test(route),
  'an owner taken from the request is an owner the caller chooses',
);

/* Both functions run past row-level security, so who may call them is the
   only thing standing between a browser and everybody's rows. */
for (const fn of ['note_event', 'listens_for']) {
  ok(
    `${fn} cannot be called by a signed-in browser`,
    new RegExp(`revoke all on function public\\.${fn}[^;]*from public, anon, authenticated`, 'i').test(sql),
    'a security definer function reachable from a browser is the row-level rules undone',
  );
  ok(
    `and ${fn} is granted only to the service role`,
    new RegExp(`grant execute on function public\\.${fn}[^;]*to service_role`, 'i').test(sql),
  );
}

if (failures > 0) {
  console.log(`\ncheck:listencount — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:listencount — both numbers, her songs only, and no browser may ask.');
}

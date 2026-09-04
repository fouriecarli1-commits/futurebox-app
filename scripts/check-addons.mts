/**
 * A paywall that only exists on the screen is not a paywall.
 *
 * ── The three ways this feature can be wrong ─────────────────────────────
 *
 * 1. The room hides what is not paid for and the route serves it anyway. The
 *    expensive endpoint is one `fetch` away from anybody who opens a console,
 *    and `/api/plan` spends real money per call.
 * 2. The price on the button and the price charged drift apart, or the request
 *    gets to name either one.
 * 3. A renewal is credited to the wrong thing. This one is the quiet one: a
 *    renewal carries none of our metadata, and the branch that handles it read
 *    "no metadata" as "a membership renewed" — so an R199 marketing month
 *    would have renewed somebody's Studio plan instead, every month, and the
 *    only symptom would be a membership nobody remembers paying for.
 *
 * None of the three shows up in a type check or on a screen, so they are
 * asserted here against the source itself.
 */
import { readFileSync } from 'node:fs';

let bad = 0;
const check = (label: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? '  ok ' : '  ✗  '} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) bad += 1;
};

const read = (path: string) => readFileSync(path, 'utf8');

/* ── 1. Every gated route asks the server, not the page ─────────────────── */

const GATED = ['app/api/plan/route.ts', 'app/api/schedule/route.ts'];
for (const path of GATED) {
  const source = read(path);
  check(`${path} asks hasAddon`, /hasAddon\(/.test(source),
    'the lock is only on the screen, which is not a lock');
  check(`${path} asks with the caller's own id`,
    /hasAddon\(\s*caller\.id/.test(source),
    'gated on something other than who is calling');
  check(`${path} refuses with 402 rather than 403 or 200`,
    /status:\s*402/.test(source),
    'a paywall answers "payment required"; the screen tells them apart by it');
}

/* The queue's read and cancel must NOT be gated. Somebody whose month has
   lapsed has to be able to see what they planned and take it out again;
   locking them out of their own queue is using it against them. */
{
  const source = read('app/api/schedule/route.ts');
  const posts = source.slice(source.indexOf('export async function POST'), source.indexOf('export async function GET'));
  const rest = source.slice(source.indexOf('export async function GET'));
  check('only putting something in the queue is behind the lock',
    /hasAddon\(/.test(posts) && !/hasAddon\(/.test(rest),
    'reading or cancelling is gated too, which locks a lapsed member out of their own queue');
}

/* ── 2. The price is ours, never the request's ──────────────────────────── */

{
  const source = read('app/api/checkout/route.ts');
  check('the checkout prices an add-on from our own table',
    /addonById\(want\.addon\)/.test(source),
    'the price is coming from somewhere the request can influence');
  check('and nothing reads a price, amount or rand off the body',
    !/body\.(rand|amount|price|cents)/.test(source),
    'a page that can name its own price eventually will');
}
{
  const source = read('app/lib/addons.ts');
  const prices = [...source.matchAll(/rand:\s*(\d+)/g)].map((m) => Number(m[1]));
  check('every add-on has a price above zero', prices.length > 0 && prices.every((one) => one > 0),
    JSON.stringify(prices));
  check('and a month that is a month', /days:\s*3[01]\b/.test(source));
}
{
  /* The screen must not carry a second copy of the number. It reads what the
     server said and falls back to the catalogue — a hard-coded R199 in the
     markup is how the button and the charge drift apart. */
  const source = read('app/components/AddOn.tsx');
  check('the sales screen reads the price rather than printing one',
    /priceOf\(/.test(source) && !/R\s?199/.test(source.replace(/priceOf\([^)]*\)/g, '')),
    'a price is typed into the sales screen');
}

/* ── 3. A renewal goes to the thing that renewed ────────────────────────── */

{
  const source = read('app/api/payments/webhook/route.ts');
  check('the webhook reads the plan code off a renewal', /addonOfPlan\(/.test(source),
    'every add-on renewal would be recorded as a membership renewal');

  const branch = source.indexOf('if (!owner) {');
  const addonAt = source.indexOf('addonOfPlan(', branch);
  const membershipAt = source.indexOf('setMembership(', branch);
  check('and checks it before assuming a membership renewed',
    branch > -1 && addonAt > -1 && membershipAt > -1 && addonAt < membershipAt,
    'the membership path runs first, so an add-on renewal upgrades a plan');

  check('a first add-on charge writes down whose customer code it is',
    /rememberAddonPayer\(/.test(source),
    'the renewal a month later has nowhere to go');
  check('how long a month lasts is read from our table, not from the charge',
    /addonById\(meta\.addon\)/.test(source) && !/meta\.days/.test(source),
    'a tampered checkout could buy a year');
}

/* ── The migration says what the code assumes ───────────────────────────── */

{
  const sql = read('supabase/addons.sql');
  check('addons.sql enables row level security on every table it makes',
    (sql.match(/create table if not exists/g) ?? []).length ===
      (sql.match(/enable row level security/g) ?? []).length,
    'a table without RLS is readable by every signed-in account');
  check('a repeated charge cannot be counted twice',
    /addon_grants/.test(sql) && /on conflict \(reference\) do nothing/.test(sql),
    'a retried webhook hands out a second month for one payment');
  check('time is extended from the later of now and the current end',
    /greatest\(public\.addons\.until,\s*now\(\)\)/.test(sql),
    'buying early throws away the rest of the month, or buying late back-dates it');
  check('grant_addon is not callable by a signed-in browser',
    /revoke all on function public\.grant_addon/.test(sql),
    'anybody with an account could grant themselves the add-on');
}

if (bad) {
  console.error(`\ncheck:addons — ${bad} wrong.`);
  process.exit(1);
}
console.log('check:addons — the lock is on the server, the price is ours, and a renewal knows what it renewed.');

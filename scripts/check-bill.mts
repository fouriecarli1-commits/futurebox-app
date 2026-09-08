/**
 * The invoice reader, exercised — because it cannot be exercised anywhere else.
 *
 * `bill()` and `warningsFor()` answer the one question Carli keeps asking:
 * "ek wil net hê ons moet konstant in ag neem wat ek alles maandelliks betaal
 * want dit help nie ek maak nie 'n wins nie." They read ElevenLabs' own
 * numbers rather than our arithmetic about them.
 *
 * ── Why this file exists ─────────────────────────────────────────────────
 *
 * api.elevenlabs.io is blocked from the machine this was written on, so every
 * field name in `bill()` came off a documentation page rather than off an
 * answer. That is a guess with a comment on it, which is exactly what
 * `check:sing` was written to stop being acceptable for Kits.
 *
 * So the reader is run here against answers shaped the ways this kind of
 * endpoint answers, and against the three that would be expensive to get
 * wrong:
 *
 *   · a zero allowance, which divides into Infinity and puts it on a page;
 *   · an answer missing the fields entirely, which must come back thin
 *     rather than throw and take the whole money page with it;
 *   · a quiet month, which must say NOTHING — a warning that fires every
 *     month is a warning nobody reads on the month it matters.
 *
 * And one rule that does not bend: nothing this code returns may carry the
 * key or the account. The page it feeds exists to be pasted into a chat.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* The upstream, faked. `bill()` takes no injection point on purpose — it is a
   two-line fetch and a parser, and threading a client through it to make it
   testable would be more machinery than the thing being tested. */
process.env.ELEVENLABS_API_KEY = 'not-a-real-key';
let answer: unknown = {};
let asked = '';
globalThis.fetch = (async (url: string) => {
  asked = String(url);
  return { ok: true, status: 200, headers: new Headers(), json: async () => answer };
}) as unknown as typeof fetch;

const { bill, warningsFor } = await import('../app/lib/server/eleven.ts');

const DAY = 86_400_000;
const at = (days: number): number => Math.floor((Date.now() + days * DAY) / 1000);

async function billed(body: unknown) {
  answer = body;
  const got = await bill();
  return 'bill' in got ? got.bill : null;
}

console.log('\nWhat ElevenLabs will charge\n');

const strained = await billed({
  tier: 'creator',
  status: 'active',
  billing_period: 'monthly_period',
  character_count: 87_400,
  character_limit: 100_000,
  next_character_count_reset_unix: at(12),
  current_overage: { amount: 4.25, currency: 'usd' },
  next_invoice: { amount_due_cents: 2599 },
  open_invoices: [{ id: 'a' }, { id: 'b' }],
  can_extend_character_limit: false,
});

ok('it asks the narrow endpoint, not /v1/user', asked.endsWith('/user/subscription'), asked);
ok('the next invoice comes back in cents', strained?.nextInvoiceCents === 2599);
ok('what is already over the plan comes back', strained?.overage?.amount === 4.25);
ok('the percentage is worked out', strained?.percent === 87.4, String(strained?.percent));
ok('the days to the refill are worked out', strained?.resetsInDays === 12, String(strained?.resetsInDays));
ok('unpaid invoices are counted', strained?.openInvoices === 2);
ok('and whether overage billing is even on', strained?.canExceed === false);

/* The one that would reach a dashboard as "Infinity%". */
const free = await billed({ tier: 'free', character_count: 100, character_limit: 0 });
ok('a zero allowance is not a percentage', free?.percent === null, String(free?.percent));

const empty = await billed({});
ok('an answer with nothing in it comes back thin, not thrown', empty !== null && empty.used === null);

/* A shape that is not an object at all — their error pages have been HTML
   before, which is how the Kits probe found four endpoints that were not. */
answer = null;
const nothing = await bill();
ok('a non-answer is reported as one rather than parsed', !('bill' in nothing));

console.log('\nThe sentences on the page\n');

const loud = warningsFor(strained!);
ok('a month under strain says all four things', loud.length === 4, `said ${loud.length}`);
ok('and names the overage first — it is money going out now', /past the plan/.test(loud[0] ?? ''));

const soon = warningsFor((await billed({
  character_count: 85_000, character_limit: 100_000, next_character_count_reset_unix: at(2),
}))!);
ok('85% with two days left reads differently from 85% with three weeks', /refills in 2/.test(soon[0] ?? ''), soon[0]);

const quiet = warningsFor((await billed({
  character_count: 20_000, character_limit: 100_000, next_character_count_reset_unix: at(12),
  can_extend_character_limit: false,
}))!);
ok('a quiet month says nothing at all', quiet.length === 0, quiet.join(' / '));

console.log('\nWhat may never leave the server\n');

const lib = read('app/lib/server/eleven.ts');
const route = read('app/api/eleven/prices/route.ts');

ok('the money page never names the key', !route.includes('ELEVENLABS_API_KEY'));
ok('the money page is still guarded, in constant time', /timingSafeEqual/.test(route));
/* The allow-list is the point. Returning their object whole would put account
   fields on a page whose whole purpose is to be pasted somewhere. */
for (const banned of ['...body', '...record', 'JSON.stringify(body)']) {
  ok(`the reader never passes their answer through (${banned})`, !lib.includes(banned));
}
/* Asserted against the CODE, not the file. The first version of this rule
   read the whole file and failed on the comment above `keyGuards` explaining
   which endpoints exist and why none of them is called — a check that a
   warning about a danger counts as the danger is a check that teaches people
   to delete the warning. */
const code = lib.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/* Just that function, not the rest of the file — `eleven.ts` is full of
   legitimate POSTs (a read, a clone, a dub) and slicing to the end of the file
   would have caught every one of them. */
const from = code.indexOf('export async function keyGuards');
const next = code.indexOf('\nexport ', from + 1);
const guardFn = code.slice(from, next === -1 ? undefined : next);
ok('the key reader was found to look at', from !== -1 && guardFn.length > 200);
ok(
  'the key reader only ever reads — no key is created, changed or deleted',
  !/method:\s*'(POST|PATCH|DELETE|PUT)'/.test(guardFn) && !/api-keys/.test(code),
);
ok(
  'and the comment saying why is still there, because that is the whole guard',
  /POST \.\.\.\/api-keys` returns the new key in PLAIN TEXT/.test(lib),
);

console.log('\nThe letter that interrupts\n');

/* The route, run for real. The two cases that matter here are the ones the
   old `/api/watch` was blind to: it read four fields out of the subscription
   and none of them was money, so an account bleeding overage at 60% of its
   allowance looked perfectly healthy every morning. */
process.env.WATCH_SECRET = 'a-test-secret';
process.env.MAIL_API_KEY = 'not-a-real-key';
process.env.MAIL_FROM = 'FutureBox <hallo@futurebox.studio>';
process.env.OWNER_EMAIL = 'owner@futurebox.studio';

const posted: string[] = [];
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  if (String(url).includes('resend')) {
    posted.push(String(JSON.parse(String(init?.body ?? '{}')).subject ?? ''));
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ id: 'x' }) };
  }
  return { ok: true, status: 200, headers: new Headers(), json: async () => answer };
}) as unknown as typeof fetch;

const { GET } = await import('../app/api/watch/route.ts');

async function morning(sub: Record<string, unknown>) {
  answer = sub;
  posted.length = 0;
  const body = (await (await GET(new Request('https://x/api/watch?key=a-test-secret'))).json()) as {
    told?: string | null;
  };
  return { told: body.told ?? null, subjects: [...posted] };
}

const calm = await morning({
  tier: 'pro', character_count: 25_647, character_limit: 601_026,
  next_character_count_reset_unix: at(24), next_invoice: { amount_due_cents: 11_385 },
  can_extend_character_limit: false, open_invoices: [],
});
ok('a healthy month interrupts nobody', calm.told === null && calm.subjects.length === 0, calm.subjects.join(''));

const threequarters = await morning({
  tier: 'pro', character_count: 460_000, character_limit: 601_026,
  next_character_count_reset_unix: at(10),
});
ok('three quarters of the allowance still sends the letter it always sent',
  threequarters.told === 'allowance:0.75' && /three quarters gone/.test(threequarters.subjects[0] ?? ''),
  threequarters.subjects.join(''));

/* The reason any of this was worth changing. */
const bleeding = await morning({
  tier: 'pro', character_count: 360_000, character_limit: 601_026,
  next_character_count_reset_unix: at(10),
  current_overage: { amount: 12.5, currency: 'usd' },
});
ok('an overage at 60% of the allowance is now caught — it never was before',
  bleeding.told === 'overage' && /over its plan/.test(bleeding.subjects[0] ?? ''),
  bleeding.subjects.join(''));

const unpaid = await morning({
  tier: 'pro', character_count: 10_000, character_limit: 601_026,
  next_character_count_reset_unix: at(10), open_invoices: [{ id: 'a' }],
});
ok('so is an unpaid invoice on an otherwise quiet month',
  unpaid.told === 'unpaid', unpaid.subjects.join(''));

/* The once-key is what stops a warning arriving every morning for a week, and
   what lets a CHANGED situation through. Both halves matter. */
ok('the letter is keyed to the situation, not just the month',
  threequarters.told !== bleeding.told && bleeding.told !== unpaid.told);

const watch = read('app/api/watch/route.ts');
ok('the letter and the money page share one set of sentences', watch.includes('warningsFor'));
ok('and there is no second reader of the subscription left',
  !read('app/lib/server/eleven.ts').includes('export async function allowanceLeft'));

if (failures > 0) {
  console.log(`\ncheck:bill — ${failures} assertion(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\ncheck:bill — the invoice reader survives every shape their answer arrives in, and carries nothing it should not.");
}

/**
 * Kids credits: bought on their own, spent only in the kids room.
 *
 * The owner, 14 October 2026: *"In die pricing page moet die kids room ook 'n
 * aparte prys hê. Die kids room met sy aparte credits …"* and, on the three
 * packs suggested: *"Prys voorstelle is reg vir kids studio. Moet net nie
 * die family ding sê nie."*
 *
 * What has to stay true, read off the code that moves the money:
 *
 *   1. The packs are priced so the dearest things in the kids room still
 *      earn: no kids credit sells under R1.70.
 *   2. A charge spends kids credits first, and one they cover whole never
 *      reaches the account's credits.
 *   3. A kids credit can only be taken while the kids room is open and its
 *      clock has time on it — otherwise a cheap kids pack is the cheapest
 *      way into the grown-up studio, without a plan.
 *   4. A refund goes back to the kids balance as far as that balance paid,
 *      and only the rest to the account.
 *   5. The till sells a kids pack without a plan, refuses a monthly one
 *      that has no Paystack plan behind it, and the webhook counts the
 *      credits from the pack table, renewals included, before the branch
 *      that would read a renewal as a membership.
 *   6. The welcome page prices the kids room from the same table, and
 *      nothing says "family" or counts children.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { KIDS_PACKS } from '../app/lib/kidspacks.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));
const charge = code('app/lib/server/credits.ts');
const sql = readFileSync('supabase/kinderkrediete.sql', 'utf8');
const till = code('app/api/checkout/route.ts');
const hook = code('app/api/payments/webhook/route.ts');
const landing = code('app/components/Landing.tsx');
const packs = readFileSync('app/lib/kidspacks.ts', 'utf8');

console.log('\nKids credits are the kids room\'s, and nobody else\'s\n');

/* ── 1 ── */
ok('three kids packs, each a whole number of credits at a positive price',
  KIDS_PACKS.length === 3 && KIDS_PACKS.every((p) => Number.isInteger(p.credits) && p.credits > 0 && p.rand > 0));
ok('  and no kids credit sells under R1.70',
  KIDS_PACKS.every((p) => Math.round((p.rand / p.credits) * 100) >= 170),
  KIDS_PACKS.map((p) => `${p.id} R${(p.rand / p.credits).toFixed(2)}`).join(', '));

/* ── 2 ── */
ok('a charge takes kids credits before the allowance and the account',
  before(charge, 'kidsWalletTake(caller.id, amount)', 'kidsSpend(caller.id, rest)')
    && before(charge, 'kidsSpend(caller.id, rest)', 'spend(caller.id, rest, reason, ref)'),
  'the order in charge() is the order the money is taken in');
const take = charge.indexOf('kidsWalletTake(caller.id, amount)');
const allowance = charge.indexOf('kidsSpend(caller.id, rest)');
ok('  and one they cover whole returns before the account is touched',
  /if \(rest <= 0\) \{[\s\S]{0,200}return \{ ok: true/.test(charge.slice(take, allowance)));
ok('  and a refused charge gives the kids credits back',
  (charge.slice(allowance).match(/kidsWalletReturn\(caller\.id, fromKids\)/g) ?? []).length >= 2);

/* ── 3 ── */
const takeFn = sql.slice(sql.indexOf('function public.kids_wallet_take'), sql.indexOf('function public.kids_wallet_return'));
ok('a kids credit is taken only while the kids room is open',
  /if not exists \(select 1 from public\.kids_mode where owner = p_owner\) then\s+return 0;/.test(takeFn));
ok('  and only while its clock has time on it',
  /kids_time_left\(p_owner\)[\s\S]{0,40}<= 0 then\s+return 0;/.test(takeFn));
ok('  and a purchase is credited once per payment reference',
  /unique index[\s\S]{0,120}\(owner, ref\) where reason = 'buy'/.test(sql)
    && /reason = 'buy' and ref = p_ref/.test(sql));

/* ── 4 ── */
const refund = charge.slice(charge.indexOf('export async function refund'), charge.indexOf('export async function topUp'));
ok('a refund goes back to the kids balance first, the rest to the account',
  before(refund, 'kidsWalletReturn(owner, amount)', "from('credit_entries')") && /amount: rest/.test(refund));

/* ── 5 ── */
const planGate = till.indexOf("want.kind === 'credits' && !mayTopUp");
ok('the till sells a kids pack without asking for a plan',
  planGate > 0 && !/want\.kind === 'kids'[^\n]{0,80}mayTopUp/.test(till));
ok('  and refuses a monthly pack that has no Paystack plan behind it',
  /want\.kind === 'kids' && kidsPackById\(want\.pack\)\?\.monthly && !kidsPlanCode\(want\.pack\)/.test(till));
ok('  and prices it from the pack table, never the request',
  /want\.kind === 'kids'\) \{\s+const pack = kidsPackById\(want\.pack\);[\s\S]{0,120}pack\.rand \* 100/.test(till));
ok('a monthly kids renewal is read before the membership renewal',
  before(hook, 'kidsPackOfPlan(planOfCharge(event.data.plan))', 'const known = await ownerOfCustomer(payer.customerCode)'),
  'a renewal carries no metadata, and read as a membership it would write a tier');
ok('  and a kids purchase lands on the kids balance, counted from the pack table',
  /meta\.kind === 'kids' && meta\.pack\) \{\s+const pack = kidsPackById\(meta\.pack\);[\s\S]{0,300}kidsWalletAdd\(owner, pack\.credits, reference/.test(hook));

/* ── 6 ── */
ok('the welcome page prices the kids room from the same table',
  /KIDS_PACKS\.map/.test(landing) && /data-landingkidsprices/.test(landing));
ok('  and nothing says family or counts children',
  !/famil|children|kinders\b/i.test(packs.replace(/^\s*(\*|\/\/|\/\*).*$/gm, '')),
  'she said: "Moet net nie die family ding sê nie"');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

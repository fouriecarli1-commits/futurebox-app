/**
 * The recurring payment: seeing it, changing the card, and stopping it.
 *
 * ── The correction this file records ─────────────────────────────────────
 *
 * Carli, 23 September 2026: *"En met billing, dat hulle hul billing
 * information kon verander?"*
 *
 * I answered that there was nowhere in the app to see the arrangement, change
 * it or cancel it. Two thirds of that was wrong. `components/Subscription.tsx`
 * has shown the plan, the next date and a cancel button since it was built —
 * I grepped `Account.tsx` for "billing", "invoice" and "card", and the
 * component is called `Subscription`, so my own search decided the feature did
 * not exist. Searching for the word rather than the thing.
 *
 * What WAS missing is the third: changing the card. And it is the one that
 * happens most — a card expires long before anybody wants to leave, so the
 * ordinary end of a membership here was a failed renewal and a plan that
 * quietly stopped.
 *
 * ── What these rules hold ────────────────────────────────────────────────
 *
 * All three, together, because the reason they belong together is the one
 * this app keeps proving: a subscription somebody cannot manage from inside
 * the app is one they manage at their bank instead, and that is a chargeback,
 * a fee, and a mark against the merchant account.
 *
 * And one rule about how the card is changed, which matters more than it
 * looks: no card field on our own screens, ever.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const route = readFileSync('app/api/subscription/route.ts', 'utf8');
const bank = readFileSync('app/lib/server/paystack.ts', 'utf8');
const screen = readFileSync('app/components/Subscription.tsx', 'utf8');
/**
 * The same file with its prose taken out.
 *
 * Needed for one rule below and the reason is worth writing down: the first
 * version hunted for "card number" in the whole file and found it in the
 * COMMENT explaining why there is no card number in the file. A rule that
 * reads the argument for the rule and calls it a violation.
 *
 * This repository has done it before — a `check:longshot` rule stayed green
 * for a day because it required a phrase that appeared only in a comment I
 * had written for it. Both directions of the same fault: a check that reads
 * the prose is measuring the writing, not the code.
 */
const screenCode = screen
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, (had, before) => before);
const account = readFileSync('app/components/Account.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── All three, and on a screen ──────────────────────────────────────── */

ok('the arrangement can be seen', /export async function GET/.test(route) && /sub\.title/.test(screen),
  'a subscription nobody can see is one they query at their bank');

ok('  and stopped', /export async function DELETE/.test(route) && /sub\.stop/.test(screen),
  'the only way out is a chargeback, which costs a fee and a mark on the merchant account');

ok('  and the card it is charged to can be changed',
  /export async function POST/.test(route) && /data-changecard/.test(screen),
  'a card expires long before anybody wants to leave, so a membership ends by failing rather than by choice');

ok('  on a screen somebody can reach', /<Subscription \/>/.test(account),
  'the component exists and no screen draws it — which is exactly how this one was missed for weeks');

/* ── No card ever touches this app ───────────────────────────────────── */

/* The point is not tidiness. A card number typed into a field this app
   renders is a card number in this app's DOM, in its error reports and in
   its PCI scope, and none of it buys anything Paystack's own page does not
   already do. */
ok('changing the card is a link to their page, not a form on ours',
  /manage\/link/.test(bank) && !/card[_ ]?number|cvv|expiry/i.test(screenCode),
  'a card field on our screen puts a card number in our DOM, our error reports and our PCI scope');

ok('  and the link is fetched on the press rather than kept',
  /cardChangeLink\(code\)/.test(route) && !/cardChangeLink[\s\S]{0,200}?(?:insert|update)\(/.test(route),
  'a short-lived link to somebody’s payment page, stored');

/* ── Whose subscription ──────────────────────────────────────────────── */

/* The whole of the authorisation, and it has to be in each of the three.
   A route that took a subscription code from the request would hand anybody
   a card-change page for anybody's plan. */
const each = ['GET', 'POST', 'DELETE'].filter((verb) => {
  const body = new RegExp(`export async function ${verb}\\(request[\\s\\S]*?\\n\\}`).exec(route)?.[0] ?? '';
  return !body || !/\.eq\('owner', caller\.id\)/.test(body);
});
ok('every one of them acts only on the caller’s own row', each.length === 0,
  `${each.join(', ')} do not look the subscription up by owner — a code from the request would do for anybody’s plan`);

/* ── What the screen says ────────────────────────────────────────────── */

/* Above the way out, because somebody whose card expired came to fix it and
   not to leave. A screen offering only "stop the payment" turns an expired
   card into a cancellation, which is the opposite of what anybody wanted. */
/* Anchored on the two buttons' own distinctive marks rather than on a
   translation key. `t('sub.stop'` can be written anywhere in the file — a
   mutation that put it into the change-card button's label moved the match
   and the rule stayed green over an ordering it was written to hold. The
   cancel button is the one that opens the confirmation, and nothing else in
   this file does. */
const changeAt = screen.indexOf('data-changecard');
const stopAt = screen.indexOf('setAsking(true)');
ok('  and the change is offered before the way out',
  changeAt !== -1 && stopAt !== -1 && changeAt < stopAt,
  changeAt === -1 ? 'there is no change-card button'
    : stopAt === -1 ? 'there is no cancel button'
    : 'a screen that offers only "stop paying" turns an expired card into a cancellation');

ok('  and says where the card details go', /sub\.cardWhere/.test(screen)
  && /"sub\.cardWhere":[^\n]*never come to us/i.test(words),
  'a button that sends somebody to a third party without saying so');

const KEYS = [...new Set([...screen.matchAll(/t\('(sub\.[A-Za-z]*)'/g)].map((one) => one[1]))];
const noAf = KEYS.filter((key) =>
  !new RegExp(`"${key.replace('.', '\\.')}":\\s*\\{[^}]*\\baf:\\s*"[^"]{2,}"`).test(words));
ok(`  in Afrikaans too — ${KEYS.length} keys`, KEYS.length >= 10 && noAf.length === 0,
  noAf.length ? noAf.join(', ') : `${KEYS.length} keys is fewer than this panel has sentences`);

if (failures) {
  console.error(`\ncheck:billing — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:billing — the arrangement can be seen, the card changed and the payment stopped, '
  + 'each only on the caller’s own row, and no card number ever reaches a screen of ours.',
);

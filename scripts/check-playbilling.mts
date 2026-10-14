/**
 * Google Play Billing in the Android app, Paystack on the website — held.
 *
 * Carli, 14 October 2026: "Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."
 *
 * What this protects is the money, so every rule here is one whose breaking
 * either gives something away or charges somebody for nothing:
 *
 *   the phone's word is never a receipt — Google is asked first
 *   a grant reads its size from our own tables, never the request
 *   a token belongs to the first account that shows it
 *   Google is told "delivered" only after the grant is written
 *   in the Play app, Paystack is never offered
 *   the renewal address is behind a secret and still asks Google
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { before } from './order.mts';
import { PLAY_PRODUCTS, productBySku, skuFor } from '../app/lib/playproducts.ts';
import { PACKS } from '../app/lib/credits.ts';
import { KIDS_PACKS } from '../app/lib/kidspacks.ts';
import { TIERS } from '../app/lib/plans.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

const route = code('app/api/play/route.ts');
const notify = code('app/api/play/notify/route.ts');
const server = code('app/lib/server/playbilling.ts');
const client = code('app/lib/playbilling.ts');
const purchases = code('app/lib/purchases.ts');
const kids = code('app/lib/kidsdoor.ts');
const art = code('app/components/ArtMarket.tsx');

console.log('\nPaying through Google Play in the Android app\n');

/* ── 1. Every paid thing has a product, and every product a real thing ── */
const paidTiers = TIERS.filter((one) => one !== 'free');
ok('every paid plan, every top-up and every kids pack is a Play product',
  paidTiers.every((tier) => skuFor({ kind: 'plan', tier }))
  && PACKS.every((pack) => skuFor({ kind: 'credits', pack: pack.id }))
  && KIDS_PACKS.every((pack) => skuFor({ kind: 'kids', pack: pack.id })));
ok('  and every product grants something that exists',
  PLAY_PRODUCTS.every((one) => (one.grants.kind === 'plan'
    ? paidTiers.includes(one.grants.tier)
    : one.grants.kind === 'credits'
      ? PACKS.some((pack) => pack.id === (one.grants as { pack: string }).pack)
      : KIDS_PACKS.some((pack) => pack.id === (one.grants as { pack: string }).pack))));
ok('  a monthly kids pack is a subscription and Kids Try is not',
  KIDS_PACKS.every((pack) => productBySku(skuFor({ kind: 'kids', pack: pack.id }))?.type === (pack.monthly ? 'subscription' : 'consumable')));
ok('  product ids are ones the Play Console accepts',
  PLAY_PRODUCTS.every((one) => /^[a-z0-9][a-z0-9_.]*$/.test(one.sku)) && new Set(PLAY_PRODUCTS.map((one) => one.sku)).size === PLAY_PRODUCTS.length);

/* ── 2. The phone's word is never the receipt ────────────────────────── */
ok('the paid step asks Google about the token before anything is granted',
  before(route, 'checkPurchase(product, token)', 'grant(owner, product, token, checked)'));
ok('  claims the token for this account and refuses one that is somebody else\'s',
  /claim\(caller\.id, product, token, checked\)/.test(route) && /owner !== caller\.id/.test(route) && /status: 409/.test(route));
ok('  and tells Google "delivered" only after the grant is written',
  before(route, 'grant(owner, product, token, checked)', 'deliver(product, token)'));
ok('  a subscription token for another product is refused', /checked\.sku !== product\.sku/.test(route));
ok('the grant reads its size from our own tables, under the order id',
  /packById\(what\.pack\)/.test(server) && /kidsPackById\(what\.pack\)/.test(server) && /`play:\$\{checked\.order\}`/.test(server)
  && !/body\??\.(credits|amount|price)/.test(route));
ok('  and a plan lasts until Google says its month ends', /renews_at: until/.test(server) && /checked\.expires/.test(server));
ok('the same rule as the website, asked before Play\'s sheet opens: credits need a plan',
  /step === 'may'/.test(route) && /mayTopUp\(caller\.tier\)/.test(route)
  && before(client, "step: 'may'", 'request.show()'));

/* ── 3. Google is asked with the app's own key ──────────────────────── */
ok('Google is asked with a signed service-account token, not a key in the code',
  /createSign\('RSA-SHA256'\)/.test(server) && /GOOGLE_PLAY_SERVICE_ACCOUNT/.test(server)
  && /androidpublisher/.test(server) && !/BEGIN PRIVATE KEY/.test(readFileSync('app/lib/server/playbilling.ts', 'utf8')));

/* ── 4. Renewals ────────────────────────────────────────────────────── */
ok('the renewal address is behind a secret, compared in constant time',
  /PLAY_NOTIFY_SECRET/.test(notify) && /sameKey\(given, expected\)/.test(notify) && /timingSafeEqual/.test(server));
ok('  and a notice only ever causes a question to Google',
  before(notify, 'checkPurchase(product, sub.purchaseToken)', 'grant(owner, product, sub.purchaseToken, checked)'));
ok('  granted to the account on record for that purchase', /ownerOfToken\(sub\.purchaseToken, checked\.linked\)/.test(notify));

/* ── 5. In the Play app, Play — never Paystack ──────────────────────── */
ok('the buy buttons go to Play inside the Play app, before Paystack is ever asked',
  before(purchases, 'if (inPlayApp()) return buyOnPlay(want);', "fetch('/api/checkout'")
  && before(kids, 'if (inPlayApp())', "fetch('/api/checkout'"));
ok('  album art is not sold in the Play app, and nothing points elsewhere to pay',
  before(art, 'if (inPlayApp())', "fetch('/api/checkout'") && /art\.notInPlay/.test(art));
ok('  the Play app is recognised per tab, so ordinary Chrome keeps Paystack',
  /android-app:\/\//.test(client) && /sessionStorage/.test(client) && !/localStorage/.test(client));
ok('  and a purchase whose last step was lost is finished on the next start',
  /listPurchases\(\)/.test(client) && /resumePlayPurchases\(\)/.test(code('app/page.tsx')));
ok('a plan bought in Play is managed on Play\'s page from the account screen',
  /playManageUrl/.test(code('app/api/subscription/route.ts')) && /data-subplaymanage/.test(code('app/components/Subscription.tsx')));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

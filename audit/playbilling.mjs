/**
 * Paying inside the Android app goes through Google Play — walked.
 *
 * Carli, 14 October 2026: *"Wanneer ek die app op die playstore gaan sit gaan
 * ek paystack afhaal en werk met die playstore se paying system."*
 *
 * A browser cannot be a Trusted Web Activity, so the two things a TWA has
 * that a tab does not are put in front of the page here, the way Chrome
 * would: the session's "opened by the Android app" mark, the Digital Goods
 * service, and a Payment Request that answers with a purchase token as
 * Play's sheet does. `/api/play` is answered here too — the server's half is
 * held by `check:playbilling`, and asking real Google is not something a walk
 * can do.
 *
 * What is measured is the part only a browser shows: that the SAME buy
 * button, in the Play app, asks `/api/play` first whether it may, then opens
 * Play's sheet with the right product, then hands the token over — and that
 * the Paystack till is never asked at all. And the other half: the same page
 * in an ordinary tab still goes to Paystack.
 */
import { enter, studio } from './enter.mjs';
import { serve } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const PORT = process.argv[2] || '3271';
const server = await serve(PORT);

async function kidsPage(playApp) {
  const { browser, page } = await enter({ width: 1280, height: 900, at: server.url });
  await page.route('**/api/kids', (route) => route.fulfill({ json: { open: false } }));
  await page.route('**/api/kids/pack', (route) => route.fulfill({ json: { monthly: [] } }));
  const asked = { play: [], till: [] };
  await page.route('**/api/play', async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const body = route.request().postDataJSON();
    asked.play.push(body);
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/checkout', async (route) => {
    if (route.request().method() === 'POST') asked.till.push(route.request().postDataJSON());
    return route.fulfill({ json: { url: `${server.url}/kids?paid=1`, available: true } });
  });
  const sheet = [];
  if (playApp) {
    /* Out to the walk as it happens: the page navigates away the moment the
       purchase is through, taking anything kept in it along. */
    await page.exposeFunction('__sawSheet', (methods) => { sheet.push(methods); });
    await page.addInitScript(() => {
      sessionStorage.setItem('fb-play-app', '1');
      window.getDigitalGoodsService = async (method) => {
        if (method !== 'https://play.google.com/billing') throw new Error('not Play');
        return { listPurchases: async () => [], getDetails: async () => [] };
      };
      window.PaymentRequest = class {
        constructor(methods) { this.methods = methods; }
        async show() {
          await window.__sawSheet(this.methods);
          return { details: { purchaseToken: 'audit-token-1' }, complete: async () => undefined };
        }
      };
    });
  }
  await studio(page);
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidspacks]').waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  return { browser, page, asked, sheet };
}

/* ── In the Play app ─────────────────────────────────────────────────── */
{
  const { browser, page, asked, sheet } = await kidsPage(true);
  check('in the Play app the kids page says Google Play takes the payment',
    (await page.locator('[data-kidsplaymanage]').count()) === 1);
  await page.locator('[data-kidsbuy="kids-try"]').click();
  await page.waitForURL(/paid=1/, { timeout: 15000 }).catch(() => undefined);
  check('  a press asks the server whether it may, for the Play product',
    asked.play[0]?.step === 'may' && asked.play[0]?.sku === 'kids_try', JSON.stringify(asked.play[0]));
  check('  then opens Play’s own sheet for that product',
    sheet[0]?.[0]?.supportedMethods === 'https://play.google.com/billing' && sheet[0]?.[0]?.data?.sku === 'kids_try',
    JSON.stringify(sheet));
  check('  then hands the purchase token to the server to check with Google',
    asked.play[1]?.step === 'paid' && asked.play[1]?.token === 'audit-token-1', JSON.stringify(asked.play[1]));
  check('  and the Paystack till is never asked', asked.till.length === 0, JSON.stringify(asked.till));
  await page.locator('[data-kidspaid]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  check('  and it comes back to the kids page saying the payment went through',
    await page.locator('[data-kidspaid]').isVisible().catch(() => false), page.url());
  await browser.close();
}

/* ── In an ordinary tab ──────────────────────────────────────────────── */
{
  const { browser, page, asked } = await kidsPage(false);
  check('in an ordinary tab there is no Google Play wording', (await page.locator('[data-kidsplaymanage]').count()) === 0);
  await page.locator('[data-kidsbuy="kids-try"]').click();
  await page.waitForURL(/paid=1/, { timeout: 15000 }).catch(() => undefined);
  check('  and the same press goes to the Paystack till as before',
    asked.till[0]?.kind === 'kids' && asked.till[0]?.pack === 'kids-try' && asked.play.length === 0,
    JSON.stringify(asked));
  await browser.close();
}

await server.stop();
if (problems.length) {
  console.error(`\ncheck:playwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:playwalk — in the Android app the buy buttons pay through Google Play; in a tab, Paystack.');

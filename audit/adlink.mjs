/**
 * Adverts from a product link, walked on a phone.
 *
 * The owner, 18 October 2026: yes to Google's AI reading a product page for
 * three credits. Read off the glass and off what is sent: the link field is
 * on the advert desk, its button says its price and waits for a link, the
 * link goes up as typed with her language, and what comes back is put in the
 * brief's boxes. A page that cannot be read says so and changes nothing. The
 * route is answered here, so nothing is spent.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const server = await serve(process.argv[2] || '3362');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};
const asked = [];
let reply = { status: 200, body: {} };
const { browser, page } = await enter({
  width: 390, height: 844, touch: true, at: server.url, lang: 'en',
  before: async (p) => {
    await p.route('**/api/campaign/link', (route) => {
      const sent = JSON.parse(route.request().postData() || '{}');
      asked.push(sent);
      /* The route's own shape: `{ found }` on a read, `{ message }` on a failure. */
      return route.fulfill({ status: reply.status, contentType: 'application/json', body: JSON.stringify(reply.body.found ? { found: reply.body.found } : { message: reply.body.message }) });
    });
  },
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

try {
  await studio(page);
  await toRoom(page, 'Adverts');
  await page.waitForTimeout(1200);
  const go = page.locator('[data-adslinkgo]');
  await page.locator('[data-adslinkbox]').scrollIntoViewIfNeeded().catch(() => undefined);
  check('the link field is on the advert desk, and its button says its price and waits for a link',
    (await page.locator('[data-adslink]').count()) === 1 && /3 credits/.test(await go.innerText()) && await go.isDisabled());

  /* A page that cannot be read changes nothing. */
  await page.locator('#ads-what').fill('Something I typed');
  await page.locator('[data-adslink]').fill('https://shop.example.co.za/locked');
  reply = { status: 502, body: { message: 'That page could not be read — it may need a login, or block readers. Nothing was charged.' } };
  await go.click();
  await page.waitForSelector('[data-adslinksaid]', { timeout: 10000 }).catch(() => undefined);
  check('a page that cannot be read says so and leaves the brief alone',
    /could not be read/.test(await page.locator('[data-adslinksaid]').innerText().catch(() => '')) && (await page.locator('#ads-what').inputValue()) === 'Something I typed');

  /* A page that can. */
  reply = { status: 200, body: { found: { name: 'Amber candle', what: 'A soy candle in an amber jar', who: 'People who like a calm evening at home', offer: 'R149', points: ['Burns for 40 hours', 'Hand-poured in Paarl'] } } };
  await page.locator('[data-adslink]').fill('shop.example.co.za/amber-candle');
  await go.click();
  await page.waitForFunction(() => /Amber candle/.test(document.querySelector('#ads-what')?.value ?? ''), null, { timeout: 10000 }).catch(() => undefined);
  const one = asked.at(-1) ?? {};
  check('the link goes up as typed, with her language', one.url === 'shop.example.co.za/amber-candle' && one.lang === 'en', JSON.stringify(one));
  check('what the page says is put in the brief',
    (await page.locator('#ads-what').inputValue()) === 'Amber candle — A soy candle in an amber jar'
      && (await page.locator('#ads-who').inputValue()) === 'People who like a calm evening at home'
      && /R149 · Burns for 40 hours · Hand-poured in Paarl/.test(await page.locator('#ads-offer').inputValue()),
    `${await page.locator('#ads-what').inputValue()} | ${await page.locator('#ads-who').inputValue()} | ${await page.locator('#ads-offer').inputValue()}`);
  check('  and it says so, and that anything can be changed', /Change anything/.test(await page.locator('[data-adslinksaid]').innerText()));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:adlinkwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:adlinkwalk — a product link says its price, goes up as typed, and fills the brief; a page that cannot be read changes nothing.');

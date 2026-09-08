/**
 * Stopping the monthly payment, and what the screen says while you do it.
 *
 * ── Why this one was worth bringing back first ───────────────────────────
 *
 * It is the only probe in this directory that walks somebody out of paying.
 * Every other room fails by disappointing; this one fails by taking money
 * from a person who asked it to stop, or by making them believe it stopped
 * when it did not. It has been sitting unrun since it was written.
 *
 * ── What is asserted, and one thing that is asserted by its absence ──────
 *
 * The panel names the plan and the date the next payment would have been —
 * both are what somebody checks before pressing anything. The confirmation
 * has to say the month already paid for is not cut short, because the fear
 * that stops people cancelling is losing what they have paid for, and the
 * honest answer is that they do not.
 *
 * And there must be **no parting offer**. A discount thrown in front of
 * somebody who has decided is the pattern this app is not going to have, and
 * an assertion is the only way that survives a growth idea eighteen months
 * from now.
 *
 * Both languages, because the eleven `sub.*` keys were English fallbacks once
 * and the run before this said fine: the first Afrikaans run printed "cancel
 * button present: false" and then "problems: none", because only page errors
 * counted. Every line here is an assertion.
 */
import { serve, shot } from './where.mjs';
import { enter, studio, toRoom } from './enter.mjs';

const PORT = process.argv[2] || '3099';
const af = process.argv[3] === 'af';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** What the cancel asked for, which decides which letter goes out. */
let cancelledIn = null;

let server = null;
let browser = null;
let fell = false;
try {
  server = await serve(PORT);
  const opened = await enter({
    at: server.url,
    lang: af ? 'af' : 'en',
    /* Registered before the first paint: the panel asks for the subscription
       on mount, and a stub added after that has already missed it. */
    before: async (page) => {
      await page.route('**/api/subscription*', async (route) => {
        if (route.request().method() === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              subscribed: true,
              tier: 'studio',
              name: 'Studio',
              status: 'active',
              nextPaymentAt: '2026-10-04T00:00:00Z',
              cancellable: true,
            }),
          });
        }
        cancelledIn = new URL(route.request().url()).searchParams.get('lang');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ stopped: true }),
        });
      });
    },
  });
  browser = opened.browser;
  const page = opened.page;

  const room = await studio(page);
  await toRoom(page, af ? 'Kanaal' : 'Channel');
  await page.waitForTimeout(1200);

  let text = await room.innerText();
  check('the panel names the plan', /Studio/.test(text));
  check('and the date the next payment would have been', /2026|10\/|\/10/.test(text), text.slice(0, 120));

  const stop = room
    .locator('button')
    .filter({ hasText: af ? /Stop die maandelikse/ : /Stop the monthly/ })
    .first();
  const hasStop = (await stop.count()) > 0;
  check('there is a way to stop paying', hasStop);

  if (hasStop) {
    await stop.click();
    await page.waitForTimeout(600);
    text = await room.innerText();
    check(
      'the confirmation says the month already paid for is not cut short',
      af ? /nie afgesny|reeds betaal/.test(text) : /not cut short|already paid/.test(text),
      'the fear that stops people cancelling is losing what they have paid for',
    );
    check(
      'and there is no parting offer in it',
      !/discount|korting|% off/i.test(text),
      'a discount in front of somebody who has decided is not what this app does',
    );

    await room
      .locator('button')
      .filter({ hasText: af ? /^Ja, stop dit/ : /^Yes, stop it/ })
      .first()
      .click();
    await page.waitForTimeout(1400);
    text = await room.innerText();
    check('and the screen says it stopped', af ? /Gestop/.test(text) : /Stopped/.test(text));
    check(
      'the letter goes out in the language she was reading',
      cancelledIn === (af ? 'af' : 'en'),
      `asked for ${cancelledIn ?? 'nothing'}`,
    );
  }

  await page.screenshot({ path: shot(`subscription-${af ? 'af' : 'en'}.png`) });
} catch (problem) {
  fell = true;
  console.error(`  FAIL the probe itself fell over — ${String(problem).slice(0, 240)}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
}

if (problems.length || fell) {
  console.error(`\ncheck:subscription — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log(`\ncheck:subscription — stopping the monthly payment is honest about the paid month, and does not beg.`);

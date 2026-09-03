/**
 * When something refuses, does the person see it?
 *
 * A 503 in the console is not a failure mode anybody experiences. What matters
 * is whether the room says something, and whether what it says is a sentence
 * rather than a status code. Every paid button here is pressed against a
 * refusal and the screen is read afterwards.
 */
import { enter, studio } from './enter.mjs';
const { browser, page } = await enter();

// Every route refuses, in the shape the real ones use.
await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (route.request().method() === 'GET' && !/songwriter|copilot|campaign|recommend/.test(url)) {
    return route.continue();
  }
  await route.fulfill({
    status: 503, contentType: 'application/json',
    /* Both shapes, because the routes do not agree on one: the songwriter
       answers {error, detail} and most others answer {message}. Sending all
       three means this tests the room rather than testing my guess at the
       route. */
    body: JSON.stringify({
      message: 'The writer is not switched on for this app yet.',
      error: 'not_configured',
      detail: 'The writer is not switched on for this app yet.',
    }),
  });
});

const room = await studio(page);
const CASES = [
  ['Make a song', /Write the next bit/],
  ['Adverts', /Write the adverts/],
];
for (const [name, button] of CASES) {
  await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click();
  await page.waitForTimeout(1100);
  if (name === 'Adverts') {
    await room.locator('#ads-what').fill('A bakery in Bellville, sourdough, open six days.');
    await page.waitForTimeout(300);
  }
  const before = await room.innerText();
  const target = room.locator('button').filter({ hasText: button }).first();
  if (!(await target.count())) { console.log(`${name}: button not found`); continue; }
  await target.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1600);
  const after = await room.innerText();
  const added = after.replace(before, '').trim();
  const said = /not switched on|could not|did not work|try again|failed|nie/i.test(after);
  console.log(`${name}: says something → ${said}`);
  if (added) console.log(`   new on screen: ${added.split('\n').filter(Boolean).slice(0, 3).join(' | ').slice(0, 200)}`);
}
await browser.close();

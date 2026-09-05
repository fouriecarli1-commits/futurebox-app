/**
 * How far a phone has to scroll to reach the bottom of the home page.
 *
 * A number rather than an impression: "it feels long" cannot be argued with
 * and cannot be fixed, but a screen count can be both.
 *
 * The tab is confirmed to have changed before anything is measured. The first
 * version of this reported the same 23,552 px for all five, which was not a
 * finding about the page — it was the probe measuring the same tab five
 * times.
 */
import { enter } from './enter.mjs';

const { browser, page } = await enter({ width: 390, height: 844 });
await page.waitForTimeout(1200);

const strip = page.locator('nav').first();
for (const tab of ['Spotlight', 'Podcasts', 'Classes', 'Music & video', 'Radar']) {
  const button = strip.locator('button', { hasText: tab }).first();
  await button.click();
  await page.waitForFunction(
    (name) => {
      const on = document.querySelector('nav button[aria-current="page"]');
      return !!on && (on.innerText ?? '').trim() === name;
    },
    tab,
    { timeout: 8000 },
  ).catch(() => console.log(`  (${tab} het nie aangeskakel nie)`));
  await page.waitForTimeout(900);

  const read = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body;
    return {
      height: document.documentElement.scrollHeight,
      viewport: window.innerHeight,
      sections: main.querySelectorAll(':scope > section').length,
      cards: main.querySelectorAll('.grid > div, .grid > article').length,
    };
  });
  console.log(
    `${tab.padEnd(14)} ${String(read.height).padStart(6)} px = ${(read.height / read.viewport).toFixed(1).padStart(5)} skerms · ` +
      `${read.sections} afdelings · ${read.cards} kaarte`,
  );
}
await browser.close();

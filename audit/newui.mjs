/** Do the things just built actually appear, and do they keep what they are given? */
import { enter, studio } from './enter.mjs';
const { browser, page, problems } = await enter();
const room = await studio(page);

// ── The advert desk's brand kit ──────────────────────────────────────────
await room.locator('button').filter({ hasText: /^Adverts/i }).first().click();
await page.waitForTimeout(1200);
const kitOpen = await room.getByText(/Who these adverts are for/i).count();
console.log('brand kit panel present:', kitOpen > 0);

const nameBox = room.locator('#kit-name');
if (await nameBox.count()) {
  await nameBox.fill('Bellville Bakery');
  await room.locator('#kit-voice').fill('We are not fancy, we open at six.');
  await room.locator('button').filter({ hasText: /^Keep this$/ }).first().click();
  await page.waitForTimeout(600);
  console.log('saved shows:', await room.locator('button').filter({ hasText: /^Saved$/ }).count() > 0);
  // Does it survive a reload? That is the whole point of it.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const back = await page.evaluate(() => window.localStorage.getItem('futurebox.brandkit.v1'));
  console.log('kept after reload:', back);
} else {
  console.log('brand kit fields NOT found');
}

// ── The video desk's picture strip ───────────────────────────────────────
const room2 = await studio(page);
await room2.locator('button').filter({ hasText: /^Video desk/i }).first().click();
await page.waitForTimeout(1200);
const text = await room2.innerText();
console.log('start-frame offered:', /Start from a picture|Add a picture|Premium grade/i.test(text));
console.log('genre row present:', /What kind of song is it/i.test(text));
await room2.locator('button').filter({ hasText: /^Music video/ }).first().click().catch(() => {});
await page.waitForTimeout(800);
console.log('\nproblems:', problems.join(' ;; ') || 'none');
await browser.close();

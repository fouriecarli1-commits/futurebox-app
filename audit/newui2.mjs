import { enter, studio } from './enter.mjs';
const { browser, page, problems } = await enter();
const room = await studio(page);
await room.locator('button').filter({ hasText: /^Video desk/i }).first().click();
await page.waitForTimeout(1400);

// The scene tile, not the rail entry that shares its name — the tile carries
// its own one-line description under it.
const tile = room.locator('button').filter({ hasText: /A shot to cut against a track/ }).first();
console.log('music tile found:', await tile.count() > 0);
await tile.click();
await page.waitForTimeout(900);

const text = await room.innerText();
console.log('genre row after picking the tile:', /What kind of song is it/i.test(text));
if (/What kind of song is it/i.test(text)) {
  const box = room.locator('#canvas-prompt');
  const before = await box.inputValue();
  await room.locator('button').filter({ hasText: /Late, close, and moving on the off-beat/ }).first().click();
  await page.waitForTimeout(600);
  const after = await box.inputValue();
  console.log('Amapiano filled the box:', before !== after && after.length > 40);
  console.log('  →', after.slice(0, 100));
  await room.locator('button').filter({ hasText: /Late, close, and moving on the off-beat/ }).first().click();
  await page.waitForTimeout(600);
  const third = await box.inputValue();
  console.log('second press walks to the other scaffold:', third !== after);
  console.log('  →', third.slice(0, 100));
}
console.log('\nstart frame note (no engine here):', /Start from a picture|Premium grade/i.test(text));
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();

import { enter, studio } from './enter.mjs';
const THIN = ['Studio', 'Soundboard', 'Music video', 'Hooks', 'Channel', 'Live', 'Podcast'];
const { browser, page } = await enter();
const room = await studio(page);
// The rail is the same on every room; subtract it by taking only the working pane.
for (const name of THIN) {
  await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click();
  await page.waitForTimeout(1200);
  const text = (await room.innerText()).replace(/\n+/g, ' | ');
  const after = text.split('Collab Radar | Podcasts and creators | ')[1] ?? text;
  console.log(`\n───── ${name} ─────`);
  console.log(after.slice(0, 700));
}
await browser.close();

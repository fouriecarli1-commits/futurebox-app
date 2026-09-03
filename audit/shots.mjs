import { enter, studio } from './enter.mjs';
const ROOMS = ['Make a song','Studio','The Booth','Your voice','Soundboard','Music video',
  'Video desk','Hooks','Channel','Live','Podcast','Adverts','Collab Radar'];
const { browser, page } = await enter();
const room = await studio(page);
for (const name of ROOMS) {
  try {
    await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1200);
    const file = `audit/r-${name.replace(/\W+/g,'-').toLowerCase()}.png`;
    await page.screenshot({ path: file });
    console.log('shot', file);
  } catch { console.log('skip', name); }
}
await browser.close();

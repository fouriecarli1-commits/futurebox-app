import { enter, studio } from './enter.mjs';
const name = process.argv[2];
const { browser, page, problems } = await enter();
const room = await studio(page);
await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click();
await page.waitForTimeout(1500);
const RAIL = ['Make a song','Studio','The Booth','Your voice','Soundboard','Music video','Video desk','Hooks','Channel','Live','Podcast','Adverts','Collab Radar'];
const seen = [];
for (const b of await room.locator('button:visible').all()) {
  const first = (await b.innerText().catch(()=>'')).split('\n')[0].trim();
  if (first && !RAIL.includes(first)) seen.push(first.slice(0, 50));
}
console.log(`${name}: ${seen.length} controls`);
console.log(seen.map((s,i)=>`  ${i+1}. ${s}`).join('\n'));
console.log('\nTEXT:', (await room.innerText()).split('Collab Radar').pop().replace(/\n+/g,' | ').slice(0, 900));
console.log('\nPROBLEMS:', problems.join(' ;; ') || 'none');
await browser.close();

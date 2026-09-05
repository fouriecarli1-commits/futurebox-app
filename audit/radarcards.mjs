/**
 * The radar's headings open what they name.
 *
 * They used to be plain headings: pressing one did nothing, and the only link
 * on the card went to the tool vendor's front page. Somebody pressing
 * "Autonomous Coding & Micro-SaaS with Cursor AI" landed on cursor.com, which
 * says none of that — a broken link as far as the reader is concerned, even
 * though the href was exactly what it claimed to be.
 */
import { enter } from './enter.mjs';
/* Signed in and past the door. The tabs live on the feed behind both, so a
   plain goto found no radar tab and the probe timed out against a welcome
   screen rather than against a fault. */
const { browser: b, page: p } = await enter({ width: 390, height: 844 });
await p.waitForTimeout(1200);

const radar = p.locator('button').filter({ hasText: /Radar/i }).first();
/* Scrolled to first. The feed's tab strip scrolls sideways and on a 390-pixel
   screen the radar tab sits off the right edge — the same shape of fault the
   studio rail had, and the reason a plain click timed out against a tab that
   exists. */
await radar.scrollIntoViewIfNeeded();
await radar.click();
await p.waitForTimeout(1200);

let bad = 0;
for (const title of ['Autonomous Coding', 'AI Voice Operators', 'Generative Frontend']) {
  const head = p.locator('button').filter({ hasText: title }).first();
  if (!(await head.count())) { console.log(`✗ "${title}" nie op die blad nie`); bad += 1; continue; }
  await head.click();
  await p.waitForTimeout(900);
  /* The briefing is open when the steps are on screen — they exist nowhere
     else, so finding one proves it is the blueprint and not the card. */
  const body = await p.locator('body').innerText();
  const opened = /Install Cursor AI|Configure real-time WebRTC|Open v0\.dev/i.test(body);
  console.log(`${opened ? '✓' : '✗'} "${title}" → ${opened ? 'bloudruk oop' : 'niks gebeur nie'}`);
  if (!opened) bad += 1;
  const close = p.locator('button').filter({ hasText: /^(Close|Maak toe)/i }).first();
  if (await close.count()) await close.click().catch(() => undefined);
  else await p.keyboard.press('Escape');
  await p.waitForTimeout(600);
}

/* And the outward link still says where it goes. */
const links = await p.locator('a[target="_blank"][title]').evaluateAll((els) =>
  els.filter((el) => /cursor|livekit|v0/i.test(el.textContent ?? '')).map((el) => `${el.textContent.trim()} → ${el.getAttribute('href')}`),
);
console.log(`\n${links.length} skakels na die gereedskap self:`);
links.forEach((l) => console.log('   ' + l));

await b.close();
console.log(bad ? `\n${bad} verkeerd` : '\nreg — elke opskrif maak sy eie bloudruk oop');
process.exit(bad ? 1 : 0);

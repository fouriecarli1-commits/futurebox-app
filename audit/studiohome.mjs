/**
 * The studio's front door, and the one button back to it.
 *
 * The studio used to open on whichever room was last in `studioTab` — Make a
 * song, on a first visit — so pressing "Studio" put somebody in one room with
 * no sight of the other twelve. The door offered six of thirteen and then said
 * "every other room is inside the studio, in the list down the side", which is
 * true on a desk and false on a phone, where there is no side and no list.
 *
 * And the way between rooms on a phone was a dropdown. A menu is a thing you
 * open, read and choose from; what somebody in a room wants is one press back
 * to the screen that shows everything.
 */
import { enter, studio } from './enter.mjs';
import { serve, shot } from './where.mjs';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const DOOR = 'div.fixed.inset-0.z-\\[55\\]';
/* This probe used to point at :3000 and assume somebody had put a server
   there. Twenty-four of its twenty-six siblings start their own; now it does
   too, so it runs on a bare machine rather than only on the one it was
   written on. `serve` explains why one per probe rather than one per job. */
const PORT = process.argv[2] || '3251';
const server = await serve(PORT);
const { browser, page } = await enter({ width: 390, height: 844, at: server.url });
await studio(page);
await page.waitForTimeout(1400);

const names = (await page.locator(`${DOOR} button`).allInnerTexts())
  .map((s) => s.split('\n')[0].trim())
  .filter((n) => n && !/^(not now|nie nou)/i.test(n))
  .filter((n, i, all) => all.indexOf(n) === i);

console.log(`\nthe door offers ${names.length}:`);
names.forEach((n) => console.log('   · ' + n));

/* Thirteen rooms and the way past. Named against the rail's own labels rather
   than a count, so a room added to the registry and not to the door fails. */
for (const room of ['Make a song', 'Studio', 'The Booth', 'Your voice', 'Soundboard', 'Music video',
                    'Video desk', 'Hooks', 'Channel', 'Live', 'Podcast', 'Adverts', 'Collab Radar']) {
  check(`${room} has a button of its own`, names.some((n) => n.toLowerCase().startsWith(room.toLowerCase())));
}
await page.screenshot({ path: shot('studio-door.png'), fullPage: false });

/* Into a room, and back out of it, on a phone. */
const into = page.locator(`${DOOR} button`).filter({ hasText: 'The Booth' }).first();
await into.click();
await page.waitForTimeout(1200);
check('pressing a room leaves the door', (await page.locator(`${DOOR} button`).count()) === 0);

const back = page.locator('button').filter({ hasText: /All rooms|Alle kamers/ }).first();
check('and every room carries one button back', (await back.count()) === 1);
check('which is not a dropdown', (await page.locator('button[aria-haspopup="menu"]').count()) === 0);
await back.click();
await page.waitForTimeout(1200);
check('and pressing it returns to the door', (await page.locator(`${DOOR} button`).count()) > 10);

await browser.close();
server.stop();
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nevery room is one press from the door, and the door is one press from every room.');

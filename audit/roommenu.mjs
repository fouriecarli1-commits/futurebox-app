/**
 * Can a phone reach every room?
 *
 * The rail is a sideways-scrolling row: measured at 390 px it was 1,726 px
 * wide, so eleven of the fourteen rooms sat off the right edge with nothing
 * to say they were there. They were reported as missing, which is a fair
 * name for a room nobody can see.
 *
 * This opens the phone's room menu, counts what it offers, and presses the
 * three that were reported missing to check each one actually lands.
 */
import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';

const { browser, page, problems } = await enter({ width: 390, height: 844 });
await studio(page);
await page.waitForTimeout(1200);

const opener = page.locator('button[aria-haspopup="menu"]').first();
if (!(await opener.count())) {
  console.log('geen kamer-kieslys op die foon nie');
  await browser.close();
  process.exit(1);
}

console.log('knoppie wys :', (await opener.innerText()).replace(/\s+/g, ' ').trim());
await opener.click();
await page.waitForTimeout(500);

const items = await page.locator('[role="menu"] [role="menuitem"]').allInnerTexts();
const names = items.map((s) => s.split('\n')[0].trim());
console.log(`kieslys      : ${names.length} inskrywings`);
names.forEach((n) => console.log('   · ' + n));
await page.screenshot({ path: shot('roommenu-phone.png'), fullPage: false });

let bad = 0;
if (names.length < 14) { console.log(`\n✗ verwag ten minste 14, kry ${names.length}`); bad += 1; }

// The three that were reported missing, pressed for real.
for (const want of ['Podcast', 'Collab', 'Live']) {
  const open = page.locator('button[aria-haspopup="menu"]').first();
  if ((await open.getAttribute('aria-expanded')) !== 'true') {
    await open.click();
    await page.waitForTimeout(400);
  }
  /* Matched on the entry's first line, which is the room's name. A plain
     hasText also searches the hint under it, and "Podcast" appears in the
     video desk's hint — so pressing "Podcast" opened the video desk and the
     probe called a working menu broken. */
  const rows = page.locator('[role="menu"] [role="menuitem"]');
  const labels = (await rows.allInnerTexts()).map((s) => s.split('\n')[0].trim());
  const at = labels.findIndex((l) => l.toLowerCase().startsWith(want.toLowerCase()));
  if (at < 0) { console.log(`✗ ${want} is nie in die kieslys nie`); bad += 1; continue; }
  await rows.nth(at).click();
  await page.waitForTimeout(900);
  /* The second line. The button names itself "All rooms" — it is the way
     between rooms, not the name of the room you are in — and says where you
     are underneath. Reading line one reported every landing as a failure. */
  const now = ((await open.innerText()).split('\n')[1] ?? '').trim();
  const landed = now.toLowerCase().includes(want.toLowerCase());
  console.log(`${landed ? '✓' : '✗'} ${want.padEnd(8)} → knoppie wys nou "${now}"`);
  if (!landed) bad += 1;
}

// The rail must still be the desktop's, untouched.
const desk = await page.evaluate(() => {
  const nav = Array.from(document.querySelector('aside').parentElement.children).find((el) => el.tagName === 'NAV');
  return { hiddenOnPhone: getComputedStyle(nav).display === 'none' };
});
console.log(desk.hiddenOnPhone ? '✓ rail is weg op die foon' : '✗ rail is nog op die foon — twee navigasies');
if (!desk.hiddenOnPhone) bad += 1;

if (problems.length) console.log('probleme:', problems.slice(0, 4).join(' | '));
await browser.close();
console.log(bad ? `\n${bad} verkeerd` : '\nreg — elke kamer is een druk weg op die foon');
process.exit(bad ? 1 : 0);

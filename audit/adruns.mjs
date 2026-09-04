/**
 * A run planned, tagged, ticked off, and still there after a reload.
 *
 * `check:adrun` proves the tagging as arithmetic. This proves it reaches the
 * screen: that the link a person actually copies carries the platform it is
 * next to, and that ticking one platform does not tick another — which is the
 * failure mode of a checklist built with a shared piece of state, and one that
 * looks fine until somebody uses it.
 */
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3028';
const af = process.argv[3] === 'af';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');
await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);

async function signIn() {
  const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 40000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('toets-wagwoord-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2500);
}
async function intoTheDesk() {
  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: af ? /^Advertensies/ : /^Adverts/ }).first().click();
  await p.waitForTimeout(1800);
  return room;
}

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
await signIn();
let room = await intoTheDesk();

const words = await room.innerText();
check('the run panel is in the advert desk',
  af ? /Wanneer dit uitgaan, en waarheen/.test(words) : /When it goes out, and where/.test(words));
check('it says why the tags matter',
  af ? /een reël in jou syfers/.test(words) : /one line in your analytics/.test(words));
check('and that nothing is sent from here',
  af ? /Niks word van hier gestuur nie/.test(words) : /Nothing is sent from here/.test(words));

await room.locator('button').filter({ hasText: af ? /^Beplan 'n lopie/ : /^Plan a run/ }).first().click();
await p.waitForTimeout(600);

const runBox = room.locator('input[id^="run-name-"]').first();
check('a run was planned', (await runBox.count()) > 0);
await runBox.fill('Winter Sale');
await room.locator('input[id^="run-link-"]').first().fill('https://shop.example.co.za/boots?size=9');
await p.waitForTimeout(700);

const links = await room.locator('code').allInnerTexts();
check('there is a link per platform', links.length >= 4, String(links.length));
check('each carries its own platform as the source',
  links.every((one) => /utm_source=/.test(one)) &&
    new Set(links.map((one) => (one.match(/utm_source=([a-z0-9-]+)/) || [])[1])).size === links.length,
  links.map((o) => (o.match(/utm_source=([a-z0-9-]+)/) || [])[1]).join(','));
check('they share one campaign, slugged', links.every((one) => /utm_campaign=winter-sale/.test(one)), links[0]);
check('and the link’s own parameters survive', links.every((one) => /size=9/.test(one)), links[0]);

/* Ticking one must not tick another. A checklist built on shared state looks
   right until somebody uses it, and then it is wrong in a way that costs a
   post rather than a pixel. */
const ticks = room.locator('li button[aria-pressed]');
await ticks.first().click();
await p.waitForTimeout(400);
const pressed = await ticks.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('aria-pressed')));
check('ticking one platform ticks only that one',
  pressed[0] === 'true' && pressed.slice(1).every((one) => one === 'false'),
  pressed.join(','));
check('the count follows', /1\/\d/.test(await room.innerText()), (await room.innerText()).match(/\d\/\d/)?.[0] || 'none');

// A date, and what it says about it.
await room.locator('input[type="date"]').first().fill('2020-01-01');
await p.waitForTimeout(500);
check('a day that has passed reads as overdue',
  af ? /Hierdie dag is verby/.test(await room.innerText()) : /This day has passed/.test(await room.innerText()));

// The copy button hands over the same string that is on screen.
await room.locator('li button[aria-label]').first().click();
await p.waitForTimeout(500);
const clip = await p.evaluate(() => navigator.clipboard.readText().catch(() => ''));
check('the copy button copies the tagged link', /utm_source=/.test(clip) && /winter-sale/.test(clip), clip.slice(0, 60));

// It survives a reload — a plan for next week is no use if it is gone tomorrow.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await signIn();
room = await intoTheDesk();
const back = await room.locator('input[id^="run-name-"]').first().inputValue();
const stillTicked = await room.locator('li button[aria-pressed="true"]').count();
check('the run survives a reload', back === 'Winter Sale' && stillTicked === 1, `${back}, ${stillTicked} ticked`);

await p.screenshot({ path: shot(`adruns-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

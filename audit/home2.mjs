/**
 * The home page, pressed quickly.
 *
 * The studio's audit reopens the room before every press so that "nothing
 * changed" means something. The home tabs have far more controls than a room
 * and that approach does not finish, so this one presses in sequence and only
 * claims to catch the things that survive a changing page: thrown errors and
 * refused requests.
 */
import { enter } from './enter.mjs';
const { browser, page, problems } = await enter();

const TABS = ['Spotlight', 'FutureBox Podcasts', 'Masterclasses', 'Creative AI Music & Video', 'AI Trends Radar'];
const SKIP = /^(delete|sign out|creator studio|upgrade|choose |buy|pay|english|afrikaans)/i;
const nameOf = (t) => (t ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 44);

for (const tab of TABS) {
  await page.locator('button').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  const before = problems.length;
  let pressed = 0;

  const count = await page.locator('button:visible').count();
  for (let i = 0; i < Math.min(count, 60); i += 1) {
    const buttons = page.locator('button:visible');
    if (i >= (await buttons.count())) break;
    const el = buttons.nth(i);
    const label = nameOf(await el.innerText().catch(() => ''));
    if (!label || TABS.includes(label) || SKIP.test(label)) continue;
    await el.click({ timeout: 2500 }).catch(() => {});
    pressed += 1;
    await page.waitForTimeout(280);
    // Anything modal goes away before the next one.
    await page.keyboard.press('Escape').catch(() => {});
  }
  const fresh = problems.slice(before);
  console.log(`${tab.padEnd(28)} pressed ${String(pressed).padStart(2)} — ${fresh.length ? fresh.join(' ;; ') : 'clean'}`);
}
console.log('\nall problems:\n' + (problems.join('\n') || 'none'));
await browser.close();

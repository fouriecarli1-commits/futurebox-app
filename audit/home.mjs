/**
 * The pages outside the studio: the tabs, and everything on them.
 *
 * The studio has had a click-through; this half has not. It is the half a
 * visitor sees first.
 */
import { enter } from './enter.mjs';
const { browser, page, problems } = await enter();

const ALL = ['Spotlight', 'FutureBox Podcasts', 'Masterclasses', 'Creative AI Music & Video', 'AI Trends Radar'];
const TABS = process.argv[2] ? [process.argv[2]] : ALL;
const SKIP = /^(delete|sign out|creator studio|upgrade|choose |buy|pay|english|afrikaans)/i;
const nameOf = (t) => (t ?? '').split('\n')[0].trim().replace(/\s+/g, ' ').slice(0, 46);

for (const tab of TABS) {
  await page.locator('button').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first().click().catch(() => {});
  await page.waitForTimeout(1400);
  const labels = [];
  for (const b of await page.locator('button:visible').all()) {
    const label = nameOf(await b.innerText().catch(() => ''));
    if (label && !ALL.includes(label) && !SKIP.test(label) && !labels.includes(label)) labels.push(label);
  }
  console.log(`\n════ ${tab} — ${labels.length} controls ════`);

  for (let i = 0; i < labels.length; i += 1) {
    // Back to a known state before each press.
    await page.locator('button').filter({ hasText: new RegExp(`^${tab}$`, 'i') }).first().click().catch(() => {});
    await page.waitForTimeout(700);
    const kept = [];
    for (const b of await page.locator('button:visible').all()) {
      const label = nameOf(await b.innerText().catch(() => ''));
      if (label && !ALL.includes(label) && !SKIP.test(label)) kept.push({ b, label });
    }
    const target = kept[i];
    if (!target) continue;
    const before = problems.length;
    const dom = await page.locator('body').innerHTML().catch(() => '');
    try {
      await target.b.click({ timeout: 3500 });
      await page.waitForTimeout(650);
    } catch {
      console.log(`  ✗ ${target.label} — click refused`);
      continue;
    }
    const after = await page.locator('body').innerHTML().catch(() => '');
    const fresh = problems.slice(before);
    if (fresh.length) console.log(`  ✗ ${target.label} — ${fresh.join(' ;; ')}`);
    else if (dom === after) console.log(`  ? ${target.label} — nothing changed`);
    await page.keyboard.press('Escape').catch(() => {});
  }
}
console.log('\nall problems:', problems.join('\n') || 'none');
await browser.close();

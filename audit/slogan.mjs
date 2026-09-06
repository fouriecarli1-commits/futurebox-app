/**
 * The Afrikaans welcome, looked at rather than argued about.
 *
 * The slogan is the one line a visitor reads before deciding to stay, so it
 * gets measured the way every other line does: does it fit on the narrowest
 * phone, does it wrap somewhere that reads badly, and is it actually the
 * Afrikaans text rather than the English fallback showing through.
 */
import { chromium, devices } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const b = await chromium.launch(launchOptions());

for (const [name, opts] of [
  ['phone', devices['iPhone SE'] ?? { viewport: { width: 320, height: 700 } }],
  ['desktop', { viewport: { width: 1280, height: 900 } }],
]) {
  const c = await b.newContext(opts);
  await c.addInitScript(() => window.localStorage.setItem('futurebox.lang.v1', 'af'));
  const p = await c.newPage();
  const bad = [];
  p.on('pageerror', (e) => bad.push(String(e).slice(0, 120)));
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const read = await p.evaluate(() => {
    const h1 = document.querySelector('h1');
    const ps = Array.from(document.querySelectorAll('p')).map((el) => el.innerText.trim());
    return {
      h1: h1 ? h1.innerText.replace(/\s+/g, ' ').trim() : '(geen h1)',
      lines: h1 ? h1.getClientRects().length : 0,
      tag: ps.find((s) => s.startsWith('Die hele ateljee')) ?? '(nie gevind)',
      sub: ps.find((s) => s.startsWith('FutureBox')) ?? '(nie gevind)',
      wide: document.documentElement.scrollWidth,
    };
  });

  console.log(`\n${name} (breedte ${read.wide})`);
  console.log(`  merk   ${read.tag}`);
  console.log(`  h1     ${read.h1}   [${read.lines} reël(s)]`);
  console.log(`  onder  ${read.sub}`);
  if (bad.length) console.log(`  foute  ${bad.join(' | ')}`);
  await p.screenshot({ path: shot(`slogan-af-${name}.png`), fullPage: false });
  await c.close();
}
await b.close();

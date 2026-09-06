import { chromium, devices } from 'playwright';
import { launchOptions, shot } from './where.mjs';
const b = await chromium.launch(launchOptions());
for (const [name, opts] of [['phone', devices['iPhone 13']], ['desktop', { viewport: { width: 1280, height: 900 } }]]) {
  const p = await b.newPage({ ...opts });
  const bad = [];
  p.on('pageerror', (e) => bad.push(String(e).slice(0, 120)));
  await p.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1800);
  const width = await p.evaluate(() => document.documentElement.scrollWidth);
  const small = await p.evaluate(() => {
    let n = 0;
    for (const el of Array.from(document.querySelectorAll('button, a, [role="button"]'))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && (r.height < 32 || r.width < 32)) n += 1;
    }
    return n;
  });
  console.log(`${name.padEnd(8)} width ${width} · small targets ${small} · errors ${bad.length ? bad.join(' | ') : 'none'}`);
  await p.screenshot({ path: shot(`landing-${name}.png`), fullPage: false });
  await p.close();
}
await b.close();

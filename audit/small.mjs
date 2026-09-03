import { enter, studio } from './enter.mjs';
const { browser, page } = await enter({ width: 390, height: 844 });
page.on('response', (r) => { if (r.status() === 404) console.log('404 →', r.url()); });
const room = await studio(page);
await room.locator('button').filter({ hasText: /^Your voice/i }).first().click();
await page.waitForTimeout(1200);
const list = await page.evaluate(() => {
  const out = [];
  for (const el of Array.from(document.querySelectorAll('button, [role="button"], a'))) {
    const b = el.getBoundingClientRect();
    if (b.width > 0 && b.height > 0 && (b.height < 32 || b.width < 32)) {
      out.push({
        w: Math.round(b.width), h: Math.round(b.height),
        text: (el.textContent || '').trim().slice(0, 28),
        label: el.getAttribute('aria-label') || '',
        cls: String(el.className).slice(0, 50),
      });
    }
  }
  return out;
});
const seen = new Map();
for (const one of list) {
  const key = `${one.text}|${one.label}|${one.w}x${one.h}`;
  seen.set(key, (seen.get(key) ?? 0) + 1);
}
console.log(`${list.length} small targets, ${seen.size} distinct:`);
for (const [k, n] of [...seen.entries()].sort((a,b)=>b[1]-a[1])) console.log(`  ×${n}  ${k}`);
await browser.close();

/**
 * Does anything push the page wider than the phone it is on?
 *
 * A horizontal scrollbar on a phone is the difference between an app that
 * feels made for the device and one that was made for a laptop and shrunk. The
 * check is the page's own scrollWidth against the viewport: anything wider is
 * something that would not wrap.
 */
import { enter, studio } from './enter.mjs';

const ROOMS = ['Make a song', 'Video desk', 'Adverts', 'Collab Radar', 'Podcast', 'Your voice'];
const { browser, page, problems } = await enter({ width: 390, height: 844 });
const room = await studio(page);

console.log('viewport 390 × 844');
for (const name of ROOMS) {
  try {
    await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click({ timeout: 8000 });
  } catch { console.log(`${name.padEnd(14)} could not open`); continue; }
  await page.waitForTimeout(1100);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  // Anything the reader has to reach sideways for.
  const wide = await page.evaluate(() => {
    const out = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.right > window.innerWidth + 1) {
        const style = getComputedStyle(el);
        // A strip that scrolls inside its own box is meant to be wider.
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue;
        let parent = el.parentElement, inScroller = false;
        while (parent) {
          const ps = getComputedStyle(parent);
          if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { inScroller = true; break; }
          parent = parent.parentElement;
        }
        if (inScroller) continue;
        out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} → ${Math.round(box.right)}px`);
      }
    }
    return out.slice(0, 4);
  });
  console.log(`${name.padEnd(14)} page ${width}px  ${wide.length ? '⚠ ' + wide.join(' | ') : 'fits'}`);
}

// Targets too small to hit with a thumb.
const small = await page.evaluate(() => {
  let n = 0;
  for (const el of Array.from(document.querySelectorAll('button, [role="button"], a'))) {
    const b = el.getBoundingClientRect();
    if (b.width > 0 && b.height > 0 && (b.height < 32 || b.width < 32)) n += 1;
  }
  return n;
});
console.log('\nsmall tap targets on the last room:', small);
console.log('problems:', problems.join(' ;; ') || 'none');
await browser.close();

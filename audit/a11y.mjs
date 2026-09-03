/**
 * Controls a screen reader cannot name.
 *
 * Not a full audit — that needs a person. This is the one class of fault that
 * is both common and completely invisible on screen: an input with no label,
 * or an icon-only button with no `aria-label`, reads out as "edit text" and
 * "button" and tells somebody nothing about what they are about to press.
 */
import { enter, studio } from './enter.mjs';

const ROOMS = ['Make a song','Studio','The Booth','Your voice','Soundboard','Music video',
  'Video desk','Hooks','Channel','Live','Podcast','Adverts','Collab Radar'];
const { browser, page } = await enter();
const room = await studio(page);
let total = 0;

for (const name of ROOMS) {
  try {
    await room.locator('button').filter({ hasText: new RegExp(`^${name}`, 'i') }).first().click({ timeout: 8000 });
    await page.waitForTimeout(900);
  } catch { continue; }

  const bad = await page.evaluate(() => {
    const named = (el) => {
      if (el.getAttribute('aria-label')?.trim()) return true;
      const by = el.getAttribute('aria-labelledby');
      if (by && by.split(/\s+/).some((id) => document.getElementById(id)?.textContent?.trim())) return true;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
      if (el.closest('label')) return true;
      if ((el.textContent || '').trim()) return true;
      if (el.getAttribute('title')?.trim()) return true;
      if (el.getAttribute('placeholder')?.trim()) return true;
      return false;
    };
    const out = [];
    const overlay = document.querySelector('div.fixed.inset-0.z-50');
    const scope = overlay ?? document;
    for (const el of Array.from(scope.querySelectorAll('input, textarea, select, button'))) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (el.type === 'hidden') continue;
      if (!named(el)) {
        out.push(`${el.tagName.toLowerCase()}${el.type ? `[${el.type}]` : ''} .${String(el.className).slice(0, 44)}`);
      }
    }
    return out;
  });

  total += bad.length;
  console.log(`${name.padEnd(14)} ${bad.length === 0 ? 'all named' : `${bad.length} unnamed`}`);
  for (const one of bad.slice(0, 4)) console.log(`    ${one}`);
}
console.log(`\ntotal unnamed controls: ${total}`);
await browser.close();

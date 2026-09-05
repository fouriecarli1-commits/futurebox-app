/**
 * Every piece of text in the studio, against the colour actually behind it.
 *
 * `check:theme` proves the palette's own numbers clear AA. It cannot prove a
 * screen does, because a screen puts a token on a surface the token was not
 * solved against — a zinc-500 note on a zinc-900 card in a light theme, say.
 * This reads the computed colours off the rendered page instead.
 */
import { enter, studio, toRoom } from './enter.mjs';

const ROOMS = ['Make a song', 'Video desk', 'Adverts', 'Your voice', 'Collab Radar', 'Podcast'];
const { browser, page } = await enter();
const room = await studio(page);
let worst = { ratio: 99, what: '' };
let failures = 0;
let checked = 0;
const unreachable = [];

for (const name of ROOMS) {
  /* Through the studio's front door, which is what the studio opens on.

     This used to click the rail directly and swallow the failure with
     `catch { continue; }` — so once the door started covering the rail, every
     room was skipped and the run reported "0 text nodes checked, 0 below AA"
     as a pass. A probe that silently stops visiting anything is worse than one
     that fails, so an unreachable room is now recorded and fails the run. */
  try {
    await toRoom(page, name);
  } catch (why) {
    unreachable.push(`${name}: ${String(why).slice(0, 80)}`);
    continue;
  }

  const result = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const opaque = (el) => {
      let node = el;
      while (node) {
        const bg = getComputedStyle(node).backgroundColor;
        const parts = (bg.match(/[\d.]+/g) ?? []).map(Number);
        if (parts.length >= 3 && (parts.length < 4 || parts[3] > 0.85)) return parts.slice(0, 3);
        node = node.parentElement;
      }
      return [255, 255, 255];
    };
    const out = [];
    const scope = document.querySelector('div.fixed.inset-0.z-50') ?? document.body;
    for (const el of Array.from(scope.querySelectorAll('*'))) {
      const text = Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join(' ');
      if (!text) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || Number(style.opacity) < 0.5) continue;
      const fg = parse(style.color);
      if (fg.length < 3) continue;
      const bg = opaque(el);
      const a = lum(fg), b = lum(bg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(style.fontSize);
      const bold = Number(style.fontWeight) >= 700;
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
      out.push({ ratio: Math.round(ratio * 100) / 100, need, text: text.slice(0, 40), size });
    }
    return out;
  });

  const bad = result.filter((one) => one.ratio < one.need);
  checked += result.length;
  failures += bad.length;
  for (const one of result) {
    if (one.ratio < worst.ratio) worst = { ratio: one.ratio, what: `${name}: "${one.text}"` };
  }
  console.log(`${name.padEnd(14)} ${result.length} text nodes, ${bad.length} below AA`);
  for (const one of bad.slice(0, 3)) {
    console.log(`    ${one.ratio}:1 (needs ${one.need}) — "${one.text}"`);
  }
}
console.log(`\n${checked} text nodes checked, ${failures} below AA. Lowest: ${worst.ratio}:1 — ${worst.what}`);
await browser.close();

/* Nothing checked is not a clean run. */
if (unreachable.length) {
  console.error(`\ncould not reach ${unreachable.length} room(s):\n  ${unreachable.join('\n  ')}`);
}
if (!checked) console.error('\nno text was read at all — this run proves nothing.');
if (failures || unreachable.length || !checked) process.exit(1);

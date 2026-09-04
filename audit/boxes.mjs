/**
 * Buttons with no box.
 *
 * "All these buttons must get boxes" was asked for once about the radar, and
 * the reason generalises: a control drawn as bare text or a bare glyph does not
 * look like a control, so people do not press it. The dub button was sixteen
 * grey pixels between two icons and nobody found the most valuable thing in
 * that room.
 *
 * A box is a border or a background. Text links inside a sentence are excluded
 * — a boxed word in the middle of a paragraph is worse than an unboxed one.
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

  const bare = await page.evaluate((ROOMS) => {
    const out = [];
    const overlay = document.querySelector('div.fixed.inset-0.z-50');
    if (!overlay) return out;
    for (const el of Array.from(overlay.querySelectorAll('button'))) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      const s = getComputedStyle(el);
      const hasBorder = ['Top', 'Right', 'Bottom', 'Left'].some(
        (side) => parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none',
      );
      const bg = (s.backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
      const hasFill = bg.length >= 3 && (bg.length < 4 || bg[3] > 0.04);
      /* A gradient is a fill and does not appear in `backgroundColor`.

         The primary action in several rooms is `bg-gradient-to-r`, which
         computes a transparent `background-color` and puts the colour in
         `background-image` — so the first version of this check reported the
         biggest, most obviously boxed button on the screen as unboxed. */
      const hasGradient = s.backgroundImage !== 'none' && s.backgroundImage !== '';
      if (hasBorder || hasFill || hasGradient) continue;
      // A row that opens a panel, inside a card that is already a box.
      if (el.getAttribute('aria-expanded') !== null) continue;
      // Inside a sentence: leave it as text.
      if (el.closest('p')) continue;
      /* The rail is a navigation list, not a row of controls. Boxing all
         thirteen entries would make the sidebar a wall of boxes and tell a
         reader nothing — the active one already carries a fill, which is the
         only distinction that means anything there.

         Matched on the `nav` it lives in, which is what it is. This used to
         match the entries' English labels against `ROOMS`, which had two
         faults: an Afrikaans run would have reported all thirteen as unboxed,
         and adding a fourteenth entry that is not a room — the way home —
         made the check report it as a fault thirteen times over. A rail entry
         is a rail entry because of where it sits, not because of what it is
         called. */
      if (el.closest('nav')) continue;
      const label = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      out.push(`${label || '(icon only)'} — ${Math.round(box.width)}×${Math.round(box.height)}`);
    }
    return out;
  }, ROOMS);

  total += bare.length;
  if (bare.length) {
    console.log(`${name}: ${bare.length} without a box`);
    for (const one of bare.slice(0, 6)) console.log(`    ${one}`);
  }
}
console.log(`\ntotal buttons with no border and no fill: ${total}`);
await browser.close();

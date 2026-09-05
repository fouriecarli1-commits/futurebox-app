/**
 * Every room, on a phone.
 *
 * Three questions per room, because they are the three ways a screen built on
 * a laptop breaks on a 390-pixel one:
 *
 *   · Does anything push the page wider than the phone? A horizontal
 *     scrollbar is the difference between an app made for the device and one
 *     made for a laptop and shrunk.
 *   · Is anything too small to hit with a thumb? Under 32 px in either
 *     direction is a target people miss.
 *   · Did the room actually draw? A room that renders nothing looks the same
 *     as a room that is merely quiet, and only one of those is a fault.
 *
 * Driven through the phone's room menu rather than the rail. The rail is
 * hidden below md now, so the six-room version of this probe that clicked it
 * had stopped opening anything at all.
 */
import { enter, studio } from './enter.mjs';
import { shot } from './where.mjs';

const { browser, page, problems } = await enter({ width: 390, height: 844 });
await studio(page);
await page.waitForTimeout(1200);

const opener = page.locator('button[aria-haspopup="menu"]').first();
await opener.click();
await page.waitForTimeout(500);
const rooms = (await page.locator('[role="menu"] [role="menuitem"]').allInnerTexts())
  .map((s) => s.split('\n')[0].trim())
  .filter((n) => n && n.toLowerCase() !== 'home');
await page.keyboard.press('Escape').catch(() => undefined);
await page.locator('button[aria-label]').first().click({ timeout: 2000 }).catch(() => undefined);

console.log(`venster 390 × 844 · ${rooms.length} kamers\n`);

let bad = 0;
for (const name of rooms) {
  const open = page.locator('button[aria-haspopup="menu"]').first();
  if ((await open.getAttribute('aria-expanded')) !== 'true') {
    await open.click();
    await page.waitForTimeout(400);
  }
  const rows = page.locator('[role="menu"] [role="menuitem"]');
  const labels = (await rows.allInnerTexts()).map((s) => s.split('\n')[0].trim());
  const at = labels.indexOf(name);
  if (at < 0) { console.log(`${name.padEnd(14)} nie in die kieslys nie`); bad += 1; continue; }
  await rows.nth(at).click();
  await page.waitForTimeout(1300);

  const read = await page.evaluate(() => {
    const surface = document.querySelector('div.fixed.inset-0.z-50') ?? document.body;

    /* Anything the reader has to reach sideways for. A strip that scrolls
       inside its own box is meant to be wider, so those are skipped along
       with everything inside one. */
    const wide = [];
    for (const el of Array.from(surface.querySelectorAll('*'))) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.right <= window.innerWidth + 1) continue;
      const style = getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') continue;
      let parent = el.parentElement, inScroller = false;
      while (parent) {
        const ps = getComputedStyle(parent);
        if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { inScroller = true; break; }
        parent = parent.parentElement;
      }
      if (inScroller) continue;
      wide.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 28)}→${Math.round(box.right)}px`);
    }

    /* Too small for a thumb. The room menu's own backdrop is a full-screen
       button and is not a target anybody aims at. */
    let small = 0;
    for (const el of Array.from(surface.querySelectorAll('button, [role="button"], a'))) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      if (b.width >= window.innerWidth) continue;
      if (b.height < 32 || b.width < 32) small += 1;
    }

    /* The panes, found from the room menu rather than from the aside.

       The voice room draws the copilot inside itself, under "Read a script
       aloud", so it has no aside at all — and anchoring on one reported that
       room as completely empty. The menu is in every room. */
    const menu = document.querySelector('button[aria-haspopup="menu"]')?.closest('div');
    const shell = menu?.parentElement;
    const panes = shell ? Array.from(shell.children) : [];
    const aside = panes.find((el) => el.tagName === 'ASIDE') ?? null;
    const work = panes.find((el) => el !== aside && el !== menu && el.tagName !== 'NAV');

    return {
      pageWidth: document.documentElement.scrollWidth,
      wide: wide.slice(0, 3),
      small,
      words: (work?.innerText ?? '').replace(/\s+/g, ' ').trim().length,
      fields: work ? work.querySelectorAll('input, textarea, select, button').length : 0,
    };
  });

  const flags = [];
  if (read.pageWidth > 390) flags.push(`blad ${read.pageWidth}px breed`);
  if (read.wide.length) flags.push(`oorloop: ${read.wide.join(' | ')}`);
  if (read.small) flags.push(`${read.small} klein teiken(s)`);
  if (read.words < 40) flags.push(`leeg (${read.words} karakters)`);
  if (flags.length) bad += 1;

  console.log(
    `${(flags.length ? '⚠' : '✓')} ${name.padEnd(14)} ${String(read.words).padStart(5)} karakters · ` +
      `${String(read.fields).padStart(3)} kontroles${flags.length ? '  — ' + flags.join(' · ') : ''}`,
  );
  await page.screenshot({ path: shot(`phoneroom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`), fullPage: false });
}

if (problems.length) console.log('\nprobleme:\n  ' + problems.slice(0, 8).join('\n  '));
await browser.close();
console.log(bad ? `\n${bad} van ${rooms.length} kamers het iets` : `\nal ${rooms.length} kamers wys reg op die foon`);

/**
 * Every piece of text in the studio, against the colour actually behind it.
 *
 * `check:theme` proves the palette's own numbers clear AA. It cannot prove a
 * screen does, because a screen puts a token on a surface the token was not
 * solved against — a zinc-500 note on a zinc-900 card in a light theme, say.
 * This reads the computed colours off the rendered page instead.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const ROOMS = ['Make a song', 'Video desk', 'Adverts', 'Your voice', 'Collab Radar', 'Podcast'];
const PORT = process.argv[2] || '3074';

/* Its own server, like every other probe.
 
   This file has been right since it was written and has never once run. It
   pointed `enter()` at its default localhost:3000 and assumed somebody had
   put a server there — which is exactly the fault check:probes exists to
   prevent, and is why it is in no npm script and no CI step. So the tool that
   reads the real colour of every piece of text against what is actually
   behind it was sitting in the repository while the line she is meant to sing
   measured 1.02:1 on the singing screen. */
const server = await serve(PORT);
const { browser, page } = await enter({ at: server.url });
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

  const result = await measure(page);
  score(name, result);
}

/* ── The five tabs, which is where members actually are ─────────────────
 
   Added 10 September 2026, after the music quiz went onto the creative page
   and nothing was measuring whether a word on it could be read.
 
   This probe walked six STUDIO rooms and stopped. Those are rooms somebody
   opens to do a job; the five tabs at the bottom are where they live between
   jobs, and the creative page is the longest scroll in the app. A palette
   fault there is seen by everybody, every visit, and was covered by nothing.
 
   The Spotlight tab carries its own row of chips — Kollig, FutureBox,
   Masterclasses, Kreatiewe AI-musiek en -video, Radar — and the quiz sits at
   the bottom of the fourth. So the chips are walked as well as the tabs,
   because "the Spotlight tab" and "the creative page" are not the same
   screen and only one of them was ever going to be looked at. */
const TABS = ['Spotlight', 'Live', 'Library', 'You'];
const CHIPS = ['Music & video', 'Musiek en video'];

for (const name of TABS) {
  try {
    const bar = page.locator('nav[aria-label]').first();
    await bar.locator('button').filter({ hasText: new RegExp(`^${name}$`) }).first().click();
    await page.waitForTimeout(1200);
  } catch (why) {
    unreachable.push(`tab ${name}: ${String(why).slice(0, 80)}`);
    continue;
  }
  score(`tab ${name}`, await measure(page));

  if (name === 'Spotlight') {
    /* The chip, by either language. A run in Afrikaans must reach the same
       screen — this probe has no business caring which language it is in,
       and a name matched in one language only is a silent skip in the other. */
    let opened = false;
    for (const chip of CHIPS) {
      const found = page.locator('button').filter({ hasText: chip }).first();
      if (await found.count()) {
        await found.click();
        await page.waitForTimeout(1200);
        opened = true;
        break;
      }
    }
    if (!opened) unreachable.push('the creative page: no chip matched');
    else score('creative page', await measure(page));
  }
}

console.log(`\n${checked} text nodes checked, ${failures} below AA. Lowest: ${worst.ratio}:1 — ${worst.what}`);
await browser.close();
server.stop();

if (unreachable.length) {
  console.error(`\ncould not reach ${unreachable.length} screen(s):\n  ${unreachable.join('\n  ')}`);
}
if (!checked) console.error('\nno text was read at all — this run proves nothing.');
if (failures || unreachable.length || !checked) process.exit(1);

/* ── The two halves, out of the loop so both passes share them ──────────
 
   They were inline in the room loop. Lifting them is what let the tabs be
   walked at all: a second copy of the colour maths would have been a second
   place for the AA rule to drift, in the file whose whole job is that rule. */
async function measure(target) {
  return target.evaluate(() => {
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
}

function score(name, result) {
  const bad = result.filter((one) => one.ratio < one.need);
  checked += result.length;
  failures += bad.length;
  for (const one of result) {
    if (one.ratio < worst.ratio) worst = { ratio: one.ratio, what: `${name}: "${one.text}"` };
  }
  console.log(`${name.padEnd(16)} ${result.length} text nodes, ${bad.length} below AA`);
  for (const one of bad.slice(0, 4)) {
    console.log(`    ${one.ratio}:1 (needs ${one.need}) — "${one.text}"`);
  }
}

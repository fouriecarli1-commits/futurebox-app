/**
 * Afrikaans fits where it is put — at the phone's own font size and at the
 * "Large" one — and no word is ever broken in the middle.
 *
 * The owner, 24 October 2026, with a photograph of the studio door on her
 * phone: *"Jy gaan 'n hele sweep deur Afrikaans moet doen. Die woorde pas nie
 * op een plek in nie. Dit is nie reg nie."* The photograph read "Stemkloni /
 * ng" and "Videolesse / naar": `break-words` had done what it does when a
 * compound is wider than its column, and her phone's font size is a notch
 * above the default, which no probe here had ever asked for.
 *
 * So this walks every door and room in Afrikaans at 390 pixels, twice —
 * once at the default size and once with the root font at 130%, which is
 * what Android's "Large" text setting does to a page set in rem — and reads
 * every word on the screen through a Range: a word whose rectangles sit on
 * two different lines was broken in the middle. A soft hyphen (U+00AD) or a
 * real one is a place a word MAY break, and is not counted. It also reports
 * any text that runs past the right edge of the screen.
 */
import { enter, pressTab, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';
import { ROOMS, ROOMS_AF } from './rooms.mjs';

const PORT = process.argv[2] || '3412';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

/* Runs in the page. Every visible word, measured. */
const READ = () => {
  const out = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const wide = window.innerWidth;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? '';
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    if (parent.closest('script, style, noscript, textarea, input, [aria-hidden="true"], [data-launchmark], [data-sideways], .overflow-x-auto')) continue;
    /* A line cut with an ellipsis on purpose is `check:notcut`'s to judge —
       it knows which of those are names and which are the app's own words.
       Here a word past the edge inside one would be reported twice. */
    if ([parent, ...(function* up(el) { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) yield e; })(parent)]
      .some((el) => getComputedStyle(el).textOverflow === 'ellipsis')) continue;
    const cs = getComputedStyle(parent);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const box = parent.getBoundingClientRect();
    if (box.width === 0) continue;
    /* A box that clips sideways on purpose — a ticker, a strip that scrolls —
       is named, so the finding says where the word lives. */
    let clipper = null;
    for (let up = parent; up && up !== document.body; up = up.parentElement) {
      const c = getComputedStyle(up);
      if (c.overflowX !== 'visible' && up.scrollWidth > up.clientWidth + 1) { clipper = up; break; }
    }
    const cls = (el) => (typeof el.className === 'string' ? el.className.split(' ').filter(Boolean).slice(0, 5).join('.') : '');
    const label = `${parent.tagName.toLowerCase()}.${cls(parent)}${clipper ? ` inside ${clipper.tagName.toLowerCase()}.${cls(clipper)}` : ''}`;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      const word = m[0];
      const range = document.createRange();
      range.setStart(node, m.index);
      range.setEnd(node, m.index + word.length);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rects.length) continue;
      const right = Math.max(...rects.map((r) => r.right));
      if (right > wide + 1) {
        const key = `off:${word}`;
        if (!seen.has(key)) { seen.add(key); out.push(`runs off the screen: “${word}” in ${label} (${Math.round(right - wide)}px past the edge)`); }
      }
      const letters = word.replace(/[^\p{L}]/gu, '');
      if (letters.length < 5 || /[-­‐‑/]/.test(word)) continue;
      const tops = new Set(rects.map((r) => Math.round(r.top)));
      if (tops.size > 1) {
        const key = `broken:${word}:${label}`;
        if (!seen.has(key)) { seen.add(key); out.push(`broken in the middle: “${word}” in ${label}`); }
      }
    }
  }
  return out;
};

const server = await serve(PORT);
const { browser, page } = await enter({ at: server.url, lang: 'af', width: 390, height: 844, touch: true });
try {
  await studio(page);
  /* 390 at both sizes, and her own phone's 360 at the larger one — the
     photograph was taken on a 360-pixel Samsung with the text a notch up. */
  const passes = [[390, '100%'], [390, '130%'], [360, '130%']];
  const only = process.env.AFWRAP_ONLY ? Number(process.env.AFWRAP_ONLY) : 0;
  const screens = [
    ['die ateljee se deur', async () => { await pressTab(page, 'Maak').catch(() => undefined); }],
    ...ROOMS.map((english) => [`${english} (${ROOMS_AF[english]})`, async () => { await toRoom(page, ROOMS_AF[english]); }]),
    ['Kollig', async () => { await pressTab(page, 'Kollig'); }],
    ['Live', async () => { await pressTab(page, 'Live'); }],
    ['Kanaal', async () => { await pressTab(page, 'Kanaal'); }],
    ['Jy', async () => { await pressTab(page, 'Jy'); }],
  ];
  if (only) screens.splice(only);
  for (const [width, scale] of (only ? [[390, '100%']] : passes)) {
    await page.setViewportSize({ width, height: 844 });
    console.log(`\n── ${width} wide, root font ${scale}`);
    for (const [name, go] of screens) {
      try {
        await go();
      } catch (error) {
        check(`${name} opens`, false, String(error).slice(0, 80));
        continue;
      }
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
      await page.waitForTimeout(600);
      const found = await page.evaluate(READ);
      check(`${name} at ${width}px, ${scale}: every word whole and on the screen`, found.length === 0, found.slice(0, 6).join(' · '));
    }
  }
} finally {
  await browser.close();
  server.stop();
}

if (problems.length) {
  console.log(`\ncheck:afwrap — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log('\ncheck:afwrap — every Afrikaans word on every door and room is whole and on the screen, at the phone’s own size and a notch larger.');

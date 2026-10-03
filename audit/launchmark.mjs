/**
 * The screen the app opens with, walked in a browser.
 *
 * ── What a source check cannot say ───────────────────────────────────────
 *
 * `check:launchmark` reads the markup, the stylesheet and the pixels of the
 * startup pictures. All three can be right while the screen itself is wrong,
 * in ways only a browser knows:
 *
 *  - a rule that exists but does not apply, because something later in the
 *    cascade wins;
 *  - a splash that covers the app and then does not leave, which no amount of
 *    reading CSS proves — the animation has to actually run;
 *  - a word painted in a colour nobody can read on the ground behind it.
 *
 * ── Why the media query is flipped rather than emulated ──────────────────
 *
 * `display-mode: standalone` is true when the operating system launched the
 * page from an installed icon, and there is no way to put a headless browser
 * in that state: Chromium's app mode needs a window, and this runs on a
 * machine with no screen.
 *
 * So the probe finds the shipped `@media (display-mode: standalone)` rule in
 * the live stylesheet and widens it to `all`. That is not a test hook and not
 * a second copy of the rule: it is the rule the app ships, applied. If
 * somebody deletes it, mistypes the query, or moves the launch screen out
 * from behind it, there is nothing to find and the probe says so.
 */
import { enter } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = 3341;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

const server = await serve(PORT);

/* ── Before anything else: it is in the HTML the server sent ───────────── */

const sent = await fetch(server.url).then((r) => r.text());
check('the launch screen is in the HTML the server sends',
  /data-launchmark/.test(sent) && /data-launchmarkword/.test(sent),
  'this is the whole point of it being markup: it is on the screen in the'
  + ' first paint, before React has loaded, let alone hydrated');

/* Read from the word's own element rather than from a window of characters
   after the block starts: the mark's svg is six hundred of them, so a window
   wide enough today is a window that silently stops covering the words the
   next time the glyph gains a path. */
const said = sent.slice(sent.indexOf('data-launchmarkword'));
check('  with the name in it, not only the mark',
  /^data-launchmarkword[^>]*>FUTURE<span>BOX<\/span>/.test(said),
  `${said.slice(0, 120)} — her request in one line: "die futurebox woorde`
  + ' logo moet saam launch"');

const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

/* ── In an ordinary tab, it stays out of the way ───────────────────────── */

check('in a browser tab there is no splash over the page',
  !(await p.locator('[data-launchmark]').isVisible().catch(() => false)),
  'a tab has no system screen to cover, and the landing page draws this same'
  + ' mark four times the size a moment later');

/* ── The shipped rule, found and applied ───────────────────────────────── */

const widened = await p.evaluate(() => {
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules) {
      /* The closing bracket is load-bearing. Without it this matched
         `(display-mode: standalonex)` too — a typo Chromium keeps verbatim in
         `conditionText`, never complains about, and never matches. The probe
         was run against exactly that typo and passed, which is the whole
         reason the bracket is here. */
      if (rule.media && /\(display-mode:\s*standalone\)/.test(rule.conditionText ?? '')) {
        const governs = [...rule.cssRules].some((inner) => /data-launchmark/.test(inner.selectorText ?? ''));
        if (!governs) continue;
        rule.media.mediaText = 'all';
        return true;
      }
    }
  }
  return false;
});

check('the launch screen is behind a display-mode rule, and that rule governs it',
  widened,
  'found in the stylesheet the browser actually parsed — a query with a typo'
  + ' in it never matches and never complains');

await p.waitForTimeout(60);

const covers = await p.locator('[data-launchmark]').evaluate((el) => {
  const box = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return {
    wide: Math.round(box.width),
    tall: Math.round(box.height),
    shown: style.display,
    taps: style.pointerEvents,
    ground: style.backgroundColor,
  };
}).catch(() => null);

check('once the app is launched from its icon, it covers the screen',
  !!covers && covers.shown === 'flex'
  && covers.wide >= (p.viewportSize()?.width ?? 0) - 1
  && covers.tall >= (p.viewportSize()?.height ?? 0) - 1,
  `${JSON.stringify(covers)} — a splash with the page showing round it is a`
  + ' panel, not a launch screen');

check('  and it never takes a tap, not even while it is up',
  covers?.taps === 'none',
  `pointer-events: ${covers?.taps} — it is a picture over a working app, and`
  + ' somebody who knows where the button is should reach it');

const word = await p.locator('[data-launchmarkword]').evaluate((el) => ({
  says: (el.textContent ?? '').trim(),
  seen: el.getBoundingClientRect().width > 40 && el.getBoundingClientRect().height > 8,
})).catch(() => null);

check('the words are painted, not merely present',
  word?.says === 'FUTUREBOX' && word.seen,
  `${JSON.stringify(word)} — "net die app icon" was the complaint, and a`
  + ' word at zero height is the same as no word');

/* ── Readable, on the ground it is painted on ──────────────────────────── */

const ratio = await p.evaluate(() => {
  const band = (colour) => {
    const [r, g, b] = (colour.match(/\d+(\.\d+)?/g) ?? ['0', '0', '0']).map(Number);
    const lift = (one) => {
      const part = one / 255;
      return part <= 0.03928 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lift(r) + 0.7152 * lift(g) + 0.0722 * lift(b);
  };
  const ground = band(getComputedStyle(document.querySelector('[data-launchmark]')).backgroundColor);
  const worst = [...document.querySelectorAll('[data-launchmarkword], [data-launchmarkword] > span')]
    .map((el) => {
      const ink = band(getComputedStyle(el).color);
      const light = Math.max(ink, ground);
      const dark = Math.min(ink, ground);
      return (light + 0.05) / (dark + 0.05);
    });
  return Math.min(...worst);
});

check('  and both halves of the name are readable on it',
  ratio >= 4.5,
  `${ratio.toFixed(2)}:1 — "FUTURE" and "BOX" are different colours and only`
  + ' one of them was ever checked on a light ground');

/* ── And it leaves, on its own ─────────────────────────────────────────── */

await p.waitForTimeout(2200);

const after = await p.locator('[data-launchmark]').evaluate((el) => {
  const style = getComputedStyle(el);
  return { shown: style.visibility, fade: Number(style.opacity) };
}).catch(() => null);

check('it takes itself away, with no JavaScript asked to do it',
  after?.shown === 'hidden' || (after?.fade ?? 1) < 0.02,
  `${JSON.stringify(after)} — the bundle may never arrive on the device`
  + ' somebody is stuck on, and a splash that waits for it stays forever');

const reaches = await p.evaluate(() => {
  const mid = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  return !mid?.closest('[data-launchmark]');
});
check('  and the app underneath is what a tap reaches',
  reaches,
  'a hidden layer still catching presses is a frozen app that looks fine');

await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:launchmark (browser) — ${problems.length} problem(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:launchmark (browser) — the app launched from its own icon opens on'
  + ' its mark and its name, readable, over nothing it can block, and the'
  + ' screen takes itself away without being asked.',
);

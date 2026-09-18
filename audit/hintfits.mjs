/**
 * Every help panel opens on the screen, wherever its mark is.
 *
 * ── The report ───────────────────────────────────────────────────────────
 *
 * Carli, 18 September 2026, the Stems desk in the Pro Booth, with the help
 * panel running off the right-hand edge of the phone: *"Hierdie een
 * description is van die bladsy af."*
 *
 * `Hint` had a rule for this and the rule was about the wrong thing. It
 * opened leftwards from the mark, or rightwards if the MARK sat past the
 * middle of the window — and the thing that hangs off the screen is the
 * PANEL. Her mark is about four tenths of the way across a 390-pixel phone,
 * so it is in the left half and the panel opened leftwards: 164 plus 240 is
 * 404, and the screen ends at 390.
 *
 * ── What is measured ─────────────────────────────────────────────────────
 *
 * A mark at every tenth of the width, plus one at 42% because that is where
 * she found it, each opened in turn, and the panel's own rectangle read off
 * the page. Inside the window on both sides or it is a failure, with the
 * overflow printed in pixels.
 *
 * A probe that pressed one mark would have agreed with whichever rule was
 * in force, which is how this survived being written about twice.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3320';
const PROBE = 'app/probe-hint/page.probe.tsx';
const LIVE = 'app/probe-hint/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let browser;
let server;
try {
  cpSync(PROBE, LIVE);
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  /* A phone, because the panel is 240 wide and a laptop has room for it
     anywhere. The fault only exists where the panel is a large fraction of
     the window. */
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`${server.url}/probe-hint`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ready').waitFor({ timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);

  const marks = page.locator('[data-at]');
  const many = await marks.count();
  check('every mark drew', many === 12, `${many}`);

  let worst = 0;
  for (let at = 0; at < many; at += 1) {
    const one = marks.nth(at);
    const per = await one.getAttribute('data-at');
    await one.locator('button').click();
    const box = await page.evaluate(() => {
      const panel = document.querySelector('[role="tooltip"]');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      return { left: Math.round(rect.left), right: Math.round(rect.right), width: window.innerWidth };
    });
    if (!box) {
      check(`at ${per}% the panel opens`, false, 'no panel');
      continue;
    }
    const over = Math.max(0, -box.left, box.right - box.width);
    if (over > worst) worst = over;
    check(
      `at ${per}% of the width it is on the screen`,
      box.left >= 0 && box.right <= box.width,
      `${box.left}–${box.right} in ${box.width}, ${over}px off`,
    );
    if (Number(per) === 42) await page.screenshot({ path: shot('hint-42.png') });
    /* Shut it before the next one, or two panels are open and the query
       above reads whichever the document hands back first. */
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
  }
  if (worst) console.log(`        worst overflow: ${worst}px`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(
  problems.length
    ? `\ncheck:hintfits — ${problems.length} problem(s):\n- ${problems.join('\n- ')}`
    : '\ncheck:hintfits — a help panel opens inside the screen wherever its mark is, including the band in the middle that neither end of the old rule covered.',
);
process.exit(problems.length ? 1 : 0);

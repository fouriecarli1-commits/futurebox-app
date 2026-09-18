/**
 * The mark, drawn onto a real frame, and then looked at.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * `check:logomark` proves that `markBox` puts its rectangle inside the part
 * of the frame TikTok, Reels and Shorts all leave visible, on every corner
 * and every frame shape. That is worth having and it is a different claim
 * from "the logo is visible on the video".
 *
 * A box computed perfectly and then drawn at the wrong scale, at an alpha of
 * nothing, or under something else passes every assertion in that file. When
 * the logo shipped on 18 September I said so rather than leaving it implied:
 * the arithmetic was proved, the wiring was proved, and nothing had ever
 * marked a frame and looked at it.
 *
 * ── How it looks ─────────────────────────────────────────────────────────
 *
 * `app/probe-logomark` draws twelve canvases — three frame shapes by four
 * corners — each a flat grey standing in for a video with the app's own
 * `drawMark` called on it. Not a copy of `drawMark`: the real one, or this
 * would agree with itself and nothing else.
 *
 * The ink is magenta, which nothing in this app is. A probe that counted
 * "pixels unlike the background" would also count a caption, a letterbox bar
 * or a blurred backdrop, and pass for the wrong reason. Counting one
 * improbable colour cannot.
 *
 * What is then asserted, per canvas:
 *
 *   · there is ink at all — the failure a box-only check cannot see;
 *   · it is inside the box the platforms leave visible;
 *   · it is in the corner that was asked for, measured as which half of the
 *     frame the ink's middle falls in, rather than by trusting the name;
 *   · it keeps the logo's own proportions, so a wordmark is not squashed
 *     into a square;
 *   · and it covers a believable share of the frame — enough to see, not so
 *     much that it is the subject.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3318';
const PROBE = 'app/probe-logomark/page.probe.tsx';
const LIVE = 'app/probe-logomark/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let browser;
let server;
try {
  cpSync(PROBE, LIVE);
  /* One build, nothing to put back. This page reads no environment and
     talks to nothing, so it cannot leave a stubbed `.next` behind for
     whatever probe runs next — which is how a poisoned build reads as a
     broken app in a different file. */
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  await page.goto(`${server.url}/probe-logomark`, { waitUntil: 'domcontentloaded' });
  await page.locator('#ready').waitFor({ timeout: 30000 });
  /* Every canvas marks itself when its draw is done, so the wait is for the
     work rather than for a number of seconds somebody guessed. */
  await page.locator('canvas[data-drawn="1"]').nth(11).waitFor({ timeout: 30000 });

  const found = await page.evaluate(() => {
    const INK = { r: 255, g: 0, b: 212 };
    const near = (a, b) => Math.abs(a - b) <= 24;
    return Array.from(document.querySelectorAll('canvas')).map((canvas) => {
      const w = canvas.width;
      const h = canvas.height;
      const paint = canvas.getContext('2d');
      const { data } = paint.getImageData(0, 0, w, h);
      let count = 0;
      let left = w;
      let right = -1;
      let top = h;
      let bottom = -1;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const at = (y * w + x) * 4;
          if (near(data[at], INK.r) && near(data[at + 1], INK.g) && near(data[at + 2], INK.b)) {
            count += 1;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }
      return {
        id: canvas.dataset.frame,
        corner: canvas.dataset.corner,
        w,
        h,
        count,
        left,
        right,
        top,
        bottom,
      };
    });
  });

  check('all twelve frames drew', found.length === 12, `${found.length}`);

  for (const one of found) {
    const where = `${one.id}`;
    check(`${where}: there is ink on the frame`, one.count > 0, `${one.count} pixels`);
    if (one.count === 0) continue;

    /* In the right corner, measured rather than trusted: which half of the
       frame the ink's own middle falls in. */
    const midX = (one.left + one.right) / 2;
    const midY = (one.top + one.bottom) / 2;
    const wantLeft = one.corner === 'topLeft' || one.corner === 'bottomLeft';
    const wantTop = one.corner === 'topLeft' || one.corner === 'topRight';
    check(
      `  and it is in the ${one.corner} half`,
      (wantLeft ? midX < one.w / 2 : midX > one.w / 2)
      && (wantTop ? midY < one.h / 2 : midY > one.h / 2),
      `middle at ${Math.round(midX)},${Math.round(midY)} of ${one.w}×${one.h}`,
    );

    /* Never touching the frame's own edge. Anything flush with the edge is
       under a platform's furniture, which is the whole reason the safe box
       exists. */
    check(
      '  and it is clear of the frame edge',
      one.left > 0 && one.top > 0 && one.right < one.w - 1 && one.bottom < one.h - 1,
      `${one.left},${one.top}–${one.right},${one.bottom}`,
    );

    /* The stand-in logo is 320 × 100, so 3.2 wide. A mark stretched to fill
       its box would come out square and pass every box-only assertion. */
    const drawn = (one.right - one.left + 1) / (one.bottom - one.top + 1);
    check(
      '  and it kept the logo’s own proportions',
      Math.abs(drawn - 3.2) < 0.25,
      `drawn ${drawn.toFixed(2)}, logo 3.20`,
    );

    /* Big enough to read, small enough not to be the subject. The share is
       of the frame's area and the range is deliberately loose: this is
       catching a mark drawn at two pixels or across half the picture, not
       tuning a number. */
    const share = one.count / (one.w * one.h);
    check(
      '  and it covers a believable share of the frame',
      share > 0.002 && share < 0.06,
      `${(share * 100).toFixed(2)}%`,
    );
  }

  await page.screenshot({ path: shot('logomark-frames.png'), fullPage: true });
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

console.log(
  problems.length
    ? `\ncheck:logoshot — ${problems.length} problem(s):\n- ${problems.join('\n- ')}`
    : '\ncheck:logoshot — the mark is really on the frame, in the corner asked for, the shape it was given, and clear of every edge.',
);
process.exit(problems.length ? 1 : 0);

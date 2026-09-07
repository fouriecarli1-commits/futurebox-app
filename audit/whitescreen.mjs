/**
 * A white screen is never an acceptable answer.
 *
 * Carli: "I accidentally went out of videodesk, and now when I want to go back
 *  in, it only shows a white screen."
 *
 * There was no error boundary in this app — no `error.tsx`, no
 * `global-error.tsx`, nothing catching anywhere. So any throw while drawing,
 * and any piece of JavaScript that failed to arrive, emptied the page: no
 * words, no button, and no way for her to tell a broken app from a phone that
 * had lost its signal.
 *
 * This makes a page fall over on purpose and asserts that what she gets is a
 * sentence she can read and a button she can press. Two shapes of failure:
 * an ordinary throw, and one that looks like a page left open across a deploy
 * asking for a file the new deploy does not have — which is almost certainly
 * hers, and which needs a reload rather than a retry, so it says so.
 */
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3088';
const PROBE = 'app/blowup/page.probe.tsx';
const LIVE = 'app/blowup/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

let server = null;
let browser = null;
let fell = false;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = await serve(PORT);
  browser = await chromium.launch(launchOptions());

  /** What the page shows after it has fallen over. */
  const visit = async (query) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    /* The throw is the point of the page; its console noise is not a fault. */
    page.on('pageerror', () => undefined);
    await page.goto(`${server.url}/blowup${query}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const words = ((await page.locator('body').innerText()) ?? '').replace(/\s+/g, ' ').trim();
    const buttons = await page.locator('button, a[href]').count();
    /* What is actually painted where she is looking, not what `body` says.

       The first version read `getComputedStyle(document.body)` and let
       anything that was not exactly `rgb(255,255,255)` through. It passed on
       `rgb(250, 250, 249)` — the app's own near-white body, which is behind
       the boundary and not the thing on the screen at all. Two faults in one
       line: it measured the wrong element, and its idea of "not white" was a
       string comparison against one exact colour.

       This walks up from the middle of the screen to the first ancestor with
       a background that is not transparent, and answers with its brightness. */
    const painted = await page.evaluate(() => {
      let at = document.elementFromPoint(195, 422);
      while (at) {
        const colour = getComputedStyle(at).backgroundColor;
        const parts = colour.match(/[\d.]+/g);
        if (parts && (parts.length < 4 || Number(parts[3]) > 0)) {
          const [r, g, b] = parts.map(Number);
          return { colour, light: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 };
        }
        at = at.parentElement;
      }
      return { colour: 'nothing painted', light: 1 };
    });
    return { page, words, buttons, painted };
  };

  /* ── An ordinary throw ───────────────────────────────────────────────── */
  {
    const { page, words, buttons, painted } = await visit('');
    check('a page that throws does not come out blank',
      words.length > 40, `${words.length} characters on the screen`);
    check('and says so in Afrikaans, because that is what she reads',
      /verkeerd geloop|opgedateer|kon nie/i.test(words), words.slice(0, 80));
    check('and tells her that nothing of hers was lost',
      /is nie geraak nie|were not touched/i.test(words), words.slice(0, 120));
    check('and gives her something to press',
      buttons >= 2, `${buttons} button(s) and link(s)`);
    /* Dark, not white. The palette in this app remaps white and black onto
       theme variables, so a boundary that trusted `bg-black` would paint
       itself light — the exact screen it exists to replace. */
    check('and is painted dark rather than left white',
      painted.light < 0.2,
      `${painted.colour} — brightness ${painted.light.toFixed(3)}`);
    await page.screenshot({ path: shot('whitescreen.png'), fullPage: false });
    await page.close();
  }

  /* ── A page left open across a deploy ────────────────────────────────── */
  {
    const { page, words } = await visit('?as=stale');
    check('a missing piece of the app is named as an update, not as a fault',
      /opgedateer/i.test(words) && !/verkeerd geloop/i.test(words),
      words.slice(0, 100));
    /* A retry redraws the same tree and asks for the same missing file, so the
       only button offered is the one that actually helps. */
    check('and it is not offered a retry that would fail the same way',
      !/Probeer weer/i.test(words), words.slice(0, 140));
    check('and the reload button is there',
      /Laai weer/i.test(words), words.slice(0, 80));
    await page.close();
  }

  /* Both boundaries exist, because `error.tsx` draws inside the root layout
     and cannot help when the root layout is what threw. */
  check('there is a boundary for the layout itself as well',
    (await import('node:fs')).existsSync('app/global-error.tsx'));
} catch (problem) {
  fell = true;
  console.error(`  FAIL the probe itself fell over — ${String(problem).slice(0, 300)}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
  try { rmSync(LIVE); } catch { /* never made it */ }
}

if (problems.length || fell) {
  console.error(`\ncheck:whitescreen — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:whitescreen — a page that falls over says so, in her language, with a way out.');

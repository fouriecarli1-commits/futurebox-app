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
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
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

  /* ── The white screen that nothing threw ─────────────────────────────

     Carli, 15 September 2026: *"Ek sien die wit blad met die avatar oplaai
     werk nie. Dit is nogsteeds net wit."*

     This is the other half and it is the half she keeps hitting. Nothing
     throws, no boundary fires, the page simply stops having anything on it —
     which is what a tab looks like after Android has taken its memory while
     the gallery was in front of the app. `Blankscreen` is meant to catch
     exactly that, it was written the day before, and nothing checked it: it
     looked once at six seconds and her page went blank at twenty.

     Wiped by hand here rather than waited for. A probe cannot make Android
     discard a tab, and it does not need to — what is being asked is whether
     a page that has nothing on it says so, and an empty body is an empty
     body however it got that way. */
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.on('pageerror', () => undefined);
    await page.goto(`${server.url}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const before = ((await page.locator('body').innerText()) ?? '').trim();
    check('the app draws something to begin with', before.length > 0, before.slice(0, 60));

    /* Hidden rather than removed, and that distinction is the probe.

       Removing the app's nodes makes React throw on its next render, the
       error boundary fires, and a panel appears — a panel, and not this one.
       The first version of this did exactly that and passed on the wrong
       thing. `display: none` leaves the tree whole and takes the page off
       the screen, which is what a blank page IS: `innerText` skips hidden
       text, so the watcher sees what a person sees. */
    await page.evaluate(() => {
      for (const child of Array.from(document.body.children)) {
        if (!child.getAttribute('role')) child.style.display = 'none';
      }
    });

    /* Six seconds of blank plus a look. The watcher's patience is the number
       being tested, so it is waited out rather than guessed under. */
    await page.waitForTimeout(9000);
    const after = ((await page.locator('body').innerText()) ?? '').replace(/\s+/g, ' ').trim();
    /* The words are named, and they are the panel's own.

       This failed on 18 September against a guard that was working perfectly:
       it looked for "geteken" and "Laai weer", which is what the panel said
       when this probe was written, and the panel had since been rewritten to
       say "Hierdie bladsy het leeg teruggekom" and "Laai die bladsy weer".
       The probe was a day older than the screen and nobody had run it in
       between.

       A probe about wording has to name the wording — reading the strings out
       of the component it is checking would make it agree with itself. So the
       answer is not to loosen these into something that cannot fail; it is to
       anchor them on the sentence that carries the meaning, and to re-run the
       probe when the sentence changes. */
    check('a page that goes blank later still says so',
      /leeg teruggekom|came back empty/i.test(after), after.slice(0, 120) || '(still nothing)');
    check('  in Afrikaans as well as English',
      /leeg teruggekom/i.test(after) && /came back empty/i.test(after), after.slice(0, 160));
    check('  and gives her something to press rather than a dead screen',
      /Laai die bladsy weer/i.test(after), after.slice(0, 160));
    check('  and offers the record of what went wrong',
      (await page.locator('a[href="/oops"]').count()) > 0);
    await page.close();
  }
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

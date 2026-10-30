/**
 * The Play Store screenshots, taken off the built app.
 *
 * `docs/PLAY-STORE.md` asks for them to be retaken "the day the look is
 * final", and the set taken on 12 October 2026 went stale the same day: the
 * default theme moved to Pro Studio's green-black that evening, and on
 * 15 October Make a song became one box around the copilot. Taken by hand,
 * a retake is an afternoon; written down, it is one command:
 *
 *     npm run build && npm run play:shots
 *
 * 1080 x 1920 each — a 360 x 640 phone at three pixels to the point — in the
 * app's default theme, on a signed-up test account, with something in the
 * making rooms rather than an empty form. The kids room and Cubed keep their
 * own looks and are not retaken here; their shots stay as they are.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { enter, studio, toRoom } from './enter.mjs';
import { launchOptions, serve } from './where.mjs';

/* `af` as the second argument takes the same screens in Afrikaans, for the
   Afrikaans store listing (`scripts/play-screens.mjs af`). */
const AF = process.argv[3] === 'af';
const OUT = AF ? 'docs/play/shots/af' : 'docs/play/shots';
const PHONE = { width: 360, height: 640, touch: true, scale: 3, email: 'lily@futurebox.test', lang: AF ? 'af' : null };
const ROOM = AF
  ? { make: 'Maak ’n liedjie', video: 'Videolessenaar', ads: 'Advertensies', photo: 'Foto Editor' }
  : { make: 'Make', video: 'Video desk', ads: 'Adverts', photo: 'Photo Editor' };
/* Placeholder keys, so each room's own "is the engine there?" asks answer
   yes, as they do on the live site — a store shot of a desk saying "no key
   reached this app" shows a fault that only exists on this machine. Nothing
   below presses anything that would spend, so no key is ever used. */
const server = await serve(process.argv[2] || '3394', {
  env: { ELEVENLABS_API_KEY: 'placeholder-for-screenshots', ANTHROPIC_API_KEY: 'placeholder-for-screenshots' },
});
mkdirSync(OUT, { recursive: true });
const taken = [];

/** Puts an element near the top of whatever scrolls it, with room above. */
async function bringUp(page, selector, above = 120) {
  await page.locator(selector).first().evaluate((el, gap) => {
    for (let box = el.parentElement; box; box = box.parentElement) {
      const style = getComputedStyle(box);
      if (/(auto|scroll)/.test(style.overflowY) && box.scrollHeight > box.clientHeight) {
        box.scrollBy(0, el.getBoundingClientRect().top - gap);
        return;
      }
    }
    window.scrollBy(0, el.getBoundingClientRect().top - gap);
  }, above);
  await page.waitForTimeout(500);
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  taken.push(name);
}

try {
  /* ── 01 The welcome, signed out ─────────────────────────────────────── */
  {
    const browser = await chromium.launch(launchOptions());
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true });
    if (AF) await page.addInitScript(() => { try { window.localStorage.setItem('futurebox.lang.v1', 'af'); } catch { /* none */ } });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await shoot(page, '01-welcome');
    await browser.close();
  }

  /* ── 02 The studio, and 03 Make a song with a song started ──────────── */
  {
    const { browser, page } = await enter({ ...PHONE, at: server.url });
    await studio(page);
    await page.waitForTimeout(1200);
    await shoot(page, '02-studio');

    await toRoom(page, ROOM.make);
    await page.waitForTimeout(1500);
    const box = page.locator('[data-makebox]');
    await box.locator('[data-makeplus]').click();
    await page.waitForTimeout(400);
    await page.locator('[data-shelf="road"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-start]').first().click();
    await page.waitForTimeout(600);
    await box.locator('[data-maketool="length"]').click();
    await page.locator('[data-makelength]').nth(2).click();
    await page.waitForTimeout(300);
    /* The plus open, so the shot shows the list of feelings and sounds and
       the box's own buttons under it. */
    await box.locator('[data-makeplus]').click();
    /* Long enough for the list to finish coming in: at 600 ms the Afrikaans
       shot caught it half faded, with the room showing through. */
    await page.waitForTimeout(1500);
    await bringUp(page, '[data-makepicker]', 0);
    await page.waitForTimeout(500);
    await shoot(page, '03-make-a-song');
    await browser.close();
  }

  /* ── 04 The video desk, and 06 the advert desk ──────────────────────── */
  {
    const { browser, page } = await enter({ ...PHONE, at: server.url });
    await studio(page);
    /* Folded, and from the top: the room as somebody arriving meets it. */
    await toRoom(page, ROOM.video, { folded: true });
    await page.waitForTimeout(1500);
    await bringUp(page, 'h4', 24);
    await shoot(page, '04-video-desk');
    await toRoom(page, ROOM.ads, { folded: true });
    await page.waitForTimeout(1500);
    await bringUp(page, 'h4', 24);
    await shoot(page, '06-adverts');
    await browser.close();
  }

  /* ── 05 The photo editor, with a photograph in it ───────────────────── */
  {
    const { browser, page } = await enter({ ...PHONE, at: server.url });
    await studio(page);
    await toRoom(page, ROOM.photo);
    await page.waitForTimeout(1200);
    const bench = page.locator('[data-cutbench="pic"]').first();
    if (await bench.count()) {
      await bench.click();
      await page.waitForTimeout(600);
    }
    await page.locator('[data-poststudio] input[type=file]').first().setInputFiles('docs/play/lighthouse.jpg');
    await page.waitForTimeout(2000);
    /* The bench shut again, so the photograph has the screen. */
    if (await bench.count()) {
      await bench.click().catch(() => undefined);
      await page.waitForTimeout(600);
    }
    await shoot(page, '05-photo-editor');
    await browser.close();
  }

  /* ── 07 Collab Radar with the radar sweeping, 08 Hooks ──────────────── */
  {
    const { browser, page } = await enter({ ...PHONE, at: server.url });
    await studio(page);
    /* Folded and from the top, as the other rooms are: the radar is the
       first thing in the room, and Hooks opens on what it does. */
    await toRoom(page, 'Collab Radar', { folded: true });
    await page.waitForTimeout(2500);
    /* The radar itself at the top. Above it on this machine is the notice
       that the collaboration tables are missing, which they are only here. */
    /* Low enough that the list of shows under it sits behind the tab bar:
       those are real shows by name, which a store listing must not carry. */
    await bringUp(page, '[data-collabradar]', 150);
    await page.waitForTimeout(1500);
    await shoot(page, '07-radar');
    await toRoom(page, 'Hooks', { folded: true });
    await page.waitForTimeout(2000);
    await bringUp(page, '[data-hooksroom] h4', 24);
    await shoot(page, '08-hooks');
    await browser.close();
  }

  /* ── 09 Cubed class, its own page ───────────────────────────────────── */
  {
    const { browser, page } = await enter({ ...PHONE, at: server.url });
    await page.goto(`${server.url}/cubed`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shoot(page, '09-cubed');
    await browser.close();
  }
} finally {
  await server.stop();
}

console.log(`\nplay:shots — ${taken.length} taken at 1080 x 1920 into ${OUT}: ${taken.join(', ')}`);

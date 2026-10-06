/**
 * A room that fits the phone when it opens, and still fits after a press.
 *
 * ── Why a second width probe ─────────────────────────────────────────────
 *
 * Carli, 6 October 2026, with a photograph of the song list scrolled
 * sideways: *"Die oomblik wanneer ek op 'n liedjie se cover art druk, dan
 * gooi dit die skerm wyd uit. Op mobile moet dit nie so maak nie."*
 *
 * `audit/wide.mjs` measures every element in every room against the
 * viewport, and it was green. It is not wrong and it was not lying: it walks
 * into a room and measures it **as it opens**. Pressing Cover art swaps the
 * artwork for a panel of buttons, and that panel is a state no width probe
 * had ever been in.
 *
 * That is the whole lesson and it is worth the file. A room has more than
 * one shape. Measuring the first one and calling the room measured is the
 * same green-but-adjacent fault this repo keeps finding, wearing the clothes
 * of a probe rather than of a check — and a probe is the last place anybody
 * goes looking for it, because a probe drives a real browser and feels like
 * proof.
 *
 * ── What is stubbed, and what is not ─────────────────────────────────────
 *
 * One song in local storage and the cover endpoint answered, both lifted
 * from `audit/realart.mjs`, which already walks to this exact panel. The
 * LAYOUT is not stubbed: real CSS, real fonts, a real 390-pixel viewport.
 * The thing being measured is the thing on the screen.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3097';
/* Her phone, not a round number. The first run used 390 and found nothing;
   a narrower viewport is the difference between a grid track that just fits
   and one that does not. */
const WIDTH = Number(process.argv[3] || 360);
const ROOM = process.argv[4] || 'Make';
/** A pixel of slack for sub-pixel rounding, which is not a layout fault. */
const SLACK = 2;

const SONG = {
  id: 'widecover-1',
  title: 'Stof oor die Karoo',
  genre: 'Amapiano',
  bpm: 112,
  key: 'A Minor',
  lyrics: '[Verse 1]\nDie eerste reël\n',
  style: 'warm, late night',
  models: ['Backing'],
  source: 'engine',
  seconds: 12,
  createdAt: '2026-09-01T10:00:00.000Z',
  seed: 7,
};

/* A one-pixel PNG, so the panel believes there is a cover and draws its
   other half — the image, "Another", "Take it off". */
const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * Flipped between the two passes.
 *
 * The first version of this probe only ever saw a song with NO cover, and
 * called the panel measured. The panel has two halves and they share almost
 * nothing: one is a single wide button, the other is a square image above a
 * wrapping row of two. Measuring one and naming the file after the panel is
 * the same fault this probe exists to catch, one level further in — and the
 * screen Carli photographed is a library of songs that have covers.
 */
let hasCover = false;

const server = await serve(PORT);
const { browser, page, problems } = await enter({
  at: server.url,
  width: WIDTH,
  height: 844,
  touch: true,
  before: async (p) => {
    await p.addInitScript(
      ([key, songs]) => {
        try {
          window.localStorage.setItem(key, JSON.stringify(songs));
        } catch { /* storage off; the probe will find an empty channel */ }
      },
      /* Seventeen, because that is how many she had on the screen she
         photographed. One song is one card and one card is the easy case;
         a list is where a strip, a wrap and a grid start disagreeing. */
      ['futurebox.tracks.v1', Array.from({ length: 17 }, (_, i) => ({
        ...SONG, id: `${SONG.id}-${i}`, seed: 7 + i,
      }))],
    );
    await p.route('**/api/cover**', (route) => {
      /* `tracks=` is the whole grid asking at once; `track=` is the one card
         with the panel open. Only the second decides which half of the panel
         draws, which is how `realart.mjs` reaches both. */
      const url = route.request().url();
      const body = /[?&]tracks=/.test(url)
        ? '{"covers":{}}'
        : hasCover
          ? JSON.stringify({ state: 'done', url: PIXEL })
          : '{}';
      return route.fulfill({ status: 200, contentType: 'application/json', body });
    });
  },
});

const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok && !problems.includes(label)) problems.push(label);
};

/**
 * Everything on the screen that reaches past the edge.
 *
 * Measured against `documentElement.clientWidth` rather than the window, so
 * a scrollbar is not mistaken for an overflow. The report names the three
 * worst and says how many there are: everything inside a box that is too
 * wide is also too wide, and sixty lines describing one fault is a report
 * nobody reads.
 */
const tooWide = () => page.evaluate((slack) => {
  const vw = document.documentElement.clientWidth;
  /**
   * A card inside a sideways strip is not an overflow.
   *
   * The first version measured every element against the viewport and named
   * forty-two of them, before any press, on a page whose `scrollWidth` was
   * exactly the viewport. They were song cards in a strip that scrolls
   * sideways on purpose — doing what they are built to do, sitting off to
   * the right until a thumb brings them over.
   *
   * So the question is not "is this past the edge" but "is this past the
   * edge of something that cannot scroll". An element inside a scroller is
   * that scroller's business; the scroller itself still has to fit.
   */
  const rides = (el) => {
    for (let at = el.parentElement; at && at !== document.body; at = at.parentElement) {
      const how = getComputedStyle(at).overflowX;
      if (how === 'auto' || how === 'scroll') return true;
    }
    return false;
  };
  const seen = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (r.right <= vw + slack && r.left >= -slack) continue;
    if (rides(el)) continue;
    seen.push({
      over: Math.round(Math.max(r.right - vw, -r.left)),
      what: `${el.tagName}.${(el.className || '').toString().slice(0, 60)}`,
      says: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    });
  }
  return {
    vw,
    scroll: document.documentElement.scrollWidth,
    worst: seen.sort((a, b) => b.over - a.over).slice(0, 3),
    count: seen.length,
  };
}, SLACK);

const say = (found) => found.worst
  .map((one) => `${one.what} +${one.over}px "${one.says}"`)
  .join(' | ');

try {
  await studio(page);
  await toRoom(page, ROOM);
  await page.waitForTimeout(800);

  /* Before the press, so a failure after it can be blamed on the press and
     not on a room that was already too wide. Without this line the probe
     could report the panel for somebody else's fault. */
  const before = await tooWide();
  check(`the song list fits a ${WIDTH}px phone in ${ROOM} before anything is pressed`,
    before.count === 0 && before.scroll <= before.vw + SLACK,
    `${before.count} element(s), scrollWidth ${before.scroll} vs ${before.vw} — ${say(before)}`);

  /* `toRoom` calls `unfold`, which opens every control carrying
     `aria-expanded="false"` — and Cover art is one, because it opens a panel
     and says so for a screen reader. So it may ALREADY be open, and pressing
     unconditionally would close it and measure the wrong screen. The same
     trap `realart.mjs` fell into three times. */
  const cover = page.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  check('a song card offers Cover art', (await cover.count()) > 0);
  if ((await cover.getAttribute('aria-expanded')) !== 'true') {
    await cover.click();
  }
  await page.locator('[data-realart]').first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  const after = await tooWide();
  check('and it still fits once the cover panel is open',
    after.count === 0 && after.scroll <= after.vw + SLACK,
    `${after.count} element(s), scrollWidth ${after.scroll} vs ${after.vw} — ${say(after)}`);

  /* ── And the other half, which is a different panel ──────────────────── */

  hasCover = true;
  await page.reload({ waitUntil: 'networkidle' });
  await studio(page);
  await toRoom(page, ROOM);
  await page.waitForTimeout(800);
  const again = page.locator('button').filter({ hasText: /^(Cover art|Omslagkuns)$/ }).first();
  if ((await again.getAttribute('aria-expanded')) !== 'true') await again.click();
  await page.locator('img[alt*="over" i], img[alt*="mslag" i]').first()
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(500);

  const drawn = await tooWide();
  check('and a song that already has a cover fits too',
    drawn.count === 0 && drawn.scroll <= drawn.vw + SLACK,
    `${drawn.count} element(s), scrollWidth ${drawn.scroll} vs ${drawn.vw} — ${say(drawn)}`);

  await page.screenshot({ path: shot('widecover.png') });
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:widecover — ${problems.length} problem(s):`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log(`\nWalked it: the song list fits a ${WIDTH}-pixel phone in ${ROOM}, and it still fits with a cover panel open.`);

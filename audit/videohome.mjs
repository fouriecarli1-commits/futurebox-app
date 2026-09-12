/**
 * A video she made, in the place she goes looking for it.
 *
 * Carli: "Ek het nou net 'n video gegenerate, en toe gesê sit dit in my
 *  channel, en nou kry ek dit nie in my channel nie." And then: "Kan jy asb ook
 *  daardie video vir my soek? want ek kry dit meer nerens nie."
 *
 * ── What was wrong ───────────────────────────────────────────────────────
 *
 * Nothing ever put it there. A generated clip is kept under the room that made
 * it, and the only two places it appeared were that room's own history at the
 * foot of the page and the Find tab. The Library tab opens the channel, the
 * channel held songs and nothing else, so "my channel" was the one place a
 * video could not be.
 *
 * Worse than missing: the copilot's next step out of the video desk said "Put
 * it on your channel", and there was no action anywhere that put a video on a
 * channel. Somebody who asked for it was told it had been done.
 *
 * ── What this measures ───────────────────────────────────────────────────
 *
 * A video kept the way the video desk keeps one, and then the channel opened
 * the way the Library tab opens it. The clip has to be named on that screen —
 * not "there is a videos card", which is markup, but the title of the thing
 * she made.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3089';
const TITLE = 'Karoo pad — die video';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** A video kept exactly the way `VideoCanvas` keeps one after a generation. */
const SEED = `(${(async (title) => {
  /* A tiny mp4-shaped blob. Nothing plays it and nothing needs to: what is
     being measured is whether the channel lists what she made, not whether
     Chromium can decode four bytes. */
  const blob = new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], { type: 'video/mp4' });

  await new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('audio')) open.result.createObjectStore('audio');
    };
    open.onsuccess = () => {
      const tx = open.result.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, 'canvas-videohome');
      tx.oncomplete = () => done();
      tx.onerror = () => done();
    };
    open.onerror = () => done();
  });

  /* The same shape `rememberMake` writes, under the video desk's surface —
     which is the point: the channel must not care which room it came from. */
  localStorage.setItem('futurebox.makes.v1', JSON.stringify([
    {
      id: 'canvas-videohome',
      surface: 'canvas',
      kind: 'video',
      title,
      note: 'A woman at a window, slow push in',
      createdAt: new Date().toISOString(),
      seconds: 5,
      ext: 'mp4',
      credits: 15,
    },
  ]));
}).toString()})(${JSON.stringify(TITLE)})`;

const server = await serve(PORT);
const { browser, page } = await enter({ width: 390, height: 844, at: server.url, touch: true });

try {
  await page.evaluate(SEED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  /* Confirmed to have landed before anything is concluded from its absence. A
     probe that seeds a video, fails to find it and calls the channel broken
     has measured its own setup. */
  const seeded = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('futurebox.makes.v1') || '[]').length);
  check('the video this walk needs is on the device', seeded === 1, `${seeded} kept`);

  /* In through the Library tab, which is how she got there. */
  const library = page.locator('nav[aria-label] button', { hasText: /Library|Biblioteek/ }).first();
  check('the Library tab is on the bar', (await library.count()) > 0);
  await library.click();
  await page.waitForTimeout(2500);

  const room = page.locator('div.fixed.inset-0.z-50').first();
  /* ── Read the room, with its panels open ─────────────────────────
 
     Every card starts folded now, so the title of a video is inside a
     fold and `innerText` does not see it. Unfolded immediately before
     each read rather than once on the way in: the channel's own panels
     draw after its data arrives, so an unfold a second earlier opens the
     ones that were there and none of the ones that matter.
 
     `unfold` is cheap when nothing is shut — one count — so calling it
     at each read costs nothing and removes a whole class of timing. */
  const reads = async () => {
    await unfold(page);
    return ((await room.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  };
  let says = await reads();
  if (!/Your videos|Jou video/.test(says)) {
    /* The Library tab opens the channel; if this build lands somewhere else,
       walk in the long way rather than reporting a room that was never
       opened. */
    await studio(page);
    await toRoom(page, 'Channel');
    await page.waitForTimeout(2000);
    says = await reads();
  }

  check('the channel has a place for videos',
    /Your videos|Jou video/.test(says), says.slice(0, 140));
  /* The clip by name. "There is a videos card" is markup; this is the
     question she asked. */
  check('and the video she made is named on it',
    says.includes(TITLE), says.slice(0, 220));
  says = await reads();
  check('with what it cost still on it, so the history is a receipt',
    /15 credits|15 krediete/.test(says), (says.match(/\d+ (credits|krediete)/) ?? ['nothing'])[0]);

  /* ── The heading has to look like a button ────────────────────────────

     "Die button, made here before is amper onsienbaar want dit lyk nie soos
      'n button." It was a row of text with a small icon in front of it, the
     same weight as the paragraph above and the same colour as the label
     beside it — so the one control that opens everything she has made read as
     a caption. Every button in this app gets a box.

     Measured as a box rather than as a class name: a border and a background
     that is not the card's own. */
  const heading = room.locator('button').filter({ hasText: /Made in this app|Hier gemaak/ }).first();
  check('the heading that opens her work is on the screen', (await heading.count()) > 0);
  if ((await heading.count()) > 0) {
    const looks = await heading.first().evaluate((one) => {
      const style = getComputedStyle(one);
      const parts = (style.backgroundColor.match(/[\d.]+/g) ?? []).map(Number);
      return {
        border: style.borderTopWidth,
        radius: style.borderTopLeftRadius,
        filled: parts.length >= 4 ? parts[3] > 0.2 : true,
        height: one.getBoundingClientRect().height,
      };
    });
    check('and it looks like a button rather than a line of text',
      parseFloat(looks.border) > 0 && parseFloat(looks.radius) > 0 && looks.filled,
      JSON.stringify(looks));
    /* A thumb needs forty-four pixels. A caption does not have them. */
    check('and it is big enough to press with a thumb',
      looks.height >= 40, `${Math.round(looks.height)}px tall`);
  }

  /* ── Somewhere to post it ─────────────────────────────────────────────

     "dit het glad nie meer 'n share button daarop om dit moontlik na social
      media toe te skuif nie." A clip could be downloaded and nothing else. */
  check('every video offers a way to post it, not only to download it',
    (await room.locator('button').filter({ hasText: /^(Post it|Plaas dit)/ }).count()) > 0,
    'there is no share button on a video');

  /* ── And nothing tells her to move it ─────────────────────────────────

     She has now tried three times to move a video onto her channel. It is
     already there and always was going to be, so the card has to say that in
     as many words rather than leaving her to guess from its absence. */
  check('the card says the video arrives on its own, so there is nothing to move',
    /nothing to move|niks om te skuif/i.test(says), says.slice(0, 200));

  /* And it opens. A list that names a file nobody can play is a list. */
  const openIt = room.locator('button').filter({ hasText: /^(Open it|Maak dit oop)/ }).first();
  check('and it can be opened', (await openIt.count()) > 0);
  if ((await openIt.count()) > 0) {
    await openIt.click();
    await page.waitForTimeout(800);
    check('as a video rather than as a sound file',
      (await room.locator('video').count()) > 0,
      `${await room.locator('video').count()} video element(s)`);
  }

  /* The promise that was not kept. Nothing in the app may tell her to press
     something that puts a video on a channel, because nothing does.

     Read out of the copy the copilot is actually given, not out of the file:
     the note explaining why that line was removed quotes it, and the first
     version of this check went red on its own explanation. Comments are prose
     about the code and are not the code — the same weakness `check:security`
     had, in a different file. */
  const surfaces = (await import('node:fs'))
    .readFileSync('app/lib/surfaces.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  check('and nothing offers a button that puts a video on a channel',
    !/Put it on your channel/.test(surfaces),
    'the copilot still says a video can be put there');

  await page.screenshot({ path: shot('videohome.png'), fullPage: true });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 220)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:videohome — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:videohome — a video she made is on her channel, by name, and it opens.');

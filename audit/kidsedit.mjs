/**
 * Easy Editing, with its sound on.
 *
 * The owner, 19 October 2026: *"Daar kom nie klank uit by kids easy editing
 * nie. Ek love hierdie funksie vir kids."* "Play it through" stepped through
 * the pictures in silence, and a film had sound only with a recorded voice or
 * a kept song — the song picker did not even show without one.
 *
 * Measured off the sound card itself: every AudioBufferSourceNode started is
 * counted, so "it plays a tune" is a number, not a hope.
 */
import { chromium } from 'playwright';
import { launchOptions, serve } from './where.mjs';

const server = await serve(process.argv[2] || '3380');
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const thrown = [];
page.on('pageerror', (error) => thrown.push(String(error).slice(0, 160)));
await page.addInitScript(() => {
  window.__started = 0;
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function counted(...args) {
    if (this.buffer && this.buffer.duration > 1) window.__started += 1;
    return start.apply(this, args);
  };
});
await page.route('**/api/kids', (route) => route.fulfill({
  json: { open: true, allowance: 40, spent: 0, left: 40, minutes: null, secondsLeft: null, signedIn: true },
}));

try {
  await page.goto(`${server.url}/kids`, { waitUntil: 'networkidle' });
  await page.locator('[data-kidsroom]').waitFor({ timeout: 15000 });
  /* Two drawings on the wall, the way the drawing board keeps them. */
  await page.evaluate(async () => {
    const drawn = async (colour) => {
      const c = document.createElement('canvas');
      c.width = 200; c.height = 200;
      const x = c.getContext('2d');
      x.fillStyle = colour; x.fillRect(0, 0, 200, 200);
      return new Promise((done) => c.toBlob(done, 'image/png'));
    };
    const pieces = [
      { id: 'p1', made: Date.now(), kind: 'drawing', title: 'Red', blob: await drawn('#ef4444') },
      { id: 'p2', made: Date.now() - 1, kind: 'drawing', title: 'Blue', blob: await drawn('#3b82f6') },
    ];
    await new Promise((done, fail) => {
      const asked = indexedDB.open('futurebox-kidsgallery', 1);
      asked.onupgradeneeded = () => asked.result.createObjectStore('pieces', { keyPath: 'id' });
      asked.onerror = () => fail(asked.error);
      asked.onsuccess = () => {
        const tx = asked.result.transaction('pieces', 'readwrite');
        for (const one of pieces) tx.objectStore('pieces').put(one);
        tx.oncomplete = () => done();
      };
    });
  });
  await page.locator('[data-kidshome]').first().click().catch(() => undefined);
  await page.locator('[data-kidsroomdoor="edit"]').click();
  const editor = page.locator('[data-kidseditor]');
  await editor.waitFor({ timeout: 10000 });
  check('the music picker is there with no songs kept', (await editor.locator('[data-kidseditortune]').count()) >= 3);
  check('  and a tune is chosen already, so a first film has music',
    (await editor.locator('[data-kidseditortune][aria-pressed="true"]').count()) === 1);

  for (const id of ['p1', 'p2']) {
    await editor.locator(`[data-kidspiece="${id}"], button:has(img[alt="${id === 'p1' ? 'Red' : 'Blue'}"])`).first().click().catch(() => undefined);
  }
  await page.waitForTimeout(300);
  const pieces = await editor.locator('[data-kidspuzzle]').count();
  check('two drawings go on the timeline', pieces === 2, String(pieces));

  await editor.locator('[data-kidspreview]').click();
  await page.waitForTimeout(1500);
  check('Play it through plays sound', (await page.evaluate(() => window.__started)) >= 1, String(await page.evaluate(() => window.__started)));
  await editor.locator('[data-kidspreview]').click();

  const before = await page.evaluate(() => window.__started);
  await editor.locator('[data-kidsmakefilm]').click();
  await editor.locator('[data-kidsfilmout]').waitFor({ timeout: 30000 });
  check('making the film plays its music too', (await page.evaluate(() => window.__started)) > before);
  const tracks = await editor.locator('[data-kidsfilmout]').evaluate(async (video) => {
    await new Promise((done) => { if (video.readyState >= 1) done(); else video.onloadedmetadata = done; });
    const stream = video.captureStream ? video.captureStream() : null;
    return { audio: stream ? stream.getAudioTracks().length : -1, seconds: video.duration };
  });
  check('the film has a sound track', tracks.audio !== 0, JSON.stringify(tracks));
  check('nothing threw', thrown.length === 0, thrown.join(' | '));
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 400)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:kidseditwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:kidseditwalk — Easy Editing has music from the first film, Play it through plays it, and the film is made with its sound.');

/**
 * ProBooth's meters read real sound: play a song in the studio and the lane's
 * meter on its header, its mixer strip and the master meter all move, and the
 * mixer offers each lane's sends to the shared room and echo.
 *
 * The song is the boothwalk song: a tone that steps loud and quiet every half
 * second, so a meter that moves is a meter reading it.
 *
 *   node audit/dawmeters.mjs [port]
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3498';
const SECONDS = 8;
const RATE = 44100;
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'NOT '} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) problems.push(label);
};

const SEED = `(${(async (seconds, rate) => {
  const room = new OfflineAudioContext(1, seconds * rate, rate);
  const buffer = room.createBuffer(1, seconds * rate, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const loud = Math.floor(i / (rate / 2)) % 2 === 0 ? 1 : 0.2;
    data[i] = Math.sin((2 * Math.PI * 196 * i) / rate) * 0.4 * loud;
  }
  /* A WAV by hand rather than through the app's encoder: this runs as a string
     inside the page before any of the app's modules are reachable. */
  const bytes = buffer.length * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, bytes, true);
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  const blob = new Blob([view.buffer], { type: 'audio/wav' });

  const track = {
    id: 'boothwalk-song',
    title: 'Karoo pad',
    genre: 'Acoustic',
    bpm: 96,
    key: 'A Minor',
    lyrics: '[Verse]\\nEk ry alleen deur die Karoo\\nDie pad is lank en stil\\n\\n[Chorus]\\nEn ek sing vir jou',
    style: 'warm acoustic',
    models: [],
    source: 'engine',
    seconds,
    createdAt: '2026-09-07T09:00:00.000Z',
    seed: 7,
    parts: [
      { name: 'Verse', lines: ['Ek ry alleen deur die Karoo', 'Die pad is lank en stil'], seconds: 4 },
      { name: 'Chorus', lines: ['En ek sing vir jou'], seconds: 4 },
    ],
  };
  localStorage.setItem('futurebox.tracks.v1', JSON.stringify([track]));

  await new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('audio')) open.result.createObjectStore('audio');
    };
    open.onsuccess = () => {
      const tx = open.result.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, track.id);
      tx.oncomplete = () => done();
      tx.onerror = () => done();
    };
    open.onerror = () => done();
  });
}).toString()})(${SECONDS}, ${RATE})`;

const server = await serve(PORT);
const { browser, page } = await enter({
  width: 1440, height: 900, at: server.url, lang: 'en',
  args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

/** The loudest a meter showed over a stretch, 0–100. */
const loudest = async (selector, ms = 2500) => {
  let top = 0;
  for (let t = 0; t < ms; t += 100) {
    const now = await page.evaluate((sel) => Math.max(0, ...[...document.querySelectorAll(sel)].map((one) => Number(one.dataset.level || 0))), selector);
    top = Math.max(top, now);
    await page.waitForTimeout(100);
  }
  return top;
};

try {
  await page.evaluate(SEED);
  const room = await studio(page);
  await toRoom(page, 'ProBooth');
  await page.waitForTimeout(1500);
  const picker = room.locator('[data-pickasong]').first();
  await picker.selectOption(await picker.locator('option').nth(1).getAttribute('value'));
  await page.waitForTimeout(2500);
  await room.locator('button').filter({ hasText: /Pro DAW Studio/ }).first().dispatchEvent('click');
  await page.waitForTimeout(3000);

  check('every lane header has a meter', (await page.locator('[data-lanename]').count()) > 0
    && (await page.locator('[data-lanemeter]').count()) >= (await page.locator('[data-lanename]').count()));
  check('  and it is still before anything plays', (await loudest('[data-lanemeter] [data-level]', 400)) === 0);

  await page.getByRole('button', { name: /^Play$/ }).first().click();
  const lanes = await loudest('[data-lanename] ~ [data-lanemeter] [data-level], [data-lanemeter] [data-level]');
  check('playing, the lane meters move with the song', lanes > 20, String(lanes));
  const master = await page.evaluate(() => {
    const one = document.querySelector('[aria-label="Master level"] [data-level]');
    return one ? 'there' : 'missing';
  });
  check('  and the master meter is there, along the top bar', master === 'there');
  await page.screenshot({ path: shot('dawmeters-playing.png') });
  const masterTop = await loudest('[aria-label="Master level"] [data-level]', 1500);
  check('  and moves too', masterTop > 20, String(masterTop));

  const mix = page.getByRole('button', { name: /Mix & master/ }).first();
  await mix.click();
  await page.waitForTimeout(800);
  check('the mixer offers each lane a send to the room and to the echo',
    (await page.locator('[data-stripsend^="space:"]').count()) > 0 && (await page.locator('[data-stripsend^="echo:"]').count()) > 0);
  const strip = await loudest('[data-strip] [data-lanemeter] [data-level]', 1500);
  check('  and each strip has a meter that moves', strip > 20, String(strip));
  const send = page.locator('[data-stripsend^="space:"]').first();
  await send.fill('60');
  await page.waitForTimeout(300);
  check('  and a send can be turned up', (await send.inputValue()) === '60');
  await page.screenshot({ path: shot('dawmeters-mixer.png') });
  /* ── Automation: a volume line drawn down to nothing silences the lane ── */
  await mix.click();
  await page.waitForTimeout(500);
  if ((await page.getByRole('button', { name: /^Pause$/ }).count())) await page.getByRole('button', { name: /^Pause$/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-boothautomode="gain"]').first().click();
  await page.waitForTimeout(400);
  const row = await page.locator('[data-lanerow="0"]').first().boundingBox();
  check('the volume line lies over the lanes', (await page.locator('[data-autoline="gain"]').count()) > 0);
  await page.mouse.click(row.x + row.width * 0.02, row.y + row.height - 4);
  await page.waitForTimeout(250);
  await page.mouse.click(row.x + row.width * 0.6, row.y + row.height - 4);
  await page.waitForTimeout(400);
  const placed = Number(await page.locator('[data-autoline="gain"]').first().getAttribute('data-autopoints'));
  check('  and a tap puts a point down, two taps two points', placed === 2, String(placed));
  await page.locator('[data-boothautomode="gain"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Back to the start$/ }).first().click().catch(() => undefined);
  await page.getByRole('button', { name: /^Play$/ }).first().click();
  const ridden = await loudest('[data-lanename] ~ [data-lanemeter] [data-level]', 2000);
  check('  and a line drawn down to nothing silences the lane as it plays', ridden < 8, String(ridden));
  check('  without being reported as a broken speaker', !(await page.getByText(/nothing is reaching your speakers/).count()));
  await page.getByRole('button', { name: /^Pause$/ }).first().click().catch(() => undefined);
  await page.locator('[data-boothautomode="gain"]').first().click();
  await page.waitForTimeout(300);
  for (let n = 0; n < 2; n += 1) {
    await page.locator('[data-autopoint="0"]').first().dblclick();
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300);
  check('  and a point tapped twice is taken away', Number(await page.locator('[data-autoline="gain"]').first().getAttribute('data-autopoints')) === 0);
  await page.screenshot({ path: shot('dawmeters-automation.png') });
  check('no page errors', errors.length === 0, errors.join(' ;; '));
} catch (error) {
  check('the walk finished', false, String(error).slice(0, 200));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:dawmeters — ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('\ncheck:dawmeters — the lanes, the strips and the master each have a meter that reads the song.');

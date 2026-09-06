/**
 * The song laid out in two tracks, with real audio behind it.
 *
 * ── What is real ─────────────────────────────────────────────────────────
 *
 * The separation is stubbed — it is a paid call to ElevenLabs — but what comes
 * back is two genuine WAVs, so everything downstream is the real thing: the
 * decode, the peaks drawn on each lane, the two sources scheduled against one
 * `AudioContext` clock, the gain nodes the faders move, and the offline render
 * behind "keep this balance".
 *
 * The two stems are deliberately different lengths and different loudness, so
 * a lane drawn from the wrong buffer, or a fader wired to the wrong gain, shows
 * up as a difference rather than as two identical pictures.
 */
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3023';
const af = process.argv[3] === 'af';

const b = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

/** A WAV of a steady tone. Loud or quiet, long or short, on purpose. */
function tone(seconds, hz, amplitude) {
  const rate = 22050;
  const samples = Math.round(rate * seconds);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 32767 * amplitude), 44 + i * 2);
  }
  return buffer;
}

const VOCALS = tone(3, 440, 0.9);   // short and loud
const MUSIC = tone(5, 110, 0.25);   // long and quiet

let separated = 0;
await p.route('**/api/stems', async (route) => {
  separated += 1;
  const boundary = '----futureboxaudit';
  const part = (name, bytes) =>
    Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${name}.wav"\r\nContent-Type: audio/wav\r\n\r\n`),
      bytes,
      Buffer.from('\r\n'),
    ]);
  const body = Buffer.concat([part('vocals', VOCALS), part('instrumental', MUSIC), Buffer.from(`--${boundary}--\r\n`)]);
  return route.fulfill({
    status: 200,
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
    body,
  });
});

const WORDS = '[Verse]\nDie pad is lank vanaand\nEn die ligte brand nog aan\n[Chorus]\nHou vas, hou vas\nDie oggend kom\n';
await p.addInitScript(({ lang, words }) => {
  try {
    window.localStorage.setItem('futurebox.lang.v1', lang);
    window.localStorage.setItem('futurebox.tracks.v1', JSON.stringify([{
      id: 'song-1', title: 'Toetsliedjie', genre: 'Afrikaans', bpm: 96, key: 'Am',
      lyrics: words, style: 'warm', models: [], source: 'engine', seconds: 5,
      createdAt: new Date().toISOString(), seed: 1,
    }]));
  } catch {}
}, { lang: af ? 'af' : 'en', words: WORDS });

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

/* The song's own audio, put where the app keeps it.

   Without this the split button is correctly disabled — there is nothing to
   split — and the run stops at a screen behaving properly. The store is
   `futurebox`/`audio`, keyed by track id, the same as `lib/library.ts` writes
   it; a mix is a full-band tone so the timeline above has something real to
   draw and play too. */
await p.evaluate(async (bytes) => {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/wav' });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('futurebox', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('audio')) request.result.createObjectStore('audio');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('audio', 'readwrite');
    tx.objectStore('audio').put(blob, 'song-1');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}, Array.from(tone(5, 220, 0.6)));

await p.reload({ waitUntil: 'networkidle' });
const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
await cta.waitFor({ state: 'visible', timeout: 40000 });
await cta.click();
await p.waitForTimeout(700);
await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
const pw = p.locator('input[type="password"]').first();
if (await pw.count()) await pw.fill('toets-wagwoord-1234');
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(2500);
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
await room.locator('button').filter({ hasText: /^Studio/ }).first().click();
await p.waitForTimeout(1800);

// ── Shut until asked ─────────────────────────────────────────────────────
const open = room.locator('button').filter({ hasText: af ? /^Lê dit in klankbane uit/ : /^Lay it out in tracks/ }).first();
check('the studio offers to lay it out in tracks', (await open.count()) > 0);
check('and nothing was separated on the way in', separated === 0, String(separated));

await open.click();
await p.waitForTimeout(1200);
const words = await room.innerText();
check('it says what two tracks can and cannot do',
  af ? /Nie 'n menger nie/.test(words) : /Not a mixer/.test(words));
check('it says the separation is paid for once',
  af ? /kos niks/.test(words) : /costs nothing/.test(words));
check('it puts a price on it before anything is spent', /\d+/.test(words) && /credit|krediet/i.test(words));

await room.locator('button').filter({ hasText: af ? /^Deel dit op in klankbane/ : /^Split it into tracks/ }).first().click();
await p.waitForTimeout(3000);
check('the separation was asked for once', separated === 1, String(separated));

// ── Two lanes, each drawn from its own audio ─────────────────────────────
const lanes = room.locator('input[type="range"]');
check('there are two faders', (await lanes.count()) === 2, String(await lanes.count()));
const laneNames = await room.locator('button[aria-pressed]').allInnerTexts();
check('one is the voice and one is everything else',
  af ? laneNames.some((n) => /Die stem/.test(n)) && laneNames.some((n) => /Al die res/.test(n))
     : laneNames.some((n) => /The voice/.test(n)) && laneNames.some((n) => /Everything else/.test(n)),
  laneNames.join(' | '));

/* The two waveforms must not be the same picture. The stems differ in length
   and loudness on purpose, so identical canvases would mean both lanes were
   drawn from one buffer — which is the bug this exists to catch. */
const drawn = await p.evaluate(() => {
  const canvases = Array.from(document.querySelectorAll('canvas')).filter((c) => c.height === 88);
  return canvases.map((c) => c.toDataURL().length);
});
check('each lane is drawn from its own audio', drawn.length === 2 && drawn[0] !== drawn[1], drawn.join(','));

/* ── The faders actually move a gain ──────────────────────────────────────

   Not proven by pressing play: a headless browser makes no sound and hearing
   is not something a run can assert. It is proven by rendering — the same
   offline path "keep this balance" uses reads the same gain nodes the faders
   move, so two renders that differ are two gains that differ. Bytes, not
   pictures. */
async function rendered(name) {
  const waiting = p.waitForEvent('download', { timeout: 30000 });
  await room.locator('button').filter({ hasText: af ? /^Hou hierdie balans/ : /^Keep this balance/ }).first().click();
  const file = await waiting;
  const path = await file.path();
  const { readFileSync } = await import('node:fs');
  const bytes = readFileSync(path);
  return { name: await file.suggestedFilename(), bytes };
}

const both = await rendered('both');
check('keeping the balance produces a file', both.bytes.length > 44, String(both.bytes.length));
check('and it is a wav', /\.wav$/.test(both.name) && both.bytes.slice(0, 4).toString() === 'RIFF', both.name);

await lanes.first().fill('30');
await p.waitForTimeout(400);
check('moving a fader shows the new level', /30%/.test(await room.innerText()),
  (await room.innerText()).match(/\d+%/g)?.join(',') || 'none');

const quieter = await rendered('quieter');
check('and the render actually changes with it', !quieter.bytes.equals(both.bytes),
  `${both.bytes.length} vs ${quieter.bytes.length}`);

await room.locator('button[aria-pressed]').first().click();
await p.waitForTimeout(400);
check('a track can be muted', (await room.locator('button[aria-pressed="true"]').count()) > 0);

const muted = await rendered('muted');
check('and muting one changes the render again', !muted.bytes.equals(quieter.bytes),
  `${quieter.bytes.length} vs ${muted.bytes.length}`);
/* A muted lane is silence, and the other lane is the quiet one. So the
   loudest sample must drop — which is the difference between a fader that is
   wired to a gain node and one that only moves a number on screen. */
function loudest(wav) {
  let peak = 0;
  for (let at = 44; at + 1 < wav.length; at += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(at)));
  return peak;
}
check('muting the loud track really takes it out of the file',
  loudest(muted.bytes) < loudest(both.bytes), `${loudest(both.bytes)} → ${loudest(muted.bytes)}`);

check('it says the original is left alone',
  af ? /nie oor die snit gestoor nie/.test(await room.innerText()) : /not saved over the song/.test(await room.innerText()));

await p.screenshot({ path: shot(`lanes-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

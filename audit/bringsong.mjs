/**
 * Bringing a song in from a file, rather than only picking one from the channel.
 *
 * Both rooms that put music under a picture read `loadTracks()` and nothing
 * else, so the only songs you could make a video for were the ones this app
 * wrote. Somebody with a recording already — which is most people who want a
 * music video — was told to go and write a song first. The music video room
 * went further and printed "no songs yet" over the whole screen, so an empty
 * channel was a dead end with no button on it.
 *
 * What this proves, against a real WAV made in the browser and handed to the
 * real file input:
 *
 *   · the button is there on an empty channel, not only once a song exists
 *   · the file is decoded and its true length is what gets stored, because
 *     every trim handle and every runtime does arithmetic with that number
 *   · a brought-in song does not land in the channel — the channel is what
 *     this app made and what syncs to an account
 *   · it survives a reload, because the storyboard remembers which song is
 *     under it and a song that evaporated would be worse than no button
 *   · the video desk's own picker offers it, in its own group
 *   · taking it back out removes the audio too, not just the name
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3071';
const SECONDS = 6;
const RATE = 44100;

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** A real mono WAV, written by hand so nothing about it is a fixture. */
function wav(seconds, rate) {
  const frames = seconds * rate;
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + frames * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000), 44 + i * 2);
  }
  return buffer;
}

const dir = mkdtempSync(join(tmpdir(), 'bringsong-'));
const song = join(dir, 'my own recording.wav');
writeFileSync(song, wav(SECONDS, RATE));

let server = null;
let browser = null;
try {
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`http://localhost:${PORT}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  browser = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  const p = await browser.newPage({ viewport: { width: 1280, height: 950 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('bring@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('bring-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2500);

  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(500);

  const intoRoom = async (name) => {
    const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
    if (!(await door.count())) {
      const back = p.locator('button').filter({ hasText: /All rooms|Alle kamers/ }).first();
      if (await back.count()) {
        await back.click();
        await door.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
        await p.waitForTimeout(500);
      }
    }
    const many = await door.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) {
        await door.nth(i).click();
        await p.waitForTimeout(1400);
        return;
      }
    }
    throw new Error(`no way into ${name}`);
  };

  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* ── The music video room, on an empty channel ─────────────────────── */
  await intoRoom('Music video');

  const channelBefore = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.tracks.v1') || '[]').length);
  const bring = room.locator('button').filter({ hasText: /Bring a song in/ }).first();
  check('the button is there before any song exists', (await bring.count()) === 1,
    `${channelBefore} song(s) in the channel`);

  await room.locator('input[type="file"]').first().setInputFiles(song);
  await p.waitForTimeout(2500);

  const stored = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]'));
  check('the file was taken in', stored.length === 1, JSON.stringify(stored.map((s) => s.title)));
  check('its title is the file name, without the extension',
    stored[0]?.title === 'my own recording', String(stored[0]?.title));
  check('its length was read off the audio, not guessed',
    Math.abs((stored[0]?.seconds ?? 0) - SECONDS) < 0.15,
    `${(stored[0]?.seconds ?? 0).toFixed(3)}s against ${SECONDS}s`);
  check('it is marked as brought in', stored[0]?.source === 'upload', String(stored[0]?.source));

  const channelAfter = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.tracks.v1') || '[]').length);
  check('and it did not land in the channel', channelAfter === channelBefore,
    `${channelBefore} before, ${channelAfter} after`);

  const bytes = await p.evaluate((id) => new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onsuccess = () => {
      const get = open.result.transaction('audio', 'readonly').objectStore('audio').get(id);
      get.onsuccess = () => done(get.result ? get.result.size : 0);
      get.onerror = () => done(0);
    };
    open.onerror = () => done(0);
  }), stored[0]?.id);
  check('the audio itself is on the device', bytes > 44 + SECONDS * RATE, `${bytes} bytes`);

  const opened = await room.innerText();
  check('picking it opened the video panel', /my own recording/.test(opened) && /Music video|Video/i.test(opened));
  await p.screenshot({ path: shot('bringsong-video.png'), fullPage: false });

  /* ── It is still there after a reload ──────────────────────────────── */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  const kept = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]').length);
  check('it survives a reload', kept === 1, `${kept} kept`);

  /* ── The video desk's own picker ───────────────────────────────────── */
  const cta2 = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  if (await cta2.count()) {
    await cta2.click();
    await p.waitForTimeout(700);
    await p.locator('input[type="email"]').first().fill('bring@futurebox.test');
    const pw2 = p.locator('input[type="password"]').first();
    if (await pw2.count()) await pw2.fill('bring-password-1234');
    await p.locator('button[type="submit"]').first().click();
    await p.waitForTimeout(2500);
    const again = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
    if (await again.count()) await again.click().catch(() => undefined);
    await p.waitForTimeout(500);
  }
  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  await intoRoom('Video desk');

  const addShot = room.locator('button').filter({ hasText: /^Add a shot/ }).first();
  await addShot.click();
  await p.waitForTimeout(900);

  const picker = room.locator('#board-song');
  check('the desk asks which song goes under it', (await picker.count()) === 1);
  const groups = await picker.locator('optgroup').evaluateAll((all) => all.map((g) => g.label));
  check('and offers a group for songs brought in', groups.includes('Brought in'), groups.join(' | '));
  const names = await picker.locator('optgroup[label="Brought in"] option').allInnerTexts();
  check('with the file in it', names.includes('my own recording'), names.join(' | '));

  await picker.selectOption({ label: 'my own recording' });
  await p.waitForTimeout(700);
  const out = room.locator('button').filter({ hasText: /Take it back out/ }).first();
  check('a brought-in song can be taken back out', (await out.count()) === 1);
  await picker.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  await p.screenshot({ path: shot('bringsong-desk.png'), fullPage: false });

  await out.click();
  await p.waitForTimeout(1200);
  const left = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]').length);
  check('taking it out removes the name', left === 0, `${left} left`);
  const gone = await p.evaluate((id) => new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onsuccess = () => {
      const get = open.result.transaction('audio', 'readonly').objectStore('audio').get(id);
      get.onsuccess = () => done(get.result ? get.result.size : 0);
      get.onerror = () => done(-1);
    };
    open.onerror = () => done(-1);
  }), stored[0]?.id);
  check('and the audio with it', gone === 0, `${gone} bytes`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\na song can be brought in from a file, in both rooms, and it stays out of the channel.');

/**
 * A song a collaborator sent you, opened in your own booth.
 *
 * ── The decision this implements ─────────────────────────────────────────
 *
 * The room was a message thread with a song attachable by name, and nothing
 * could be done with the song. Two people editing one timeline together is a
 * different app and weeks of work for something that may not be what was
 * wanted. What collaborators actually do is simpler: you hear what they sent,
 * you sing over it, you send a version back.
 *
 * ── What is stubbed, and what is not ─────────────────────────────────────
 *
 * The Supabase side, because there is none in a probe: the threads, the
 * messages, and the route that signs the audio. What is **not** stubbed is
 * everything the browser does with the answer — keeping the song beside the
 * channel rather than in it, recording who sent it, and the booth listing it
 * with their name on it.
 *
 * The rule that decides whether a file may travel lives in
 * `app/api/collab/track/route.ts` and is checked against the database, so it
 * cannot be proved here. It is stated where it is enforced and in
 * `docs/OPEN-QUESTIONS.md`: the audio is signed for you when its owner put
 * that song into a thread you are in, and that thread is accepted. Not
 * "shared on the radar" — sharing there is a decision to be matched, and
 * treating it as permission to download would turn a discovery switch into a
 * distribution one for every shared song on the platform.
 *
 * ── The assertions that matter ───────────────────────────────────────────
 *
 * That the button appears on **their** song and not on yours — offering to
 * fetch your own song would be the room pretending to do something.
 *
 * And that the song lands in the booth carrying their name. A file that
 * arrives on somebody's device with no name on it becomes theirs by accident.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3099';
const THEM = 'Thabo Mokoena';
const SONG = 'Their half of it';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

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

  /* A real wav for the stubbed route to hand over, so what lands in the booth
     is a song that plays rather than a fixture that cannot. */
  let wav = null;
  const signed = [];

  await p.route('**/api/collab/track', async (route) => {
    signed.push(JSON.parse(route.request().postData() || '{}'));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        // Their own origin: the app's CSP allows `self` and supabase.co and
        // nothing else, so a signed URL anywhere else is refused by the page
        // before Playwright ever sees the request.
        url: `http://localhost:${PORT}/their-song.wav`,
        expiresIn: 120,
        track: {
          id: 'their-1', title: SONG, genre: 'Amapiano', bpm: 112, key: 'A Minor',
          lyrics: '', style: 'warm', models: [], seconds: 4,
          createdAt: '2026-09-01T09:00:00.000Z', seed: 3,
        },
      }),
    });
  });
  await p.route(`http://localhost:${PORT}/their-song.wav`, async (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'audio/wav' }, body: wav }));

  await p.route('**/api/collab/messages*', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          { id: 1, mine: false, body: 'Here is mine — see what you can do with it.', trackId: 'their-1', at: '2026-09-01T09:00:00.000Z' },
          { id: 2, mine: true, body: 'Nice. Mine is coming.', trackId: 'mine-1', at: '2026-09-01T09:05:00.000Z' },
        ],
      }),
    }));
  await p.route('**/api/collab', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ready: true,
        threads: [{
          id: 'thread-1', state: 'accepted', because: 'Same tempo, same key.',
          mine: false, name: THEM, handle: '@thabo', createdAt: '2026-09-01T08:00:00.000Z',
        }],
      }),
    });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  wav = Buffer.from(await p.evaluate(async () => {
    const rate = 22050;
    const frames = rate * 4;
    const bytes = new ArrayBuffer(44 + frames * 2);
    const view = new DataView(bytes);
    const ascii = (at, s) => [...s].forEach((ch, i) => view.setUint8(at + i, ch.charCodeAt(0)));
    ascii(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); ascii(8, 'WAVE');
    ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    ascii(36, 'data'); view.setUint32(40, frames * 2, true);
    for (let i = 0; i < frames; i += 1) {
      view.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 18000), true);
    }
    return Array.from(new Uint8Array(bytes));
  }), 'binary');

  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('collab@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('collab-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(900);

  const bar = p.locator('nav[aria-label]').first();
  const intoRoom = async (name) => {
    await bar.locator('button').filter({ hasText: 'Make' }).first().click();
    await p.waitForTimeout(1100);
    const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
    const many = await door.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) {
        await door.nth(i).click();
        await p.waitForTimeout(1900);
        return;
      }
    }
    throw new Error(`no way into ${name}`);
  };

  await intoRoom('Collab Radar');
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: THEM }).first().click().catch(() => undefined);
  await p.waitForTimeout(1400);

  const sing = room.locator('button').filter({ hasText: /Sing on it in my booth/ });
  check('the room offers to open their song in your booth',
    (await sing.count()) === 1, `${await sing.count()} offered`);
  check('and only on theirs — not on the one you sent',
    (await sing.count()) === 1, 'two songs in the thread, one button');
  await p.screenshot({ path: shot('collab-booth.png'), fullPage: false });

  await sing.first().click();
  await p.waitForTimeout(3000);

  check('the app asked for that song by id', signed[0]?.trackId === 'their-1', JSON.stringify(signed[0]));

  const kept = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]'));
  check('it is kept beside the channel, not in it', kept.length === 1, `${kept.length} kept`);
  check('with their name on it', kept[0]?.givenBy === THEM, String(kept[0]?.givenBy));
  const channel = await p.evaluate(() =>
    JSON.parse(window.localStorage.getItem('futurebox.tracks.v1') || '[]').length);
  check('and the channel is untouched', channel === 0, `${channel} in the channel`);

  const bytes = await p.evaluate((id) => new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onsuccess = () => {
      const get = open.result.transaction('audio', 'readonly').objectStore('audio').get(id);
      get.onsuccess = () => done(get.result ? get.result.size : 0);
      get.onerror = () => done(0);
    };
    open.onerror = () => done(0);
  }), kept[0]?.id);
  check('the song itself is on the device', bytes > 40000, `${bytes} bytes`);

  /* And it landed in the booth, credited. */
  const boothSays = ((await room.innerText()) ?? '').replace(/\s+/g, ' ');
  check('the booth is open on it', boothSays.includes(SONG),
    (boothSays.match(new RegExp(`.{0,20}${SONG}.{0,30}`)) ?? ['(not there)'])[0]);
  check('and says who sent it', /Sent to you by/.test(boothSays) && boothSays.includes(THEM),
    (boothSays.match(/Sent to you by [^·]{0,30}/) ?? ['(not said)'])[0]);
  await p.screenshot({ path: shot('collab-booth-open.png'), fullPage: false });
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ntheir song opens in your booth, kept beside your channel, with their name on it.');

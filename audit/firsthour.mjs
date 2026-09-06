/**
 * One person's first hour, as one path.
 *
 * ── The gap this fills ───────────────────────────────────────────────────
 *
 * Every room in this app has a probe and the joins between them have none.
 * That is exactly backwards from where things break: a room fails loudly and
 * its own probe catches it, while a join fails as a dead end — a button that
 * leads to an empty screen, a song that does not appear where it was made, a
 * tab that opens on nothing — and every per-room probe stays green through
 * all of it.
 *
 * Carli has testers signing up now. The one thing worth knowing before they
 * do is whether a person can get from the front door to a song in the room
 * without hitting a wall, and that is a question no probe here has ever
 * asked.
 *
 * ── The path ─────────────────────────────────────────────────────────────
 *
 *   the door → sign up → wherever that lands → make a song → the library
 *   → take the file → put it in the live room → see it there
 *
 * Six screens, four components, and one assertion at each seam: not "the
 * button exists" but "the thing it was about is now on the next screen".
 *
 * ── What is stood in for, and what is not ────────────────────────────────
 *
 * The music engine and the live room's server. Both need paid accounts this
 * environment does not have, and a probe that needs one is a probe nobody
 * runs. Everything between them — the routing, the library, the storage, the
 * download, the state each screen hands the next — is the real app.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3245';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const WORDS = ['[Verse]', 'Die eerste liedjie wat ek hier maak', '[Chorus]', 'En dit werk'].join('\n');

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

  browser = await chromium.launch(launchOptions());
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* The engine. A few bytes of WAV rather than MP3, because the download at
     the end reads the type off the blob and a probe that cannot tell the two
     apart would pass on a file named wrongly. */
  const wav = () => {
    const head = Buffer.alloc(44);
    head.write('RIFF', 0); head.writeUInt32LE(36 + 8, 4); head.write('WAVE', 8);
    head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20);
    head.writeUInt16LE(1, 22); head.writeUInt32LE(8000, 24); head.writeUInt32LE(8000, 28);
    head.writeUInt16LE(1, 32); head.writeUInt16LE(8, 34);
    head.write('data', 36); head.writeUInt32LE(8, 40);
    return Buffer.concat([head, Buffer.alloc(8, 128)]);
  };
  await p.route('**/api/music', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'audio/wav', 'X-Music-Model': 'ElevenLabs Music' },
      body: wav(),
    });
  });

  /* The live room. Its posts are whatever this probe has put in it, so the
     last seam — "the song is in the room" — is answered by the room rather
     than by a fixture that was always going to say yes. */
  const inTheRoom = [];
  await p.route('**/api/live*', async (route) => {
    if (route.request().method() === 'POST') {
      const sent = JSON.parse(route.request().postData() ?? '{}');
      if (sent.what === 'post') {
        inTheRoom.push({
          id: `post-${inTheRoom.length + 1}`,
          kind: 'track',
          title: String(sent.title ?? ''),
          note: '', seconds: Number(sent.seconds ?? 0), platform: '', link: '',
          startsAt: null, at: new Date().toISOString(), by: 'You', mine: true,
          audio: null, sourceId: String(sent.sourceId ?? ''),
        });
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ready: true, signedIn: true, here: 1, posts: inTheRoom, says: [] }),
    });
  });

  /* ── 1. The door ──────────────────────────────────────────────────── */
  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  check('the front door offers a way in', (await cta.count()) === 1);
  await cta.click();
  await p.waitForTimeout(700);

  /* ── 2. Signing up ────────────────────────────────────────────────── */
  await p.locator('input[type="email"]').first().fill('firsthour@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('firsthour-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2800);

  /* What a new person is offered before they choose anything.
 
     "Ek dink na in log moet, make die eerste blad wees wat die klient sien."
     The greeting is that screen, and the first thing on it has to be making
     something. Asserted before the skip is pressed — a probe that pressed
     "take me to the feed" and then reported which tab it landed on would be
     measuring its own click. */
  const greetingBox = p.locator('div.fixed.inset-0.z-\\[55\\]');
  check('a new person meets the greeting rather than the feed', (await greetingBox.count()) === 1);
  /* Read inside the greeting, not off the whole page.
 
     Written against `body` first, and it passed — on the feed behind it,
     which carries the words "Make a song" in its own rail. An assertion that
     reads the document and looks for a phrase will find it somewhere; this is
     the fourth time in this session that shape has passed for the wrong
     reason. */
  const greeting = ((await greetingBox.innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ');
  check('and the first thing it offers is making something',
    /Make a song|Maak .n liedjie|first song|eerste liedjie/i.test(greeting),
    greeting.slice(0, 90));

  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  check('and a way past it, for somebody who came to look around',
    (await notNow.count()) === 1);
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(1000);

  const bar = p.locator('nav[aria-label]').first();
  check('skipping lands on the feed, with all five tabs',
    (await bar.count()) === 1 && (await bar.locator('button').count()) === 5,
    `${await bar.locator('button').count()} tabs`);
  await p.screenshot({ path: shot('firsthour-landed.png') });

  /* ── 3. Making a song ─────────────────────────────────────────────── */
  await bar.locator('button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1300);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  let opened = false;
  for (let i = 0; i < (await door.count()); i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Make a song/i.test(first)) { await door.nth(i).click(); opened = true; break; }
  }
  check('the studio has a door into making a song', opened);
  await p.waitForTimeout(1600);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  await room.locator('textarea[placeholder*="Verse 1"]').fill(WORDS);
  await room.locator('input:visible').first().fill('Die eerste een');
  await p.waitForTimeout(400);
  await room.locator('button').filter({ hasText: /^Make my song$/ }).first().click();

  /* The song has to arrive on the screen it was made on, and be a song rather
     than a name on it — the title is in the box that was typed into, so
     "the words are on the screen" would have passed before anything was made.
     What only exists once there is a track is its own Post to Live button. */
  const madeOne = room.locator('button').filter({ hasText: /Post to Live/ }).first();
  await madeOne.waitFor({ state: 'visible', timeout: 60000 }).catch(() => undefined);
  check('the song comes back into the room it was made in',
    (await madeOne.count()) > 0 && (await room.innerText()).includes('Die eerste een'),
    (await madeOne.count()) > 0 ? 'with its own buttons on it' : 'no song card');

  /* ── 4. The library ───────────────────────────────────────────────── */
  await room.locator('button[aria-label="Close"], button[aria-label="Back"]').first()
    .click().catch(() => undefined);
  await p.waitForTimeout(600);
  await bar.locator('button').filter({ hasText: 'Library' }).first().click();
  await p.waitForTimeout(1800);
  const library = async () => ((await p.locator('body').innerText()) ?? '').replace(/\s+/g, ' ');
  check('and it is in the library, on the other side of the app',
    (await library()).includes('Die eerste een'), 'by name');

  /* ── 5. Taking the file ───────────────────────────────────────────── */
  const keep = p.locator('button').filter({ hasText: /^Download$/ }).first();
  check('the library offers the file', (await keep.count()) === 1);
  const [file] = await Promise.all([
    p.waitForEvent('download', { timeout: 20000 }).catch(() => null),
    keep.click(),
  ]);
  check('and pressing it hands over a real one, named after the song',
    file?.suggestedFilename() === 'die-eerste-een.wav', file?.suggestedFilename() ?? 'nothing arrived');

  /* ── 6. Into the room ─────────────────────────────────────────────── */
  const toLive = p.locator('button').filter({ hasText: /Post to Live/ }).first();
  check('the song can go straight to the room from here', (await toLive.count()) === 1);
  await toLive.click();
  for (let waited = 0; waited < 30 && inTheRoom.length === 0; waited += 1) await p.waitForTimeout(300);
  check('pressing it puts the song in the room', inTheRoom.length === 1,
    inTheRoom[0]?.title ?? 'nothing arrived');
  check('under the name it was given, not a placeholder',
    inTheRoom[0]?.title === 'Die eerste een', inTheRoom[0]?.title ?? '');
  /* The song's own id, not the post's. A chart or a play counted against the
     wrong one is invisible until somebody checks the numbers. */
  check('and carrying the song it is of', Boolean(inTheRoom[0]?.sourceId), inTheRoom[0]?.sourceId ?? '');

  /* ── 7. And it is there ───────────────────────────────────────────── */
  await bar.locator('button').filter({ hasText: 'Live' }).first().click();
  await p.waitForTimeout(2200);
  check('the live room shows it', (await library()).includes('Die eerste een'), 'by name');
  await p.screenshot({ path: shot('firsthour-inroom.png') });
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:firsthour — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:firsthour — the door, a song, the library, the file, and the room. One path, no dead ends.');

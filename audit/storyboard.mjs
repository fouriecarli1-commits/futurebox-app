/**
 * A film built out of shots: from the first sentence to the finished file.
 *
 * ── What is real ─────────────────────────────────────────────────────────
 *
 * Everything this app owns. The shots and their order, the running total, what
 * is left to pay for, the clips going into the same store the desk already
 * uses, the board surviving a reload, and the cut itself — `lib/stitch.ts`
 * runs for real against real recorded video and the film that comes out is
 * measured.
 *
 * ── What is stubbed, and how honestly ────────────────────────────────────
 *
 * The engine, because it charges money. It is stubbed at the wire rather than
 * in the module: `POST /api/video` opens a job, the poll answers done, and the
 * URL it points at serves a **genuine recorded clip**. So `generateVideo` does
 * its whole real job — post, poll, download — and what the stitcher receives
 * downstream is video, not a fixture.
 *
 * ── The assertion that matters ───────────────────────────────────────────
 *
 * That the film is as long as its clips added together. Everything else here
 * is arranging; that number is whether the arranging produced a film.
 *
 * A note on the reload: without Supabase configured this app signs somebody in
 * for the tab only, so the run signs in again afterwards. That is the app
 * behaving correctly and the test working around it, not the other way round.
 */
import { chromium } from 'playwright';

const PORT = process.argv[2] || '3027';
const af = process.argv[3] === 'af';
const CLIP_SECONDS = 2;

const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));
await p.addInitScript((l) => { try { window.localStorage.setItem('futurebox.lang.v1', l); } catch {} }, af ? 'af' : 'en');

const CAPS = {
  available: true, auth: 'bearer', grades: ['premium'],
  can: { premium: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: true } },
  sound: true, startFrame: true,
};

let clipBytes = null;
const started = [];
await p.route('**/api/video*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  if (request.method() === 'POST') {
    started.push(JSON.parse(request.postData() || '{}'));
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: `v${started.length}` }) });
  }
  if (url.searchParams.get('id')) {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      /* A supabase.co host, because the app's own CSP says so.

         `connect-src 'self' https://*.supabase.co` — a signed URL from the
         videos bucket is what this really is, and a stub on any other host is
         blocked by the page before Playwright's route ever sees it. The first
         version used `clip.test` and every generation failed silently, which
         is the app's content policy working exactly as intended. */
      body: JSON.stringify({ state: 'done', url: `https://stub.supabase.co/${url.searchParams.get('id')}.webm` }),
    });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CAPS) });
});
await p.route('https://stub.supabase.co/**', async (route) =>
  route.fulfill({ status: 200, headers: { 'content-type': 'video/webm' }, body: clipBytes }));

async function signIn() {
  const cta = p.locator('button, a').filter({ hasText: af ? /begin|gratis|teken/i : /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 40000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('toets-wagwoord-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2500);
}
async function intoTheDesk() {
  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();
  await room.locator('button').filter({ hasText: /^Video desk|^Videolessenaar/i }).first().click();
  await p.waitForTimeout(2200);
  return room;
}

await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

// A real clip, recorded in the page, for the stubbed engine to hand back.
clipBytes = Buffer.from(await p.evaluate(async (seconds) => {
  const canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 90;
  const c = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: type });
  const parts = [];
  rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const stopped = new Promise((r) => { rec.onstop = r; });
  rec.start();
  const began = performance.now();
  await new Promise((finish) => {
    const draw = () => {
      c.fillStyle = '#1b4965'; c.fillRect(0, 0, 160, 90);
      if (performance.now() - began >= seconds * 1000) { finish(); return; }
      requestAnimationFrame(draw);
    };
    draw();
  });
  rec.stop();
  await stopped;
  const blob = new Blob(parts, { type });
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}, CLIP_SECONDS), 'binary');
check('a real clip was recorded for the engine to return', clipBytes.length > 2000, String(clipBytes.length));

await signIn();
let room = await intoTheDesk();

const words = await room.innerText();
check('the storyboard is on the desk',
  af ? /Bou .n lang een/.test(words) : /Build a long one/.test(words));
check('it says why a long video is short ones',
  af ? /halwe minuut in een slag/.test(words) : /half a minute in one go/.test(words));
check('it says to write them all first',
  af ? /Skryf hulle eers almal/.test(words) : /Write them all first/.test(words));
check('there is nothing to cut before there are shots',
  (await room.locator('button').filter({ hasText: af ? /^Sny dit in een film/ : /^Cut it into one film/ }).count()) === 0);

const add = room.locator('button').filter({ hasText: af ? /^Sit .n skoot by/ : /^Add a shot/ }).first();
for (let n = 0; n < 3; n += 1) { await add.click(); await p.waitForTimeout(250); }
const boxes = () => room.locator('textarea[id^="shot-"]');
check('three shots were added', (await boxes().count()) === 3, String(await boxes().count()));

const lines = [
  'A tar road at dusk, slow push in, dust in the headlights',
  'Hands on a steering wheel in close-up, city lights passing',
  'A wide shot of the car leaving frame, the road empty behind',
];
for (let n = 0; n < 3; n += 1) await boxes().nth(n).fill(lines[n]);
await p.waitForTimeout(500);

const written = await room.innerText();
check('the running total is shown', /0:15/.test(written), (written.match(/\d+:\d\d/g) || []).join(','));
check('and what is left to make costs something',
  af ? /Wat oorbly om te maak kos/.test(written) : /What is left to make costs/.test(written));

await room.locator(`button[aria-label="${af ? 'Skuif hierdie skoot later' : 'Move this shot later'}"]`).first().click();
await p.waitForTimeout(500);
check('a shot can be moved later', (await boxes().nth(0).inputValue()) === lines[1], (await boxes().nth(0).inputValue()).slice(0, 28));

// The reload: the whole reason the board is stored at all.
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await signIn();
room = await intoTheDesk();
check('the storyboard survives a reload',
  (await boxes().count()) === 3 && (await boxes().nth(0).inputValue()) === lines[1],
  `${await boxes().count()} shots`);

// Make each shot. The engine's poll waits ten seconds before its first ask.
for (let n = 0; n < 3; n += 1) {
  await room.locator('button').filter({ hasText: af ? /^Maak hierdie skoot/ : /^Make this shot/ }).first().click();
  await p.waitForTimeout(14000);
}
check('three shots were sent to the engine', started.length === 3, String(started.length));
check('each was asked for at the length on its row',
  started.every((one) => one.seconds === 5), started.map((o) => o.seconds).join(','));
check('and with the desk\'s own shape', started.every((one) => one.aspect === CAPS.can.premium.aspects[0]),
  started.map((o) => o.aspect).join(','));

const made = await room.innerText();
check('every shot reads as made',
  (made.match(af ? /Gemaak/g : /\bMade\b/g) || []).length >= 3,
  (made.match(af ? /Gemaak/g : /\bMade\b/g) || []).length + ' marked');

// The cut.
const cut = room.locator('button').filter({ hasText: af ? /^Sny dit in een film/ : /^Cut it into one film/ }).first();
check('the cut button appears once every shot is made', (await cut.count()) > 0);
check('and is not disabled', !(await cut.isDisabled()));
await cut.click();
await p.waitForTimeout((CLIP_SECONDS * 3 + 6) * 1000);

const film = room.locator('video');
check('a film came out', (await film.count()) > 0, String(await film.count()));
const length = await p.evaluate(async () => {
  const v = [...document.querySelectorAll('video')].pop();
  if (!v) return 0;
  if (!Number.isFinite(v.duration) || v.duration === Infinity) {
    v.currentTime = 1e101;
    await new Promise((r) => { v.onseeked = r; setTimeout(r, 1500); });
  }
  return v.duration;
});
check(
  `the film is as long as its clips (${(CLIP_SECONDS * 3).toFixed(1)}s wanted, ${length.toFixed(2)}s got)`,
  Math.abs(length - CLIP_SECONDS * 3) < 1.2,
  String(length),
);
check('and it can be saved',
  (await room.locator('button').filter({ hasText: af ? /^Stoor die film/ : /^Save the film/ }).count()) > 0);

await p.screenshot({ path: `audit/storyboard-${af ? 'af' : 'en'}.png`, fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

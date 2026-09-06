/**
 * The language button at the video desk, and what it refuses to offer.
 *
 * ── The gap this closes ──────────────────────────────────────────────────
 *
 * There was no way to choose a language anywhere on this desk, and that read
 * as an oversight. It half was. Nothing else here takes a language: the
 * engines are English-first and their API has no language field, and the words
 * on screen are typed in whatever language they were typed in. The one place a
 * language is a real parameter is a dub — and a dub of a film is the thing
 * somebody actually wants, which is the same shots with the speaking
 * re-performed.
 *
 * ── What is real and what is stubbed ─────────────────────────────────────
 *
 * The desk, the panel, the choice, the polling and the collect are the shipped
 * code. The two paid services are stubbed at the wire: `POST /api/video`
 * answers with a genuine recorded clip, and `/api/dub` answers as ElevenLabs
 * would — a job id, then done, then a file. Both are stubbed in one handler
 * each, because Playwright hands a request to the LAST matching route and two
 * handlers for one path is how a specific stub gets silently shadowed.
 *
 * ── The assertion that matters ───────────────────────────────────────────
 *
 * That the button appears on a clip with a spoken line and does NOT appear on
 * a silent one. A dub re-performs speech; offering it on silence would take
 * the credits and hand back the same film. That is the difference between a
 * language button and a way to lose money.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { dismissDoor } from './enter.mjs';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3073';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const CAPS = {
  available: true,
  auth: 'bearer',
  grades: ['better'],
  can: { better: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: false } },
  sound: true,
  startFrame: false,
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

  let clipBytes = null;
  const asked = [];

  // One handler for the video engine, POST and GET alike.
  await p.route('**/api/video*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      asked.push(JSON.parse(request.postData() || '{}'));
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: `v${asked.length}` }),
      });
    }
    if (url.searchParams.get('id')) {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        // A supabase.co host, because the app's own CSP allows that and
        // nothing else — a stub anywhere else is blocked before Playwright
        // ever sees the request.
        body: JSON.stringify({ state: 'done', url: `https://stub.supabase.co/${url.searchParams.get('id')}.webm` }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CAPS) });
  });
  await p.route('https://stub.supabase.co/**', async (route) =>
    route.fulfill({ status: 200, headers: { 'content-type': 'video/webm' }, body: clipBytes }));

  /* The dub, as ElevenLabs answers it: a job id, then done, then the file —
     and the file is a video, because a video went in. One handler for all
     three, for the route-ordering reason in the note above. */
  const dubs = [];
  await p.route('**/api/dub*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      dubs.push({ bytes: (request.postData() ?? '').length });
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 'dub-1', expected: 90, charged: 30 }),
      });
    }
    if (url.searchParams.get('collect') === '1') {
      return route.fulfill({ status: 200, headers: { 'content-type': 'video/mp4' }, body: clipBytes });
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'dubbed', done: true, failed: false, error: null, language: 'af' }),
    });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

  // A real clip for the stubbed engine to hand back.
  clipBytes = Buffer.from(await p.evaluate(async () => {
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
        if (performance.now() - began >= 2000) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    return Array.from(new Uint8Array(await new Blob(parts, { type }).arrayBuffer()));
  }), 'binary');
  check('a real clip was recorded for the engine to return', clipBytes.length > 2000, `${clipBytes.length} bytes`);

  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('taal@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('taal-password-1234');
  await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through. The app is in when the bottom bar is —
     it is on every signed-in screen and no signed-out one. The flat sleep
     that was here is how long signing in took on an idle laptop; on a loaded
     one it is sometimes short, and this probe then drives the signed-out page
     while believing it is in, which reports the room as broken when the fault
     is the wait. That is exactly how it failed. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => undefined);
  await p.waitForTimeout(400);
  /* The welcome door, waited for and then gone.
     `count()` once was the fault: the door draws after two fetches settle, so
     asking the instant the bar appears gets "no", and half a second later it is
     there — over the header, under the next press. `bringsong` timed out on
     exactly that. `enter.mjs` has said it in a comment since the day it was
     written; the probes with their own way in never got the lesson. */
  await dismissDoor(p);
  await p.waitForTimeout(500);

  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* Through the studio's front door, which is what the studio opens on. Going
     for the rail behind it clicks through an overlay and times out — the rail
     is "visible" to Playwright the whole time it is covered. */
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  let wentIn = false;
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (first.toLowerCase().startsWith('video desk')) {
      await door.nth(i).click();
      wentIn = true;
      break;
    }
  }
  if (!wentIn) throw new Error('no way into the video desk');
  await p.waitForTimeout(2200);

  const box = room.locator('textarea').first();

  /** Write a shot, choose whether it speaks, and make it. */
  async function makeOne(words, speaking) {
    await box.fill(words);
    await p.waitForTimeout(400);
    /* The switch only draws while the prompt has a quoted line in it — which
       is the whole reason `willSpeak` is derived rather than trusted. */
    const say = room.locator('input[type="checkbox"]').first();
    if (speaking) {
      await say.waitFor({ state: 'visible', timeout: 5000 });
      await say.setChecked(true);
    } else if ((await say.count()) && (await say.isVisible().catch(() => false))) {
      await say.setChecked(false);
    }
    await p.waitForTimeout(300);
    const were = asked.length;
    await room.locator('button').filter({ hasText: /^Make it/ }).first().click();
    /* Waited for rather than slept through: the engine is polled, so a fixed
       four seconds reported "no button" for a clip that arrived at five. */
    for (let tries = 0; tries < 40 && asked.length === were; tries += 1) {
      await p.waitForTimeout(500);
    }
    /* Waited for the clip's own line to appear under "Made on this desk".
       Waiting on "a blob video is visible" passed instantly on the second
       shot, because the first one's video was still on the page — and the
       check that followed then read a section with one clip in it. */
    await room.locator('p').filter({ hasText: words.slice(0, 30) }).first()
      .waitFor({ state: 'visible', timeout: 25000 });
    await p.waitForTimeout(600);
  }

  // ── A clip with a line on it ─────────────────────────────────────────
  await makeOne('A woman at a window in the late afternoon, saying "Ek gaan nie terug nie", slow push in.', true);
  check('the engine was asked to speak the line', asked.at(-1)?.speak === true, JSON.stringify(asked.at(-1)?.speak));

  const button = room.locator('button').filter({ hasText: /Another language/ }).first();
  await button.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
  check('a clip that speaks offers the language button', (await button.count()) === 1,
    `${await button.count()} found`);

  await button.click();
  await p.waitForTimeout(700);
  const panel = room.locator('text=Put this film in another language').first();
  check('and the panel opens', (await panel.count()) === 1);

  const codes = await room.locator('[role="radiogroup"] [role="radio"]').allInnerTexts();
  check('with a real list of languages, not two', codes.length > 20, `${codes.length} offered`);
  check('with Afrikaans on it, first', /Afrikaans/.test(codes[0] ?? ''), codes[0]);
  await p.screenshot({ path: shot('videolang.png'), fullPage: false });

  await room.locator('[role="radio"]').filter({ hasText: /Afrikaans/ }).first().click();
  await p.waitForTimeout(300);
  await room.locator('button').filter({ hasText: /^Dub it/ }).first().click();
  await p.waitForTimeout(3000);

  check('the film was sent to be dubbed', dubs.length === 1, `${dubs.length} started`);
  const finished = await room.innerText();
  check('and the dubbed film comes back and is offered', /Done/.test(finished) && /Save it/.test(finished));
  check('played as a film, because a dub of a film is a film',
    (await room.locator('video[src^="blob:"]').count()) > 0);

  // ── A silent clip ────────────────────────────────────────────────────
  await makeOne('An empty road at dawn, wide, still, no one in the frame.', false);
  check('the engine was not asked to speak', asked.at(-1)?.speak === false, JSON.stringify(asked.at(-1)?.speak));

  const said = await room.innerText();
  check('a silent clip says why there is nothing to dub',
    /nothing is spoken on this one/i.test(said));
  /* One clip speaks and one does not, so exactly one language button belongs
     on the page — and the open panel from the first clip is not a button. */
  const stillOne = await room.locator('button').filter({ hasText: /Another language/ }).count();
  check('and does not offer the paid button', stillOne === 0, `${stillOne} button(s) on the page`);
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nthe language button is on the clips that speak, and only on those.');

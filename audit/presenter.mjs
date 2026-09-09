/**
 * The presenter, driven from a script to a finished clip.
 *
 * ── What is real and what is stubbed ─────────────────────────────────────
 *
 * Real: the panel, the order it asks in, what it refuses to do before the
 * confirmation, the price it puts on the button, and — the point of the whole
 * run — what actually reaches `/api/presenter`. A picture and an audio file as
 * data URLs, the script alongside them for the screen, and the length read off
 * the audio rather than guessed from the words.
 *
 * Stubbed: the two services. The voice route hands back a real WAV so the
 * duration is measured rather than asserted, and the presenter route answers
 * the way it would with `ELEVEN_AURORA_READY=1` set. Neither is switched on in
 * this environment, and a run that only proved the refusal would be a run
 * about the flag. *
 * ── Why this had never run ───────────────────────────────────────────────
 *
 * It was written against a server somebody had left running on a port, which
 * is the fault `serve()` exists to fix — so it never earned a `check:` name
 * and sat here being run by nobody. It builds its own stubbed project and
 * starts its own server now, and puts the ordinary build back in an exit
 * handler however the run ends.
 */
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, toRoom } from './enter.mjs';

const PORT = Number(process.argv[2] || 3021);
const af = process.argv[3] === 'af';

/* A project that has accounts, so the header draws a signed-in person at all.
   `stub.supabase.co` is nonsense on purpose — nothing here reaches Supabase —
   and the storage key the app derives from it is `sb-stub-auth-token`, which
   is what this probe seeds below. */
const STUB = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'stub-anon-key',
};
console.log('building with a project that has accounts…');
execSync('npx next build', { stdio: 'ignore', env: { ...process.env, ...STUB } });

let putBack = false;
process.on('exit', () => {
  if (putBack) return;
  putBack = true;
  console.log('putting the ordinary build back…');
  try {
    execSync('npx next build', { stdio: 'ignore' });
  } catch {
    console.error('the ordinary build could not be put back — run `npx next build`');
  }
});

const server = await serve(PORT, { env: STUB });
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${label}: ${ok}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const WHO = { id: '11111111-2222-3333-4444-555555555555', email: 'toets@futurebox.test' };
await p.addInitScript(({ lang, who }) => {
  try {
    window.localStorage.setItem('futurebox.lang.v1', lang);
    window.localStorage.setItem('sb-stub-auth-token', JSON.stringify({
      access_token: 'stub-access-token', refresh_token: 'r', token_type: 'bearer',
      expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400,
      user: { id: who.id, email: who.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
    }));
  } catch {}
}, { lang: af ? 'af' : 'en', who: WHO });

await p.route('**/auth/v1/**', async (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ id: WHO.id, email: WHO.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }),
}));
await p.route('**/rest/v1/**', async (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));

// One cast member, with a real picture behind it.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
await p.route('**/api/cast*', async (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ cast: [{ id: 'm1', name: 'Sarel', note: '', path: `${WHO.id}/1700000000000.webp`, created_at: new Date().toISOString() }] }),
}));
await p.route('**/storage/v1/object/**', async (route) =>
  route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

// The video engine, so the desk draws at all.
await p.route('**/api/video*', async (route) => {
  if (route.request().method() !== 'GET') return route.fallback();
  const url = new URL(route.request().url());
  if (url.searchParams.get('id')) {
    // The poll the presenter waits on, answering done on the first ask.
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'done', url: 'blob:stub' }) });
  }
  return route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({
      available: true, auth: 'bearer', grades: ['premium'],
      can: { premium: { seconds: [5, 10], aspects: ['16:9', '9:16', '1:1'], speaks: true, startFrame: true } },
      sound: true, startFrame: true,
    }),
  });
});

await p.route('**/api/presenter', async (route) => {
  if (route.request().method() === 'GET') {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ available: true }) });
  }
  sent = JSON.parse(route.request().postData() || '{}');
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'vid-1', state: 'running', seconds: sent.seconds }) });
});
let sent = null;

await p.route('**/api/voice', async (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ configured: true, signedIn: true, mine: [{ id: 'mine-1', name: 'My own voice' }], stock: [{ id: 'stock-1', name: 'Anja' }] }),
}));

/* A real two-second WAV, so the length on the button is measured off a file
   the way it is in life rather than asserted by the test. */
function wav(seconds) {
  const rate = 8000;
  const samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples * 2, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}
let reads = 0;
/* ── What the read answers with, and both shapes of it ────────────────────

   `timings: true` asks for JSON — the audio as base64 with ElevenLabs' own
   alignment beside it. Anything that has not been deployed yet, or anything
   in front of the route that answers plainly, sends audio. The screen has to
   cope with both, and this probe drives both: `asJson` is flipped part-way
   down so the raw-audio path is walked as well.

   The language is checked here rather than on the screen, because it is the
   whole of #115 and it is invisible: an Afrikaans script read by the model
   chosen for English looks identical on the page. */
let asJson = true;
/** What the screen sent to have the script read. `sent` above is the video. */
let asked = null;
await p.route('**/api/voice/speak', async (route) => {
  reads += 1;
  asked = JSON.parse(route.request().postData() || '{}');
  if (!asJson || asked.timings !== true) {
    return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav(2) });
  }
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      audio: wav(2).toString('base64'),
      type: 'audio/wav',
      model: 'eleven_v3',
      modelWhy: 'measured',
      /* Inside the two seconds the file lasts, so the follow-along has
         somewhere real to land. */
      words: [
        { text: 'Hallo,', start: 0, end: 0.4 },
        { text: 'ek', start: 0.5, end: 0.7 },
        { text: 'is', start: 0.8, end: 1 },
        { text: 'Sarel.', start: 1.1, end: 1.6 },
      ],
      lines: [{ text: 'Hallo, ek is Sarel.', start: 0, end: 1.6 }],
    }),
  });
});

/* `domcontentloaded`, not `networkidle`: the stub project's Supabase address
   keeps a realtime socket open that never settles. */
await p.goto(server.url, { waitUntil: 'domcontentloaded' });
await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 40000 }).catch(() => undefined);
await p.waitForTimeout(1500);
/* The welcome door, which did not exist when this probe was written and sits
   over the header at `z-[55]`. */
await dismissDoor(p);
await p.locator('header button').filter({ hasText: /Studio/i }).first().waitFor({ timeout: 40000 });
await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
await p.waitForTimeout(1800);
const room = p.locator('div.fixed.inset-0.z-50').first();
await toRoom(p, af ? 'Videolessenaar' : 'Video desk');
await p.waitForTimeout(2200);

const words = await room.innerText();
check('the presenter is on the desk',
  af ? /Aanbieder wat jou skrif s/i.test(words) : /A presenter who says your script/i.test(words));
check('it says it speaks the language you write in',
  af ? /Afrikaans inkluis/.test(words) : /Afrikaans included/.test(words));
check('the cast member is offered as who says it',
  (await room.locator('button[aria-pressed]').filter({ hasText: /Sarel/ }).count()) > 0);

await room.locator('#presenter-script').fill('Hallo, ek is Sarel, en vandag wys ek jou iets nuuts.');
await p.waitForTimeout(400);

check('nothing can be made before it has been heard',
  (await room.locator('button').filter({ hasText: af ? /^Maak die video/ : /^Make the video/ }).count()) === 0);

await room.locator('button').filter({ hasText: af ? /Luister eers/ : /Hear it first/ }).first().click();
await p.waitForTimeout(2500);
check('the voice route was asked once', reads === 1, String(reads));

/* ── #115, checked where it is invisible ──────────────────────────────────

   An Afrikaans script read by the model chosen for English looks exactly like
   one read by the right model. The only place it can be caught is on the
   wire: the screen has to say which language it is written in, or the route
   has nothing to choose with — and for the whole life of this room it did
   not. */
check('the read says which language the script is written in',
  asked?.language === (af ? 'af' : 'en'),
  `it sent ${JSON.stringify(asked?.language)}`);
check('and it asks for the timings, which cost nothing extra',
  asked?.timings === true,
  'without this the words cannot follow the read without paying to transcribe it back');

/* ── The words, following the read ────────────────────────────────────────

   The lines come back with the audio and are drawn under the player. What is
   checked is that they are on the screen and pressable — the highlight itself
   moves on `timeupdate`, which needs the file to actually play, and a headless
   run with no audio device is not the place to assert on that. */
const readLines = room.locator('button').filter({ hasText: 'Hallo, ek is Sarel.' });
check('the words of the read are under the player', (await readLines.count()) > 0,
  'the alignment came back and nothing was drawn with it');
check('and a line can be pressed to hear it from there',
  (await readLines.first().isEnabled().catch(() => false)));

const afterRead = await room.innerText();
check('the length is measured off the reading', /\b2s\b/.test(afterRead), afterRead.match(/\d+s/g)?.join(',') || 'none');
check('and the price follows that length', /\b12\b/.test(afterRead), afterRead.match(/\d+ (credits|krediete)/)?.[0] || 'none');

const go = room.locator('button').filter({ hasText: af ? /^Maak die video/ : /^Make the video/ }).first();
check('the make button appears once there is a reading', (await go.count()) > 0);
check('and is refused until the confirmation is ticked', await go.isDisabled());

await room.locator('input[type="checkbox"]').first().check();
await p.waitForTimeout(300);
check('ticking it lets the video be made', !(await go.isDisabled()));

await go.click();
await p.waitForTimeout(3000);

check('a picture reached the route', typeof sent?.image === 'string' && sent.image.startsWith('data:image/'), String(sent?.image).slice(0, 24));
check('an audio file reached the route', typeof sent?.audio === 'string' && sent.audio.startsWith('data:audio/'), String(sent?.audio).slice(0, 24));
check('the script went with it, for the screen', /Sarel/.test(sent?.script ?? ''), sent?.script);
check('the length sent is the length of the reading', sent?.seconds === 2, String(sent?.seconds));
check('the confirmation was sent, not assumed', sent?.consent === true, String(sent?.consent));

await p.screenshot({ path: shot(`presenter-${af ? 'af' : 'en'}.png`), fullPage: true });
console.log('problems:', problems.join(' ;; ') || 'none');
await b.close();
process.exit(problems.length ? 1 : 0);

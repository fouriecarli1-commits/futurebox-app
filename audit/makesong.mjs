/**
 * The room this app is for, pressed the way somebody presses it.
 *
 * Two things Carli reported, in Afrikaans, an hour apart:
 *
 *   "By make a song is daar nie 'n lengte keuse vir liedjies nie."
 *   "Die make a song generate glad nie reg nie … net klank het uitgekom."
 *
 * The first was true because the length sat behind the Everything switch — the
 * one control there that changes what a song costs, so Simple was hiding the
 * price while charging it. The second was a fault on the server, and is tested
 * where it lives by `check:makesong`.
 *
 * What this adds is the half a unit test cannot reach: that the room asks for
 * a length before anything is spent, that it says plainly when a song is going
 * to come back with nobody singing on it, and that the request it actually
 * sends carries the words that were typed into the box. The last one is the
 * whole product in one assertion, and it is checked by reading the request on
 * its way out rather than by trusting the code that builds it.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { shot } from './where.mjs';

const PORT = process.argv[2] || '3093';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

const WORDS = [
  '[Verse]',
  'Ek ry alleen deur die Karoo',
  'Die pad is lank en stil',
  '[Chorus]',
  'En ek sing vir jou',
].join('\n');

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

  browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

  /* The engine, stood in for.

     There is no ElevenLabs key here and there must not be one — a probe that
     needs a paid account is a probe nobody runs. What is being checked is what
     leaves this app, so the stub answers "yes, I am switched on" and hands
     back a few bytes of audio, and the request on the way past is kept. */
  let sent = null;
  await p.route('**/api/music', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
      return;
    }
    sent = JSON.parse(route.request().postData() ?? '{}');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'X-Music-Model': 'ElevenLabs Music' },
      body: Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    });
  });

  await p.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('makesong@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('makesong-password-1234');
  await p.locator('button[type="submit"]').first().click();
  await p.waitForTimeout(2600);
  const notNow = p.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  if (await notNow.count()) await notNow.click().catch(() => undefined);
  await p.waitForTimeout(900);

  const bar = p.locator('nav[aria-label]').first();
  await bar.locator('button').filter({ hasText: 'Make' }).first().click();
  await p.waitForTimeout(1300);
  const door = p.locator('div.fixed.inset-0.z-\\[55\\] button');
  const many = await door.count();
  for (let i = 0; i < many; i += 1) {
    const first = ((await door.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
    if (/^Make a song/i.test(first)) {
      await door.nth(i).click();
      break;
    }
  }
  await p.waitForTimeout(1600);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* Simple, which is where somebody starts and where she was looking. */
  await room.locator('button').filter({ hasText: /^Simple$/ }).first().click();
  await p.waitForTimeout(700);
  const says = async () => ((await room.innerText()) ?? '').replace(/\s+/g, ' ');

  check('Simple asks how long the song should be', (await says()).includes('How long?'));
  /* Not "the words How long are on the page" — the buttons themselves, because
     a label over nothing pressable is the same bug in a different shape. */
  const lengths = room.locator('button').filter({ hasText: /credits$/ });
  check('and offers real lengths to press', (await lengths.count()) >= 3,
    `${await lengths.count()} choices`);
  check('with what each one costs on it', /\d+ credits/.test(await says()));

  /* ── Nobody singing, said out loud ─────────────────────────────────── */
  check('an empty words box says the song will come back unsung',
    (await says()).includes('nobody singing'));

  await room.locator('textarea').first().fill(WORDS);
  await p.waitForTimeout(700);
  check('and the warning goes once there are words',
    !(await says()).includes('nobody singing'));
  await p.screenshot({ path: shot('makesong-simple.png') });

  /* ── What actually leaves the app ──────────────────────────────────── */
  await room.locator('input').first().fill('Karoo');
  await room.locator('button').filter({ hasText: /^Make my song$/ }).first().click();
  for (let waited = 0; waited < 40 && !sent; waited += 1) await p.waitForTimeout(500);

  check('pressing Make sends a request to the music route', Boolean(sent));
  const sections = sent?.sections ?? [];
  check('carrying the words as sections, not as a bare prompt',
    sections.length === 2, `${sections.length} sections`);
  const lines = sections.flatMap((one) => one.lines ?? []);
  for (const line of ['Ek ry alleen deur die Karoo', 'En ek sing vir jou']) {
    check(`"${line}" is in what leaves the app`, lines.includes(line));
  }
  check('the parts are named, so the words land in the right place',
    sections.map((one) => one.name).join(',') === 'Verse,Chorus',
    sections.map((one) => one.name).join(','));
  check('and it is not asked for as an instrumental',
    sent?.instrumental === false, JSON.stringify(sent?.instrumental));
  check('the chosen length goes with it', typeof sent?.seconds === 'number' && sent.seconds > 0,
    String(sent?.seconds));
  /* And the language, which nothing ever said before. The words above are
     Afrikaans, so the room should have worked that out without being told —
     that is the case that matters, because somebody writing in their own
     language should not have to find a control first. */
  check('the engine is told to sing it in Afrikaans',
    (sent?.style ?? '').includes('sung in Afrikaans'), sent?.style ?? '');
} finally {
  if (browser) await browser.close();
  if (server) { try { process.kill(-server.pid); } catch { /* already gone */ } }
}

if (problems.length) {
  console.error(`\ncheck:makeroom — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:makeroom — the room asks how long, says when nobody will sing, and sends the words.');

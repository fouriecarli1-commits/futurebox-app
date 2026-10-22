/**
 * The recording screen for reading a song aloud, walked with a microphone.
 *
 * The owner, 22 October 2026: *"Daar is geen recording knoppie of enige
 * praktiese vorm van dit om dalk 'n recording screen oop te maak wat die
 * lyrics wys terwyl mens record. En dan seker 'n submit button. Dan met make
 * a song, submit Afrikaans and make a song."*
 *
 * Chromium's fake microphone stands in for her voice, and the listening route
 * is stubbed with the spelling it would send back. Everything on the screen —
 * the words, the record and stop, the listen-back, Submit, Make the song — is
 * the real room.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3301';
const WORDS = '[Verse]\nEk is baie lief vir jou\nOns ry saam deur die nag\n[Chorus]\nJy is my son en maan\n';

const server = await serve(PORT);
let heard = null;
const { browser, page, problems } = await enter({
  at: server.url,
  width: 390,
  height: 844,
  touch: true,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  before: async (p) => {
    await p.route('**/api/sayas', async (route) => {
      heard = JSON.parse(route.request().postData() || '{}');
      const lines = Array.isArray(heard.lines) ? heard.lines : [];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ lines: lines.map((one) => `${one} (as said)`) }) });
    });
  },
});

const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok && !problems.includes(label)) problems.push(label);
};

try {
  await studio(page);
  await toRoom(page, 'Make');
  await page.waitForTimeout(800);
  const words = page.locator('textarea').first();
  await words.fill(WORDS);
  await page.waitForTimeout(600);

  const begin = page.locator('[data-sayasbegin]');
  check('an Afrikaans song offers the recording screen', (await begin.count()) === 1);
  await begin.click();
  const sheet = page.locator('[data-sayassheet]');
  await sheet.waitFor({ state: 'visible', timeout: 5000 });
  const shown = await page.locator('[data-sayassheetlines] li').allTextContents();
  check('  and the screen shows the words to read', shown.length === 3 && shown.join(' ').includes('Ek is baie lief vir jou'), shown.join(' | '));

  await page.locator('[data-sayasrecord]').click();
  await page.locator('[data-sayasclock]').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1600);
  check('  and recording shows a running clock', /0:0[1-9]/.test((await page.locator('[data-sayasclock]').textContent()) ?? ''));
  await page.locator('[data-sayasstop]').click();
  await page.locator('[data-sayastake]').waitFor({ state: 'visible', timeout: 5000 });
  check('  and stopping offers the take to listen back to', (await page.locator('[data-sayastake]').count()) === 1);

  await page.locator('[data-sayassubmit]').click();
  await page.locator('[data-sayasdone]').waitFor({ state: 'visible', timeout: 8000 });
  check('  and Submit sends the recording with the lines, in order',
    Array.isArray(heard?.lines) && heard.lines.length === 3 && typeof heard.audio === 'string' && heard.audio.length > 100,
    JSON.stringify({ lines: heard?.lines, audio: heard?.audio?.length }));
  check('  and once it is in, Make the song is right there with its price',
    /credits|krediete/.test((await page.locator('[data-sayasmake]').textContent().catch(() => '')) ?? ''));

  await page.locator('[data-sayasclose]').click();
  await page.waitForTimeout(400);
  const spelled = await page.locator('[data-sayaslines] input').evaluateAll((all) => all.map((el) => el.value));
  check('  and back on the song, every line carries the spelling it was read as',
    spelled.length === 3 && spelled.every((one) => one.endsWith('(as said)')), spelled.join(' | '));
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('  and nothing runs off the side of a phone', over <= 1, `${over}px too wide`);
} catch (error) {
  problems.push(String(error).slice(0, 200));
  console.log(`  FAIL ${String(error).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

console.log(problems.length ? `\nsayassheet: ${problems.length} problem(s).` : '\nsayassheet: read the words aloud on a screen of their own, submit, and make the song.');
process.exit(problems.length ? 1 : 0);

import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];

/** Half a second of quiet 8-bit mono, as a WAV Chromium will actually play. */
function tone() {
  const rate = 8000;
  const count = rate / 2;
  const body = Buffer.alloc(count, 128);
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + count, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate, 28);
  head.writeUInt16LE(1, 32);
  head.writeUInt16LE(8, 34);
  head.write('data', 36);
  head.writeUInt32LE(count, 40);
  return Buffer.concat([head, body]);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));

// The voice list, so the panels have something to pick.
await page.route('**/api/voice', (route) =>
  route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      configured: true,
      signedIn: true,
      tier: 'studio',
      caps: { voices: 3, speakChars: 5000, speakPerDay: 20, clean: true, publish: true },
      mine: [],
      stock: [{ id: 'stock-1', name: 'Rachel' }],
    }),
  }),
);

let sent = null;
await page.route('**/api/voice/change', async (route) => {
  const request = route.request();
  sent = request.postData() ?? '';
  // A real, playable half-second, so the player is tested and not the fixture.
  await route.fulfill({ contentType: 'audio/wav', body: tone() });
});

// Mounted bare: the real screen sits behind a sign-in this sandbox cannot pass.
await page.goto(`${base}/probe-voicelab`, { waitUntil: 'networkidle' });

// The dials.
await page.getByText('How it is read').click();
await page.waitForTimeout(200);
const dials = await page.locator('input[type="range"]').count();
if (dials !== 4) problems.push(`expected 4 dials, saw ${dials}`);

// Move stability and check the readout follows.
const stability = page.locator('input[type="range"]').first();
await stability.fill('0.85');
await page.waitForTimeout(100);
if (!(await page.getByText('0.85', { exact: true }).count())) problems.push('stability readout did not follow the slider');

// The changer.
const changer = page.getByText('Say it again in another voice');
if (!(await changer.count())) problems.push('the changer panel is missing');

// Hand it a file, then change.
await page.setInputFiles('input[type="file"]', {
  name: 'said.webm',
  mimeType: 'audio/webm',
  buffer: Buffer.from('not really audio, the route is intercepted'),
});
await page.waitForTimeout(200);
if (!(await page.getByText('said.webm').count())) problems.push('the picked file was not named back');

await page.getByRole('button', { name: /Change the voice/i }).click();
await page.waitForTimeout(1200);

if (!sent) problems.push('nothing was posted to /api/voice/change');
else {
  for (const field of ['stability', 'similarity', 'style', 'speakerBoost', 'removeNoise', 'audio']) {
    if (!sent.includes(`name="${field}"`)) problems.push(`the post carried no ${field}`);
  }
  if (!sent.includes('0.85')) problems.push('the post did not carry the stability I set');
}

const player = await page.locator('audio').nth(1).evaluate((el) => el.className);
if (player.includes('hidden')) problems.push('the changed audio never appeared');

await browser.close();
console.log(problems.length ? problems.map((p) => `FAIL ${p}`).join('\n') : 'all good');
process.exit(problems.length ? 1 : 0);

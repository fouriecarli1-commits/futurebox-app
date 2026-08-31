// The follow-along view: big words, and an honest failure when there is no
// camera.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/sing.mjs
//
// ── What this cannot check, and why it says so ─────────────────────────
//
// The recording path is not exercised here. This container has no media
// devices at all — `enumerateDevices()` returns an empty array and
// `--use-fake-device-for-media-capture` produces nothing — so there is no
// camera to record from, real or fake. Asserting that recording works from an
// environment that cannot record would be a check that passes for the wrong
// reason, which is worse than no check.
//
// What that leaves is genuinely worth having: the words are big enough to read
// off a propped-up phone, the camera does not start before it is asked for,
// and a machine with no camera is told *that* rather than being told to go and
// check a permission it already granted. That last one is the case this
// environment is, so it is the one case that can be tested properly.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-fake-device-for-media-capture', '--use-fake-ui-for-media-stream'],
});
const page = await browser.newPage({ permissions: ['camera', 'microphone'] });
await page.goto('http://127.0.0.1:3111/singcheck', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.ready === 'yes');

// ── Big enough to read from across a room ──────────────────────────────
const line = page.getByText('The first line of it');
say(await line.count() === 1, 'the first line is not on screen');
const size = await line.first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
say(size >= 28, `the sung line renders at ${size}px — too small to read off a propped-up phone`);

// Three at a time, not the whole sheet: this is a teleprompter, not a page.
const shown = await page.locator('p').filter({ hasText: /line|second|chorus/i }).count();
say(shown <= 4, `${shown} lines on screen at once — this is meant to be three`);

// ── The camera does not start before it is asked for ───────────────────
say(
  await page.evaluate(() => !document.querySelector('video')?.srcObject),
  'the camera was live before anybody asked for it',
);
const hidden = await page.evaluate(() => getComputedStyle(document.querySelector('video')).opacity);
say(hidden === '0', `the video element is showing at opacity ${hidden} with no stream in it`);

// Mirrored for the person looking at it — a selfie preview that is not
// mirrored reads as broken to anybody who has used a phone.
const flip = await page.evaluate(() => getComputedStyle(document.querySelector('video')).transform);
say(/matrix\(-1/.test(flip), `the preview is not mirrored: ${flip}`);

// ── With no camera, it says so — and does not blame a permission ───────
say(await page.evaluate(async () => (await navigator.mediaDevices.enumerateDevices()).length === 0),
  'this environment has a camera after all — the check below no longer tests what it says');

await page.getByRole('button', { name: /Film yourself/i }).click();
await page.waitForTimeout(1500);
const said = await page.locator('body').innerText();
say(/No camera was found/i.test(said), `a machine with no camera was told: ${said.slice(0, 160)}`);
say(
  !/was not allowed|check the permission/i.test(said),
  'a missing camera was reported as a refused permission — that sends people to fix the wrong thing',
);

await browser.close();
console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : 'PASS — big words, camera idle until asked, mirrored preview, and a missing camera named as one',
);
process.exit(problems.length ? 1 : 0);

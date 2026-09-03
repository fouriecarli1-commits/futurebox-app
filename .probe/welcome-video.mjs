// The welcome page: the mark, what it offers, and the video that plays in the
// reader's own language and does not start on its own.
//
// This used to assert the video was English only, which was right while there
// was one recording. There are two now, one per language, and the rule that
// replaced it is the one that mattered all along: a page never shows a
// recording in the other language. A language with no recording set shows
// nothing — better a page with no video than one that tells an Afrikaans
// speaker, in the first thing they see, that the English is the real product.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/welcome-video.mjs

import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

// Every byte the page pulls, so "does not autoplay" can be a measurement
// rather than a reading of the markup.
const fetched = [];
page.on('request', (request) => fetched.push(request.url()));

await page.goto(base, { waitUntil: 'networkidle' });

// ── The mark, at a size somebody remembers ─────────────────────────────
// The name appears twice — small in the header, large in the hero — and both
// read as "FUTUREBOX". The claim being tested is that *one* of them is big, so
// the largest is the one to measure; asserting on the first would pass or fail
// on which happens to be earlier in the document.
const marks = page.getByText(/^FUTUREBOX$/);
say(await marks.count() >= 1, 'the wordmark is not on the page');
const sizes = await marks.evaluateAll((nodes) =>
  nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)),
);
say(Math.max(...sizes) >= 48, `the largest wordmark is ${Math.max(...sizes)}px — not life-size`);

// ── What it offers, and every claim a thing that exists ────────────────
for (const claim of [
  'Songs you sing on',
  'Your own voice, cloned',
  'Podcasts with a real feed',
  'Music videos',
  'Masterclasses',
  'Collaboration',
]) {
  say(await page.getByText(claim, { exact: true }).count() >= 1, `the page never offers "${claim}"`);
}

// ── The video is there, and has not started ────────────────────────────
const video = page.locator('video');
say(await video.count() === 1, `${await video.count()} video elements on the welcome page`);
say(await page.getByRole('button', { name: /Play the introduction/i }).count() === 1, 'there is no play button');

const state = await video.evaluate((node) => ({
  paused: node.paused,
  autoplay: node.autoplay,
  preload: node.preload,
  src: node.getAttribute('src'),
}));
say(state.paused, 'the video is already playing');
say(!state.autoplay, 'the video is set to autoplay — 12MB of a stranger’s data, silently');
say(state.preload === 'metadata', `preload is "${state.preload}"`);
say(/#t=/.test(state.src), 'no time fragment, so the player would show a black first frame');

// The measurement: the whole file must not have come down on load.
const wholeFile = fetched.filter((url) => /welcome\.mp4/.test(url) );
say(wholeFile.length <= 1, `the video was requested ${wholeFile.length} times before anybody pressed play`);

// ── Pricing is on this page, which is what it is for ───────────────────
say(await page.locator('#pricing').count() === 1, 'the plans are not on the welcome page');
say(await page.getByText(/Free/).count() >= 1, 'the free tier is not shown');

// ── Each language plays its own recording, or none ─────────────────────
const englishSrc = await page.locator('video').first().getAttribute('src').catch(() => null);

await page.evaluate(() => window.localStorage.setItem('futurebox.lang.v1', 'af'));
await page.reload({ waitUntil: 'networkidle' });
const afrikaans = await page.getByText(/Die swartkas van die toekoms/i).count();

if (afrikaans === 0) {
  problems.push('could not switch the page to Afrikaans, so the language rule was never tested');
} else if (await page.locator('video').count() === 0) {
  // No Afrikaans recording configured in this build. That is a legitimate
  // state and the right one — silence rather than the English file.
  say(true, '');
} else {
  const afrikaansSrc = await page.locator('video').first().getAttribute('src');
  say(Boolean(afrikaansSrc), 'the Afrikaans page draws a player with no file behind it');
  say(
    !englishSrc || afrikaansSrc !== englishSrc,
    'the Afrikaans page plays the English recording, which says the English is the real product',
  );
  say(
    !/undefined/.test(afrikaansSrc ?? ''),
    'the source came through as undefined — a NEXT_PUBLIC_ name that Next could not inline',
  );
}

await browser.close();
console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — the mark is life-size, every offer is real, and the video waits to be asked');
process.exit(problems.length ? 1 : 0);

// Arranging a song, and the arrangement surviving the way out.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/studio.mjs
//
// The Studio could rename a section and rewrite its words, which is
// proofreading rather than editing. Most of what anybody does to a song is
// arrangement: move the bridge before the last chorus, cut the second verse,
// say the chorus twice.
//
// What is actually being checked is the seam. The plan leaves the Studio as a
// lyric sheet and is rebuilt from the tags in it, so if the order, the repeats
// or the cuts do not come through exactly, somebody presses "make a new take"
// and gets a song that is not the one they arranged — and finds out three
// minutes and some credits later. So the sheet is compared whole, not searched
// for words.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));

await page.goto('http://127.0.0.1:3111/probe-studio', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('[data-ready]')?.dataset.ready === 'yes');
await page.waitForTimeout(400);

const names = () => page.locator('input').evaluateAll((all) => all.map((one) => one.value));
const sheet = async () => (await page.locator('#sheet').innerText()).trim();

// ── It starts as the song was written ──────────────────────────────────
say(
  JSON.stringify(await names()) === JSON.stringify(['Verse 1', 'Chorus', 'Verse 2', 'Outro']),
  `the song did not lay out as written: ${JSON.stringify(await names())}`,
);

const up = page.getByRole('button', { name: 'Move it earlier' });
const down = page.getByRole('button', { name: 'Move it later' });
const againBtn = page.getByRole('button', { name: 'Say it again' });
const dropBtn = page.getByRole('button', { name: 'Take it out' });

// ── Nothing can be moved off the ends ──────────────────────────────────
say(await up.nth(0).isDisabled(), 'the first section can be moved earlier than first');
say(await down.nth(3).isDisabled(), 'the last section can be moved later than last');

// ── Move the chorus to the front ───────────────────────────────────────
await up.nth(1).click();
say(
  JSON.stringify(await names()) === JSON.stringify(['Chorus', 'Verse 1', 'Verse 2', 'Outro']),
  `moving a section earlier gave ${JSON.stringify(await names())}`,
);

// ── Say the chorus again, after the second verse ───────────────────────
await againBtn.nth(0).click();
say((await names()).length === 5, 'duplicating a section did not add one');
await down.nth(1).click();   // the copy, down past Verse 1
await down.nth(2).click();   // and past Verse 2
say(
  JSON.stringify(await names()) === JSON.stringify(['Chorus', 'Verse 1', 'Verse 2', 'Chorus', 'Outro']),
  `after the repeat the order is ${JSON.stringify(await names())}`,
);

// ── Cut the second verse ───────────────────────────────────────────────
await dropBtn.nth(2).click();
say(
  JSON.stringify(await names()) === JSON.stringify(['Chorus', 'Verse 1', 'Chorus', 'Outro']),
  `after the cut the order is ${JSON.stringify(await names())}`,
);

// ── And put a bridge in that was never written ─────────────────────────
await page.getByRole('button', { name: /put another section in/i }).click();
const withBridge = await names();
say(withBridge.length === 5 && withBridge[4] === 'Bridge', `adding a section gave ${JSON.stringify(withBridge)}`);
await page.locator('input').nth(4).fill('Bridge');
await page.locator('textarea').nth(4).fill('en dan bly dit stil');

// ── The whole arrangement, out the other side, exactly ─────────────────
await page.getByRole('button', { name: /make a new take/i }).click();
await page.waitForTimeout(400);

const want = [
  '[Chorus]\nrooi aand\nbly by my',
  '[Verse 1]\ndie son sak stadig\noor die stad',
  '[Chorus]\nrooi aand\nbly by my',
  '[Outro]\nbly by my',
  '[Bridge]\nen dan bly dit stil',
].join('\n\n');
const got = await sheet();
say(got === want, `the sheet came out as:\n${got}\n\n--- wanted ---\n${want}`);

// The repeat has to be a real second block, not one section mentioned twice.
say((got.match(/\[Chorus\]/g) ?? []).length === 2, 'the repeated chorus did not travel as two blocks');
say(!/Verse 2/.test(got), 'the cut verse came back');
say(!/die lig gaan uit/.test(got), 'the cut verse\'s words came back without its tag');

// ── An empty section is not a block ────────────────────────────────────
// Adding one and leaving it blank must not put a bare tag in the sheet, which
// the engine would read as a section with nothing to sing.
await page.getByRole('button', { name: /put another section in/i }).click();
await page.getByRole('button', { name: /make a new take/i }).click();
await page.waitForTimeout(400);
const after = await sheet();
say(after === want, `an empty section changed the sheet:\n${after}`);

// ── The last section standing cannot be removed ────────────────────────
{
  const remaining = await dropBtn.count();
  for (let i = 0; i < remaining - 1; i += 1) await dropBtn.nth(0).click();
  say((await names()).length === 1, `cutting everything left ${(await names()).length} sections`);
  say(await dropBtn.nth(0).isDisabled(), 'the only remaining section can be cut, leaving a song with nothing in it');
}

// ── Lengths are explained rather than offered ──────────────────────────
{
  const text = await page.locator('body').innerText();
  say(/follows from how many lines/i.test(text), 'nothing says what decides how long a section runs');
  const sliders = await page.locator('input[type="range"]').count();
  say(sliders === 0, `${sliders} length sliders are drawn, and a length is not carried in the sheet`);
}

await browser.close();

if (problems.length) {
  console.error(`studio: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('studio: sections move, repeat, cut and appear — and the arrangement comes out the other side exactly');

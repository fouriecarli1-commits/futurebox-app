// The video desk, in a browser, with the engine reported as off — which is how
// a person with no keys set sees it, and the state that must still be usable.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/canvas.mjs

import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
// What counts as broken, and what is this sandbox.
//
// A console *message* carries no URL, so it cannot be told apart from another
// one — which is why an earlier version of this check reported "console
// errors" and named nothing useful. Three listeners with URLs instead:
//
//   pageerror     a real exception in the app. Never excused.
//   requestfailed something the page asked for and did not get.
//   response 4xx  the same, answered rather than refused.
//
// The footer badge is fetched live from VibefyCode and this sandbox's proxy
// refuses outbound connections, so that one URL is excused by name. Everything
// else fails.
const broken = [];
const mine = (url) => !/vibefy-web|favicon/i.test(url);

page.on('pageerror', (error) => broken.push(`exception: ${error.message}`));
page.on('requestfailed', (request) => {
  if (mine(request.url())) broken.push(`did not load: ${request.url()}`);
});
page.on('response', (response) => {
  if (response.status() >= 400 && mine(response.url())) {
    broken.push(`${response.status()}: ${response.url()}`);
  }
});

await page.goto(`${base}/deskcheck`, { waitUntil: 'networkidle' });

// ── It opens empty, which is the point ─────────────────────────────────
const box = page.locator('#canvas-prompt');
say(await box.count() === 1, 'there is no prompt box');
say((await box.inputValue()) === '', 'the desk opens with something already typed in it');

// ── Every kind of video is on the desk ─────────────────────────────────
for (const label of ['Music video', 'Marketing', 'Podcast', 'Reel', 'Product', 'Atmosphere']) {
  say(await page.getByRole('button', { name: new RegExp(label, 'i') }).count() >= 1, `no tile for ${label}`);
}

// ── A tile fills the box rather than generating anything ───────────────
await page.getByRole('button', { name: /Podcast/i }).first().click();
const filled = await box.inputValue();
say(filled.length > 80, `the podcast tile put ${filled.length} characters in the box`);
say(/microphone/i.test(filled), 'the podcast scaffold is not about a podcast');

// ── The quoted line is read back before anything is spent ──────────────
const spoken = await page.getByText(/Will be spoken/i).count();
say(spoken === 1, 'the spoken line is not read back');
say(
  await page.getByText(/Welcome back/i).count() >= 1,
  'the line that will be spoken is not shown',
);

// ── The warning fires on the mistake it exists for ─────────────────────
await box.fill('A host says welcome back to the show, close shot, warm light');
await page.waitForTimeout(150);
say(
  await page.getByText(/quotation marks/i).count() >= 1,
  'an unquoted spoken line drew no warning',
);
await box.fill('A host says, "welcome back." Close shot, warm light');
await page.waitForTimeout(150);
say(
  await page.getByText(/will be drawn at, not said/i).count() === 0,
  'a correctly quoted line was still warned about',
);

// ── The cost is on the button, not hidden ──────────────────────────────
const button = page.getByRole('button', { name: /Make it/i }).first();
say(/\d+\s*credits/i.test(await button.innerText()), `the button reads "${await button.innerText()}"`);

// ── With no engine, it says so and does not offer to generate ──────────
say(await page.getByText(/not switched on/i).count() === 1, 'no word that the engine is off');
say(await button.isDisabled(), 'the make button is live with no engine behind it');

// ── Nothing broken on the way ──────────────────────────────────────────
say(broken.length === 0, `the page broke: ${broken.slice(0, 3).join(' | ')}`);

await browser.close();
console.log(problems.length ? `FAIL\n  ${problems.join('\n  ')}` : 'PASS — the desk opens clean, teaches the quote rule, and refuses to pretend');
process.exit(problems.length ? 1 : 0);

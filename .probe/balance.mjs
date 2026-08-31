// The credit chip, and the panel pressing it opens.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/balance.mjs
//
// ── Why this reads `#chip` and not the page ────────────────────────────
//
// It used to compare `body.innerText()` to '5', to '0', to '—'. Then a site
// footer was added to the layout and all eight comparisons began to fail at
// once — for a reason with nothing to do with credits, on a chip that was
// rendering perfectly. Eight red states including two that contradict each
// other ("a signed-out visitor was shown a balance" alongside "a paid balance
// did not show") is not eight regressions; it is a check reading the wrong
// thing. It stayed red long enough to stop being read.
//
// So it reads the chip. A check that breaks when an unrelated part of the page
// changes is a check that will be ignored the third time it cries.

import { chromium } from 'playwright';

const base = 'http://127.0.0.1:3111';
const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

async function open(name, fulfil) {
  const page = await browser.newPage({ viewport: { width: 500, height: 400 } });
  page.on('pageerror', (error) => problems.push(`${name}: page error ${error.message}`));
  await page.route('**/api/credits', fulfil);
  await page.goto(`${base}/probe-bal`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return page;
}

async function chip(name, fulfil) {
  const page = await open(name, fulfil);
  const text = (await page.locator('#chip').innerText()).trim();
  await page.close();
  return text;
}

const json = (body) => (route) =>
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });

const FREE = { metered: true, signedIn: true, tier: 'free', monthly: 10, cap: 10, packs: [] };

// ── The eight states ───────────────────────────────────────────────────
say(await chip('free', json({ ...FREE, balance: 5 })) === '5', 'a free account with 5 credits showed nothing');
say(await chip('zero', json({ ...FREE, balance: 0 })) === '0', 'a balance of zero showed nothing');
say(
  await chip('paid', json({ metered: true, signedIn: true, balance: 120, tier: 'maker', monthly: 120, cap: 360, packs: [] })) === '120',
  'a paid balance did not show',
);

// A broken endpoint must show a dash, not vanish — a silent disappearance is
// how a broken /api/credits came to look exactly like a working free account.
say(
  await chip('broken', (route) => route.fulfill({ status: 500, body: 'boom' })) === '—',
  'a failing endpoint made the chip disappear instead of showing a dash',
);
say(
  await chip('unready', json({ ...FREE, ready: false, balance: 0 })) === '—',
  'an unset-up credit system showed 0 instead of a dash',
);
say(await chip('real zero', json({ ...FREE, ready: true, balance: 0 })) === '0', 'a genuine balance of zero did not show as zero');
say(await chip('out', json({ metered: true, signedIn: false, balance: 0, packs: [] })) === '', 'a signed-out visitor was shown a balance');
say(await chip('unmetered', json({ metered: false, balance: 0, packs: [] })) === '', 'an app with no accounts showed a balance');

// ── A dash has to say what it means, and which of the two it is ────────
// Otherwise it is a shrug, and somebody reads it as nothing left. The two
// causes need different sentences: a request that never arrived is worth
// trying again in a moment, and credit tables that are not there will still
// not be there in a moment — that one is for the owner to act on, not the
// visitor, and telling them to check their connection sends them nowhere.
{
  const page = await open('unready title', json({ ...FREE, ready: false, balance: 0 }));
  const title = await page.locator('#chip [title]').first().getAttribute('title');
  say(Boolean(title), 'the dash carries no explanation at all');
  say(/not switched on/i.test(title ?? ''), `a system that was never set up says: ${JSON.stringify(title)}`);
  await page.close();
}
{
  const page = await open('failed title', (route) => route.fulfill({ status: 500, body: 'boom' }));
  const title = await page.locator('#chip [title]').first().getAttribute('title');
  say(/could not read|just now/i.test(title ?? ''), `a request that failed says: ${JSON.stringify(title)}`);
  await page.close();
}

// ── Pressing your own balance is not a refusal ─────────────────────────
// The reported bug, and there was no check for it: opening the shelf from a
// balance of 1,570 read "You are short by 0. That needed 0, and you have
// 1570." A panel reporting a shortfall of nothing to somebody who is not short
// reads as a bug because it is one.
{
  const page = await open('shelf', json({ metered: true, signedIn: true, balance: 1570, tier: 'studio', monthly: 600, cap: 1800, packs: [] }));
  await page.locator('#chip button').click();
  await page.waitForTimeout(300);
  const panel = await page.locator('body').innerText();

  say(!/short by/i.test(panel), 'pressing your own balance says you are short');
  say(!/\b0\b[^0-9]*credits? needed|needed 0/i.test(panel), 'it claims the thing you did not ask for needed nothing');
  say(/1570/.test(panel), 'it does not say what you actually have');
  say(/shelf|nothing is short/i.test(panel), 'it never says that nothing is wrong');

  // No pack is the answer when no question was asked. Highlighting one would
  // be the panel recommending a purchase nobody asked it about.
  const highlighted = await page.locator('button.border-emerald-500').count();
  say(highlighted === 0, `${highlighted} packs are singled out as the answer when nothing was refused`);
  await page.close();
}

// ── A real refusal still says the sum ──────────────────────────────────
{
  const page = await open('refused', json({ ...FREE, balance: 5 }));
  await page.locator('#refuse').click();
  await page.waitForTimeout(300);
  const panel = await page.locator('body').innerText();

  say(/short by/i.test(panel), 'a genuine refusal does not say you are short');
  say(/\b35\b/.test(panel), 'it does not do the subtraction — 40 needed against 5 held is 35');
  say(/\b40\b/.test(panel) && /\b5\b/.test(panel), 'it does not show both sides of the sum');

  // And exactly one pack is drawn as the answer, so nobody has to work out
  // which of three numbers covers a shortfall of thirty-five.
  const highlighted = await page.locator('button.border-emerald-500').count();
  say(highlighted === 1, `${highlighted} packs are drawn as the answer to one refusal`);
  await page.close();
}

await browser.close();

if (problems.length) {
  console.error(`balance: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('balance: eight states read off the chip itself, a dash that explains itself, and pressing your own balance is not a refusal');

// The Booth, rendered — the door works, and the room behind it is the real one.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/booth-screen.mjs
//
// ── What this cannot check, and why it says so ─────────────────────────
//
// Not the recording. This container has no media devices — `enumerateDevices()`
// comes back empty and the fake-device flag produces nothing — so a check that
// claimed the booth records would be passing for the wrong reason. Same
// limitation the follow-along check states, same reason.
//
// What it can check is the part that was actually broken, which is getting in.
// Somebody with no songs must be told why the room is empty and given the way
// out; somebody with songs must see them, and a song already sung on must
// offer to be opened up again rather than started over — those two lead to
// different files and choosing wrong loses a take.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ── A new account: nothing to sing on ──────────────────────────────────
{
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3111/boothcheck', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.ready === 'yes');

  const body = await page.locator('body').innerText();
  say(/nothing to sing on yet/i.test(body), 'a new account sees a blank room instead of being told why');
  say(/backing track/i.test(body), 'the empty state does not say to ask for a backing track, which is the useful part');

  // The five things it does, said before anything is pressed.
  for (const [what, pattern] of [
    ['singing with the words in time', /words in time/i],
    ['both waveforms on one clock', /one clock/i],
    ['punching in', /sing only that/i],
    ['lifting the generated voice out', /lift the generated voice out/i],
    ['lanes and levels', /lanes, levels/i],
  ]) say(pattern.test(body), `the screen never says it can do ${what}`);

  // And the way out is a button that works.
  const go = page.getByRole('button', { name: /make a song/i });
  say(await go.count() === 1, 'the empty state offers no way to make a song');
  await go.first().click();
  await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.went === 'yes', { timeout: 3000 })
    .then(() => say(true, ''))
    .catch(() => say(false, 'the button in the empty state does not take you to the make screen'));
  await page.close();
}

// ── An account with songs ──────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3111/boothcheck?with=songs', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.ready === 'yes');

  const body = await page.locator('body').innerText();
  say(!/nothing to sing on yet/i.test(body), 'an account with songs is still told it has none');
  say(/The one with no vocal/.test(body), 'a song that can be sung on is not listed');
  say(/The one I already sang on/.test(body), 'a song already sung on is not listed');

  // A row you have not sung on starts the booth; one you have reopens it. The
  // second reads the take that was kept beside the mix, and offering "open the
  // booth" there would start a new take over the finished file instead.
  const rows = page.locator('div').filter({ has: page.getByRole('button') });
  const fresh = page.getByRole('button', { name: /open the booth/i });
  const again = page.getByRole('button', { name: /open it up again/i });
  say(await fresh.count() === 1, `${await fresh.count()} rows offer to start a take — expected one`);
  say(await again.count() === 1, `${await again.count()} rows offer to reopen a take — expected one`);
  say(/you sang on this/i.test(body), 'nothing marks which song already has your voice on it');

  // Pressing it must not silently do nothing. There is no audio in IndexedDB
  // for the seed, so the honest outcome is the missing-recording message —
  // which is itself the check that the button is wired to something real.
  await fresh.first().click();
  await page.waitForFunction(
    () => /could not|not on this device|missing/i.test(document.body.innerText),
    { timeout: 5000 },
  ).then(() => say(true, '')).catch(() => say(false, 'opening the booth on a song with no audio does nothing at all'));
  await page.close();
}

await browser.close();

if (problems.filter(Boolean).length) {
  const real = problems.filter(Boolean);
  console.error(`booth-screen: ${real.length} problem(s)`);
  for (const one of real) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('booth-screen: an empty room explains itself, a full one lists the songs, and a sung song reopens rather than restarts');

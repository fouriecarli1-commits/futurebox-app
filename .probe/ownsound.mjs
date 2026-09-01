// A sound of your own, chosen where it takes effect.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/ownsound.mjs
//
// This is the one control on the make screen that changes what the engine is
// *asked for* rather than what it is told in words — a trained sound is a real
// setting, and it goes with the request as `finetuneId`.
//
// It had four states and only one of them was ever drawn. If you had a
// finished sound you got a picker; otherwise the whole thing was absent, on
// the reasoning that an empty picker explaining a feature you do not have is a
// screen telling you off. Half right — what it produced was a feature nobody
// could find, which is the same failure the booth had. The other three states
// are exactly where somebody gets stuck, so each is driven here.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

const sound = (id, name, status) => ({
  id, name, genre: 'Amapiano', origin: 'channel', tracks: 12, status,
});

async function open(state) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  await page.route('**/api/finetunes**', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) }));
  // Everything else this screen asks for, answered so it renders.
  await page.route('**/api/credits', (route) =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify({ metered: true, signedIn: true, balance: 500, tier: 'studio', monthly: 600, cap: 1800, packs: [] }) }));
  await page.goto('http://127.0.0.1:3111/probe-ownsound', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#mounted')?.dataset.ready === 'yes');
  await page.waitForTimeout(500);
  return page;
}

/**
 * The tick, or null when it is not on the page at all.
 *
 * Asking a locator that matches nothing whether it is disabled throws after
 * thirty seconds with a stack trace, and a check that stack-traces is one
 * people read as "the harness is broken" rather than "the control is gone" —
 * which is the exact regression being guarded against here. So its absence is
 * an ordinary reported failure like any other.
 */
async function tickOn(page, where) {
  const box = page.getByRole('checkbox', { name: /sound of my own/i }).first();
  if ((await box.count()) === 0) {
    problems.push(`${where}: the tick is not on the page at all`);
    return null;
  }
  return box;
}

// ── The plan does not include it ───────────────────────────────────────
{
  const page = await open({ configured: true, signedIn: true, keep: 0, mine: [] });
  const body = await page.locator('body').innerText();
  say(/sound of my own/i.test(body), 'the tick is missing entirely on a plan that cannot train one');
  say(/not included in your plan/i.test(body), 'it does not say why the tick cannot be used');
  say(/GPU/i.test(body), 'it does not say what makes training expensive, so the limit reads as arbitrary');

  const box = await tickOn(page, 'no plan');
  if (box) say(await box.isDisabled(), 'the tick can be ticked with nothing behind it');

  const plans = page.getByRole('button', { name: /see the plans/i });
  if ((await plans.count()) === 0) problems.push('there is no way out of the plan limit');
  else {
    await plans.click();
    await page.waitForTimeout(200);
    say(await page.locator('#mounted').getAttribute('data-upgrades') === '1', 'the way out of the plan limit does nothing');
  }
  await page.close();
}

// ── None trained yet ───────────────────────────────────────────────────
{
  const page = await open({ configured: true, signedIn: true, keep: 3, mine: [] });
  const body = await page.locator('body').innerText();
  say(/not trained one yet/i.test(body), 'somebody with no trained sound is not told so');
  say(/channel/i.test(body), 'it does not say where a sound is trained');
  say(!/not included in your plan/i.test(body), 'a plan that allows training says it does not');

  const train = page.getByRole('button', { name: /train one in your channel/i });
  if ((await train.count()) === 0) problems.push('there is no way to reach training from here');
  else {
    await train.click();
    await page.waitForTimeout(200);
    say(await page.locator('#mounted').getAttribute('data-channel') === 'yes', 'the way to train one goes nowhere');
  }
  await page.close();
}

// ── One still training ─────────────────────────────────────────────────
// Training takes minutes on somebody else's GPUs. Saying nothing here is how
// somebody decides it failed and trains a second one, at full price.
{
  const page = await open({ configured: true, signedIn: true, keep: 3, mine: [sound('f-1', 'My sound', 'in_progress')] });
  const body = await page.locator('body').innerText();
  say(/still training/i.test(body), 'a sound part-way through training is invisible');
  say(/appears here on its own/i.test(body), 'it does not say the screen will update by itself');
  say(!/not trained one yet/i.test(body), 'a sound that is training reads as no sound at all');
  const box = await tickOn(page, 'still training');
  if (box) say(await box.isDisabled(), 'a sound that is not finished can be chosen');
  await page.close();
}

// ── One finished: the tick works, and picks ────────────────────────────
{
  const page = await open({ configured: true, signedIn: true, keep: 3, mine: [sound('f-1', 'Rooi Aand sound', 'completed')] });
  const box = await tickOn(page, 'one finished');
  if (box) {
    say(await box.isEnabled(), 'a finished sound cannot be chosen');
    say(!(await box.isChecked()), 'the tick starts on, so a song is made in a trained sound nobody asked for');

    await box.check();
    await page.waitForTimeout(200);
    // Ticking must choose something. A tick that does nothing until you also
    // pick is a tick that lies, and the only way to see the choice landed is
    // that the screen names it.
    const body = await page.locator('body').innerText();
    say(/Rooi Aand sound/.test(body), 'ticking does not say which sound it will use');

    await box.uncheck();
    await page.waitForTimeout(200);
    say(!(await box.isChecked()), 'unticking does not stick');
  }
  await page.close();
}

// ── Two finished: a choice appears ─────────────────────────────────────
{
  const page = await open({
    configured: true, signedIn: true, keep: 3,
    mine: [sound('f-1', 'First sound', 'completed'), sound('f-2', 'Second sound', 'completed')],
  });
  const box = await tickOn(page, 'two finished');
  if (box) {
    await box.check();
    await page.waitForTimeout(200);
    const body = await page.locator('body').innerText();
    say(/First sound/.test(body) && /Second sound/.test(body), 'with two trained sounds there is no way to say which');
  }
  await page.close();
}

// ── Signed out: nothing to offer, and nothing said ─────────────────────
{
  const page = await open({ configured: true, signedIn: false, keep: 0, mine: [] });
  const body = await page.locator('body').innerText();
  say(!/sound of my own/i.test(body), 'a signed-out visitor is offered a setting that belongs to an account');
  await page.close();
}

// ── It sits against the button ─────────────────────────────────────────
// Not filed away with the tempo and the key. It is the last thing decided
// before the song is made, so it reads as part of pressing Make.
{
  const read = async (path) =>
    (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
  const source = (await read('../app/components/MakeMusic.tsx'))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

  const tick = source.indexOf('useOwnSound');
  const block = source.lastIndexOf('checked={useOwnSound}');
  const button = source.indexOf('onClick={() => make()}');
  say(tick !== -1 && button !== -1, 'the tick or the make button is gone');
  say(block < button, 'the tick is drawn after the button it belongs to');

  // Nothing between the end of the tick and the button but whitespace. The
  // measurement has to stop at the opening tag, not at the onClick inside it,
  // or it reads the button's own markup as something in the way.
  const tag = source.lastIndexOf('<button', button);
  const closes = source.lastIndexOf(')}', tag);
  const between = source.slice(closes + 2, tag);
  say(
    between.trim().length === 0,
    `something has been put between the tick and the button: ${between.trim().slice(0, 80)}`,
  );
}

await browser.close();

if (problems.length) {
  console.error(`ownsound: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('ownsound: the tick is on the make screen in all four of its states, and each says which one it is');

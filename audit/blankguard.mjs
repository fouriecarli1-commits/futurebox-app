/**
 * A page emptied out draws a panel instead of being white.
 *
 * Carli, three times: *"Die add a photo in Shot gee steeds net 'n wit blad"*
 * and, on its own line, *"Bladsy is steeds wit."*
 *
 * Four explanations were offered and every one was beaten by the same thing:
 * a white page keeps its reason to itself. What is left standing is that the
 * phone throws the tab away while the picture picker is in front of it —
 * which this app cannot prevent and must not be silent about.
 *
 * ── What this proves, and what it cannot ─────────────────────────────────
 *
 * It cannot reproduce a discarded tab; no browser will do that on command.
 * What it can do is empty the page the same way a discard does — take the
 * body's contents away with React not looking — and assert that the panel
 * arrives, that it carries the step that was recorded, and that its button
 * works.
 *
 * Said plainly: this is a test of the ANSWER, not of the fault. The fault is
 * the operating system's and is documented in `app/components/Watchdog.tsx`.
 */
import { enter } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3123';
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

let server = null;
let browser = null;
try {
  server = await serve(PORT);
  const got = await enter({ at: `http://localhost:${PORT}`, width: 390, height: 844, touch: true });
  browser = got.browser;
  const p = got.page;

  /* The step, written the way `Pictures.take` writes it before it touches a
     file. The panel has to be able to say what she was doing. */
  await p.evaluate(() => {
    window.localStorage.setItem(
      'futurebox.doing.v1',
      JSON.stringify({ what: 'a picture into the shot (854KB, image/jpeg)', at: new Date().toISOString() }),
    );
  });

  check('the page has something on it to begin with',
    (await p.evaluate(() => (document.body.innerText || '').trim().length)) > 20);

  /* Emptied the way a discarded tab comes back: the contents gone, React not
     told. `replaceChildren` rather than `innerHTML = ''` because it leaves
     the body element itself — which is what a restored shell has. */
  await p.evaluate(() => {
    document.body.replaceChildren();
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await p.waitForTimeout(1800);

  const panel = p.locator('#fb-blank-guard');
  check('a page with nothing on it draws a panel', (await panel.count()) === 1,
    `${await panel.count()} found`);

  if (await panel.count()) {
    const words = await panel.innerText();
    check('  and it says so in Afrikaans', /leeg teruggekom/.test(words),
      words.split('\n')[0] ?? '');
    check('  and in English too, because the panel cannot read the language',
      /came back empty/.test(words),
      'useLang needs a tree, and the tree is what is missing');
    check('  and it carries the step that was recorded',
      /a picture into the shot/.test(words),
      words.split('\n').find((one) => /Doing/.test(one)) ?? 'no step');
    check('  with a way to a fuller answer', (await panel.locator('a[href="/oops"]').count()) === 1);

    const button = panel.locator('button');
    check('  and one button, big enough for a thumb', (await button.count()) === 1);
    const box = await button.first().boundingBox();
    check('    which it is', box !== null && box.height >= 44,
      box ? `${Math.round(box.height)}px` : 'no box');

    await p.screenshot({ path: shot('blankguard.png') });
    await button.first().click();
    await p.waitForTimeout(2500);
    check('  and pressing it brings the app back',
      (await p.evaluate(() => (document.body.innerText || '').trim().length)) > 20,
      'the reload has to actually reload');
  }

  /* And it does not fire on a page that is merely quiet. A panel over a
     working screen is worse than no panel at all. */
  await p.evaluate(() => document.getElementById('fb-blank-guard')?.remove());
  await p.waitForTimeout(5000);
  check('it stays away from a page that is working',
    (await p.locator('#fb-blank-guard').count()) === 0,
    'it drew over a screen that had content on it');
} finally {
  if (browser) await browser.close();
  if (server) await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:blankguard — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:blankguard — an empty page says what happened and offers the way back.');

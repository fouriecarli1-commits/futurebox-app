/**
 * The recorder catches the two failures no error boundary sees.
 *
 * ── Why this is a browser probe and not a source check ───────────────────
 *
 * Because the claim is "a thrown error and a rejected promise are written to
 * this device", and every part of that is a runtime fact: whether the
 * listeners are installed before anything happens, whether `localStorage` is
 * written, whether `/oops` reads the same key back. Source can show the code
 * and prove none of it.
 *
 * It exists because Carli hit a white screen and I gave two wrong
 * explanations. The recorder is the thing that ends the guessing, so a
 * recorder that quietly records nothing would be worse than none at all — it
 * would turn the next white screen into a confident "nothing was recorded, so
 * the page did not throw", which is exactly the sentence `/oops` prints.
 *
 * Both failures are caused for real rather than simulated: one `throw` inside
 * a timer, and one rejected promise nobody awaits. Those are the two shapes
 * described in `Watchdog`, caused the way the app causes them.
 */
import { serve, shot } from './where.mjs';
import { enter } from './enter.mjs';

const PORT = process.argv[2] || '3170';
const problems = [];
const check = (l, ok, d = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${l}${d && !ok ? ` — ${d}` : ''}`);
  if (!ok) problems.push(`${l}${d ? ` (${d})` : ''}`);
};

const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });

/* Nothing yet, on a device where nothing has gone wrong. */
const before = await p.evaluate(() => window.localStorage.getItem('futurebox.problems.v1'));
check('a device with no trouble has nothing recorded', before === null, String(before).slice(0, 60));

/* ── One: a throw with React nowhere on the stack ───────────────────────── */
await p.evaluate(() => {
  setTimeout(() => { throw new Error('a handler went wrong'); }, 0);
});
await p.waitForTimeout(600);

/* ── Two: a promise nobody awaited ──────────────────────────────────────── */
await p.evaluate(() => {
  void Promise.reject(new Error('nobody awaited this'));
});
await p.waitForTimeout(600);

const written = await p.evaluate(() =>
  JSON.parse(window.localStorage.getItem('futurebox.problems.v1') || '[]'));
check('both are written down', written.length === 2, `${written.length} recorded`);
check('the thrown one is named as thrown',
  written.some((one) => one.how === 'thrown' && /a handler went wrong/.test(one.message)),
  JSON.stringify(written.map((o) => [o.how, o.message])).slice(0, 200));
check('and the rejected promise as a promise',
  written.some((one) => one.how === 'promise' && /nobody awaited this/.test(one.message)),
  JSON.stringify(written.map((o) => [o.how, o.message])).slice(0, 200));
check('each says which page it happened on', written.every((one) => typeof one.page === 'string'));
check('and when', written.every((one) => !Number.isNaN(Date.parse(one.at))));

/* ── Three: the page thrown away and put back ────────────────────────────

   The likeliest cause of Carli's white screen, and the one that leaves NO
   error behind — which is exactly why it has to be detected rather than
   inferred from an empty list. `document.wasDiscarded` is true on the load
   that follows a discard, so it is set before the page loads, the way the
   browser sets it. */
await p.addInitScript(() => {
  Object.defineProperty(document, 'wasDiscarded', { value: true, configurable: true });
});
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1500);
const withDiscard = await p.evaluate(() =>
  JSON.parse(window.localStorage.getItem('futurebox.problems.v1') || '[]'));
check('a page the browser threw away says so',
  withDiscard.some((one) => one.how === 'discarded'),
  JSON.stringify(withDiscard.map((o) => o.how)));

/* ── And /oops reads back what was written ──────────────────────────────── */
await p.goto(`${server.url}/oops`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
const shown = await p.locator('body').innerText();
check('/oops shows the thrown one', /a handler went wrong/.test(shown), shown.slice(0, 200));
check('and the rejected one', /nobody awaited this/.test(shown), shown.slice(0, 200));
check('and says plainly that nothing is sent anywhere',
  /never sent|nêrgens gestuur/i.test(shown), shown.slice(0, 200));
/* The one entry that is not a fault has to say so where it is read, or it
   sends somebody hunting a bug that does not exist. */
check('and explains that a thrown-away page is not an app fault',
  /Not an app fault|nie 'n fout in die app nie/i.test(shown), shown.slice(0, 300));

/* Clearing is real, not just a repaint: somebody who clears it and comes back
   must not find it again. */
await p.getByRole('button', { name: /Clear/i }).first().click();
await p.waitForTimeout(400);
const after = await p.evaluate(() => window.localStorage.getItem('futurebox.problems.v1'));
check('clearing takes it off the device', after === null, String(after).slice(0, 60));

await p.screenshot({ path: shot('oops.png'), fullPage: false });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:oops — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:oops — a thrown error and a rejected promise are both written down, and /oops reads them back.');

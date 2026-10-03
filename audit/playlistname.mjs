/**
 * Naming a playlist, walked in a browser.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 4 October 2026: *"By playlist in channel. Wanneer mens 'n new
 * playlist add, dan moet daar darem 'n button wees wat sê rename."*
 *
 * ── Why a probe and not a source rule ────────────────────────────────────
 *
 * Because the name was ALREADY editable and had been since the day playlists
 * were written. It was a bare `<input>` with no border, no label and the
 * page's own background, sitting exactly where a heading sits — so it read as
 * the playlist's title, which is what it looked like, and nothing suggested a
 * cursor would land in it.
 *
 * A source check reading `<input value={list.name}` would have called that
 * feature present on the day she reported it missing. What was missing was
 * the affordance, and the only way to measure an affordance is to look at
 * what is on the screen: is there a control that says Rename, does pressing
 * it put her in a field, and does the name she types end up on the chip she
 * presses to open the list.
 */
import { enter, studio } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = 3347;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

await studio(p);

/* The channel is a tab on the app's own bar, not a room behind the door. */
const bar = p.locator('nav[aria-label]').first();
await bar.locator('button').filter({ hasText: 'Channel' }).first().click();
await p.waitForTimeout(1500);

/* Every card in this app opens folded — Carli asked for that months ago, so
   a room reads as its own table of contents. The playlists are inside one, so
   the heading has to be pressed before there is anything to press inside. */
await p.locator('button[aria-expanded]').filter({ hasText: 'Playlists' }).first()
  .click().catch(() => undefined);
await p.waitForTimeout(700);

const newList = p.locator('button').filter({ hasText: /^New$/ }).first();
check('the channel offers a new playlist',
  (await newList.count()) === 1,
  'everything below is about what happens after that press');

await newList.click();
await p.waitForTimeout(800);

const rename = p.locator('[data-listrename]');
check('making one leaves a button that says Rename',
  (await rename.count()) === 1 && /rename|done/i.test((await rename.innerText()).trim()),
  `${await rename.count()} — her words: "dan moet daar darem ’n button wees`
  + ' wees wat sê rename". The name was already editable and had been for'
  + ' weeks; what it had was no sign of it');

const field = p.locator('[data-listname]');
check('  and a fresh list opens straight into the naming',
  await field.isVisible().catch(() => false),
  'a list called "New playlist" is a list she is about to name, and this is'
  + ' the one moment she is certainly thinking about what it is called');

check('  with the field focused, so she can just type',
  await field.evaluate((el) => el === document.activeElement).catch(() => false),
  'a field she has to find and press first is a field that may as well not'
  + ' have opened');

await field.fill('My afrikaans songs');
await p.waitForTimeout(400);

/* ── Done means done ───────────────────────────────────────────────────

   The one way this breaks is invisible in the source: the input's own `blur`
   fires BEFORE the button's `click`, so if the press is not held off, Done
   lands on a state where nothing is being renamed and turns renaming back ON.
   The button looks right, the handler looks right, and the field never
   closes. */
await rename.click();
await p.waitForTimeout(500);

check('pressing Done really closes the field',
  (await field.count()) === 0,
  'the field’s own blur fires before the button’s click, so a press that'
  + ' is not held off finds nothing being renamed and switches renaming back'
  + ' on — a Done button that does not finish');

const title = p.locator('[data-listtitle]');
check('  and the name she typed is the title',
  ((await title.innerText().catch(() => '')) || '').trim() === 'My afrikaans songs',
  `"${((await title.innerText().catch(() => '')) || '').trim()}"`);

check('  and the chip that opens the list carries it too',
  await p.locator('button').filter({ hasText: 'My afrikaans songs' }).first().isVisible()
    .catch(() => false),
  'the chip is how she finds the list again — a name that only exists inside'
  + ' the open panel is a name she cannot use');

/* ── An empty name is not a name ───────────────────────────────────────── */

await rename.click();
await p.waitForTimeout(400);
await p.locator('[data-listname]').fill('');
await p.waitForTimeout(300);
await rename.click();
await p.waitForTimeout(300);
await rename.click();
await p.waitForTimeout(400);

check('clearing the name puts the default back rather than leaving a blank',
  ((await p.locator('[data-listname]').inputValue().catch(() => '')) || '').trim().length > 0,
  'a cleared name makes the chip above an empty button — there is nothing on'
  + ' it to press and nothing to tell it from the next one');

await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:playlistname — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(
  '\ncheck:playlistname — a new playlist opens straight into a focused name'
  + ' field with a button that says Rename, Done closes it, and the name'
  + ' reaches the chip that opens the list.',
);

/**
 * The advert desk's work, arriving in the next room.
 *
 * ── What this proves that no source check can ────────────────────────────
 *
 * Carli, 11 September 2026, on the desk as a product she is selling:
 *
 *   "When you push the buttons to take you to podcast, to video, to music
 *    making, the text and shots and scripts don't carry over to the next
 *    room. That is a real problem… It is supposed to copy and paste the
 *    information to the next page."
 *
 * `check:adhandover` proves the right values come OUT of `handoverFor`. It
 * cannot prove they arrive. Between the two sits the part that actually
 * broke: `copilotBus.handoff` holds a value for a room that is not mounted
 * yet and fires when it registers — so the whole thing depends on a room
 * unmounting, another mounting, and a handler running at the right moment.
 * A value delivered to a room that has already left, or one that never
 * fires because the destination registered under a different name, looks
 * exactly like this fault and is invisible from the desk.
 *
 * So this presses the button and then reads the box in the other room.
 *
 * ── Why the adviser is stubbed and the hand-off is not ───────────────────
 *
 * `/api/adformats` needs a live model key, which this machine does not
 * have. The reply is canned to the exact shape the route returns — `picks`
 * with `id`, `why`, `first`, `watchOut`, `style` — so what is under test is
 * everything downstream of it: the module that decides what travels, the
 * bus that carries it, and the room that receives it. Stubbing the reply to
 * test the reply would prove nothing, which is the mistake `audit/addon.mjs`
 * made with `/api/plan`.
 */
import { chromium } from 'playwright';
import { launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, studio, toRoom } from './enter.mjs';

const PORT = Number(process.argv[2] || 3131);

const server = await serve(PORT);
const b = await chromium.launch(launchOptions());
const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

/** What the adviser would have said. The shape is the route's own. */
const PICKS = {
  picks: [
    {
      id: 'short_vertical',
      why: 'People buy a bag with their eyes before they read anything.',
      first: 'One bag on a workbench, the maker’s hands stitching the last seam',
      watchOut: 'Do not show a shop; there is not one.',
      style: 'hands_working',
      styleWhy: 'Hands doing the work is the one thing a generated clip cannot fake.',
    },
    {
      id: 'song_with_a_photo',
      why: 'A song is the only thing here somebody plays twice.',
      first: 'A slow Afrikaans song over one photograph of the workshop',
      watchOut: 'A song cannot say a price.',
      style: 'dry_afrikaans',
      styleWhy: 'Nobody else is doing it.',
    },
  ],
  instead: 'Do not spend a month on a two-minute explainer nobody asked for.',
  moves: [],
};
await p.route('**/api/adformats', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PICKS) }));
/* The rooms this walk passes through must not reach out. */
await p.route('**/api/taste*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"taste":[],"ready":true}' }));

const WHAT = 'handmade leather bags, cut and stitched by one person';

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('adcarry@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('adcarry-password-1234');
  await p.locator('button[type="submit"]').first().click();
  /* Waited for, not slept through: the bottom bar is on every signed-in
     screen and no signed-out one. A fixed pause is how a probe measures the
     signed-out page and reports a working room as broken. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);

  await studio(p);
  await toRoom(p, 'Adverts');
  await p.waitForTimeout(1400);
  const room = p.locator('div.fixed.inset-0.z-50').first();

  /* The brief, as somebody fills it in. Only the first box is required by
     the room, and only the first box is filled here on purpose: the
     hand-off has to work for the person who typed one sentence, not only
     for the one who filled in five. */
  const what = room.locator('#ads-what');
  await what.waitFor({ state: 'visible', timeout: 20000 });
  await what.fill(WHAT);
  await p.waitForTimeout(200);

  const ask = room.locator('button').filter({ hasText: /Work out what to make|Werk uit wat om te maak/i }).first();
  check('the adviser can be asked', (await ask.count()) > 0,
    'no button to ask what to make — the walk below cannot start');
  if ((await ask.count()) === 0) throw new Error('no adviser button');
  await ask.click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: shot('adcarry-picks.png') });

  const open = room.locator('button').filter({ hasText: /Open the room and start it|Maak die kamer oop/i });
  check('it recommends something you can press', (await open.count()) >= 2,
    `${await open.count()} cards — the stub sends two`);

  /* ── One: a clip. The room is the video desk. ──────────────────── */
  await open.first().click();
  await p.waitForTimeout(2200);
  await p.screenshot({ path: shot('adcarry-canvas.png') });

  /* Read by what it IS rather than by an id: this is the only long text box
     on the video desk, and a probe that finds it by a class name reports a
     restyle as a lost hand-off. */
  const prompt = p.locator('div.fixed.inset-0.z-50 textarea').first();
  await prompt.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const shotText = (await prompt.inputValue().catch(() => '')) ?? '';
  check('the shot arrives on the video desk', shotText.trim().length > 40,
    `"${shotText.slice(0, 80)}" — this is the fault she reported, in one box`);
  check('  and it is HER brief, not a generic one',
    /workbench|stitching|seam/i.test(shotText), shotText.slice(0, 120));
  check('  with the look the card recommended on it',
    /hand|daylight|window|work/i.test(shotText),
    'the shot is made a different way from the one the card just described');

  /* The shape and the length: the two the desk cannot guess, and the two
     that used to be left at whatever the room was last set to.
 
     Read off `aria-pressed` rather than off the page's text. The first
     version searched the whole overlay for "9:16" and found the studio's
     rail instead — the controls are labelled "Tall" and "8s", and a probe
     that matches the words on a button is a probe that fails on a rename.
     Saying which one is chosen was also missing from the buttons
     themselves, so this found an accessibility gap on the way past. */
  const pressed = async (label) => {
    const on = p.locator('div.fixed.inset-0.z-50 button[aria-pressed="true"]');
    const many = await on.count();
    const said = [];
    for (let at = 0; at < many; at += 1) said.push(((await on.nth(at).innerText()) ?? '').trim());
    return { has: said.some((one) => one.toLowerCase().includes(label.toLowerCase())), said };
  };
  /* ── Only where there is an engine to offer them ─────────────────
 
     The desk asks the server what the video engine can actually do and
     draws only those shapes and lengths — `shapes = able?.aspects ?? []`.
     On a machine with no engine key there are no buttons at all, which is
     correct behaviour and not a lost hand-off.
 
     So this says which it is rather than failing. A probe that goes red
     for a missing API key reports the app as broken when it is fine, and
     that is the fault `enter.mjs` has a whole paragraph about. */
  const anyShape = await p.locator('div.fixed.inset-0.z-50 button[aria-pressed]').count();
  if (anyShape === 0) {
    console.log('  --   the shape and the length are not offered here: no video engine is configured,');
    console.log('       so the desk draws no shapes and no lengths. Not checked, and not a failure.');
  } else {
    const shape = await pressed('Tall');
    check('  and the shape it decided on is the one chosen', shape.has,
      `chosen: ${shape.said.join(' | ') || 'nothing'} — the desk said vertical`);
    const length = await pressed('8s');
    check('  and so is the length', length.has,
      `chosen: ${length.said.join(' | ') || 'nothing'} — the desk said eight seconds`);
  }

  /* ── Two: a song. The room that used to open completely empty. ─── */
  await toRoom(p, 'Adverts');
  await p.waitForTimeout(1400);
  const back = p.locator('div.fixed.inset-0.z-50').first();
  await back.locator('#ads-what').fill(WHAT);
  await back.locator('button').filter({ hasText: /Work out what to make|Werk uit wat om te maak/i }).first().click();
  await p.waitForTimeout(1500);
  await back.locator('button').filter({ hasText: /Open the room and start it|Maak die kamer oop/i }).nth(1).click();
  await p.waitForTimeout(2200);
  await p.screenshot({ path: shot('adcarry-make.png') });

  const boxes = p.locator('div.fixed.inset-0.z-50 textarea');
  const many = await boxes.count();
  let words = '';
  for (let at = 0; at < many; at += 1) {
    const said = (await boxes.nth(at).inputValue().catch(() => '')) ?? '';
    if (/\[Verse\]|\[Chorus\]|\[Hook\]/.test(said)) words = said;
  }
  check('the words arrive in Make a song', words.trim().length > 20,
    'this room opened completely empty — there was nothing registered to receive anything');
  check('  with the section markers the engine reads',
    /\[Chorus\]|\[Hook\]/.test(words), words.slice(0, 80));
  check('  and her own subject in them', /bag|leather|workshop/i.test(words), words.slice(0, 120));
} finally {
  await b.close();
  server.stop();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nPressed in the advert room and read in the next one: the shot with her brief and the recommended look on it, and the words with their section markers.');

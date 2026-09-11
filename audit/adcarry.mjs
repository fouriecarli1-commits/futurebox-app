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
/**
 * A different answer for a different brief.
 *
 * Not decoration. Switching between two saved campaigns can only be tested
 * if the two are told apart, and an earlier version of this file answered
 * both with the same two cards — so opening the first while showing the
 * second's advice passed every assertion below. Removing the line that
 * restores the advice did not turn it red, which is a probe measuring
 * nothing and reporting a pass.
 */
const COFFEE = {
  picks: [
    {
      id: 'short_vertical',
      why: 'A queue at a market stall is the whole argument, and it is visible.',
      first: 'Steam off the machine at seven in the morning, the market still setting up',
      watchOut: 'Do not film an empty stall.',
      style: 'the_place',
      styleWhy: 'The market is the reason people came.',
    },
    {
      id: 'spoken_read',
      why: 'Where the cart will be this weekend is a fact, and facts are read, not sung.',
      first: 'Twenty seconds: where the cart is this Saturday, and what is on',
      watchOut: 'A song cannot say an address.',
      style: 'own_voice_unscripted',
      styleWhy: 'A real voice beats a polished one at a market.',
    },
  ],
  instead: 'Do not spend a month on a jingle for a cart that moves every weekend.',
  moves: [],
};
await p.route('**/api/adformats', async (route) => {
  const asked = route.request().postDataJSON();
  const coffee = /coffee|cart|market/i.test(String(asked?.what ?? ''));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(coffee ? COFFEE : PICKS),
  });
});
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
  await p.waitForTimeout(1600);
  const back = p.locator('div.fixed.inset-0.z-50').first();

  /* Nothing is re-typed and nothing is re-asked here, and that IS the
     assertion: the brief and the cards are both supposed to be waiting.
     An earlier version of this probe filled the box and pressed "Work out
     what to make" again, and then timed out looking for that button —
     because the cards had come back and the button now reads "Think
     again". The walk failing was the feature working. */
  const kept = (await back.locator('#ads-what').inputValue().catch(() => '')) ?? '';
  check('walking back in, the brief is waiting', kept.trim() === WHAT, `"${kept}"`);
  const cards = back.locator('button').filter({ hasText: /Open the room and start it|Maak die kamer oop/i });
  check('  and so are the cards, without asking again', (await cards.count()) >= 2,
    `${await cards.count()} — the advice was written, shown once and dropped`);

  await cards.nth(1).click();
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
  /* ── Three: the brief is still there when you come back ────────
 
     Everything this desk produces was already remembered and the brief was
     not, so every trip out of the room emptied it — and every button added
     here is a trip out of the room. Walking back in is the only way to see
     it: the source can show a `saveBrief` that is never reached, and a
     restore that an effect overwrites a moment later. */
  await toRoom(p, 'Adverts');
  await p.waitForTimeout(1600);
  const again = p.locator('div.fixed.inset-0.z-50').first();
  const still = (await again.locator('#ads-what').inputValue().catch(() => '')) ?? '';
  check('the brief is still there after two trips out of the room', still.trim() === WHAT,
    `"${still}" — it was "${WHAT}" before the first button was pressed`);

  /* And a reload, which is the other way somebody comes back. */
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  await dismissDoor(p);
  await studio(p);
  await toRoom(p, 'Adverts');
  await p.waitForTimeout(1600);
  const afterLoad = (await p.locator('div.fixed.inset-0.z-50').first().locator('#ads-what')
    .inputValue().catch(() => '')) ?? '';
  check('  and after a reload', afterLoad.trim() === WHAT, `"${afterLoad}"`);

  /* Starting a fresh one, and what happens to the old one, is section four
     below: it is the same press and this used to check it against the
     label it had before the shelf existed. One assertion, in the place
     where the interesting half of it lives. */
  /* ── Four: two campaigns, each a button ─────────────────────────
 
     "The ones that I have worked on should be able to be a button to push
     on and then everything opens as it was."
 
     Source cannot show this. It can show a shelf that is written and a
     switcher that reads it, and still have the panels draw the previous
     campaign because they were remounted a paint too early, or the cards
     come back without their reasons. So: make a second campaign, switch
     back to the first, and read what is on the screen. */
  const desk = () => p.locator('div.fixed.inset-0.z-50').first();
  const SECOND = 'a mobile coffee cart at weekend markets';

  const fresh = desk().locator('button').filter({ hasText: /Start a new one|Begin .{0,3}n nuwe een/i }).first();
  check('there is a way to start a second one beside the first', (await fresh.count()) > 0,
    'a new campaign can only replace the one before it');
  if ((await fresh.count()) > 0) {
    await fresh.click();
    await p.waitForTimeout(700);
    const cleared = (await desk().locator('#ads-what').inputValue().catch(() => 'x')) ?? 'x';
    check('  which opens empty rather than inheriting the last one', cleared.trim() === '', `"${cleared}"`);

    await desk().locator('#ads-what').fill(SECOND);
    await p.waitForTimeout(900);
    await desk().locator('button').filter({ hasText: /Work out what to make|Werk uit wat om te maak/i }).first().click();
    await p.waitForTimeout(1600);

    /* Both on the shelf now, named by their own first line. */
    const first = desk().locator('button[aria-current], button').filter({ hasText: /handmade leather bags/i }).first();
    check('  and the earlier one is still there to press', (await first.count()) > 0,
      'the second campaign replaced the first rather than sitting beside it');

    if ((await first.count()) > 0) {
      await first.click();
      await p.waitForTimeout(1200);
      const back = (await desk().locator('#ads-what').inputValue().catch(() => '')) ?? '';
      check('pressing it brings the first brief back', back.trim() === WHAT, `"${back}"`);

      /* And the advice with it — the part that was written, shown once and
         dropped. Read as words on the screen, because a card rebuilt from
         ids alone is a heading with nothing under it. */
      const said = (await desk().innerText()).replace(/\s+/g, ' ');
      check('  with the recommendation cards on it', /Open the room and start it|Maak die kamer oop/i.test(said),
        said.slice(0, 140));
      /* THIS campaign's words, not the other one's. The two stubs answer
         differently on purpose: with one answer for both, a switcher that
         restores nothing shows the second campaign's cards and passes. */
      check('  and their reasons, not just their names',
        /scrolling|buy a bag|plays twice|play it twice/i.test(said),
        'the cards came back as headings with the advice missing');
      check('  and they belong to this campaign, not the one before it',
        !/market still setting up|cart that moves|queue at a market/i.test(said),
        'the first brief came back under the second campaign\u2019s advice');
      check('  and the one it said not to spend a month on',
        /two-minute explainer|What not to spend a month on|Waaraan om nie/i.test(said),
        'the most useful line on the screen is the one that did not come back');
    }
  }
} finally {
  await b.close();
  server.stop();
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\nPressed in the advert room and read in the next one: the shot with her brief and the recommended look on it, the words with their section markers, and a brief still there after two trips out and a reload.');

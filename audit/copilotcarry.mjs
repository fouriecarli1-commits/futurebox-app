/**
 * The copilot's own hand-off, driven end to end.
 *
 * ── The gap this fills ───────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Die advert se copilot skryf nie die shots in
 * die volgende kamer nie."*
 *
 * The third time she has reported a version of this, and each earlier time
 * the answer was a fix to a different path. `check:adcarry` presses the
 * recommendation CARD and reads the box in the next room, and it passes —
 * that path works and has for days. `check:copilotplan` proves
 * `planActions` puts the right room on the right action. Neither of them
 * touches the path she is actually using: typing to the copilot, and the
 * copilot answering with a `surface_op` for a room it is opening in the
 * same reply.
 *
 * That path runs through `Copilot.tsx` (split the reply into free and paid,
 * apply the free ones in order), `page.tsx` (dispatch here, hand off there)
 * and `copilotactions.ts` (hold it until the room mounts). Three modules
 * and a mount boundary, and nothing has ever walked it.
 *
 * ── Why the model is stubbed and nothing else is ─────────────────────────
 *
 * `/api/copilot` needs a live key. The reply is canned to the exact shape
 * the route returns after `planActions` — `reply` plus `actions` with
 * `kind`, `op`, `value` and `room` — because what is under test is
 * everything downstream of the model: the split, the dispatch-or-hand-off
 * decision, the bus's waiting list, and the room that receives it. The
 * model choosing to send those actions is a separate question, and one a
 * probe cannot answer anyway.
 *
 * The actions are exactly what `planActions` emits for "make me a short
 * vertical advert": the fields first, the `go` last, each field carrying
 * the destination room.
 */
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions, serve, shot } from './where.mjs';
import { dismissDoor, studio, toRoom, unfold } from './enter.mjs';

const PORT = Number(process.argv[2] || 3133);

const server = await serve(PORT);
const b = await chromium.launch(launchOptions());
/* ── Measured on a phone, because that is where she uses it ──────────
   The video desk draws its copilot in an aside on a wide screen and
   inside the room on a narrow one, so the panel the hand-off lands in is
   literally a different element at the two widths. A desk-width pass
   proving the carry is a desk-width answer to a phone report. */
const PHONE = { width: 390, height: 844 };
const p = await b.newPage({ viewport: PHONE, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 140)}`));

/* Long enough that a box holding it cannot be holding anything else, and
   worded like a shot rather than like a test string, because the assertion
   below reads it back out of the room. */
const SHOT =
  'One bag on a workbench in morning light, the maker’s hands pulling the last '
  + 'stitch through, the camera easing in until the seam fills the frame.';
const BRIEF = 'Here is the advert we just wrote together, so you can carry on from it.';

/* Three finished adverts, the shape `/api/campaign` returns. The first
   one's shot is what `film_this` must carry, so it is distinctive. */
const ADS = {
  /* Under `ads`, because that is the key `/api/campaign` puts its reply
     under. `check:jsonshape` holds a probe to the route's real shape —
     a stub that invents its own wrapper proves one side and calls it the
     system, which is how `audit/addon.mjs` passed for months over a
     screen that showed nothing. */
  ads: [
    {
      angle: 'the maker',
      headline: 'One pair of hands, one bag at a time',
      body: 'Cut, skived and stitched on a bench in Riebeek Kasteel.',
      cta: 'See the ones ready to go',
      spoken: 'Elke sak vat twee dae, en dit wys.',
      shot: 'A leather workbench at first light, one pair of hands drawing waxed thread through the last seam, the camera easing in until the stitch fills the frame.',
      caption: 'Two days a bag.',
      hashtags: ['leather'],
    },
    {
      angle: 'the wait',
      headline: 'Nothing here was made this morning',
      body: 'Four weeks from hide to handle.',
      cta: 'Join the list',
      spoken: '',
      shot: 'A rack of hides in a cool room, dust in the light, a slow static wide.',
      caption: 'Four weeks.',
      hashtags: [],
    },
  ],
};
await p.route('**/api/campaign', (r) => r.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify({ ads: ADS.ads }),
}));

let asked = 0;
/* The second question gets the second answer: the first turn is the
   hand-off written by the model, the second is the copilot reaching for
   the room's own button. Two different replies, so a probe that only ever
   sees one of them cannot pass for the other. */
const REPLIES = [
  {
    reply: 'A vertical short is the one to make. I have set it up on the video desk.',
    actions: [
      { kind: 'surface_op', op: 'set_prompt', value: SHOT, room: 'canvas' },
      { kind: 'surface_op', op: 'brief', value: BRIEF, room: 'canvas' },
      { kind: 'go', op: '', value: 'canvas', room: '' },
    ],
  },
  {
    reply: 'Filming the first one. The desk is set up with its shot.',
    actions: [
      { kind: 'surface_op', op: 'film_this', value: '', room: '' },
    ],
  },
];
await p.route('**/api/copilot', async (route) => {
  if (route.request().method() !== 'POST') {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"available":true}' });
    return;
  }
  const answer = REPLIES[Math.min(asked, REPLIES.length - 1)];
  asked += 1;
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(answer),
  });
});
await p.route('**/api/taste*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"taste":[],"ready":true}' }));

try {
  await p.goto(server.url, { waitUntil: 'networkidle' });
  const cta = p.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('copilotcarry@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('copilotcarry-password-1234');
  await agreeAndSubmit(p);
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 60000 });
  await dismissDoor(p);

  await studio(p);
  await toRoom(p, 'Adverts');
  await unfold(p);
  await p.waitForTimeout(600);

  const overlay = 'div.fixed.inset-0.z-50';
  const ask = p.locator(`${overlay} [data-copilot-ask]`).first();
  check('the adverts desk has a copilot to type into', (await ask.count()) > 0);
  if ((await ask.count()) === 0) throw new Error('no copilot input in the adverts room');

  /* The room the panel says it belongs to. If this is not the adverts desk
     then everything below is measuring the wrong copilot, and the whole
     file would pass or fail for a reason that has nothing to do with the
     hand-off. */
  const surface = await p.locator(`${overlay} [data-copilot]`).first().getAttribute('data-copilot');
  check('  and it knows which room it is in', surface === 'campaign', String(surface));

  await ask.fill('Maak vir my n kort vertikale advertensie oor die sakke.');
  await ask.press('Enter');
  await p.waitForTimeout(2500);
  check('the copilot was actually asked', asked === 1, `${asked} calls to /api/copilot`);

  /* ── It moved them ───────────────────────────────────────────────────
     The `go` is the easy half and is asserted on its own, because a
     hand-off that fails because nobody arrived is a different fault from
     one that fails because nothing was waiting. */
  await p.waitForTimeout(1200);
  const nowIn = await p.locator(`${overlay} [data-copilot]`).first().getAttribute('data-copilot').catch(() => null);
  check('it took her to the video desk', nowIn === 'canvas', String(nowIn));

  await p.screenshot({ path: shot('copilotcarry-arrived.png') });

  /* ── And the shot was waiting when she got there ─────────────────── */
  const shotFold = p.locator(`${overlay} button[aria-expanded]`)
    .filter({ hasText: /The shot|Die skoot/ }).first();
  check('the card the shot went into opened by itself',
    (await shotFold.count()) > 0 && (await shotFold.getAttribute('aria-expanded')) === 'true',
    'a value in a shut card is a room that looks untouched');

  await unfold(p);
  const prompt = p.locator(`${overlay} textarea`).first();
  await prompt.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const written = (await prompt.inputValue().catch(() => '')) ?? '';
  check('the shot the copilot wrote is in the box',
    written.includes('pulling the last'),
    written.trim() ? `the box holds: ${written.slice(0, 90)}` : 'the box is empty');

  /* ── And the conversation came with it ───────────────────────────── */
  const said = await p.locator(`${overlay} [data-copilotopen], ${overlay} [data-copilot]`).first()
    .innerText().catch(() => '');
  check('  and the copilot in this room knows what the advert is',
    said.includes('carry on from it'),
    said.trim() ? `${said.replace(/\s+/g, ' ').slice(0, 120)}` : 'nothing in the panel');

  await p.screenshot({ path: shot('copilotcarry-shot.png') });

  /* ── The second half: the button the copilot could not press ──────────

     Carli, 21 September 2026: *"Die advert se copilot skryf nie die shots
     in die volgende kamer nie."*

     Above, the copilot wrote a shot of its own and it arrived — so the
     carrying works and always did. What it could not do is reach the
     adverts already on her screen: the desk registered five brief fields
     and nothing else, so a copilot asked to film the advert it had just
     helped write had to invent a new shot or tell her to press a button.

     `film_this` is the room's own button, offered as an operation and only
     once an advert exists. This walks it: write the adverts, go back to the
     desk, ask, and read the FIRST advert's own shot out of the video desk.
     Its own shot, not a generic one — matching on a phrase only that advert
     has is what tells the two apart. */
  /* Straight across the rail, not out through the studio home: the video
     desk is a full-screen overlay and the header behind it is not
     clickable — an earlier version of this reached for the Studio button
     and timed out on a room that was working perfectly. */
  await toRoom(p, 'Adverts');
  await unfold(p);
  await p.waitForTimeout(800);

  const what = p.locator(`${overlay} #ads-what`);
  await what.waitFor({ state: 'visible', timeout: 20000 });
  await what.fill('handmade leather bags, cut and stitched by one person');
  const write = p.locator(`${overlay} button`).filter({ hasText: /Write the adverts|Skryf die advertensies/ }).first();
  await write.scrollIntoViewIfNeeded().catch(() => undefined);
  await write.click({ timeout: 15000 });
  await p.waitForTimeout(1800);

  const filmButton = p.locator(`${overlay} button`).filter({ hasText: /Film this one|Verfilm hierdie/ }).first();
  check('the adverts were written', (await filmButton.count()) > 0,
    'without an advert on screen there is nothing for the copilot to film');

  const ask2 = p.locator(`${overlay} [data-copilot-ask]`).first();
  await ask2.fill('Maak nou die video van die eerste een.');
  await ask2.press('Enter');
  await p.waitForTimeout(2500);
  check('the copilot was asked a second time', asked === 2, `${asked} calls`);

  const landed = await p.locator(`${overlay} [data-copilot]`).first().getAttribute('data-copilot').catch(() => null);
  check('pressing the room’s own button took her to the video desk', landed === 'canvas', String(landed));

  await unfold(p);
  const second = p.locator(`${overlay} textarea`).first();
  await second.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const carried = (await second.inputValue().catch(() => '')) ?? '';
  check('  and the advert’s OWN shot is what arrived',
    carried.includes('waxed thread'),
    carried.trim() ? `the box holds: ${carried.slice(0, 100)}` : 'the box is empty');
  check('  with the spoken line in quotation marks, so the desk knows it is said',
    /[“"]Elke sak vat twee dae/.test(carried),
    'unquoted, a line is drawn at rather than spoken and the subtitle comes out empty');

  await p.screenshot({ path: shot('copilotcarry-filmthis.png') });
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  await b.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:copilotcarry — ${problems.length} problem(s):`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('\nTyped to the copilot in the adverts desk: it moved her to the video desk, the shot was in the box and the conversation was there to carry on from.');

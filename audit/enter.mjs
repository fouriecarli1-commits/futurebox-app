/** Sign in, open the studio, and report what is there. Shared by every audit. */
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions } from './where.mjs';

/** The sandbox has no route to the open internet; those are not app faults. */
const OFFSITE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED/;
/** A fetch cancelled because the component unmounted is the design, not a fault. */
const ABORTED = /ERR_ABORTED/;

/**
 * @param at  where the app is. Defaults to :3000 because twenty-six older
 *            probes assume it; a probe that starts its own server passes
 *            `serve()`'s url instead, which is what makes it able to run on a
 *            machine where nobody has left a server lying around.
 * @param args extra Chromium switches. A probe that has to sing needs a
 *            microphone — `--use-fake-device-for-media-stream` and its
 *            companion — and this is the only way in for one that walks the
 *            app from the front door rather than opening a probe page.
 */
/**
 * @param lang   'af' to arrive in Afrikaans. Set before the first paint rather
 *               than clicked afterwards: a probe that switches language on
 *               screen has already measured one page in English, and the
 *               interesting failures — a missing translation, a line that no
 *               longer fits — are on the first paint.
 * @param before called with the page after it exists and before it is pointed
 *               at the app. This is where a probe registers its `page.route`
 *               stubs: registering them after `enter()` returns is too late
 *               for anything the app fetches on mount, and reloading to fix
 *               that signs the tab out again on a deployment with no accounts.
 */
export async function enter({
  width = 1280, height = 900, at = 'http://localhost:3000', args = [], touch = false,
  lang = null, before = null,
} = {}) {
  const browser = await chromium.launch(launchOptions(args.length ? { args } : {}));
  /* `touch` is not a detail on a phone-sized run.

     `app/globals.css` keeps a whole block behind `@media (pointer: coarse)` —
     the forty-four pixel minimums and the rule that sizes a link for a thumb.
     Playwright's desktop Chromium reports a *fine* pointer whatever viewport
     it is handed, so a probe that only shrinks the window is measuring the app
     with those rules switched off. That is how the share sheet passed three
     rounds of measurement while Carli was holding a photograph of it failing. */
  const page = await browser.newPage({ viewport: { width, height }, ...(touch ? { hasTouch: true } : {}) });
  const problems = [];
  const note = (s) => { if (!problems.includes(s)) problems.push(s); };
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !OFFSITE.test(text)) note(`console: ${text.slice(0, 240)}`);
  });
  page.on('pageerror', (e) => note(`pageerror: ${String(e).slice(0, 240)}`));
  page.on('requestfailed', (r) => {
    const why = r.failure()?.errorText ?? '';
    if (OFFSITE.test(why) || ABORTED.test(why)) return;
    note(`request failed: ${r.url().replace(at, '')} — ${why}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(at)) {
      note(`HTTP ${r.status()}: ${r.url().replace(at, '')}`);
    }
  });

  if (lang) {
    await page.addInitScript((one) => {
      try {
        window.localStorage.setItem('futurebox.lang.v1', one);
      } catch {
        /* Storage off. The probe will find English and say so. */
      }
    }, lang);
  }
  if (before) await before(page);

  await page.goto(at, { waitUntil: 'networkidle' });
  // The first load after a restart compiles the route, so give the call to
  // action time to exist rather than assuming it is there on arrival.
  const cta = page.locator('button, a').filter({ hasText: /start free|begin|sign up/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 60000 });
  await cta.click();
  await page.waitForTimeout(600);
  await page.locator('input[type="email"]').first().fill('audit@futurebox.test');
  const pw = page.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('audit-password-1234');

  /* The tick, and then the press — both inside `agreeAndSubmit`.

     The terms box went in on 15 September 2026, because ElevenLabs' OEM
     Terms §3(A) require an affirmative click before an account exists, and
     it disables "Create a free account" until it is ticked.

     This function ticked it inline for a day, with a note saying every
     probe in this directory signs in through here. That note was wrong, and
     being wrong is why the repair was only a third of one: thirty-seven
     other probes fill the two fields and press the submit themselves, and
     every one of them was still sitting in front of a disabled button
     waiting thirty seconds for a timeout that reads like a slow server.

     So the tick lives with the press now, in one function in `where.mjs`,
     and `check:probes` refuses a probe that presses a sign-up submit
     without it. */
  await agreeAndSubmit(page);

  /* Waited for, not slept through.

     This was `waitForTimeout(1800)`, and 1800ms is how long signing in took on
     an idle laptop. On a loaded machine it is sometimes not enough, and the
     probe then measures the signed-out page while believing it is signed in —
     which is not a probe failing, it is a probe answering a different question
     and reporting the answer as a fault. `firstscreen` failed exactly that way
     on the desk header: signed out, the page draws a different header, and the
     probe read `static` where it expected `sticky`.

     The bottom bar is the signal because it exists on every screen the app
     shows a signed-in person and on none that it shows a signed-out one. */
  await page
    .locator('nav[aria-label]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => undefined);
  await page.waitForTimeout(400);

  await dismissDoor(page);
  return { browser, page, problems };
}

/**
 * The welcome page, out of the way.
 *
 * Signing in lands on it and it covers the header, so every probe that went
 * straight for the studio button started timing out against a door rather than
 * against a fault — and a probe that cannot get in reports nothing at all,
 * which is worse than one that fails.
 *
 * Waited for rather than checked once: it draws after two fetches settle, so
 * asking whether it is there the instant the form is submitted gets "no" and
 * then it appears half a second later, under the next click.
 */
export async function dismissDoor(page) {
  /* Found by its own button rather than by a class. A Tailwind arbitrary value
     has to be escaped twice to survive both this file and the selector parser,
     and getting that wrong fails silently as "no door" — which is exactly the
     answer that put the door back under the next click. */
  const notNow = page.locator('button').filter({ hasText: /Not now|Nie nou nie/ }).first();
  try {
    await notNow.waitFor({ state: 'visible', timeout: 8000 });
  } catch {
    return; // Not every route through the app opens it.
  }
  await notNow.click({ timeout: 5000 }).catch(() => undefined);
  await notNow.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(400);
}

/**
 * Back to the page itself, with nothing full-screen over it.
 *
 * ── Why this is shared and not inlined per probe ─────────────────────────
 *
 * The header, the account panel and the sign-out button live on the PAGE. The
 * studio is `fixed inset-0 z-50` over it and the arrival door is `z-[55]` over
 * that, so any probe that walks into the studio and then reaches for something
 * on the header spends thirty seconds being told "subtree intercepts pointer
 * events" by a screen it opened itself.
 *
 * Three probes hit that on 3 October — `check:greeting` reaching for Sign out
 * among them — each with a different screen on top, and each read like a layout
 * fault in the app. None of them was: a person closes what they are looking at
 * before pressing something behind it, and the probes were not.
 *
 * The door first, because it is over the studio; then the studio's own back
 * arrow, which is what the app puts on every layer. Capped, because a loop on a
 * button that has stopped working is a probe that hangs instead of failing.
 */
export async function toThePage(page) {
  await dismissDoor(page);
  const over = page.locator('div.fixed.inset-0.z-50');
  for (let n = 0; n < 6; n += 1) {
    if ((await over.count().catch(() => 0)) === 0) break;
    const out = page.locator('[data-backout]').first();
    if ((await out.count().catch(() => 0)) === 0) break;
    /* `force`, and this is the one place in these probes where it is right.
 
       The arrow is the app's own way out of the studio and it is inside the
       studio, so Playwright's own hit-test keeps answering that the overlay
       intercepts the click on its own control — which is true and useless. Every
       other click in these probes stays honest about interception; this single
       one is "press the way out", and there is nothing underneath it that could
       receive the press instead. */
    await out.click({ timeout: 4000, force: true }).catch(() => {});
    await page.waitForTimeout(600);
    await dismissDoor(page);
  }

  /* ── And if it is still there, start the tab again ──────────────────────

     The back arrow walks out of ROOMS. From the studio's own front door, with
     no room open, there is no further layer for it to leave and the overlay
     stays — which is correct behaviour and is exactly the state a probe
     reaching for the header is in.

     So the same last resort `studio()` uses, for the same reason: a probe
     helper's job is to be deterministic, and a person who cannot get back to a
     page reloads it. The per-tab room memory is cleared first so the reload
     lands on the page rather than back in the room.

     This is the fourth helper in this file to end in "and otherwise reload".
     That is not a smell: every one of them is a contract about WHERE the
     caller is, and a contract that cannot be met by pressing things has to be
     met some other way or it is not a contract. */
  if ((await over.count().catch(() => 0)) > 0) {
    await page.evaluate(() => {
      try { sessionStorage.clear(); } catch { /* a private tab refuses, and that is fine */ }
    }).catch(() => {});
    await page.goto(new URL('/', page.url()).toString(), { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
    await dismissDoor(page);
  }
  await page.waitForTimeout(300);
}

/** The studio overlay, which is the room you work in. */
export async function studio(page) {
  /* The door is dismissed AFTER the header button, not before it.

     It used to be the other way round, and that stopped working when the
     arrival door became its own page over everything: pressing Studio in the
     header now OPENS that door rather than the studio overlay, so dismissing
     it first and pressing Studio second put it straight back. The probe then
     had a `fixed inset-0 z-[55]` page sitting on top of the `z-50` overlay it
     had just been handed, and every click inside came back as "subtree
     intercepts pointer events" — which reads like a layout fault in the room
     and is nothing of the sort.

     Dismissed twice on purpose. Once for a door that was already open when we
     arrived, once for the one the header button opens. `dismissDoor` returns
     quietly when there is none, so the extra call costs a timeout on the way
     in and nothing else.

     The header button was called "Creator Studio" and is now called "Studio".
     Both are matched, because a probe that silently stops finding its way in
     reports every room as clean — which is what this one did until somebody
     noticed it had been passing without visiting anything. */
  /* ── Already inside? Then there is nothing to press ─────────────────────

     3 October 2026. `check:realartwalk` and `check:nameupload` had been red
     since at least 30 September with a thirty-second timeout on this click, and
     the message read like the header button being broken.

     It is not. Both probes RELOAD the page partway through and then ask to be
     in the studio again — and after that reload the studio overlay is already
     open, with one of its own cards sitting over the header button. The button
     was visible and enabled the whole time; `document.elementFromPoint` at its
     centre answered a card from the overlay. Playwright waits for a click to
     land, the card never moves, thirty seconds pass.

     So the fault was this helper's contract. It is named for a PLACE — be in
     the studio — and it was written as an ACTION, press the button that gets
     there. Asking somebody already in a room to walk into it is how a helper
     fails on correct behaviour, which is the direction that gets probes
     switched off.

     ── And "already there" has to mean the RAIL, not any overlay ───────────

     The first version of this tested `div.fixed.inset-0.z-50`, which is what
     this function hands back — and a ROOM is one of those too. So it answered
     "already in the studio" while standing inside the Channel room, and the
     next line went looking for the rail and reported "no way into Channel".
     The timeout became a different wrong answer, which is not progress.

     The test is the rail itself: the same `z-50 nav button` that `toRoom`
     reads. If the thing that gets you to another room is on the screen, you are
     in the studio; if it is not, you are somewhere else and the header button
     is the way back. */
  const already = page.locator('div.fixed.inset-0.z-50').first();
  /* `:visible` on the SET rather than `.first().isVisible()`.
 
     The rail's first button is not always the one on screen — a room can leave
     the list mounted with the top of it clipped — and asking the first one
     answered "no rail" while fourteen of its fifteen buttons were on the glass.
     What the caller needs to know is whether there is a way to another room in
     front of them, which is "any of these is visible". */
  const atRail = async () => (
    await page.locator('div.fixed.inset-0.z-50 nav button:visible').count().catch(() => 0)
  ) > 0;

  if (await atRail()) {
    /* A door may still have opened over it — a reload can restore both — and
       the caller wants what is BEHIND the door either way. */
    await dismissDoor(page);
    await page.waitForTimeout(300);
    return already;
  }

  /* ── Inside a ROOM: walk out of it the way a person does ────────────────

     This is the state both red probes were actually in, and it took three
     wrong answers to find. After their reload the page came back INSIDE the
     Channel room: one z-50 overlay, `data-copilot="channels"`, and fifteen rail
     buttons sitting in the DOM with no box on them, because the rail does not
     show while a room is open.

     So "is the rail there" answered no, and the old code reached for the header
     button — which is behind the room. Pressing a control that is covered by the
     thing you are trying to leave is not how anybody gets out of a room, and
     Playwright spent thirty seconds proving it.

     `data-backout` is the arrow the app itself puts on every room, and pressing
     it is exactly what a person does. Four presses at most: a room nests at most
     a couple of layers deep, and a loop with no ceiling on a button that stops
     working is a probe that hangs instead of failing. */
  for (let n = 0; n < 4; n += 1) {
    if (await atRail()) break;
    const out = page.locator('[data-backout]:visible').first();
    if ((await out.count().catch(() => 0)) === 0) break;
    await out.scrollIntoViewIfNeeded().catch(() => {});
    await out.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  if (await atRail()) {
    await dismissDoor(page);
    await page.waitForTimeout(300);
    return already;
  }

  /* ── Last resort: start the tab again ───────────────────────────────────

     If the back arrow did not reach the rail, we are somewhere this helper
     cannot reason about — and the honest thing for a PROBE helper is to be
     deterministic rather than clever. A person who is lost reloads; this does
     the same, and clears the per-tab room memory first so the reload lands at
     the front door instead of back where it started.

     `whereiwas.ts` is what puts it back: it remembers the room in
     `sessionStorage` so a tab the phone discarded comes back where she was.
     That is right for a person and is exactly what makes "reload to get out"
     not work for a probe, so the probe clears it on purpose and nothing about
     the feature changes.

     Four wrong answers went before this one and each was worth keeping: the
     overlay test that matched rooms too, the rail test that read only the first
     button, and the back arrow that does not always land. They are the reason
     the three cheap paths above exist; this is the one that cannot fail. */
  if (!(await atRail())) {
    await page.evaluate(() => {
      try { sessionStorage.clear(); } catch { /* a private tab refuses, and that is fine */ }
    }).catch(() => {});
    await page.goto(new URL('/', page.url()).toString(), { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(800);
  }

  await studioDoor(page);
  /* ── The door is left UP, and that is the fix rather than a shortcut ────

     This used to end `await dismissDoor(page)`, which presses "Not now — take
     me to the feed".

     On 4 October that button started doing what it says. It used to only lower
     the door, leaving whatever room was behind it — Carli: *"Daai not now -
     take me to the feed button vat my na die video editor."* It now calls the
     app's own `goTab('spotlight')`, which closes the studio as well, because
     the feed is not inside the studio.

     So this line walked in through the header button and immediately walked
     back out, and every probe after it reported "no way into <room>". The
     helper had encoded the button's old, wrong meaning as its way in.

     Nothing needs to replace it. This function is named for a PLACE — be in
     the studio — and the door IS in the studio: `toRoom` reads the door first
     and only falls back to the rail. Leaving it up is both correct and one
     fewer press. */
  await page.waitForTimeout(700);
  return page.locator('div.fixed.inset-0.z-50').first();
}

/**
 * The studio's front door, left standing.
 *
 * `studio()` above wants what is BEHIND the door — the overlay with the room
 * rail in it — so it dismisses the door on the way through. A handful of
 * probes want the door itself, because the door IS the studio's home page:
 * the greeting is on it, the room buttons are on it, and so is the music
 * quiz card, which Carli asked for "op die home page onder van die creative
 * studio".
 *
 * Split out because the two are not the same destination and sharing one
 * function made them look like it. `audit/quiz.mjs` called `studio()` and
 * then waited for the door; the day `studio()` learned to dismiss the door
 * after pressing the header button — which it had to, or every click behind
 * it came back as "subtree intercepts pointer events" — the quiz probe was
 * waiting twenty seconds for a page that had just been shut in front of it.
 * It did not show up for another day, because the terms box was stopping
 * that probe at the front door before it ever got this far.
 *
 * Returns the door, so a caller can scope its assertions to it rather than
 * to "somewhere on screen" — which is the assertion that once passed
 * happily while the quiz card was in the wrong room.
 */
export async function studioDoor(page) {
  /* Dismissed first, then re-opened by the header button. Signing in shuts
     the door behind it, and pressing Studio is what brings it back — which
     is also what a person does. The first call returns quietly when there
     is no door, so it costs one timeout and nothing else. */
  await dismissDoor(page);
  await page.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await page.waitForTimeout(800);
  const door = page.locator('div.fixed.inset-0.z-\\[55\\]').first();
  await door.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  return door;
}

/**
 * Press one of the five tabs on the app's own bar.
 *
 * ── Why this is a helper and not two lines ───────────────────────────────
 *
 * Because the two lines are wrong, and they were wrong in three probes at
 * once — `writing`, `wide` and `afrikaans` all timed out here on 5 October
 * 2026, which is a third of the red in CI from one mistake written three
 * times.
 *
 * The bar is at `z-95` and the studio's front door is a full-screen overlay
 * at `z-55`... which sounds like the bar wins, and on the screen it does.
 * Playwright calls the button visible, because visibility does not account
 * for what is painted over it, and then spends thirty seconds retrying a
 * click the door keeps intercepting. The failure reads as "the button is not
 * there", which is why all three looked like missing markup.
 *
 * The trap is specific to this bar: pressing Make is what OPENS the door, so
 * a probe that walks several rooms presses it once successfully and then
 * presses it again into an overlay it just raised itself. `afrikaans` has
 * called `dismissDoor` since it was written and still failed, for exactly
 * that reason — once at the start is not the same as once per press.
 */
export async function pressTab(page, label) {
  await dismissDoor(page);

  /* ── And the room that took the bar away ──────────────────────────────
     Carli, 4 October 2026, about the cutting room: she asked for the room to
     BE the screen. So `roomOwnsScreen` drops the app's bar entirely there,
     and `check:underbar` holds it that way — "the app's bar is away while
     the room IS the screen".
     `writing` and `wide` walk every room in `ROOMS` in order, and the Video
     Editor is seventh of fourteen. From the eighth room onwards they were
     pressing a bar that the app had correctly removed, so the locator
     resolved to nothing and Playwright waited thirty seconds for an element
     that will never exist. Both probes were written before that room did.
     The way a person leaves a room that owns the screen is the arrow in its
     corner, which every room carries. */
  const bar = page.locator('nav[aria-label]').first();
  if (!(await bar.count()) || !(await bar.isVisible().catch(() => false))) {
    const back = page.locator('[data-backout]:visible').first();
    if (await back.count()) {
      await back.click();
      await page.waitForTimeout(900);
      await dismissDoor(page);
    }
  }

  await page.locator('nav[aria-label]').first()
    .locator('button').filter({ hasText: label }).first()
    .click();
  await page.waitForTimeout(1100);
}

/**
 * Into a room, the way a person gets there.
 *
 * Rooms used to be reached from a dropdown on a phone and a rail on a desk,
 * and every probe drove the dropdown. There is no dropdown now: a phone has
 * one green button back to the studio's front door, and the door carries a
 * button for every room under the same stage headings the rail uses.
 *
 * So this presses the door and then the room, which is what somebody does.
 * On a desk the rail is right there and the door is not in the way, so the
 * rail is used when it is visible.
 */
export async function toRoom(page, name, { folded = false } = {}) {
  /** The one button among these whose FIRST LINE is the room's name.
   *
   *  The hint under each one holds room names too — "Podcast" appears in the
   *  video desk's, and so does "Adverts" — so matching the whole button opens
   *  the wrong room. Playwright's `hasText` searches the whole subtree, which
   *  is why this is a loop rather than a filter.
   *
   *  Shared by the door and the rail. It was written for the door only, and
   *  the rail kept its `filter({ hasText: name })` — so `toRoom(page,
   *  'Adverts')` from inside a room walked into the Video desk, whose hint
   *  reads "Adverts, podcasts, social". The probe then measured the wrong room
   *  and reported the Adverts screen as missing. Found the first time
   *  `audit/addon.mjs` was ever run. */
  const firstLineIs = async (buttons) => {
    const many = await buttons.count();
    for (let i = 0; i < many; i += 1) {
      const first = ((await buttons.nth(i).innerText().catch(() => '')) ?? '').split('\n')[0].trim();
      if (first.toLowerCase().startsWith(name.toLowerCase())) return buttons.nth(i);
    }
    return null;
  };

  const onDoor = () => firstLineIs(page.locator('div.fixed.inset-0.z-\\[55\\] button'));

  /* The door may already be open — the studio opens on it — in which case
     reaching for the way back clicks through an overlay and times out. */
  let button = await onDoor();
  if (!button) {
    /* The rail inside the studio, not the feed's tab strip behind it.

       `nav button` found the landing page's tabs — which Playwright calls
       visible, because visibility does not account for being covered by a
       full-screen overlay — and then spent thirty seconds retrying a click
       that the studio kept intercepting. */
    const rail = await firstLineIs(page.locator('div.fixed.inset-0.z-50 nav button'));
    if (rail && (await rail.isVisible().catch(() => false))) {
      await rail.click();
      await page.waitForTimeout(900);
      /* The same unfolding as the door path below.
 
         This returned here, and on a desk-width viewport the rail is the
         path taken — so the FIRST visit (through the door) came in
         unfolded and every visit after it did not. `adcarry` walked out to
         the video desk, walked back in, and reported a brief it had typed
         two minutes earlier as empty: the box was behind a fold this
         helper had skipped on the way past. */
      if (!folded) await unfold(page);
      return;
    }
    /* The card, if the room draws one — and `:visible`, which it did not ask.

       The cutting room stopped drawing it on 4 October: Carli asked for *"net
       'n back knoppie"* and the arrow in the top-left corner already made the
       same press, so the card is `hidden` there rather than removed. `count()`
       still finds a hidden button, so this helper picked it, waited thirty
       seconds for an element that will never be visible, and threw.

       What that looked like was much worse than a helper bug: `underbar` and
       `copilotbar` reported EIGHT rooms with no tab bar, because the probe
       never actually left the cutting room and kept measuring it under the
       next room's name. A probe that cannot leave a room reports the rooms it
       never reached. */
    const card = page.locator('button').filter({ hasText: /All rooms|Alle kamers/ }).first();
    const back = (await card.count()) && (await card.isVisible().catch(() => false))
      ? card
      /* Every room has this one, and it steps back exactly one layer — which
         inside a room is the room list. It is the way out a person uses when
         the card is not drawn. */
      : page.locator('[data-backout]:visible').first();
    if (await back.count()) {
      await back.click();
      /* The door fades in. Reading it the instant the press lands finds an
         empty overlay and reports a room as unreachable. */
      await page.locator('div.fixed.inset-0.z-\\[55\\] button').first()
        .waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
      await page.waitForTimeout(500);
    }
    button = await onDoor();
  }
  if (!button) throw new Error(`no way into ${name}`);
  await button.click();
  await page.waitForTimeout(1100);
  /* Opened on the way in, because every panel starts folded now and forty
     probes were written against rooms that did not.
 
     `folded: true` leaves it alone, for the one probe whose subject IS the
     folding. Without that escape the assertion "the room opens shut" was
     being made about a room this helper had just opened — a test defeated
     by its own scaffolding, which reads as the feature being broken. */
  if (!folded) await unfold(page);
}

/**
 * Open every folded panel in the room you are standing in.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 *
 * Carli, 12 September 2026: "Make sure every rooms drop down menu is closed
 * from the beginning and the user can open it." So `Card` starts shut, and
 * a room now opens as its own table of contents.
 *
 * That is right for a person and wrong for every probe written before it:
 * three of them went looking for a control that was behind a fold and
 * reported the room as broken. A probe that cannot reach the room reports
 * nothing, which is worse than one that fails.
 *
 * So `toRoom` unfolds on the way in, and every probe measures what it was
 * written to measure. The folded state itself is not left untested — it is
 * `check:folded` in the source and `adcarry`'s own assertion in a browser,
 * both of which look at a room BEFORE this runs.
 *
 * Only panels that are shut, found by `aria-expanded="false"`. Clicking
 * everything would close whatever a probe had just opened for itself.
 *
 * Repeated, because opening one panel can reveal another inside it — the
 * video desk's song picker lives inside a card. Bounded, because a pair of
 * panels that toggle each other would otherwise spin here for ever.
 */
export async function unfold(page) {
  /* Inside the studio when it is open, and on the page when it is not.
 
     Not `page` unconditionally: the landing page behind the overlay has
     folds of its own, Playwright calls them visible because visibility does
     not account for being covered, and every click on one is intercepted by
     the studio and times out. The first version did exactly that — it spent
     its whole budget on a button nobody can reach and never touched the
     room, so the probes it was written to fix failed the same way and it
     looked as though folding had broken them. */
  const overlay = page.locator('div.fixed.inset-0.z-50');
  const where = (await overlay.count()) > 0 && (await overlay.first().isVisible().catch(() => false))
    ? overlay.first()
    : page;

  /* Folds have a name on them. Icon-only buttons are something else.
 
     `aria-expanded` is not the property "I am a fold" — it is the property
     "I disclose something", and `Hint` uses it too, for the little question
     mark beside half the headings in this app. So this helper was opening
     every explanation in the room along with every card, and each one is an
     absolutely-positioned tooltip that then sits over whatever is under the
     heading. `collabroom` spent thirty seconds being told its room button
     was "visible, enabled and stable" while a tooltip belonging to the
     heading above it swallowed the press.
 
     A card's fold carries its title; a hint carries an `aria-label` and an
     svg. Requiring a non-blank text is the structural difference, and it
     holds for the wand as well, which is the other icon-only button on a
     card header. Matching on the label's wording would not survive the
     second language. */
  const shutNow = () =>
    where.locator('button[aria-expanded="false"]:visible').filter({ hasText: /\S/ });

  /* Press the first one that is still shut; if pressing it changed nothing,
     step past it and try the next.
 
     The version before this one gave UP at that point — it treated "this
     button did not open" as "nothing here opens" and returned. A room whose
     first foldable thing is a stubborn little icon toggle therefore had
     none of its real cards opened, and `check:makeroom` reported the words
     box as missing. Skipping is the difference between a helper that opens
     a room and one that opens whatever happens to be first in it.
 
     Bounded rather than "until none are shut": two panels that toggle each
     other would otherwise spin here for ever. Twenty-four presses is far
     more than any room has. */
  let skip = 0;
  for (let press = 0; press < 24; press += 1) {
    if (skip >= (await shutNow().count())) return;
    const one = shutNow().nth(skip);
    await one.scrollIntoViewIfNeeded().catch(() => undefined);
    /* Asked of the BUTTON afterwards, not of the room's total.
 
       Counting how many folds remain is too blunt: a card whose contents
       take longer to draw than the wait looks like "nothing happened", gets
       skipped, and its box is then missing for the rest of the probe. That
       is how `adcarry` came to report a brief it had just typed as empty.
       `aria-expanded` on the thing that was pressed is the direct answer. */
    const handle = await one.elementHandle().catch(() => null);
    if (!handle) { skip += 1; continue; }
    /* Pressed through the DOM rather than by a real pointer.
 
       A room that opens as a list of headings is a tall room with a sticky
       bar at the top of it, and a scrolled-to heading lands underneath that
       bar — so Playwright's click hit the bar, nothing opened, and this
       helper walked past all eight folds achieving nothing while reporting
       no error. Eight four-second timeouts, and a probe that then said the
       brief it had just typed was empty.
 
       Whether a person can actually reach these is a real question and it
       is asked elsewhere: `check:buttonlook`, `audit/touch.mjs` and
       `audit/underbar.mjs` exist for it. This is scaffolding to get at the
       contents, so it goes straight at the element. */
    await handle.evaluate((el) => el.click()).catch(() => undefined);
    await page.waitForTimeout(220);
    const opened = (await handle.getAttribute('aria-expanded').catch(() => null)) === 'true';
    if (!opened) skip += 1;
  }
}

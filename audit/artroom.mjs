/**
 * The album art gallery, walked in a browser.
 *
 * ── What this is here to catch ───────────────────────────────────────────
 *
 * Three of the room's rules are promises to somebody outside the code, and
 * all three are the kind that stay true in the source while quietly going
 * false on the screen:
 *
 *   the keyboard   Carli: *"Geen tik moontlikhede nie, net dit."* The whole
 *                  conversation between a buyer and an artist is two
 *                  buttons. One `<input>` added to the pop-out by somebody
 *                  being helpful and the room's reason for existing is gone
 *                  — and it would look like an improvement in review.
 *
 *   the price      A price behind a fold is a price somebody meets after
 *                  they have decided. `docs/OPEN-QUESTIONS.md` §Z.
 *
 *   sold once      *"elke kunswerk … uniek is en net een keer verkoop."*
 *                  If the room stops saying so before anything is pressed,
 *                  the proposition is only in a commit message.
 *
 * ── Why it measures the shut room, not the open one ──────────────────────
 *
 * The three assertions above are about what is on the screen BEFORE anybody
 * presses anything. So this deliberately does not call `unfold()` first —
 * a probe that opens everything and then checks the price is visible is a
 * probe that cannot fail. It unfolds afterwards, for the fourth assertion.
 *
 * ── What it cannot prove without artists in the database ─────────────────
 *
 * There is no picture on the wall in an unattended run: the gallery is
 * empty until a real artist is approved and hangs something. So this does
 * not assert that a piece is buyable. It asserts the room's own rules,
 * which hold with nothing hanging, and says so rather than pretending to a
 * coverage it has not got.
 */
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { agreeAndSubmit, launchOptions, shot } from './where.mjs';
import { dismissDoor, toRoom, unfold } from './enter.mjs';

const PORT = 3323;
const HERE = `http://localhost:${PORT}`;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

let b = null;
let server = null;
try {
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch(`${HERE}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  b = await chromium.launch(launchOptions());
  /* A phone, not a desk. The first version of this room passed here at
     1280px and Carli opened it on a phone and said it looked like a
     website — which it did, and the probe had no way to notice because a
     two-column hero looks correct at desktop width. 390 × 844 is the
     screen she actually holds. */
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));
  /* ── The one refusal that is not a fault ─────────────────────────────

     An unattended run has no Supabase project behind it, so
     `/api/artmarket` answers 503 `no_accounts` — which is this app's
     documented "not configured" answer everywhere, and the correct one.
     Treating it as a failure would make this probe unrunnable in CI.

     It is narrowed to that one code rather than to that one route: a 503
     `not_read` from the same address means the gallery could not be read,
     and that IS a fault. Ignoring the route wholesale would have hidden
     it, which is the shape of mistake this whole file exists to catch. */
  const EXPECTED = /"error":"(no_accounts|not_set_up)"/;
  p.on('response', (r) => {
    if (r.status() < 400 || !r.url().startsWith(HERE)) return;
    const where = r.url().replace(HERE, '');
    void r
      .text()
      .then((body) => {
        if (r.status() === 503 && EXPECTED.test(body)) return;
        problems.push(`HTTP ${r.status()}: ${where}`);
      })
      .catch(() => problems.push(`HTTP ${r.status()}: ${where}`));
  });

  await p.goto(HERE, { waitUntil: 'networkidle' });

  const cta = p.locator('button, a').filter({ hasText: /start|free|begin/i }).first();
  await cta.waitFor({ state: 'visible', timeout: 40000 });
  await cta.click();
  await p.waitForTimeout(700);
  await p.locator('input[type="email"]').first().fill('toets@futurebox.test');
  const pw = p.locator('input[type="password"]').first();
  if (await pw.count()) await pw.fill('toets-wagwoord-1234');
  await agreeAndSubmit(p);
  /* Waited for rather than slept through: a fixed timeout on a slow run
     reads the sign-in form and reports every rule missing from a page that
     was never the room. */
  await p.locator('nav[aria-label]').first().waitFor({ state: 'visible', timeout: 40000 });
  await p.waitForTimeout(600);
  await dismissDoor(p);
  await p.waitForTimeout(900);

  await p.locator('header button').filter({ hasText: /Studio/i }).first().click();
  await p.waitForTimeout(1800);

  /* `toRoom` rather than a door-then-rail walk written here.

     The hand-written version worked at 1280px and timed out at 390px, for
     the reason this helper exists: on a phone there is no rail, the way in
     is the door card, and a probe that knows only one of the two paths
     finds the room on a desk and not in a hand. `enter.mjs` has carried
     both since the day sixty probes were triaged.

     `folded: true` — this probe measures the room as somebody walks into
     it, shut, before anything is pressed. Unfolding happens further down,
     after the three rules that are about the closed room. */
  await toRoom(p, 'Album art', { folded: true });
  await p.waitForTimeout(1200);

  const room = p.locator('[data-room="albumart"]');
  check('the gallery is a room you can walk into', (await room.count()) === 1,
    'no [data-room="albumart"] on the screen — the room is registered but not rendered');

  if ((await room.count()) === 1) {
    /* ── Measured shut, before a single press ───────────────────────── */
    const shut = await room.first().innerText();

    check('the sold-once rule is on the screen before anything is pressed',
      /sold once|one only|1 of 1|never appear|never again|een keer verkoop|nooit weer/i.test(shut),
      'the room stops promising the one thing it is built to promise');

    check('the starting price is on the screen before anything is pressed',
      /R\s?200/.test(shut),
      'R200 is behind a fold — a price somebody meets after they have decided');

    /* ── The panels, on the tab that has them ────────────────────────

       The room is three tabs now, and the panels live in the last one.
       This assertion used to run on arrival and pass because the works
       tab happens to have no folds — which is the vacuous shape this
       whole file exists to avoid, so it moved to the tab it is about.

       Getting there is also worth pressing: a tab that does not switch
       is a third of the room nobody can reach. */
    const mine = room.locator('[role="tab"]').last();
    await mine.click();
    await p.waitForTimeout(600);
    check('the last tab opens', (await mine.getAttribute('aria-selected')) === 'true',
      'pressing the tab did not select it');

    const open = await room.locator('button[aria-expanded="true"]').count();
    const folds = await room.locator('button[aria-expanded]').count();
    check('every panel behind it starts shut',
      folds > 0 && open === 0,
      folds === 0 ? 'there are no panels at all' : `${open} of ${folds} were already open`);

    /* ── The keyboard that must not be there ────────────────────────── */
    await unfold(p);
    await p.waitForTimeout(700);

    /* The artist's own desk has fields — a name, a price, an about — and is
       allowed them: it is a person describing themselves to us, not a
       message to a buyer. What may never exist is a field in the pop-out,
       which is the conversation. So the count is taken inside the pop-out
       rather than across the room. */
    const ask = room.locator('[data-ask]');
    if ((await ask.count()) === 0) {
      /* No approved artists in an unattended run, so no pop-out to open.
         Said out loud rather than passed silently: a probe that reports a
         rule it did not measure is worse than one that admits the gap. */
      console.log('  --   no artist is listed in this run, so the pop-out could not be opened');
    } else {
      await ask.first().click();
      await p.waitForTimeout(600);
      const sheet = p.locator('div.fixed.inset-0.z-50').last();
      const typing = await sheet.locator('input:not([type="file"]), textarea, [contenteditable]').count();
      check('there is no way to type a message to an artist',
        typing === 0,
        `${typing} place(s) to type in the pop-out — the deal can now be arranged off the platform`);
    }

    /* ── And a buyer cannot bring their own picture ──────────────────
       Measured on the whole room, with the artist's desk shut behind an
       application form: an ordinary member is not an approved artist, so
       there must be no file input anywhere they can reach. */
    const uploads = await room.locator('input[type="file"]').count();
    check('a buyer has nowhere to upload their own picture',
      uploads === 0,
      `${uploads} file input(s) reachable by somebody who is not one of our artists`);

    /* A JPEG, not a PNG. A full-page phone screenshot of this room is a
       1.3 MB PNG of flat paper and one photograph, which is too large to
       hand to anybody and says nothing a 200 KB JPEG does not. */
    await p.screenshot({ path: shot('artroom.jpg'), type: 'jpeg', quality: 72, fullPage: true });
  }
} catch (error) {
  problems.push(`threw: ${String(error).slice(0, 200)}`);
} finally {
  if (b) await b.close().catch(() => {});
  /* The whole group, not the shell: `next start` spawns a child, and killing
     the shell leaves the server holding the port. `check:probes` holds every
     probe to this — one leaked server is every later probe failing. */
  if (server?.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

if (problems.length) {
  console.log(`\ncheck:artroom — ${problems.length} wrong:`);
  for (const one of problems) console.log(`  - ${one}`);
  process.exit(1);
}
console.log('\ncheck:artroom — the gallery says what it promises before anything is pressed.');

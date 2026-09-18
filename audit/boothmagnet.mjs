/**
 * The magnet's switch, the interlock, and two lanes swapping places.
 *
 * Carli, 16 September 2026: *"Die timeline het 'n magnet nodig, en ook 'n
 * interlock funksie om twee tydlyne met mekaar vas te maak. Tracks moet ook
 * geswitch kan word, menend op en af beweeg en omgeruil word."*
 *
 * ── What this probe is for, and what it is deliberately not for ──────────
 *
 * The magnet's arithmetic is `check:magnet`'s job, and that check runs the
 * real `lib/magnet` rather than reading it: what a point does within reach,
 * what it does out of reach, and the case where Snap is off and the grid is
 * not a quieter answer but no answer. None of that needs a browser, and a
 * browser would test it worse — a synthetic drag of forty pixels lands on
 * whatever the canvas happens to be scaled to, so an assertion about exactly
 * where a clip came to rest would be measuring the probe's own arithmetic.
 *
 * What only a browser can settle is whether the three things can be REACHED
 * and whether they do anything:
 *
 *   · the magnet has a switch, it is on, it is 44 pixels, and it toggles;
 *   · a lane locked to another one really drags it along — the same number
 *     of pixels, which is the whole promise of a lock;
 *   · "Move down" really swaps two lanes in the stack.
 *
 * Read off the clips' own positions rather than off any state we can see, so
 * "both moved by the same amount" is a fact about the screen.
 */
import { execSync, spawn } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { launchOptions, shot } from './where.mjs';

const PORT = process.argv[2] || '3122';
const PROBE = 'app/proboothprobe/page.probe.tsx';
const LIVE = 'app/proboothprobe/page.tsx';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

let server = null;
try {
  cpSync(PROBE, LIVE);
  console.log('building with the probe page…');
  execSync('npx next build', { stdio: 'ignore' });
  server = spawn('npx', ['next', 'start', '-p', PORT], { detached: true, stdio: 'ignore' });
  for (let tries = 0; tries < 40; tries += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`http://localhost:${PORT}/proboothprobe`);
      if (r.ok) break;
    } catch { /* not up yet */ }
  }

  const b = await chromium.launch(launchOptions({ args: ['--autoplay-policy=no-user-gesture-required'] }));
  /* A phone, upright, with a coarse pointer — `globals.css` keeps the
     forty-four pixel minimums behind `@media (pointer: coarse)`, so a
     desk-sized window would measure a room nobody has. */
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  p.on('pageerror', (e) => problems.push(String(e).slice(0, 160)));
  await p.goto(`http://localhost:${PORT}/proboothprobe`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);

  /* ── The switch ─────────────────────────────────────────────────────── */
  const magnet = p.locator('[data-magnet]').first();
  check('the timeline has a magnet switch', (await magnet.count()) > 0);
  if (await magnet.count()) {
    const box = await magnet.boundingBox();
    check(
      'and it is big enough for a thumb',
      box !== null && box.width >= 44 && box.height >= 44,
      box ? `${Math.round(box.width)}x${Math.round(box.height)}` : 'no box',
    );
    check(
      'and it starts on',
      (await magnet.getAttribute('aria-pressed')) === 'true',
      'a magnet off by default is a magnet nobody finds',
    );
    await magnet.click();
    await p.waitForTimeout(200);
    check(
      'and it can be switched off',
      (await magnet.getAttribute('aria-pressed')) === 'false',
      'there has to be a way out for placing something just past what it sticks to',
    );
    await magnet.click();
    await p.waitForTimeout(200);
  }
  /* The marker is still in the corner beside it, and still pressable. Both
     switches went into one 96-pixel cell, so this is the assertion that the
     second one did not push the first out. */
  const marker = p.locator('[data-mark]').first();
  const markBox = (await marker.count()) ? await marker.boundingBox() : null;
  check(
    'the marker is still beside it and still 44 wide',
    markBox !== null && markBox.width >= 44 && markBox.height >= 44,
    markBox ? `${Math.round(markBox.width)}x${Math.round(markBox.height)}` : 'no marker',
  );

  /* ── Two lanes, made by cutting the one that is there ────────────────── */
  const af = /\/af(\/|$)/.test(p.url());
  const openDesk = async (en, afr) => {
    const icon = p.getByRole('button', { name: new RegExp(af ? afr : en) }).first();
    if ((await icon.getAttribute('aria-pressed')) === 'true') return;
    await icon.click();
    await p.waitForTimeout(300);
  };
  const shutDesk = async () => {
    const open = p.locator('[data-dock] button[aria-pressed="true"]').first();
    if ((await open.count()) === 0) return;
    await open.click();
    await p.waitForTimeout(300);
  };

  /* The line has to be inside the lane for a cut to mean anything, so put it
     there first, by the gesture a person uses: a press on the ruler. */
  const ruler = p.locator('[data-axis]').first();
  const rulerBox = await ruler.boundingBox();
  if (rulerBox) {
    await p.mouse.click(rulerBox.x + rulerBox.width * 0.25, rulerBox.y + rulerBox.height / 2);
    await p.waitForTimeout(250);
  }
  const name = p.locator('[data-lanename]').first();
  if ((await name.getAttribute('aria-pressed')) !== 'true') {
    await name.click();
    await p.waitForTimeout(250);
  }
  await openDesk('Track controls', 'Baankontroles');
  const cut = p.getByRole('button', { name: new RegExp(af ? 'Sny waar die lyn' : 'Cut where the line') }).first();
  check('the lane can be cut in two, which is how this probe gets a second lane',
    (await cut.count()) > 0);
  if (await cut.count()) {
    await cut.click();
    await p.waitForTimeout(400);
  }
  const lanes = await p.locator('[data-lanename]').count();
  check('there are two lanes now', lanes >= 2, `${lanes} lane(s)`);

  /* ── Where the clips sit, in SECONDS ──────────────────────────────────

     Pixels were the first attempt and they lie here, for a documented
     reason: the drawing surface is the song plus room at the end, rounded up
     to whole four-bar blocks, and it grows a block when a clip is dragged
     past the end (see `canvas` in ProBooth, and the note above it — a canvas
     that grew smoothly put every dragged clip straight back under the
     thumb). So a drag to the right can rescale the axis between the two
     measurements, and two clips that moved by exactly the same number of
     seconds come out having moved 55 and 30 pixels. That is the axis
     rescaling, not the lock failing.

     A clip's `left` is a percentage of the canvas, and the canvas is on the
     screen in the readout — `0:04 / 0:16`. Percentage times length is
     seconds, which is what the lock actually promises and what survives a
     rescale. */
  const canvasSeconds = async () => {
    const readout = p.getByText(/^\/\s*\d+:\d\d$/).first();
    if ((await readout.count()) === 0) return null;
    const said = (await readout.textContent()) ?? '';
    const bits = said.replace('/', '').trim().split(':');
    return bits.length === 2 ? Number(bits[0]) * 60 + Number(bits[1]) : null;
  };

  const clipsAt = async () => {
    const long = await canvasSeconds();
    if (!long) return [];
    const clips = p.locator('[aria-label*="Drag this sound"], [aria-label*="Sleep hierdie klank"]');
    const many = await clips.count();
    const out = [];
    for (let i = 0; i < many; i += 1) {
      const part = await clips.nth(i).evaluate((el) => parseFloat(el.style.left));
      out.push(Number.isFinite(part) ? (part / 100) * long : null);
    }
    return out;
  };
  const say = (list) => list.map((one) => (one === null ? '?' : `${one.toFixed(2)}s`)).join(', ');

  /* ── The interlock ──────────────────────────────────────────────────── */
  const lockRow = p.getByText(new RegExp(af ? '^Maak vas aan$' : '^Lock to$')).first();
  check('the lane card offers to lock this lane to another', (await lockRow.count()) > 0);

  /* The chips sit in the row that label heads, and they are taken from the
     row rather than found by their text: both halves of a cut lane carry the
     same name, which is the right behaviour and makes a name a bad handle. */
  const chips = (await lockRow.count())
    ? await lockRow.evaluateHandle((el) => el.parentElement)
    : null;
  let locked = false;
  if (chips) {
    const row = await chips.asElement();
    const buttons = await row.$$('button');
    if (buttons.length) {
      await buttons[0].click();
      await p.waitForTimeout(400);
      locked = (await buttons[0].getAttribute('aria-pressed')) === 'true';
    }
  }
  check('pressing another lane locks the two together', locked, 'the chip did not come back pressed');

  await shutDesk();
  await p.waitForTimeout(300);

  const before = await clipsAt();
  check('both clips are on the timeline to be dragged', before.length >= 2 && before.every((one) => one !== null),
    say(before));

  if (before.length >= 2 && before.every((one) => one !== null)) {
    const clips = p.locator('[aria-label*="Drag this sound"], [aria-label*="Sleep hierdie klank"]');
    const first = await clips.nth(0).boundingBox();
    /* Grabbed in the middle of the clip and dragged RIGHT.
       Left was the first attempt and it measured nothing: the first half of
       a cut lane starts at the very beginning of the song, and `percent`
       clamps a negative start to 0% — so the clip really did move and the
       screen really did not, which is correct behaviour and a useless thing
       to assert against. The canvas has room past the end of the song for
       exactly this, so right is where a clip can go and be seen going. */
    await p.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await p.mouse.down();
    await p.mouse.move(first.x + first.width / 2 + 60, first.y + first.height / 2, { steps: 12 });
    await p.mouse.up();
    await p.waitForTimeout(400);

    const after = await clipsAt();
    const moved = after.map((one, i) => (one === null ? null : one - before[i]));
    check(
      'dragging one clip moved it',
      moved[0] !== null && Math.abs(moved[0]) > 0.2,
      `moved ${moved[0]?.toFixed(2)}s`,
    );
    check(
      'and the lane locked to it came with, by the same number of seconds',
      moved.length >= 2 && moved[1] !== null && Math.abs(moved[1] - moved[0]) < 0.05,
      `first ${moved[0]?.toFixed(2)}s, second ${moved[1]?.toFixed(2)}s`,
    );
  }

  /* ── Moving a lane, and the one case that used to tear the lock ──────

     This section used to lock the two lanes together and then press "Move
     down", and it passed — because moving was a SWAP, and a swap happily
     exchanges two lanes that are locked to each other and leaves the group
     in pieces. The probe was holding the fault in place.

     On 18 September the move started going through `app/lib/laneorder.ts`,
     where a locked group is the unit. With these two lanes locked and
     nothing else in the stack, there is nowhere for the group to go, so the
     arrow is correctly OFF — and the old press timed out against a disabled
     button, which is how this was found.

     So both halves are asserted now, in order. The refusal first, because
     it is the new rule and the one a future swap would break; then the lock
     comes off and the move is proved to work. */
  await openDesk('Track controls', 'Baankontroles');
  const down = p.getByRole('button', { name: new RegExp(af ? 'Skuif af' : 'Move down') }).first();
  check('a lane can be moved down the stack', (await down.count()) > 0);

  check(
    '  and while these two are locked to each other, with nothing else in the stack,'
    + ' the arrow is off rather than tearing the group',
    (await down.count()) > 0 && (await down.isDisabled()),
    'a swap would have exchanged them and left the lock holding one lane each',
  );

  /* Off with the lock, so the move itself can be proved. The same chip that
     made the group breaks it — pressing a locked lane again lets it out.

     Found again rather than reused: the desk has been shut and reopened
     since `chips` was taken, so React has rebuilt that row and the old
     handle points at an element no longer in the document. It fails with
     "Element is not attached to the DOM", which reads like the chip is
     gone and means only that this one is stale. */
  const lockAgain = p.getByText(new RegExp(af ? '^Maak vas aan$' : '^Lock to$')).first();
  if (await lockAgain.count()) {
    const row = await lockAgain.evaluateHandle((el) => el.parentElement);
    const again = await row.asElement();
    const chipsNow = await again.$$('button');
    if (chipsNow.length) {
      await chipsNow[0].click();
      await p.waitForTimeout(500);
    }
  }
  check(
    '  and with the lock off, the arrow comes back on',
    (await down.count()) > 0 && !(await down.isDisabled()),
  );

  if ((await down.count()) && !(await down.isDisabled())) {
    await shutDesk();
    const wasOrder = await clipsAt();
    await openDesk('Track controls', 'Baankontroles');
    await down.click();
    await p.waitForTimeout(400);
    await shutDesk();
    const nowOrder = await clipsAt();
    /* Nothing moves in time here — the rows change places, so the same two
       start times come back in the other order. */
    check(
      'and pressing it swaps the two lanes round',
      wasOrder.length >= 2 &&
        nowOrder.length >= 2 &&
        Math.abs(nowOrder[0] - wasOrder[1]) < 0.05 &&
        Math.abs(nowOrder[1] - wasOrder[0]) < 0.05,
      `was ${say(wasOrder)} — now ${say(nowOrder)}`,
    );
  }

  /* ── Along the song, which did not exist at all ──────────────────────

     Carli, 18 September 2026: *"Die probooth se sideways scroll werk nie."*

     It did not work because there was nothing to work: the whole session was
     squeezed into whatever width the screen had, so on a 390-pixel phone a
     three-minute song put a BAR at about a pixel and a half and there was
     never anything to scroll to. The zoom is the missing half of every
     gesture in this room.

     Three things, because two of them would pass on their own: the buttons
     exist, pressing + really does make the axis wider than its box, and the
     names on the left stay where they are while the song slides past. That
     last one is what a horizontal scroller usually breaks. */
  /* ── The ruler and the grid run the whole length of the song ────────

     Carli, 18 September 2026, a photograph of the Pro Booth on her phone:
     *"Die grid op die foon app gaan nie lank genoeg aan nie. Die tyd en
     grid raak weg."*

     `BoothTimeline` exists to make this impossible — its own note says a
     ruler above the lanes *"becomes a fourth opinion about where a second
     is"*, and that the answer is one CSS grid with the ruler and every
     lane in the same column. A claim that strong is worth measuring, and
     nothing had. So: the two cells are the same width, the last bar line
     reaches the far end, and the marks go the whole way. */
  {
    const axisBox = await p.locator('[data-axis]').first().boundingBox();
    const rowBox = await p.locator('[data-lanerow]').first().boundingBox();
    check('the ruler and a lane are the same width',
      axisBox !== null && rowBox !== null && Math.abs(axisBox.width - rowBox.width) <= 1,
      `ruler ${Math.round(axisBox?.width ?? -1)}, lane ${Math.round(rowBox?.width ?? -1)}`);
    check('  and they start at the same place',
      axisBox !== null && rowBox !== null && Math.abs(axisBox.x - rowBox.x) <= 1,
      `ruler at ${Math.round(axisBox?.x ?? -1)}, lane at ${Math.round(rowBox?.x ?? -1)}`);

    const lines = await p.locator('[data-lanerow="0"] [data-barline]').evaluateAll((all) =>
      all.map((one) => Number.parseFloat(one.style.left)));
    const marks = await p.locator('[data-axis] span[class*="top-1"]').allInnerTexts().catch(() => []);
    const furthest = lines.length ? Math.max(...lines) : -1;
    check('the bar grid reaches the end of the song',
      lines.length > 1 && furthest > 90,
      `${lines.length} lines, the last at ${furthest.toFixed(1)}% of the way along`);
    check('  and the clock goes with it',
      marks.length > 1,
      `${marks.length} time labels: ${marks.join(' ')}`);
  }

  const zoomIn = p.locator('[data-zoom="in"]').first();
  check('the timeline has a way to go closer in', (await zoomIn.count()) === 1);
  if (await zoomIn.count()) {
    const axisBefore = await p.locator('[data-axis]').first().evaluate((one) => one.clientWidth);
    const scrollBefore = await p.evaluate(() => {
      const box = document.querySelector('[data-timeline] .overflow-x-auto');
      return box ? box.scrollWidth - box.clientWidth : -1;
    });
    check('and at the first view nothing hangs off the side', scrollBefore <= 1,
      `${scrollBefore}px of overflow before pressing +`);

    await zoomIn.click();
    await p.waitForTimeout(500);
    const axisAfter = await p.locator('[data-axis]').first().evaluate((one) => one.clientWidth);
    check('pressing + makes the song wider than the screen',
      axisAfter > axisBefore * 1.5, `${axisBefore}px → ${axisAfter}px`);

    /* And it really scrolls, which a width alone does not prove: a box that
       is `overflow-hidden` is also wider than its content and shows none of
       it. */
    const moved = await p.evaluate(() => {
      const box = document.querySelector('[data-timeline] .overflow-x-auto');
      if (!box) return null;
      const was = box.scrollLeft;
      box.scrollLeft = was + 80;
      return { was, now: box.scrollLeft };
    });
    check('and the timeline slides sideways', moved !== null && moved.now > moved.was,
      moved ? `${moved.was} → ${moved.now}` : 'no scroller found');

    /* The names stay. Measured against the scroller's own left edge rather
       than the page's, so a room that happens to sit at x=0 cannot pass this
       by accident. */
    const stuck = await p.evaluate(() => {
      const box = document.querySelector('[data-timeline] .overflow-x-auto');
      const name = document.querySelector('[data-lanename]');
      if (!box || !name) return null;
      return Math.round(name.getBoundingClientRect().left - box.getBoundingClientRect().left);
    });
    check('and the lane names stay put while it does', stuck !== null && stuck >= -1 && stuck <= 8,
      stuck === null ? 'not found' : `${stuck}px from the left edge, scrolled`);

    /* ── Zoomed in and pushed to the far end ─────────────────────────
 
       Carli's photograph is of a timeline whose grid and clock stop
       partway along while the sound carries on. The assertions above
       measure the whole axis, which is the right question and only the
       first half of it: the part she is LOOKING at is a window onto that
       axis, and a window near the end is the one state nothing had ever
       opened. So: all the way right, and then count what is actually
       inside the window. */
    await p.evaluate(() => {
      const box = document.querySelector('[data-timeline] .overflow-x-auto');
      if (box) box.scrollLeft = box.scrollWidth;
    });
    await p.waitForTimeout(400);
    const inView = await p.evaluate(() => {
      const box = document.querySelector('[data-timeline] .overflow-x-auto');
      if (!box) return null;
      const frame = box.getBoundingClientRect();
      /* The gutter is sticky and sits over the left of the window, so the
         part of the window the song is actually drawn in starts after it. */
      const name = document.querySelector('[data-lanename]');
      const from = name ? name.getBoundingClientRect().right : frame.left;
      const seen = (list) => Array.from(list).filter((one) => {
        const at = one.getBoundingClientRect();
        return at.right > from && at.left < frame.right;
      }).length;
      return {
        bars: seen(document.querySelectorAll('[data-lanerow="0"] [data-barline]')),
        clock: seen(document.querySelectorAll('[data-axis] span[class*="top-1"]')),
        wide: Math.round(frame.right - from),
      };
    });
    check('the grid is still there at the far end of the song',
      inView !== null && inView.bars > 0,
      inView ? `${inView.bars} bar lines in the ${inView.wide}px of window` : 'no scroller');
    check('  and so is the clock',
      inView !== null && inView.clock > 0,
      inView ? `${inView.clock} time labels in the ${inView.wide}px of window` : 'no scroller');
  }

  await p.screenshot({ path: shot('boothmagnet.png') });
  await b.close();
} finally {
  if (server?.pid) { try { process.kill(-server.pid); } catch { /* already gone */ } }
  rmSync(LIVE, { force: true });
  console.log('putting the ordinary build back…');
  try { execSync('npx next build', { stdio: 'ignore' }); } catch { console.error('run `npx next build`'); }
}

if (problems.length) {
  console.error(`\ncheck:boothmagnet — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:boothmagnet — the switch is there, the lock holds, and two lanes swap places.');

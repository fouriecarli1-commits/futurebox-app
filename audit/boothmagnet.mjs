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
  /* The axis's exact length, off the timeline itself.
 
     This used to read the transport — "/ 0:16" — and turn that into
     seconds. The transport prints whole seconds, which is right for a
     person and wrong for a ruler: the error grows with how far along a
     clip sits, so two lanes that moved by exactly the same amount came
     back a tenth of a second apart and the interlock read as almost
     holding. `data-total` is the unrounded number the room itself is
     drawing against. */
  const canvasSeconds = async () => {
    const root = p.locator('[data-timeline]').first();
    if ((await root.count()) === 0) return null;
    const said = await root.getAttribute('data-total');
    const long = Number(said);
    return Number.isFinite(long) && long > 0 ? long : null;
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

    /* ── A finger first, because that is what she is holding ──────────
 
       Every drag probe in this repo uses `p.mouse`, and every person in
       this room is on a phone. Carli, 19 September 2026: *"Die
       interlocking werk nie. Dit wys die funksie is aan maar die bane is
       nie vas aan mekaar nie."* The mouse drag below was already here and
       already passing while she was reporting that.
 
       Dispatched through CDP rather than built in the page: a
       `PointerEvent` made by hand carries a `pointerId` the browser never
       issued, and `setPointerCapture` throws on it — so a hand-rolled
       touch drag dies inside `grab()` before the room sees it and reports
       the app broken for a reason belonging to the probe. */
    const cdp = await p.context().newCDPSession(p);
    const fingerDrag = async (box, by) => {
      const y = box.y + box.height / 2;
      const from = box.x + box.width / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
      for (let step = 1; step <= 10; step += 1) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: from + (by * step) / 10, y }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };

    /* ── The clip goes where the finger went, in pixels ───────────────
 
       Carli, 19 September 2026, on a session that had been twenty-six
       seconds long the night before: *"Die grid het eweskielik groter
       geword, en toe sit gebeur toe wil niks meer beweeg nie."* The
       transport read 11:52, the clips were slivers eleven minutes apart,
       and the interlock — which was working — could move nothing, because
       the group's wall is half a second from the end of the song.
 
       One drag did that. `total` is the session's own length, `secondsAt`
       turns a pixel into a second by multiplying by `total`, and dragging
       right makes the session longer — so the same pixel became worth more
       seconds, which moved the clip further right, which made the session
       longer again. A sixty-pixel gesture walked a clip out to eleven
       minutes and forty seconds.
 
       Measured in PIXELS on purpose, and this is the whole point: in
       seconds a runaway looks like a big number and a big number can
       always be argued about. In pixels there is one right answer — the
       clip ends where the finger let go — and it is the same answer at
       every zoom and every session length. */
    const grip = await clips.nth(0).boundingBox();
    const longBefore = await canvasSeconds();
    /* Far enough to push the session past the room it already had, which
       is where the loop bites: while the last sound still ends inside the
       canvas, growing `span` changes nothing and a short drag looks fine.
       A short one was tried first and reported no fault. */
    const REACHED = 200;
    await fingerDrag(grip, REACHED);
    await p.waitForTimeout(500);
    const landed = await clips.nth(0).boundingBox();
    const longAfter = await canvasSeconds();
    /* Never FURTHER than the finger went, and that asymmetry is the
       point. Coming up short is a wall — the group's trailing lane is
       half a second from the end of the song and the room is right to
       stop it. Going past is the runaway, and nothing else does it. */
    const travelled = landed === null ? 0 : landed.x - grip.x;
    check(
      'a clip never travels further than the finger did',
      landed !== null && travelled <= REACHED + 14 && travelled > 20,
      `finger ${REACHED}px, clip ${Math.round(travelled)}px`,
    );
    check(
      '  and one drag does not run the session away with it',
      longBefore !== null && longAfter !== null && longAfter - longBefore < 30,
      `${longBefore}s → ${longAfter}s`,
    );
    const afterTouch = await clipsAt();
    const byFinger = afterTouch.map((one, i) =>
      one === null || before[i] === null ? null : one - before[i]);
    check(
      'a finger moves the clip, not only a mouse',
      byFinger[0] !== null && Math.abs(byFinger[0]) > 0.2,
      `${say(before)} -> ${say(afterTouch)}`,
    );
    check(
      '  and the lock holds under a thumb',
      byFinger.length >= 2 && byFinger[1] !== null && Math.abs(byFinger[1] - byFinger[0]) < 0.05,
      `first ${byFinger[0]?.toFixed(2)}s, second ${byFinger[1]?.toFixed(2)}s`,
    );

    /* Picking a clip up opens its lane's desk, and the desk is drawn over
       the timeline. So the desk goes away before the next drag — otherwise
       the press lands on the panel and the probe reports a clip that will
       not move when what really happened is that nothing touched it. */
    await shutDesk();
    await p.waitForTimeout(300);

    const first = await clips.nth(0).boundingBox();
    /* Grabbed in the middle of the clip and dragged RIGHT.
       Left was the first attempt and it measured nothing: the first half of
       a cut lane starts at the very beginning of the song, and `percent`
       clamps a negative start to 0% — so the clip really did move and the
       screen really did not, which is correct behaviour and a useless thing
       to assert against. The canvas has room past the end of the song for
       exactly this, so right is where a clip can go and be seen going. */
    /* LEFT this time, and that is not a detail.
 
       The finger drag above has already taken the group as far right as it
       goes: the wall is worked out for the whole group, and the lane at the
       back is half a second from the end of the song. A second drag to the
       right is correctly refused — which the first version of this read as
       "the clip will not move" and reported as a fault in the room. It was
       the room holding the lock together at the end of the song, which is
       the thing it is for. */
    /* ── What is under the middle of a clip ──────────────────────────
 
       This is the assertion that found it, and it is worth more than the
       drag below: a drag that does nothing has a dozen possible reasons
       and this has one. The two trim handles were a flat 24 pixels each at
       the ends of a clip drawn at least 44 wide — so on a phone, measured
       here at 49 pixels, they covered 48 of it and the thing under the
       middle of the clip was "Where this lane ends".
 
       Every touch was a trim. Nothing moved, the lock could not be seen to
       hold, and Carli reported the interlock as broken. It was not: the
       clip could not be picked up. */
    const middles = await p.evaluate(() => {
      const clips = Array.from(document.querySelectorAll(
        '[aria-label*="Drag this sound"], [aria-label*="Sleep hierdie klank"]'));
      return clips.map((one) => {
        const box = one.getBoundingClientRect();
        const at = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        const ends = Array.from(one.querySelectorAll('[role="slider"]'))
          .map((edge) => edge.getBoundingClientRect().width);
        return {
          wide: Math.round(box.width),
          ends: ends.map((w) => Math.round(w)),
          mine: Boolean(at && (at === one || one.contains(at))),
          got: at ? (at.getAttribute('aria-label') ?? at.tagName) : 'nothing',
        };
      });
    });
    /* The rule, stated as a ratio so it can be broken at any width rather
       than only at the one this run happens to produce. Two ends at a flat
       24 on a 73-pixel clip already fails here; the same two on a 49-pixel
       clip leave nothing at all, which is what was measured on the phone. */
    check(
      'neither end of a clip takes more than a quarter of it',
      middles.length > 0 && middles.every((one) => one.ends.every((w) => w <= one.wide / 4 + 1)),
      middles.map((one) => `${one.wide}px clip, ends ${one.ends.join('+')}`).join(', '),
    );
    check(
      '  so the middle of every clip belongs to the clip, not to a trim handle',
      middles.length > 0 && middles.every((one) => one.mine),
      middles.map((one) => `${one.wide}px → ${one.got}`).join(', '),
    );

    /* Right again, and that is not laziness. Left was tried and it
       measures nothing: `percent` clamps a start before zero to 0%, so a
       clip dragged past the beginning really does move and the number this
       probe reads really does not — which came back as the lock holding to
       within a second and was neither. The comment on the first drag has
       said so since the day it was written; this is the second time it had
       to be learned. */
    await fingerDrag(first, 60);
    await p.waitForTimeout(400);

    const after = await clipsAt();
    const moved = after.map((one, i) =>
      one === null || afterTouch[i] === null ? null : one - afterTouch[i]);
    check(
      'a second drag moves it too — the first one was never the problem',
      moved[0] !== null && Math.abs(moved[0]) > 0.2,
      `moved ${moved[0]?.toFixed(2)}s`,
    );
    check(
      '  and the lock holds on the second drag as well',
      moved.length >= 2 && moved[1] !== null && Math.abs(moved[1] - moved[0]) < 0.05,
      `first ${moved[0]?.toFixed(2)}s, second ${moved[1]?.toFixed(2)}s`,
    );

    /* ── LEFT, into the beginning of the song ────────────────────────

       Carli, 19 September 2026: *"met 'n instrument waarmee ek dit
       geinterlock het, het die 2de baan nogsteeds kleinbietjie sonder die
       ander bar beweeg al was dit geinterlock. Dit is dus nie 100% vas
       nie."*

       This probe has refused to drag left twice, and left a comment each
       time saying why: `percent` clamps a start before zero to 0%, so the
       clip moves and the number does not. The second comment calls that
       *"correct behaviour and a useless thing to assert against"*.

       It is not correct behaviour. It is the bug she is holding. When the
       group is dragged left, the leading lane's start goes negative, the
       screen pins it at 0% — and its partner, still positive, carries on.
       Two bars that are locked together come apart in front of her, by a
       little, exactly as described. The data was right the whole time and
       nobody can see the data.

       So: measured in PIXELS, because the question is "did these two bars
       stay together on the screen" and a screen is made of pixels. The gap
       between the two clips is the whole assertion — it is the one number
       a lock promises not to change, it needs no reference to the scale,
       and it survives both the clamp and any rescaling. */
    await shutDesk();
    await p.waitForTimeout(300);

    /* Both numbers, because they can disagree and only one of them is what
       she is looking at. `data-at` is where the clip really is; `style.left`
       against `data-total` is where it is DRAWN. */
    const readBoth = async () => p.evaluate(() => {
      const total = Number(document.querySelector('[data-total]')?.getAttribute('data-total') ?? 0);
      return Array.from(document.querySelectorAll('[data-at]')).map((el) => ({
        truly: Number(el.getAttribute('data-at')),
        drawn: (parseFloat(el.style.left) / 100) * total,
      }));
    });

    const was = await readBoth();
    const hold = await clips.nth(0).boundingBox();
    /* Far enough that the leading lane is asked for a negative start. A
       short drag stays inside the song and proves nothing, which is how
       this survived two probes. */
    await fingerDrag(hold, -260);
    await p.waitForTimeout(500);
    const now = await readBoth();

    /* ── In seconds, off the state — the lock itself ─────────────────

       NOT in pixels. The first version of this assertion measured the gap
       between the two clips in pixels and passed: the drag shortened the
       session, the axis rescaled, and four seconds at the old scale came
       out the same width as two seconds at the new one. §V again, in the
       one place §V was written about. */
    const gapWas = was.length >= 2 ? was[1].truly - was[0].truly : null;
    const gapNow = now.length >= 2 ? now[1].truly - now[0].truly : null;
    check(
      'dragged into the start of the song, the lock holds',
      gapWas !== null && gapNow !== null && Math.abs(gapNow - gapWas) < 0.02,
      `${gapWas?.toFixed(2)}s apart, then ${gapNow?.toFixed(2)}s apart`,
    );

    /* ── And the picture says the same thing ─────────────────────────

       Carli, 19 September 2026: *"met 'n instrument waarmee ek dit
       geinterlock het, het die 2de baan nogsteeds kleinbietjie sonder die
       ander bar beweeg al was dit geinterlock. Dit is dus nie 100% vas
       nie."*

       She is right and the lock was never the thing that was wrong.
       `percent` clamps a start before zero to 0%, and the group's left wall
       let a clip go to half a second from its own end — so the leading lane
       was drawn pinned at the beginning while its partner, still positive,
       kept sliding. Four seconds apart in the state, two seconds apart on
       the screen. That is a lock coming apart in front of somebody, and no
       amount of correctness in the numbers answers it.

       This probe wrote the clamp off twice, in two comments, as "correct
       behaviour and a useless thing to assert against". Where a picture and
       the state can disagree, the disagreement IS the assertion. */
    const lying = now.filter((one) => Math.abs(one.drawn - one.truly) > 0.05);
    check(
      '  and every clip is drawn where it actually is',
      lying.length === 0,
      lying.map((one) => `really at ${one.truly.toFixed(2)}s, drawn at ${one.drawn.toFixed(2)}s`).join('; '),
    );
    check(
      '  because nothing is allowed to start before the song does',
      now.every((one) => one.truly >= -0.01),
      now.map((one) => `${one.truly.toFixed(2)}s`).join(', '),
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
    /* ── Counted, not merely present ─────────────────────────────────

       These two asserted `> 0` and passed for days while Carli kept
       reporting *"die tyd en grid raak weg"*. One bar line and one label
       in a 390-pixel window IS the fault, and `> 0` cannot see it.

       Measured on this exact page, before the fix:

           zoom 1   axis  294 px ·  3 labels ·  9 bar lines
           zoom 8   axis 2352 px ·  4 labels ·  9 bar lines

       Eight times the width bought one more label and not one more bar,
       because both were chosen from the session's LENGTH — which a zoom
       does not change. A label every 588 pixels on a 390-pixel screen is
       a whole screenful of empty ruler.

       So the numbers are the assertion. Three bar lines and two labels in
       a window is the floor at which a grid is still a grid; the real
       rule is a label about every 90 pixels and a bar no further apart
       than 140, and this is that rule stated as what an eye would see. */
    check('the grid is still a grid at the far end of the song',
      inView !== null && inView.bars >= 3,
      inView ? `${inView.bars} bar lines in the ${inView.wide}px of window` : 'no scroller');
    check('  and the clock still reads as a clock',
      inView !== null && inView.clock >= 2,
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

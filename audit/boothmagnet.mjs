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

  /* ── Swapping two lanes ─────────────────────────────────────────────── */
  await openDesk('Track controls', 'Baankontroles');
  const down = p.getByRole('button', { name: new RegExp(af ? 'Skuif af' : 'Move down') }).first();
  check('a lane can be moved down the stack', (await down.count()) > 0);
  if (await down.count()) {
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

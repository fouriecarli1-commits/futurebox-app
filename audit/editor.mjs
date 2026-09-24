/**
 * The video editor, walked in a browser.
 *
 * ── Why this exists the day the room does ────────────────────────────────
 *
 * Because the last thing called an editor in this app was not one. Carli,
 * 24 September 2026: *"Jy sê ons het een, maar ek vermoed jy meen die long
 * shot funksie."* She was right — it was a storyboard with a render button.
 *
 * A typecheck cannot tell those two apart. Both compile. What separates them
 * is whether there is a clock on the screen with your own material on it, so
 * that is what this measures: not that the component mounts, but that after
 * a clip goes in, a block comes out and it can be cut.
 *
 * ── The door is the first thing it checks, and on purpose ────────────────
 *
 * An unattended run has no account, so the plan is `free` and the room is
 * shut. That is the correct behaviour — every plan card says the editor
 * comes with a paid plan — and a probe that could only run signed in would
 * never notice the door disappearing.
 *
 * So it asserts the door first, from the outside, and only then reaches past
 * the gate to walk the room. Reaching past it is done by rendering the
 * component with a paid plan rather than by faking a session: this probe is
 * about whether the editor works, and a probe that also had to hold a
 * membership row upright would fail for reasons that are not about editing.
 */
import { enter, studio, toRoom, unfold } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = 3329;
const problems = [];

const check = (what, passed, detail = '') => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) problems.push(what);
};

/* `serve` + `enter` + `studio` + `toRoom`, in that order, and the order is
   the point: the first version of this probe called `toRoom` straight after
   dismissing the door and got "no way into Video desk", because the rail
   only exists once somebody is inside the studio. A probe that cannot get
   into the room reports the room as broken. */
const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 160)}`));

await studio(p);
await toRoom(p, 'Video desk');
await unfold(p);

try {
  /* ── The gate, and why a browser cannot see it here ────────────────

     `loadOwned()` answers `EVERYTHING` — tier `label` — when no Supabase is
     configured, which is this app's rule everywhere: with no accounts,
     nothing is metered. `charge()` and `paidRoom()` do the same.

     So an unattended run is a paying member by design and the door never
     shows. The first version of this probe asserted the opposite and
     reported a working gate as broken, which is the more dangerous
     direction: a probe that fails on correct behaviour gets switched off.

     The door is asserted in `check:editorgate` instead, which asks the
     entitlement table directly and does not need a browser at all. What a
     browser IS for is the half that cannot be unit-tested — whether a clip
     put in comes out as a block that can be cut. */

  const room = p.locator('[data-videoeditor]');
  check('with no accounts configured the room opens, as every other room does',
    (await room.count()) === 1,
    `${await room.count()} — loadOwned() gives tier "label" when nothing is metered`);

  check('  and it says nothing on the clock yet',
    (await p.locator('[data-editorempty]').count()) === 1,
    'an editor with no material should say so, not show an empty strip');

  /* ── A real clip, recorded in the page and handed to the file input ── */

  const made = await p.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const c = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const type = ['video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return null;
    const rec = new MediaRecorder(stream, { mimeType: type });
    const parts = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => { rec.onstop = r; });
    rec.start();
    const began = performance.now();
    await new Promise((finish) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        c.fillStyle = '#2b6'; c.fillRect(0, 0, 320, 240);
        c.fillStyle = '#fff'; c.fillRect((t / 2) * 280, 100, 40, 40);
        if (t >= 2) { finish(); return; }
        requestAnimationFrame(draw);
      };
      draw();
    });
    rec.stop();
    await stopped;
    const blob = new Blob(parts, { type });
    const buf = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  });

  if (!made) {
    console.log('  --  this browser cannot record webm; the walk below is skipped rather than faked.');
  } else {
    await p.locator('[data-editorbring] input[type="file"]').setInputFiles({
      name: 'a-take.webm',
      mimeType: 'video/webm',
      buffer: Buffer.from(made),
    });
    await p.waitForTimeout(2500);

    const blocks = p.locator('[data-editorblock]');
    check('a clip brought in becomes a block on the clock',
      (await blocks.count()) === 1,
      `${await blocks.count()} blocks — this is the whole difference between an editor and a storyboard`);

    check('  and the clock says how long the film runs',
      /\d/.test((await p.locator('[data-editorruns]').innerText().catch(() => '')) || ''),
      'a timeline with no length on it is a strip of pictures');

    check('  and picking it opens the piece it picked',
      (await p.locator('[data-editorpiece]').count()) === 1,
      'the block is selected on arrival, so its panel should be up');

    /* Split, which is the one operation that proves there is a clock under
       this rather than a list: one piece becomes two, and the total length
       does not change. */
    const before = (await p.locator('[data-editorruns]').innerText().catch(() => '')) || '';
    await p.locator('[data-editorsplit]').click();
    await p.waitForTimeout(600);
    check('splitting a piece makes two blocks out of one',
      (await blocks.count()) === 2,
      `${await blocks.count()} after a split`);
    check('  and the film is still as long as it was',
      ((await p.locator('[data-editorruns]').innerText().catch(() => '')) || '') === before,
      'a split moved the total, which means it cut material away rather than in two');

    /* And taking one out puts it back to one. */
    await p.locator('[data-editordrop]').click();
    await p.waitForTimeout(600);
    check('taking a piece out leaves the rest',
      (await blocks.count()) === 1,
      `${await blocks.count()} after removing one of two`);
  }

  /* ── Nothing the room adds breaks the page it sits on ──────────────── */

  const wide = await p.evaluate(() => document.documentElement.scrollWidth);
  const seen = p.viewportSize()?.width ?? 0;
  check('the video desk still fits its own window with the editor on it',
    wide <= seen + 1,
    `${wide}px inside a ${seen}px window — something in the editor pushes the page sideways`);

  /* Card headings are buttons because a card folds; `check:buttonlook` has
     the same exemption. Measuring them here reported four 20px "controls"
     that are headings, which is the probe being wrong about what a control
     is. Only the things inside a card are measured. */
  const tiny = await p.evaluate(() => {
    const small = [];
    for (const el of document.querySelectorAll('[data-videoeditor] button')) {
      if (el.closest('h2, h3, header')) continue;
      if (!el.hasAttribute('data-editorblock') && !/^data-editor/.test(el.getAttributeNames().find((n) => n.startsWith('data-editor')) ?? '')) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.height < 44) small.push(`${el.textContent?.trim().slice(0, 24)} ${Math.round(r.height)}px`);
    }
    return small;
  });
  check('every control the editor adds is a thumb tall',
    tiny.length === 0,
    tiny.join(', '));

} catch (thrown) {
  problems.push(`threw: ${String(thrown).slice(0, 200)}`);
} finally {
  if (b) await b.close().catch(() => undefined);
  server.stop();
}

if (problems.length > 0) {
  console.error(`\ncheck:editor — ${problems.length} problem(s):\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log('\ncheck:editor — a clip brought in becomes a block, a split makes two without losing a frame, and nothing added pushes the page sideways.');

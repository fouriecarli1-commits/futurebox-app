/**
 * The bars inside a pop-out, measured.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Die pop out bars moet ook netjies gespasieer
 * wees, bars binne pop outs moet ewe groot en lank wees, en alles moet baie
 * eenvoudig en maklik wees. Dieselfde met video editor, asook probooth."*
 *
 * ── Why this is a browser check and not a rule about class names ─────────
 *
 * A rule could say every button carries the same class. It would pass while
 * the room looked exactly as wrong as it did when she wrote that, because
 * the fault is not which classes are written — it is the SIZES that come out
 * of them. The picture bench held controls 34, 36 and 44 pixels tall and 48,
 * 106, 145 and 164 wide: six controls, six sizes, every one of them
 * reasonable on its own.
 *
 * So this opens every bench and measures what is actually drawn.
 *
 * ── Two measurements, because "ewe groot en lank" is two things ──────────
 *
 *   **groot**  every control in a bench is the same height
 *   **lank**   controls that share a row are the same width
 *
 * The second is the one that reads as untidy from across a room. A wrapping
 * flex row sizes each button to its own text, so four buttons are four
 * widths and the right-hand edge is ragged. A grid gives every one the same
 * column whatever it says.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve } from './where.mjs';

const PORT = process.argv[2] || '3098';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** The rooms with a bar, the benches on it, and what names the tabs.
 *
 * Three rooms, two components. The Photo Editor and the Video Editor are both
 * `CutDock`, so they share `data-cutbench`; the ProBooth is `BoothDock` and has
 * its own `data-boothdesk`, because its ids are about lanes and stems and its
 * palette is blue where theirs is green. Making one component serve all three
 * was considered and rejected in `CutDock.tsx`'s own note — but there is no
 * reason the MEASUREMENT should be made three times.
 */
const ROOMS = [
  {
    room: 'Photo Editor',
    tab: 'data-cutbench',
    row: 'data-cutbenchrow',
    benches: ['pic', 'frame', 'tone', 'read', 'text', 'save'],
  },
  {
    room: 'Video Editor',
    tab: 'data-cutbench',
    row: 'data-cutbenchrow',
    benches: ['clip', 'film', 'folder', 'looks', 'words', 'sound', 'mark'],
  },
  {
    room: 'ProBooth',
    tab: 'data-boothdesk',
    row: 'data-boothdeskrow',
    benches: ['tracks', 'mix', 'effects', 'stems', 'voice', 'ai'],
    /* The booth is a picker until a song is chosen, and the room the six
       desks belong to is one door further in than that: the tile on the rail
       opens `VocalBooth`, and "Lanes and mixing" is what opens `ProBooth`.
       The first run of this check went to the tile, found no bar, and
       reported the bar missing from a room it had never been in. */
    song: true,
    door: /Lanes and mixing|Bane en meng/i,
  },
];

/* ── The ProBooth needs a song before it has a bar ───────────────────────
 *
 * The other two rooms open on an empty canvas and draw their bar anyway. The
 * booth does not: until a song is chosen it is a picker, and the dock with the
 * six desks on it is not in the page at all. The first run of this check
 * reported "ProBooth has a bar — FAIL" six times over and the bar was fine;
 * the walk had simply never gone in.
 *
 * So: a song on the device and the audio behind it, then choose it. Seeded as
 * a string that runs in the page before any of the app's modules are
 * reachable, which is why the WAV is written by hand rather than through the
 * app's own encoder. `audit/boothwalk.mjs` carries the longer note.
 */
const SEED = `(${(async () => {
  const rate = 44100;
  const seconds = 2;
  const room = new OfflineAudioContext(1, seconds * rate, rate);
  const buffer = room.createBuffer(1, seconds * rate, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.sin((2 * Math.PI * 196 * i) / rate) * 0.3;
  }
  const bytes = buffer.length * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const put = (at, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i));
  };
  put(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, bytes, true);
  for (let i = 0; i < buffer.length; i += 1) {
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  }
  const blob = new Blob([view.buffer], { type: 'audio/wav' });

  localStorage.setItem('futurebox.tracks.v1', JSON.stringify([{
    id: 'tidybars-song',
    title: 'Netjies',
    genre: 'Acoustic',
    bpm: 96,
    key: 'A Minor',
    lyrics: '[Verse]\\nAlles moet netjies wees',
    style: 'warm acoustic',
    models: [],
    source: 'engine',
    seconds,
    createdAt: '2026-10-07T09:00:00.000Z',
    seed: 7,
    parts: [{ name: 'Verse', lines: ['Alles moet netjies wees'], seconds }],
  }]));

  await new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('audio')) open.result.createObjectStore('audio');
    };
    open.onsuccess = () => {
      const tx = open.result.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, 'tidybars-song');
      tx.oncomplete = () => done();
      tx.onerror = () => done();
    };
    open.onerror = () => done();
  });
}).toString()})()`;

const server = await serve(PORT);
const { browser, page, problems: noise } = await enter({
  width: 390, height: 844, at: server.url, touch: true,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

try {
  await studio(page);

  for (const { room, benches, tab: hook, row, song, door } of ROOMS) {
    if (song) {
      /* A song on the device, and then chosen — a reload because the seed
         goes into localStorage and IndexedDB, which the page read when it
         started. */
      await page.evaluate(SEED);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await studio(page);
    }
    await toRoom(page, room);
    await page.waitForTimeout(1200);
    if (song) {
      const picker = page.locator('[data-pickasong]').first();
      if ((await picker.count()) === 0) {
        check(`${room} offers a song to choose`, false,
          'the walk never got into the room, so nothing below it means anything');
        continue;
      }
      await picker.selectOption(await picker.locator('option').nth(1).getAttribute('value'));
      await page.waitForTimeout(3500);
    }
    if (door) {
      const through = page.locator('button').filter({ hasText: door }).first();
      if ((await through.count()) === 0) {
        check(`${room} can be opened`, false,
          'nothing on the screen says what this room is behind, so the walk'
          + ' never got in and nothing below it means anything');
        continue;
      }
      await through.scrollIntoViewIfNeeded().catch(() => undefined);
      await through.click();
      await page.waitForTimeout(2500);
    }
    check(`${room} has a bar`,
      (await page.locator(`[${row}]`).count()) > 0,
      'the tools are still somewhere other than along the bottom');

    for (const which of benches) {
      const tab = page.locator(`[${hook}="${which}"]`).first();
      if ((await tab.count()) === 0) {
        check(`${room} · ${which} is on the bar`, false, 'no such bench');
        continue;
      }
      /* A bench with nothing to work on yet is drawn dim and will not open.
         That is the room behaving, not a fault — the walks that bring a clip
         or a take in are elsewhere. Nothing to measure, so say so and move
         on rather than reporting an empty sheet as untidy. */
      if (await tab.isDisabled()) {
        console.log(`  --   ${room} · ${which}: nothing to work on yet, not measured`);
        continue;
      }
      await tab.click();
      await page.waitForTimeout(450);

      const seen = await page.evaluate(() => {
        const sheet = document.querySelector('[data-desk]');
        if (!sheet) return null;
        const shown = (el) => {
          const box = el.getBoundingClientRect();
          return box.width >= 4 && box.height >= 4;
        };
        /* ── What counts as a control ──────────────────────────────────
 
           The innermost thing a thumb lands on, and nothing that merely
           wraps it.
 
           The first version of this counted every `button, label,
           input[type=range]`, which read three of the Video Editor's field
           groups — a caption with a text box under it, inside one `<label
           class="block space-y-1.5">` — as single 116-pixel controls and
           reported them as the odd ones out. They are not controls; they are
           two things in a box, and the box being taller than a button is the
           box doing its job. Meanwhile the 16-pixel range input inside such
           a label was SKIPPED, as a child of a control, and a 16-pixel
           slider is the one thing here somebody genuinely cannot hit.
 
           So: every button, every visible input, select and textarea — and a
           `<label>` only when it is itself the surface, which is to say it
           has no visible input inside it. The file pickers are that: the
           input is `hidden` and the label is the button. */
        /* ── A label is the control, or it is a box round one ──────────
 
           Clicking a `<label>` forwards the click to the input it names. So
           for an input you CLICK — a colour swatch, a file picker, a tick box
           — the label is the surface, the whole of it is live, and the 24×32
           swatch inside a 44-tall label is not a 24-pixel control.
 
           For an input you drag or type into — a slider, a text box, a list —
           clicking the label does nothing useful: a slider has to be taken
           hold of where it is. There the input itself is the control and the
           label is a caption above it, free to be as tall as a caption plus a
           box. The Video Editor's "What the film is called" is that, and the
           first version of this check reported it as a 116-pixel control. */
        const held = ['range', 'text', 'number', 'search', 'url', 'email', 'tel',
          'date', 'time', 'datetime-local', 'password'];
        const dragged = (el) => (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
          || (el.tagName === 'INPUT' && held.includes(el.type)));
        const controls = [];
        for (const el of Array.from(sheet.querySelectorAll('button, input, select, textarea, label'))) {
          if (!shown(el)) continue;
          if (el.tagName === 'LABEL') {
            const inner = Array.from(el.querySelectorAll('input, select, textarea'));
            if (inner.filter(shown).some(dragged)) continue;
          } else if (el.tagName === 'INPUT' && el.type === 'hidden') {
            continue;
          }
          controls.push(el);
        }
        const out = [];
        for (const el of controls) {
          /* Inside something already counted: part of it, not a second one. */
          if (controls.some((other) => other !== el && other.contains(el))) continue;
          const box = el.getBoundingClientRect();
          out.push({
            h: Math.round(box.height),
            w: Math.round(box.width),
            top: Math.round(box.top),
            tag: el.tagName.toLowerCase() + (el.tagName === 'INPUT' ? `[${el.type}]` : ''),
            /* A box for several lines of writing is SUPPOSED to be taller
               than a button, so it is held to the floor and not to the
               one-height rule. */
            many: el.tagName === 'TEXTAREA',
            /* No words on it: a glyph, not a bar. Held to the height rule
               with everything else, left out of the width rule — an info
               icon beside a button is not a ragged row, it is an icon. */
            glyph: !(el.textContent ?? '').trim(),
            cls: String(el.className).slice(0, 90),
            says: (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 22)
              || el.getAttribute('aria-label')?.slice(0, 22)
              || `<${el.tagName.toLowerCase()}>`,
          });
        }
        return out;
      });

      if (seen === null) {
        check(`${room} · ${which} opens`, false, 'the bench has no sheet');
        continue;
      }
      if (seen.length === 0) continue;

      /* `PEEK=1 npm run check:tidybars` prints every control it measured, so
         a size reported here can be found in the markup without guessing. */
      if (process.env.PEEK) {
        for (const one of seen) {
          console.log(`       ${one.h}x${one.w} top=${one.top} ${one.tag}`
            + ` "${one.says}" cls=${one.cls}`);
        }
      }

      const oneLine = seen.filter((one) => !one.many);
      const heights = [...new Set(oneLine.map((one) => one.h))].sort((a, b) => a - b);
      /* Named by height with an example each, because "34, 36, 44" on its own
         does not say which control to go and look at. */
      const byHeight = heights.map((h) => {
        const of = oneLine.filter((one) => one.h === h);
        return `${h}px: ${of.length} (${of.slice(0, 3).map((one) => one.says).join(', ')})`;
      }).join(' | ');
      check(`${room} · ${which}: every control is the same height`,
        heights.length === 1, byHeight);
      const shortest = Math.min(...seen.map((one) => one.h));
      check(`  and tall enough for a thumb`, shortest >= 44,
        `${shortest} — the app's own floor under \`pointer: coarse\` is 44`);

      /* Grouped by the top edge: controls that share a row. */
      const rows = new Map();
      for (const one of seen.filter((one) => !one.glyph)) {
        const key = Math.round(one.top / 4) * 4;
        rows.set(key, [...(rows.get(key) ?? []), one]);
      }
      const ragged = [...rows.values()]
        .filter((row) => row.length > 1 && new Set(row.map((one) => one.w)).size > 1);
      check(`  and controls sharing a row are the same width`,
        ragged.length === 0,
        ragged.map((row) => row.map((one) => `${one.says || '?'} ${one.w}`).join(' / ')).join(' | ')
        + ' — a wrapping flex sizes each button to its own text, and the ragged'
        + ' right-hand edge is what reads as untidy');
    }
  }

  for (const one of noise) check(`no console error: ${one}`, false);
} catch (problem) {
  check('the walk itself fell over', false, String(problem).split('\n')[0].slice(0, 160));
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.log(`\ncheck:tidybars — ${problems.length} problem(s):`);
  for (const one of problems) console.log(`  · ${one}`);
  process.exit(1);
}
console.log(
  '\ncheck:tidybars — every bench on a room’s bar holds controls of one height,'
  + ' tall enough for a thumb, and every row of them is the same width across.',
);

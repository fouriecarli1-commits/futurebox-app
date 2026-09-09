/**
 * The Booth, walked the way she walks it, on the phone she walks it on.
 *
 * Carli: "met die booth is daar nogteeds probleme."
 *
 * That sentence has been sitting unanswered because I asked which booth and
 * what she was seeing, and asking was the wrong move — the room is here and it
 * can be pressed. The Pro Booth's back button was the other half of the same
 * report and it was found by walking, not by asking.
 *
 * ── What this walks ──────────────────────────────────────────────────────
 *
 * From the front door, at 390x844, with a real song on the device: press into
 * the room, press a song, and then the four things somebody actually needs
 * once they are inside — the words to sing, the button to start, a way back,
 * and the take at the end of it.
 *
 * ── Why it is not a probe page ───────────────────────────────────────────
 *
 * Every other room probe here mounts the component on a page of its own, which
 * is faster and cannot see the two things this is looking for: whether the
 * door leads anywhere, and whether the bottom bar is painted over the controls.
 * Both of those are properties of the room's place in the app, not of the
 * component, so this one takes the long way in.
 *
 * ── The microphone ───────────────────────────────────────────────────────
 *
 * Chromium's fake device, so the walk runs anywhere. It records a tone rather
 * than silence, which matters: a booth that hands back an empty take and a
 * booth that hands back nothing look identical if there was nothing to record.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3084';
const SECONDS = 8;
const RATE = 44100;

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(label);
};

/** A song on the device: the row, and the audio the booth plays under a take. */
const SEED = `(${(async (seconds, rate) => {
  const room = new OfflineAudioContext(1, seconds * rate, rate);
  const buffer = room.createBuffer(1, seconds * rate, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const loud = Math.floor(i / (rate / 2)) % 2 === 0 ? 1 : 0.2;
    data[i] = Math.sin((2 * Math.PI * 196 * i) / rate) * 0.4 * loud;
  }
  /* A WAV by hand rather than through the app's encoder: this runs as a string
     inside the page before any of the app's modules are reachable. */
  const bytes = buffer.length * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, bytes, true);
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  const blob = new Blob([view.buffer], { type: 'audio/wav' });

  const track = {
    id: 'boothwalk-song',
    title: 'Karoo pad',
    genre: 'Acoustic',
    bpm: 96,
    key: 'A Minor',
    lyrics: '[Verse]\\nEk ry alleen deur die Karoo\\nDie pad is lank en stil\\n\\n[Chorus]\\nEn ek sing vir jou',
    style: 'warm acoustic',
    models: [],
    source: 'engine',
    seconds,
    createdAt: '2026-09-07T09:00:00.000Z',
    seed: 7,
    parts: [
      { name: 'Verse', lines: ['Ek ry alleen deur die Karoo', 'Die pad is lank en stil'], seconds: 4 },
      { name: 'Chorus', lines: ['En ek sing vir jou'], seconds: 4 },
    ],
  };
  localStorage.setItem('futurebox.tracks.v1', JSON.stringify([track]));

  await new Promise((done) => {
    const open = indexedDB.open('futurebox', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('audio')) open.result.createObjectStore('audio');
    };
    open.onsuccess = () => {
      const tx = open.result.transaction('audio', 'readwrite');
      tx.objectStore('audio').put(blob, track.id);
      tx.oncomplete = () => done();
      tx.onerror = () => done();
    };
    open.onerror = () => done();
  });
}).toString()})(${SECONDS}, ${RATE})`;

const server = await serve(PORT);
const { browser, page, problems: noise } = await enter({
  width: 390,
  height: 844,
  at: server.url,
  args: [
    '--autoplay-policy=no-user-gesture-required',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
  touch: true,
});

try {
  await page.evaluate(SEED);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  await studio(page);
  await toRoom(page, 'The Booth');
  await page.waitForTimeout(1200);

  const room = page.locator('div.fixed.inset-0.z-50').first();
  const bar = page.locator('nav[aria-label]').first();
  const barTop = (await bar.boundingBox())?.y ?? 844;

  /** Is a control reachable, or is the bottom bar painted over it? */
  const reachable = async (thing, name) => {
    if ((await thing.count()) === 0) return { ok: false, why: 'not on the page at all' };
    await thing.first().scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(250);
    const box = await thing.first().boundingBox();
    if (!box) return { ok: false, why: 'on the page but not drawn' };
    if (box.y > 844 || box.y + box.height < 0) return { ok: false, why: 'off the screen' };
    const under = box.y + box.height - barTop;
    return under > 0
      ? { ok: false, why: `${Math.round(under)}px of it is behind the bottom bar` }
      : { ok: true, why: `${name} ends ${Math.round(box.y + box.height)}, bar starts ${Math.round(barTop)}` };
  };

  /* ── The way in ──────────────────────────────────────────────────────── */
  /* The seed, confirmed to have landed before anything is concluded from its
     absence. A probe that seeds a song, fails to find it and reports the room
     as broken has measured its own setup. */
  const seeded = await page.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem('futurebox.tracks.v1') || '[]');
    return { count: rows.length, titles: rows.map((one) => one.title) };
  });
  check('the song this walk needs is on the device',
    seeded.count === 1, JSON.stringify(seeded));

  /* The song's name is a heading and the button under it says "Open the
     booth", so the first version of this looked for a button carrying the
     title and found none — and reported a room that lists the song perfectly
     well as a room that does not list it. Both are checked now: the name is
     on the screen, and the button that opens it is pressed. */
  const named = (await room.innerText()).replace(/\s+/g, ' ');
  check('the song on this device is offered in the room',
    /Karoo pad/.test(named), named.slice(0, 160));

  const open = room.locator('button').filter({ hasText: /Open the booth|Maak die hokkie oop/ }).first();
  check('and there is a button to open it', (await open.count()) > 0);
  if ((await open.count()) > 0) {
    await open.click();
    await page.waitForTimeout(4000);
  }

  const inside = (await room.innerText()).replace(/\s+/g, ' ');

  /* ── The four things somebody needs once they are in ─────────────────── */
  check('the words she is meant to sing are on the screen',
    /Ek ry alleen deur die Karoo/.test(inside),
    inside.slice(0, 120));

  const record = room.locator('button').filter({ hasText: /^(Record|Neem op|Sing)/ }).first();
  const got = await reachable(record, 'the record button');
  check('the button that starts a take is reachable', got.ok, got.why);

  /* A way back out that is not the phone's own button. The Pro Booth's back
     was the half of her report that got fixed; this is the same question one
     room out, and nothing has ever asked it here. */
  const back = room.locator('button').filter({ hasText: /Back|Terug|Choose another|Kies 'n ander|Ander liedjie/i }).first();
  check('there is a way back to the list of songs, in the room',
    (await back.count()) > 0,
    (await back.count()) > 0 ? (await back.first().innerText()).replace(/\s+/g, ' ') : 'no button says back');

  /* ── And a take actually comes out ───────────────────────────────────── */
  if (got.ok) {
    await record.click();
    /* Watched rather than slept through.

       The count-in is three bars and the song is eight seconds, so a fixed
       wait is a guess at a number that changes with the tempo — and a guess
       that lands one second early reports "nothing was captured" for a booth
       that was still capturing. This waits for the keep button to come alive,
       and prints the room's own status line as it goes so a real failure says
       where it stopped. */
    const stop = room.locator('button').filter({ hasText: /^Stop|Hou op/ }).first();
    const keepable = room.locator('button').filter({ hasText: /Keep this take|Hou hierdie opname/ }).first();
    const seen = [];
    for (let waited = 0; waited < 40; waited += 1) {
      await page.waitForTimeout(1000);
      /* Whether the take is still running, watched rather than assumed.

         This is the line that found the bug: the Stop button disappeared on
         its own at nine seconds — the song ending, the phase going idle — and
         the keep button never came alive. Recording had not stopped, it had
         been abandoned. Printed on every run, because a booth that goes quiet
         at the end of the song and keeps nothing is worth seeing happen. */
      const status = (await stop.count()) > 0 ? 'recording' : 'stopped';
      if (seen[seen.length - 1]?.split('@')[0] !== status) seen.push(`${status}@${waited}s`);
      if ((await keepable.count()) > 0 && (await keepable.first().isEnabled())) break;
      /* Stopped by hand once the song has run out, which is what somebody
         does when the take is over and the button is still red. */
      if (waited > SECONDS + 10 && (await stop.count()) > 0) {
        await stop.first().click().catch(() => undefined);
      }
    }
    console.log(`    the room went: ${seen.join(' → ')}`);
    await page.waitForTimeout(2000);

    /* The keep button, and whether it is enabled.

       The first version of this matched /take|Keep|Play/ against the room's
       text, and the room says "Take it to the timeline" and "Keep this take"
       whether or not anything was recorded — so it passed on a booth that
       had captured nothing. `Keep this take` is `disabled={!take || busy}`,
       which makes its enabled state the one thing on the screen that can only
       be true when a take exists. */
    const keep = room.locator('button').filter({ hasText: /Keep this take|Hou hierdie opname/ }).first();
    check('a take comes back after recording one',
      (await keep.count()) > 0 && (await keep.first().isEnabled()),
      (await keep.count()) === 0
        ? 'no keep button at all'
        : (await keep.first().isEnabled())
          ? 'the keep button came alive'
          : 'the keep button is still disabled — nothing was captured');
    /* And the listen button changes its name, which is the other thing that
       only happens once there is something to listen to. */
    const listen = room.locator('button').filter({ hasText: /Listen back|Luister terug/ }).first();
    check('and the room offers to play it back rather than to follow along',
      (await listen.count()) > 0,
      ((await room.innerText()).match(/Play it and follow the words|Listen back/) ?? ['neither'])[0]);
  }

  /* ── Nothing cut off, and nothing thrown ─────────────────────────────── */
  const over = await page.evaluate(() => {
    const wide = [];
    for (const one of document.querySelectorAll('div.fixed.inset-0.z-50 *')) {
      const box = one.getBoundingClientRect();
      if (box.width > 0 && box.right > 391.5) {
        wide.push(`${one.tagName.toLowerCase()}.${(one.className || '').toString().split(' ')[0]} to ${Math.round(box.right)}`);
      }
    }
    return wide.slice(0, 5);
  });
  check('nothing in the room runs off the right edge of the phone',
    over.length === 0, over.join(' · '));

  /* ── The tab bar is over this room too ────────────────────────────────

     The Pro Booth's "Mix it down" was underneath it for months and nothing
     said so: that room is z-[70], TabBar is `fixed bottom-0 z-[95]`, and
     asking whether the *page* scrolls sideways or off the bottom never sees
     it. Carli found it by asking for a button that was already there.

     Eleven full-screen overlays in this app sit below that bar. This is the
     room she actually records in, and its whole toolbar — play, the way to
     the Pro booth, the desk, and the button that keeps the take — lives at
     the foot of it. So the same question is asked here, of the real bar in
     the real app rather than of a probe page that renders the room alone.

     Any overlap at all counts. Half a button is not a button, and the half
     that goes under is the half a thumb lands on when somebody reaches for
     the bottom of the screen. */
  /* Scrolled to the end first.

     In a room that scrolls, a control passing under a fixed bar on the way
     past is ordinary — you scroll on and it comes clear. The question that
     matters is whether anything is *stranded*: still under the bar when there
     is no more scrolling to do. Asking it at whatever position the walk
     happened to leave reports the ordinary case as a fault, which is how a
     check gets switched off. */
  await page.evaluate(() => {
    const room = document.querySelector('div.fixed.inset-0.z-\\[60\\]');
    const boxes = room ? [room, ...room.querySelectorAll('div')] : [];
    for (const one of boxes) {
      if (one.scrollHeight > one.clientHeight + 4) one.scrollTop = one.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(400);

  const covered = await page.evaluate(() => {
    const bar = document.querySelector('nav.fixed.bottom-0');
    if (!bar) return ['no tab bar on screen'];
    /* Inside the room only.
 
       Scanning the whole document counts what is *behind* the overlay too —
       the page the room opened over, whose links are still in the DOM at
       their old positions and are neither visible nor reachable. The first
       run of this reported an anchor 224 pixels tall that belongs to the
       page underneath, which is the same mistake `audit/probooth.mjs` records
       about `getBoundingClientRect`: it answers where a thing would be, not
       whether anybody can get at it. */
    const room = document.querySelector('div.fixed.inset-0.z-\\[60\\]');
    if (!room) return ['the booth is not open'];
    const over = bar.getBoundingClientRect();
    const out = [];
    for (const el of Array.from(room.querySelectorAll('button, input, select, a'))) {
      if (bar.contains(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      if (r.bottom > over.top && r.top < over.bottom) {
        const said = (el.innerText || el.getAttribute('aria-label') || el.type || '')
          .replace(/\s+/g, ' ').trim();
        out.push(`${el.tagName.toLowerCase()}${said ? ` "${said.slice(0, 24)}"` : ''} .${String(el.className).slice(0, 40)} @${Math.round(r.top)}-${Math.round(r.bottom)}`);
      }
    }
    return [...new Set(out)];
  });
  check('nothing is stranded under the tab bar at the end of the room',
    covered.length === 0, covered.slice(0, 6).join(', '));

  const faults = noise.filter((one) => /pageerror|console: /.test(one));
  check('and the room throws nothing while she uses it',
    faults.length === 0, faults.slice(0, 3).join(' · '));

  await page.screenshot({ path: shot('boothwalk.png'), fullPage: true });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:boothwalk — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:boothwalk — the booth opens, sings, and gives the take back, on a 390px phone.');

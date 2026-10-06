/**
 * Coming back to the booth with the song still in it.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * Carli, 30 September 2026: *"wanneer ek die app minimize en weer terug gaan
 * … Hy gooi jou heeltemal uit en vergeet waarmee hy besig was."*
 *
 * `lib/whereiwas.ts` answered the first half — the tab comes back in the
 * booth rather than on the feed. The song it was open on lived in React
 * state, which is the thing a discarded tab loses, so she came back standing
 * at the song picker. Most of the way home, and still "it forgot".
 *
 * ── And it is the same fault as the TONE3000 return ──────────────────────
 *
 * Their callback sends her to `/?t3k=…&room=booth`, which is a full page
 * load. Room restored, no song, so `VocalBooth` never mounts, so the Pro
 * screen behind it never mounts, so nothing reads the address and the amp she
 * just chose is dropped without a word.
 *
 * Two commits read that as a broken door and pulled the Browse TONE3000
 * button over it. The door was never the problem. Both earlier probes stopped
 * outside the lanes for exactly the reason a PERSON stopped outside them, and
 * neither of us could see it because the probes had no song in the room
 * either.
 *
 * So this walks in the way `boothwalk` does — a real song on the device, in
 * through the studio door — and then does the two things that throw the page
 * away: a reload, and an arrival on the TONE3000 landing address.
 */
import { enter, studio, toRoom } from './enter.mjs';
import { serve, shot } from './where.mjs';

const PORT = process.argv[2] || '3091';
const SECONDS = 6;
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
    data[i] = Math.sin((2 * Math.PI * 196 * i) / rate) * 0.4;
  }
  const bytes = buffer.length * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const put = (at, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(at + i, text.charCodeAt(i)); };
  put(0, 'RIFF'); view.setUint32(4, 36 + bytes, true); put(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  put(36, 'data'); view.setUint32(40, bytes, true);
  for (let i = 0; i < buffer.length; i += 1) {
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  }
  const blob = new Blob([view.buffer], { type: 'audio/wav' });

  const track = {
    id: 'boothback-song',
    title: 'Terugpad',
    genre: 'Acoustic',
    bpm: 96,
    key: 'A Minor',
    lyrics: '[Verse]\\nEk kom terug na hierdie kamer\\nEn die liedjie wag nog',
    style: 'warm acoustic',
    models: [],
    source: 'engine',
    seconds,
    createdAt: '2026-10-06T09:00:00.000Z',
    seed: 7,
    parts: [{ name: 'Verse', lines: ['Ek kom terug na hierdie kamer', 'En die liedjie wag nog'], seconds }],
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

/** The words of the seeded song, which only draw once the booth is open on it. */
const WORDS = /Ek kom terug na hierdie kamer/;

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
  await toRoom(page, 'ProBooth');
  await page.waitForTimeout(1200);

  /* ── In, the way she goes in ──────────────────────────────────────────── */

  const room = page.locator('div.fixed.inset-0.z-50').first();
  const picker = room.locator('[data-pickasong]').first();
  check('the room offers the seeded song', (await picker.count()) > 0,
    (await room.innerText()).replace(/\s+/g, ' ').slice(0, 140));

  if ((await picker.count()) > 0) {
    const id = await picker.locator('option').nth(1).getAttribute('value');
    await picker.selectOption(id);
    await page.waitForTimeout(3500);
  }

  check('and choosing it opens the booth on it',
    WORDS.test((await page.locator('body').innerText()).replace(/\s+/g, ' ')),
    (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 140));

  /* ── The page thrown away, which is the whole subject ────────────────────

     A reload is the closest thing a probe has to Android discarding the tab,
     and it is EXACTLY what a redirect back from another site is. The booth
     has to come back on the song. */

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const after = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  check('after the page is thrown away she is back in the booth, on the song',
    WORDS.test(after),
    `${after.slice(0, 160)} — the room is restored by whereiwas and the song by`
    + ' singingon; without the second she lands at the picker, which is the'
    + ' complaint this answers');

  /* ── And the TONE3000 landing, which needed the above to be true ─────────

     `?t3k=af` is her closing their window without choosing — their third
     outcome, no network of ours involved. It is the cheapest possible proof
     that the reader MOUNTED: nothing else in the app says this sentence. */

  await page.goto(`${server.url}/?t3k=af&room=booth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const said = page.locator('[data-t3ksaid]').first();
  const heard = (await said.count()) > 0
    ? (await said.innerText()).replace(/\s+/g, ' ')
    : '';
  check('coming back from TONE3000 reaches the screen that reads it',
    (await said.count()) > 0,
    'nothing said anything — the Pro screen is behind the Lanes and mixing'
    + ' button, and it cannot mount while the booth has no song in it');
  check('  and it says what happened rather than swallowing it',
    /No amp was chosen|Geen versterker is gekies/i.test(heard),
    heard || 'the status line is there and empty');

  /* The query is taken off the address, or a refresh fetches the same capture
     again — and on `af` would say "no amp was chosen" for ever. */
  check('  and the address is cleared behind her',
    !/t3k=/.test(page.url()), page.url().replace(server.url, ''));

  /* ── And the same return carrying a real tone id ─────────────────────

     `?t3k=ja&tone=…` is the path a person actually takes. `/api/tone3000/tone`
     is stubbed because her TONE3000 sign-in is not in this browser and their
     site is unreachable from here; what the stub hands back is a capture this
     engine cannot read.

     So what this proves is the chain up to and including the PROOF step: the
     address is read, the tone id comes off it, our route is called, and the
     answer reaches the screen in her own words. What it does NOT prove is a
     real capture landing on the shelf — that needs a valid `.nam`, and a
     fabricated one would be a fixture testing itself. The same gap already
     exists for the file picker beside it, which runs the identical `loads`. */

  await page.route('**/api/tone3000/tone*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ nam: '{"this":"is not a capture"}', name: 'stub.nam' }),
  }));

  await page.goto(`${server.url}/?t3k=ja&tone=boothback-tone&room=booth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const second = page.locator('[data-t3ksaid]').first();
  const read = (await second.count()) > 0
    ? (await second.innerText()).replace(/\s+/g, ' ')
    : '';
  check('a tone id on the address is fetched and proved before it is kept',
    /did not load as an amp|nie hier as .{0,3}n versterker gelaai/i.test(read),
    `${read || 'nothing was said'} — anything else means the id never reached`
    + ' `takeTone`, or an unreadable capture was put on the shelf anyway,'
    + ' which is the failure `bringAmp` has guarded against since it was'
    + ' written');

  /* The BUTTON is not asserted here, and the first version of this probe got
     that wrong. It lives in the tone drawer of an open lane — beside "Bring
     in an amp", where an amp belongs — and a landing from TONE3000 has no
     lane open, because she is arriving rather than working. Looking for it
     here found nothing and reported the button as missing from the room.

     It is asserted where a person presses it: `audit/probooth.mjs`, which
     already stands in that drawer. */

  const faults = noise.filter((one) => /pageerror|console: /.test(one));
  check('and nothing throws on the way back in',
    faults.length === 0, faults.slice(0, 3).join(' · '));

  await page.screenshot({ path: shot('boothback.png'), fullPage: true });
} catch (problem) {
  problems.push(`the walk itself fell over — ${String(problem).slice(0, 200)}`);
} finally {
  await browser.close();
  await server.stop();
}

if (problems.length) {
  console.error(`\ncheck:boothback — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log(
  '\ncheck:boothback — the booth comes back on the song after the page is thrown'
  + ' away, and the TONE3000 return reaches the screen that reads it.',
);

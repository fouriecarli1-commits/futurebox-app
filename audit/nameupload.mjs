/**
 * Naming a song you brought in, and hearing its words.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * Carli, 13 September 2026: "Partykeer laai mens jou eie liedjies self op
 * wat wys in jou channel. Kan daar opsies wees om na die liedjie se woorde
 * te luister? Sodat dit doen wat die ander liedjies doen. Kan die liedjie
 * gerename word, en die artist name in gesit word."
 *
 * Three things, and reading the source says two of them are missing and one
 * already works. Reading the source is what this replaces.
 *
 * ── The one that already worked, and could not be trusted to ─────────────
 *
 * The words. `exactFor` falls through to transcription when a song has no
 * lyric sheet, and the Channel already calls it — so a brought-in song can
 * have its words written out by listening, and has been able to for weeks.
 *
 * That is exactly the kind of claim this session has been wrong about:
 * `evenly()` returns nothing for a song with no parts and no lyrics, which
 * means `timeFor` answers `none`, which means the button on the card says
 * "Get the words" and the screen opens empty. Whether the offer to listen
 * then appears is a question about a screen, so it is asked here on a real
 * file rather than reasoned about.
 *
 * The transcription itself is not run: it needs a key, and this probe has
 * none. What is asserted is that the offer is on screen — the fault being
 * guarded against is a words screen that opens blank with no way forward,
 * which is what a song with no words looked like before anyone checked.
 *
 * ── A real file, not a fixture ───────────────────────────────────────────
 *
 * The WAV is written by hand and dropped into the video desk's own input,
 * the way `bringsong.mjs` does it. Seeding localStorage directly would test
 * a row shape this probe invented.
 */
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve, shot } from './where.mjs';
import { enter, studio, toRoom, unfold } from './enter.mjs';

const SECONDS = 6;
const RATE = 44100;
const PORT = process.argv[2] || '3141';

const problems = [];
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}${detail && !ok ? ` — ${detail}` : ''}`);
  if (!ok) problems.push(`${label}${detail ? ` (${detail})` : ''}`);
};

/** A real mono WAV, written by hand so nothing about it is a fixture. */
function wav(seconds, rate) {
  const frames = seconds * rate;
  const buffer = Buffer.alloc(44 + frames * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + frames * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i += 1) {
    buffer.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 12000), 44 + i * 2);
  }
  return buffer;
}

const dir = mkdtempSync(join(tmpdir(), 'nameupload-'));
/* A filename of the shape a phone actually produces, because that is the
   whole reason renaming is worth a button. */
const song = join(dir, 'WhatsApp Audio 2026-09-13 at 05.12.44.wav');
writeFileSync(song, wav(SECONDS, RATE));

const server = await serve(PORT);
const { browser: b, page: p } = await enter({ at: server.url, lang: 'en' });
p.on('pageerror', (e) => problems.push(String(e).slice(0, 140)));

const room = await studio(p);

/* In through the video desk, which is where a file is brought in. */
await toRoom(p, 'Video desk');
await unfold(p);
await room.locator('input[type="file"][accept="audio/*"]').first().setInputFiles(song);
await p.waitForTimeout(2500);

const stored = await p.evaluate(() =>
  JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]'));
check('the file was taken in', stored.length === 1, JSON.stringify(stored.map((s) => s.title)));
check('and its title is the filename, which is why renaming exists',
  stored[0]?.title === 'WhatsApp Audio 2026 09 13 at 05.12.44', String(stored[0]?.title));

await toRoom(p, 'Channel');
await p.waitForTimeout(1500);

const card = room.locator('article').filter({ hasText: /WhatsApp Audio/ }).first();
check('the brought-in song has a card in the channel', (await card.count()) > 0);

if (await card.count()) {
  const nameIt = card.getByRole('button', { name: /Name it/i });
  check('it can be named', (await nameIt.count()) > 0, String(await nameIt.count()));

  if (await nameIt.count()) {
    /* Only if it is not already open. `toRoom` unfolds a room on the way in
       and "Name it" carries `aria-expanded`, so the panel is open before
       this probe touches anything — and a press here SHUT it. That is the
       second time in one night a probe closed the thing it came to measure
       and reported it missing, so it is written down rather than fixed
       quietly: after `unfold`, press to open only what is shut. */
    if ((await nameIt.first().getAttribute('aria-expanded')) !== 'true') {
      await nameIt.first().click();
      await p.waitForTimeout(500);
    }

    const title = card.locator('input[id^="name-"]').first();
    const by = card.locator('input[id^="by-"]').first();
    check('the title box opens with what it is called now, not empty',
      (await title.inputValue()).startsWith('WhatsApp Audio'), await title.inputValue());
    check('and there is a box for the artist', (await by.count()) === 1);

    await title.fill('Blou Bottel');
    await by.fill('Die Hoogtes');
    await card.getByRole('button', { name: /Save it/i }).first().click();
    await p.waitForTimeout(900);

    /* The row, not the screen. A card that re-rendered from state while
       storage stayed as it was would pass a look-at-the-screen assertion
       and lose the rename on the next visit. */
    const after = await p.evaluate(() =>
      JSON.parse(window.localStorage.getItem('futurebox.uploads.v1') || '[]'));
    check('the new name is written to the row', after[0]?.title === 'Blou Bottel', String(after[0]?.title));
    check('and so is the artist', after[0]?.by === 'Die Hoogtes', String(after[0]?.by));

    const renamed = room.locator('article').filter({ hasText: /Blou Bottel/ }).first();
    check('the card shows the new name', (await renamed.count()) > 0);
    check('and prints the artist under it',
      /Die Hoogtes/.test(await renamed.innerText().catch(() => '')), 'the artist is not on the card');

    /* ── The words ──────────────────────────────────────────────────────

       A brought-in song has no lyric sheet, so the card offers to get them
       rather than to show them. Opening it must lead somewhere. */
    const words = renamed.getByRole('button', { name: /Get the words|Lyrics/i }).first();
    check('the card offers the words', (await words.count()) > 0);
    if (await words.count()) {
      check('and says it has none yet, rather than promising some',
        /Get the words/i.test(await words.innerText()), await words.innerText());
      await words.click();
      await p.waitForTimeout(1800);
      const screen = p.locator('div.fixed.inset-0.z-\\[100\\]').first();
      const offered = await screen.innerText().catch(() => '');
      check('the words screen offers to listen to the song rather than opening blank',
        /listen|luister|write|words/i.test(offered), offered.slice(0, 160));
    }
  }
}

await p.screenshot({ path: shot('nameupload.png'), fullPage: false });
await b.close();
await server.stop();

if (problems.length) {
  console.error(`\ncheck:nameupload — ${problems.length} problem(s):`);
  problems.forEach((one) => console.error(`  · ${one}`));
  process.exit(1);
}
console.log('\ncheck:nameupload — a brought-in song can be named, credited, and asked for its words.');

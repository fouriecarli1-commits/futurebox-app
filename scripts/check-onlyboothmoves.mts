/**
 * Only the Pro Booth may slide sideways.
 *
 * ── The rule, in her words ───────────────────────────────────────────────
 *
 * Carli, 30 September 2026: *"video desk se grootte uit preporsie is. Die
 * hele skerm slide by ver links en regs. Maak seker elke kamer is reg. Dit is
 * net die probooth wat ruimte en beweging moet hê."*
 *
 * ── Why a source rule and not only a browser one ─────────────────────────
 *
 * `check:wide` already walks every room and measures every element against a
 * 390 pixel window. It was **green** on the desk she was complaining about,
 * and it was not wrong: it walks each room EMPTY, and an empty video desk has
 * a 280 pixel strip that fits. The strip that slid was 474 pixels, and it only
 * existed once a clip was in it.
 *
 * That is the house fault again — a measurement taken next to the thing. A
 * width check on a room with nothing in it measures a room with nothing in it.
 *
 * Putting material into all sixteen rooms in a browser is the thorough answer
 * and a large one. This is the cheap half that cannot go quiet: a horizontal
 * scroller is written in the source, so it can be counted there, and every one
 * outside the booth has to be a decision somebody wrote down rather than a
 * `overflow-x-auto` that got typed because a row was too long.
 *
 * ── The exemption ────────────────────────────────────────────────────────
 *
 * A comment saying `sideways on purpose` within a few lines above it. The
 * price of movement in this app is a sentence explaining why the thing being
 * scrolled cannot wrap instead.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

const FILES = readdirSync('app', { recursive: true, encoding: 'utf8' })
  .filter((one) => one.endsWith('.tsx'))
  .map((one) => join('app', one));

/** The booth is the one room that is allowed to be bigger than the screen. */
const BOOTH = /^(ProBooth|BoothTimeline|Lanes)\.tsx$/;

const SIDEWAYS = /overflow-x-(auto|scroll)/g;
const EXCUSE = /sideways on purpose/i;

let moving = 0;
let excused = 0;
const bad: string[] = [];

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');
  /* The class name lives in a string, so comments go and strings stay. */
  const text = withoutComments(raw);
  const lines = raw.split('\n');

  for (const hit of text.matchAll(SIDEWAYS)) {
    const at = text.slice(0, hit.index ?? 0).split('\n').length;
    const name = file.split('/').pop() ?? file;
    if (BOOTH.test(name)) { excused += 1; continue; }
    moving += 1;

    /* Read off the REAL lines, comments and all — the exemption is a comment,
       which is exactly what was blanked to find the class name. */
    /* Ten lines, because an exemption in this repository is a paragraph and
       not a word. Six caught every one-line excuse and missed the video
       editor's, whose reason runs to six lines on its own — a window that
       makes a written reason fail for being thorough is a window teaching
       people to write less. */
    const before = lines.slice(Math.max(0, at - 10), at).join(' ');
    if (EXCUSE.test(before)) {
      excused += 1;
      console.log(`  ok  ${file}:${at} — moves, with a written reason`);
      continue;
    }

    bad.push(`${file}:${at}`);
    console.log(
      `  ✗   ${file}:${at} — scrolls sideways outside the Pro Booth. ` +
        'A row that is too long can wrap (`flex-wrap`) and stay still; only ' +
        'the booth is meant to be bigger than the screen. Wrap it, or write ' +
        'why it cannot above the line.',
    );
  }
}

console.log(`\n${moving} sideways scroller(s) outside the booth; ${excused} allowed.`);

if (bad.length > 0) {
  console.log(`\ncheck:onlyboothmoves — ${bad.length} place(s) slide under a thumb that should not.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:onlyboothmoves — nothing outside the Pro Booth moves sideways without a reason.');
}

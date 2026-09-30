/**
 * Every ElevenLabs call that spends money writes down what it spent.
 *
 * ── The fault this exists for ────────────────────────────────────────────
 *
 * `noteCost` reads ElevenLabs' own `character-cost` header off a response and
 * files it beside what this app charged for the same work. It is the only
 * thing in this repository that can answer *"are we charging enough"* with a
 * measurement rather than a rate card.
 *
 * Speech, music, stems and dubbing have called it since September. The video
 * flow, the image flow and speech-to-text never did.
 *
 * And that is exactly — precisely — why the video number is the one open
 * number in the budget. `scripts/costs-eleven.mts` carries a whole section
 * saying a clip costs either R2,62 or R0,06 depending on which of two figures
 * in the code you believe, that the two are 43 times apart, that **"die enigste
 * ding wat dit oplos is 'n regte faktuur"**, and that this is *"die
 * belangrikste oop getal op hierdie bladsy"*.
 *
 * It was not waiting on an invoice. ElevenLabs was sending the answer back on
 * every single response, in a header, and three code paths were dropping it on
 * the floor. Weeks of a budget built on a guess, and an email to a supplier
 * treated as the most important thing on any list, because nobody checked
 * whether the number was already arriving.
 *
 * That is the shape this whole repository is arranged against: not a thing
 * that is broken, but a thing that is *measured somewhere adjacent to where
 * the answer already was.*
 *
 * ── The rule ─────────────────────────────────────────────────────────────
 *
 * A file that calls `api.elevenlabs.io` calls `noteCost`.
 *
 * Read off the URL, not off the import — the same lesson `check:brake` learnt
 * on 22 September, when `app/api/eleven/dictionary/route.ts` turned out to be
 * in neither its covered list nor its exemptions, because it reaches
 * ElevenLabs with its own `fetch` and imports nothing that gave it away. Not
 * excused. Invisible.
 *
 * An exemption is a comment in the file saying why, and there is one: a call
 * that cannot be billed by character has nothing to file.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { code, withoutComments } from './prose.mts';

const FILES = readdirSync('app', { recursive: true, encoding: 'utf8' })
  .filter((one) => one.endsWith('.ts') || one.endsWith('.tsx'))
  .map((one) => join('app', one));

/** What an exemption must say, somewhere in the file. */
const EXCUSE = /not billed by character/i;

/** The file that DEFINES noteCost is not a caller of it. */
const HOME = join('app', 'lib', 'server', 'eleven.ts');

let callers = 0;
let counted = 0;
let excused = 0;
const bad: string[] = [];

for (const file of FILES) {
  const raw = readFileSync(file, 'utf8');

  /* The URL is in a string, so comments are blanked and strings are not —
     `withoutComments`, not `code`. `check:earsopen` learnt the same thing the
     hard way: `code()` blanks string bodies, so a check looking FOR a URL
     reads every file as having none. */
  if (!/api\.elevenlabs\.io/.test(withoutComments(raw))) continue;
  if (file === HOME) continue;
  callers += 1;

  /* And here the other way round: a mention of `noteCost` in a comment is not
     a call to it, so this half reads the code with the prose taken out. */
  const text = code(raw);
  if (/\bnoteCost\s*\(/.test(text)) {
    /* ── And it has to file BOTH numbers ──────────────────────────────────
 
       `noteCost(response, what)` writes a row with `credits` null, and
       `eleven_price_check` — the view the pricing page reads — drops every
       row where either number is missing, because an average that treats an
       absent figure as nought lies in the expensive direction.
 
       So a two-argument call is recorded and then invisible, which is worse
       than not recording it: the page reads as "this was never used". Found
       on 30 September, when Carli made her first video and asked how to see
       what it cost. The video row was there and the page would have shown
       nothing. `align` had been in that state since it was written.
 
       A third argument, whatever it is, means somebody decided what the
       member paid. Its VALUE is not checkable from here — that is what the
       pricing page is for. */
    const thin = [...text.matchAll(/\bnoteCost\s*\(([^;]*?)\)\s*;/g)].filter(
      (hit) => hit[1].split(',').length < 3,
    );
    if (thin.length > 0) {
      const at = text.slice(0, thin[0].index ?? 0).split('\n').length;
      bad.push(file);
      console.log(
        `  ✗   ${file}:${at} — \`noteCost\` is called without what the member ` +
          'was charged, so the row is written with credits null and ' +
          '`eleven_price_check` drops it. Recorded and invisible reads as ' +
          'never used. Pass the price that was charged as the third argument.',
      );
      continue;
    }
    counted += 1;
    console.log(`  ok  ${file} — files what it cost, and what we charged`);
    continue;
  }

  if (EXCUSE.test(raw)) {
    excused += 1;
    console.log(`  ok  ${file} — exempt, with a written reason`);
    continue;
  }

  bad.push(file);
  console.log(
    `  ✗   ${file} — calls api.elevenlabs.io and never calls noteCost. ` +
      `Their \`character-cost\` header says what this call really cost and it ` +
      `is being dropped, so nothing can check our price against theirs. ` +
      `Pass the Response to noteCost, or write why it is not billed by character.`,
  );
}

console.log(`\n${callers} file(s) reach ElevenLabs; ${counted} file the cost, ${excused} exempt.`);

/* A rule with no subjects passes forever. If the URL is ever spelt another
   way, this check goes quiet rather than red — so it says so out loud. */
if (callers === 0) {
  console.log(
    '\ncheck:elevencounted — nothing in app/ appears to call api.elevenlabs.io, ' +
      'which is either wrong or means the URL is now built rather than written.',
  );
  process.exitCode = 1;
} else if (bad.length > 0) {
  console.log(`\ncheck:elevencounted — ${bad.length} path(s) spend money without writing down what it cost.`);
  process.exitCode = 1;
} else {
  console.log('\ncheck:elevencounted — every path that spends at ElevenLabs files what it spent.');
}

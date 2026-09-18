/**
 * The recording room holds still.
 *
 * Carli, 17 September 2026: *"Die record skerm in Probooth moet hard wees en
 * nie beweeg nie. Huidiglik hop alles rond. Ek dink daai read the words of
 * the song met 2 credits moet net 'n button wees en vat die verduideliking
 * weg, dan sal die recording room baie meer spasie hê en alles nie so rond
 * hop nie, die woorde gaan dan ook meer spasie hê om te wys."*
 *
 * ── Why a shove down the screen is worse here than anywhere else ─────────
 *
 * Every room in this app can afford a block that grows. This one cannot: the
 * thing being read while it moves is the line somebody is singing, and they
 * are looking at it with their hands full and their eyes in one place.
 *
 * The read-the-words block was the cause she named, and it was doing two
 * things at once. Its paragraph was `flex-1 min-w-[240px]`, which on a
 * 390-pixel screen is the whole width and four or five lines — so a control
 * that is one button took most of a phone's height, and the words it is
 * about got what was left. And the sentence is one of TWO, swapped when the
 * words arrive, at different lengths: a block that re-wraps to a different
 * number of lines pushes everything under it down, mid-take.
 *
 * So this holds three things about that block, each of which was the fault:
 * the explanation is behind the mark, the row has a floor it cannot fall
 * below, and the working label is not longer than the resting one.
 *
 * ── What it does not claim ───────────────────────────────────────────────
 *
 * "Alles hop rond" may have more than this one cause. This is the one she
 * named and the one that is measurable from the source; a probe that watched
 * the words' position through a real take would be worth more and needs a
 * microphone. Said here rather than left as an implication that the room is
 * now proven steady.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const booth = readFileSync('app/components/VocalBooth.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* The block, found by the string that names it rather than by position. */
const at = booth.indexOf("'booth.heardWhat'");
ok('the read-the-words block is a named row', at > 0);
/* The row, bounded by what it IS rather than by how long it was.

   This used to be `slice(at - 1400, at + 3800)`, a window measured off the
   heading, and on 18 September it failed a room where nothing had moved: the
   `flex-shrink-0` fix in the row came with fourteen lines of comment saying
   why, and those characters pushed `<Cost>` out the far end of the window.
   The check then reported that the price had been moved under the button.
   It had not. A rule that a written explanation can break is a rule that
   teaches people not to write explanations.

   So the row runs from the card `<div>` that opens it to the heading of the
   next card — both of which are landmarks in the file rather than distances
   from one. The old numbers stay as a floor for the day one of the two
   landmarks is renamed, so a missing marker shortens the window instead of
   swallowing the whole file. */
const opens = booth.lastIndexOf('<div className="rounded-2xl', at);
const nextCard = booth.indexOf("'booth.splitWhat'", at);
const block = at > 0
  ? booth.slice(opens > 0 ? opens : at - 1400, nextCard > at ? nextCard : at + 3800)
  : '';

ok(
  'its explanation is behind the mark, not printed in the row',
  /<Hint>\s*\{\s*heard && !preferWritten/.test(block),
  'a paragraph that is one of two different lengths re-wraps and shoves the words down',
);
/* `className="` in front of it, because the notes above these rows quote the
   class they removed and a check that matches its own prose is a check that
   can never pass. Found by it failing on exactly that. */
ok(
  '  so no paragraph in it claims the width',
  !/className="[^"]*min-w-\[240px\]/.test(block),
  'flex-1 min-w-[240px] is the whole width of a phone and four lines of it',
);
/* The tuning report further down keeps its paragraph, deliberately. It is
   not an explanation — it is four numbers about the take somebody just sang,
   which is a result, and a result behind a mark is a result nobody reads. It
   also appears once, after a press, rather than changing under a take. */
/* The card under it had exactly the same paragraph — found by widening the
   window above until it reached the button, which is how a second one turns
   up. Two blocks of forty words above the words is most of a phone spent
   explaining two buttons, and she said "alles hop rond" rather than naming
   one of them. */
ok(
  'and the card under it is one row too',
  /'booth\.splitWhat'/.test(booth) && /flex min-h-\[64px\] items-center gap-2 flex-wrap">\s*<Users/.test(booth),
  'the sing-beside-the-voice card had the same paragraph and the same shove',
);
ok(
  '  with a working label no longer than its resting one',
  /'booth\.splittingShort'/.test(booth) && !/'booth\.splitting',/.test(booth),
);
ok(
  'the row has a height it cannot fall below',
  /flex min-h-\[64px\] items-center/.test(block),
  'a row that is 44 tall with a button and 64 with two is a row that moves',
);
ok(
  'the price sits beside the button rather than under it',
  /<Cost rate=\{CREDITS\.transcribe\} seconds=\{duration \|\| track\.seconds\} \/>/.test(block),
  'a second line that comes and goes is the same shove, one line further down',
);
ok(
  'the working label is no longer than the resting one',
  /'booth\.readingShort'/.test(block) && !/'booth\.reading',/.test(block),
  '"Listening to the song…" was four words longer than what it replaced',
);
ok(
  '  and both new labels are in the dictionary in both languages',
  /"booth\.heardWhat": \{ en: "[^"]+", af: "[^"]+" \}/.test(words) &&
    /"booth\.readingShort": \{ en: "[^"]+", af: "[^"]+" \}/.test(words),
);

if (failures) {
  console.error(
    '\ncheck:recordroom — the block above the words may not change height. What is being\n' +
      'read while it moves is the line somebody is singing, and they are looking at it with\n' +
      'their hands full.\n',
  );
  process.exit(1);
}
console.log('\ncheck:recordroom — one row, a floor under it, and the explanation behind the mark.');

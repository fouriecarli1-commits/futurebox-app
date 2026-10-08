/**
 * A chosen button looks chosen.
 *
 *   npm run check:chosen
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 8 October 2026: *"Die export se png en jpg buttons moet highlight
 * wanneer mens dit kies."*
 *
 * They already did, in the DOM. Every chip in the photo editor carries
 * `aria-pressed`, and the chosen one got `border-emerald-500/60
 * text-emerald-400`. What it did not get was a FILL — so on that room's
 * near-black panel the entire difference between chosen and not chosen was a
 * grey border going half-strength green and the text going from zinc-300 to
 * emerald-400. Two changes, both of them colour alone, on a dark card.
 *
 * Nine chip sets in that one file were written that way. She noticed it on
 * the one where getting it wrong costs her something: a JPEG cannot hold a
 * see-through background, so a format she cannot tell she has chosen is a
 * transparent post downloaded onto black. The feature worked and the button
 * did not say which one it was.
 *
 * ── Why the rule is "more than a colour" and not "has a class" ───────────
 *
 * A check that only looked for a selected class would have passed the whole
 * time this was broken — there WAS a selected class. So the rule is about
 * what the class does: a chosen state has to change a fill or a shadow, not
 * only a text and border colour. That is also the accessible rule rather
 * than a taste: somebody who cannot separate a grey border from a green one
 * is reading a row of nine identical buttons.
 *
 * ── Why this reads the source and not a browser ──────────────────────────
 *
 * Because the thing it is about is the rule, not the pixels. `audit/`
 * already has a probe that measures painted contrast — `audit/contrast.mjs`
 * — and it measures text against its own background, which is exactly what
 * was fine here. What was missing was a difference between two states of the
 * same button, which is a question about the code that writes them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

/* The rooms whose chips are written as `${BASE} ${on ? CHOSEN : ''}` — the
   pattern this fault lives in. Named rather than globbed: a file added to
   this list is a decision, and a glob over `app/components` would pull in
   every panel in the app on the day somebody writes one differently. */
const ROOMS = ['app/components/PostStudio.tsx'];

/** A chosen state has to do one of these. All four are more than a colour. */
const SOLID = /\b(bg-|shadow|ring-|font-bold|border-2|outline)/;

for (const file of ROOMS) {
  const src = readFileSync(file, 'utf8');
  const name = file.split('/').pop();

  /* Every chip in the file, as the ternary that styles it. The capture is
     the branch taken when the chip is the chosen one. */
  const chips = [...src.matchAll(/\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*\$\{[^}]*\?\s*([A-Za-z_][A-Za-z0-9_]*|'[^']*')\s*:/g)]
    .map((one) => one[1]);
  ok(`${name}: its chips can be found to read`,
    chips.length >= 5,
    `${chips.length} found — this check is about the difference between two`
    + ' states of the same button, and with no chips found it is a check that'
    + ' passes by looking at nothing');

  /* A named constant is resolved to what it holds, because that is where the
     fix went: one `GEKIES` for the whole room rather than nine copies. */
  const held = (token: string): string => {
    if (token.startsWith("'")) return token.slice(1, -1);
    const found = src.match(new RegExp(`const ${token} = ([\\s\\S]{0,400}?);\\n`));
    return found ? found[1] : '';
  };

  const weak = [...new Set(chips)].filter((one) => !SOLID.test(held(one)));
  ok(`  and every chosen one says so with more than a colour`,
    weak.length === 0,
    `${weak.join(', ')} — a border going half-strength green and text going`
    + ' from zinc-300 to emerald-400 is two colour changes on a near-black'
    + ' card, and the format chip is the one where not seeing it means a'
    + ' transparent post downloaded onto black');

  /* And it is one style rather than nine, because nine copies is how the
     next one gets written weak again. */
  ok('  and it is one style for the whole room, not one per chip set',
    new Set(chips.filter((one) => !one.startsWith("'"))).size <= 2,
    `${[...new Set(chips)].join(', ')} — nine copies of a chosen state is`
    + ' nine places for the tenth to be written differently');

  /* The thing that makes a chip a chip. Without it the row is unreadable to
     a screen reader whatever it looks like. */
  const pressed = (src.match(/aria-pressed=/g) ?? []).length;
  ok('  and every chip still tells a screen reader which one it is',
    pressed >= chips.length,
    `${pressed} aria-pressed for ${chips.length} chips`);
}

if (bad) {
  console.error(`\ncheck:chosen — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  '\ncheck:chosen — every chosen chip in the photo editor says so with a fill'
  + ' or a shadow rather than with a colour alone, in one style for the whole'
  + ' room.',
);

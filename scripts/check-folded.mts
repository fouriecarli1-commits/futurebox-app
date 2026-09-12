/**
 * Every panel in every room starts folded.
 *
 * ── What was asked for ───────────────────────────────────────────────────
 *
 * Carli, 12 September 2026, on the video desk:
 *
 *   "when I open the video desk, can all the drop down menus be closed, and
 *    not open, then the user can open it. Then that desk would also look
 *    cleaner. Make sure every rooms drop down menu is closed from the
 *    beginning and the user can open it."
 *
 * And, naming four panels on the advert desk that were not folds at all:
 *
 *   "'When it goes out'; 'What the money did'; 'the market, and the week' …
 *    these aren't drop down menu's, please make it drop down menu's and make
 *    sure they are also closed from the beginning."
 *
 * ── The two halves, and why the second one needs a check ─────────────────
 *
 * The first half is one line: `Card` defaults to shut. The second half is
 * the one that rots. A panel written next week as a plain `<section>` with
 * an `<h3>` in it is not a fold, nothing fails, and the room quietly goes
 * back to showing everything at once — which is the state she has now asked
 * to be changed three times in three different words.
 *
 * So this holds two things: no card can be forced open, and no panel in
 * these rooms is a heading without a fold under it.
 */
import { readFileSync, readdirSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const DIR = 'app/components';
const files = readdirSync(DIR).filter((one) => one.endsWith('.tsx'));
const read = (one: string): string => readFileSync(`${DIR}/${one}`, 'utf8');

/* ── The fold itself ───────────────────────────────────────────────────── */
const card = read('Card.tsx');
ok('a card starts shut', /useState\(false\)/.test(card),
  'the default is open again, so every room shows everything at once');

/* And there is no way to ask for otherwise. A prop for it is a prop that
   gets used, and then the rule is "every card starts shut except the ones
   that do not", which is not a rule. */
ok('  and nothing can ask it to start open', !/startShut/.test(card.replace(/\/\*[\s\S]*?\*\//g, ' ')),
  'the escape hatch is back');
const forced = files.filter((one) => /startShut|defaultOpen|alwaysOpen/.test(read(one).replace(/\/\*[\s\S]*?\*\//g, ' ')));
ok('  and no panel asks', forced.length === 0, forced.join(', '));

/* ── A panel is a fold, not a heading ──────────────────────────────────
 
   The shape every one of these had: a rounded section, an emerald icon, an
   `<h3>`, and a `<Note>` under it. Four of them were on the advert desk and
   one was "Build a long one" on the video desk. None could be folded.
 
   Recognised by the heading rather than by a list of filenames, so the
   sixth one written this way fails on the day it is written rather than the
   next time somebody opens the room and counts. */
const unfolded: string[] = [];
for (const one of files) {
  const source = read(one);
  /* `Card.tsx` is where a heading is supposed to live, and a full-screen
     player is not a panel in a room — it has no room around it to be one
     of several in. Both recognised by what they are. */
  if (one === 'Card.tsx') continue;
  if (/createPortal/.test(source)) continue;
  for (const found of source.matchAll(/<h3 className="text-base font-black text-white tracking-tight">/g)) {
    /* A heading inside a `.map` is a row in a list, not a panel. */
    const before = source.slice(Math.max(0, (found.index ?? 0) - 900), found.index);
    if (/\.map\(\(/.test(before)) continue;
    unfolded.push(one);
  }
}
ok('every panel in a room is a fold rather than a heading',
  unfolded.length === 0,
  `${[...new Set(unfolded)].join(', ')} — a panel that cannot be folded is a room that shows everything at once`);

/* ── The five she named are folds now ─────────────────────────────────── */
const NAMED: readonly { file: string; key: string; what: string }[] = [
  { file: 'Storyboard.tsx', key: 'board.title', what: 'Build a long one' },
  { file: 'Queue.tsx', key: 'queue.title', what: 'When it goes out' },
  { file: 'AdRuns.tsx', key: 'run.title', what: 'When it goes out, and where' },
  { file: 'AdReport.tsx', key: 'report.title', what: 'What the money did' },
  { file: 'MarketPlan.tsx', key: 'plan.title', what: 'The market, and the week' },
];
for (const one of NAMED) {
  const source = read(one.file);
  ok(`"${one.what}" folds`,
    new RegExp(`<Card title=\\{t\\('${one.key.replace('.', '\\.')}'`).test(source),
    'still a heading with everything under it always open');
}

if (failures) {
  console.error(`\ncheck:folded — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:folded — every room opens as its own table of contents, and nothing can opt out.');

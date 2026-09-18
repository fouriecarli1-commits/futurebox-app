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

/* ── The one fold that opens, and the reason it is allowed to ──────────
 
   `History` takes `startOpen`, and `Channel` passes it for "Your videos".
   That is not a room showing everything at once: the `Card` around it is
   shut like every other, so nothing is on the screen until somebody asks
   for it — the prop only decides whether the list inside needs a SECOND
   press once they have. "Ek het nou net 'n video gegenerate … en nou kry
   ek dit nie in my channel nie" is the reason it is not two presses.
 
   Bounded rather than trusted. An exception nobody counts is how the rule
   goes back to "every card starts shut except the ones that do not" — so
   this pins it to one call site, inside a Card, with the default the other
   way. A second one fails here on the day it is written. */
const strip = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
ok('the list card opens shut unless it is asked',
  /startOpen = false/.test(read('History.tsx')),
  'History now opens by default, so every room that shows one does too');
const opens = files
  .filter((one) => one !== 'History.tsx')
  .flatMap((one) => [...strip(read(one)).matchAll(/startOpen/g)].map(() => one));
ok('  and exactly one panel asks it to, inside a shut card',
  opens.length === 1 && opens[0] === 'Channel.tsx',
  opens.length === 0 ? 'nobody asks — the prop is dead, take it out' : `${[...new Set(opens)].join(', ')}`);
if (opens.length === 1 && opens[0] === 'Channel.tsx') {
  const source = strip(read('Channel.tsx'));
  const at = source.indexOf('startOpen');
  ok('  and the card around it is a Card, which starts shut',
    /<Card\b/.test(source.slice(Math.max(0, at - 900), at)),
    'the list is open on arrival with nothing folded over it');
}

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
  /* `\\s+` rather than one space: the board's tag went multi-line when it
     gained `openOn`, and a check that reads "this panel is a Card" should
     not be answering a question about line breaks. Still tight enough that
     nothing but whitespace may sit between the tag and its title. */
  ok(`"${one.what}" folds`,
    new RegExp(`<Card\\s+title=\\{t\\('${one.key.replace('.', '\\.')}'`).test(source),
    'still a heading with everything under it always open');
}

/* ── The open signal stays rare ───────────────────────────────────────────

   `Card` takes an `openOn` counter: a card opens when it goes up. That is
   not `startOpen` and the difference is the point — undefined or unchanged
   on mount is shut, always, so a room still opens as its own table of
   contents. It only ever moves in answer to a press somewhere else, which
   today is the podcast room's "Put it on a video" asking to be taken to the
   long form rather than merely to the room the long form is in.

   It is still the loophole shape, so every one of them is named here, with
   what presses it. A count would have let the eighth through on the day
   somebody raised a number; a list makes whoever adds the ninth write down
   who is pressing it.

   Eight of these arrived together on 18 September, and they are one
   answer to one report: Carli, of the advert desk, *"As ek druk op open
   the room dan vat hy my net na die regte kamer toe, maar die AI vul nie
   die afdelings vir my in nie."* It did fill them in. It filled them into
   cards that were shut, and a filled card that is shut is a room that
   looks untouched. `lib/opencard.ts` and `check:opencard` have the whole
   of it. */
const OPENABLE: Record<string, string> = {
  'Storyboard.tsx': 'the podcast room\u2019s "Put it on a video", and the advert desk\u2019s longer explainer',
  'VideoCanvas.tsx': 'a shot handed over from the advert desk or the copilot',
  'VoiceLab.tsx': 'a script handed over from the advert desk',
  'PodcastStudio.tsx': 'an episode\u2019s title and notes handed over from the advert desk',
  'MakeMusic.tsx': 'words and a sound handed over from the advert desk',
  'Campaign.tsx': 'a brief filled in by the copilot from another room',
  'CollabRoom.tsx': 'a message the copilot drafted',
  'Hooks.tsx': 'a clip length the copilot set',
};
const openers: string[] = [];
for (const file of files) {
  if (!file.endsWith('.tsx') || file === 'Card.tsx') continue;
  const source = read(file);
  for (const _ of source.matchAll(/<Card\b[^]*?openOn=/g)) openers.push(file);
}
const unnamed = [...new Set(openers)].filter((one) => !OPENABLE[one]);
ok('a card opens on a signal only where one was asked for',
  unnamed.length === 0,
  `${unnamed.join(', ')} — name it above, with what presses it, having read why the rule is what it is`);
/* And the other way: a name that no longer opens anything is a reason
   nobody can check. */
const stale = Object.keys(OPENABLE).filter((one) => !openers.includes(one));
ok('  and every card named here still has one',
  stale.length === 0,
  `${stale.join(', ')} — named as openable and no longer openable`);
ok('and the signal never survives a mount',
  /const arrivedWith = useRef\(openOn\)/.test(read('Card.tsx'))
    && /openOn === arrivedWith\.current/.test(read('Card.tsx')),
  'Card must compare against what it mounted with, or openOn becomes startOpen');

if (failures) {
  console.error(`\ncheck:folded — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:folded — every room opens as its own table of contents, and nothing can opt out.');

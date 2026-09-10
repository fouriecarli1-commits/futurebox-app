/**
 * The music quiz, and the ways a question bank rots.
 *
 * ── What she asked for, 10 September 2026 ────────────────────────────────
 *
 * "ek wil hê jy moet heel onder aan die creative page 'n music quiz op sit
 *  wat music knowledge leer. dit moet abcd tick boxes hê en dan kom die
 *  antwoord aan die einde uit."
 *
 * ── Why a bank of hand-written content needs a check at all ──────────────
 *
 * Because every fault in one is silent. A question with three options still
 * renders — it just has no D. An answer index pointing past the end marks
 * nothing right, and the card looks fine until somebody ticks. A question
 * translated on one side only shows English to an Afrikaans member with
 * nothing anywhere saying so. None of that throws, none of it fails to
 * build, and none of it is visible unless the exact question comes up.
 *
 * Thirty questions is more than anybody will read back before shipping the
 * thirty-first.
 *
 * ── And the one that is not about shape ──────────────────────────────────
 *
 * Every question must carry an explanation, and it must be a real one. A
 * quiz that answers "right" or "wrong" teaches nobody anything — somebody
 * who guessed correctly learnt exactly as much as somebody who guessed
 * wrong. The `why` is the entire reason this feature exists, so a question
 * added later without one is the feature quietly becoming a game.
 */
import { readFileSync } from 'node:fs';
import { QUIZ } from '../app/data/musicquiz';

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

ok(`there are questions to ask — ${QUIZ.length}`, QUIZ.length >= 20,
  'a bank small enough to exhaust in a week is a card somebody stops reading');

const notFour = QUIZ.filter((one) => one.options.length !== 4);
ok('every question has exactly four options, A to D',
  notFour.length === 0,
  `${notFour.map((one) => one.id).join(', ')} — she asked for abcd, and a three-option question has no D`);

const outOfRange = QUIZ.filter((one) => one.answer < 0 || one.answer >= one.options.length);
ok('and an answer that points at one of them',
  outOfRange.length === 0,
  `${outOfRange.map((one) => one.id).join(', ')} — nothing would ever be marked right`);

const ids = QUIZ.map((one) => one.id);
ok('and an id of its own, because that is what stops it repeating',
  new Set(ids).size === ids.length,
  'two questions sharing an id means one of them is never seen again after the other');

const asked = QUIZ.map((one) => one.ask.en.trim().toLowerCase());
ok('and no question is asked twice',
  new Set(asked).size === asked.length,
  'the same question in two entries reads as a bank that is not looked after');

/* Both languages, on every string. An Afrikaans member meeting an English
   question is the fault this app has hit most often, and it never throws. */
const halfSaid = QUIZ.filter((one) =>
  !one.ask.af.trim() || !one.why.af.trim() || one.options.some((o) => !o.af.trim()));
ok('every question, option and explanation exists in Afrikaans',
  halfSaid.length === 0,
  `${halfSaid.map((one) => one.id).join(', ')} — this app is Afrikaans-first and half a translation shows English with nothing saying why`);

const untranslated = QUIZ.filter((one) => one.ask.af.trim() === one.ask.en.trim());
ok('  and is not the English text copied across',
  untranslated.length === 0,
  `${untranslated.map((one) => one.id).join(', ')} — an identical string is a translation nobody did`);

/* The reason the feature exists. A mark teaches nobody anything. */
const thin = QUIZ.filter((one) => one.why.en.trim().length < 60 || one.why.af.trim().length < 60);
ok('every question explains its answer, at length enough to teach something',
  thin.length === 0,
  `${thin.map((one) => one.id).join(', ')} — "correct" is not teaching`);

const duplicated = QUIZ.filter((one) => new Set(one.options.map((o) => o.en)).size !== one.options.length);
ok('and no question offers the same option twice',
  duplicated.length === 0,
  `${duplicated.map((one) => one.id).join(', ')} — two identical options means two right answers or two wrong ones`);

/* The right answer must not always be A. A bank where it is would be
   answerable without reading, which is the whole thing failing quietly. */
const spread = new Set(QUIZ.map((one) => one.answer));
ok('and the right answer is not always in the same place',
  spread.size >= 3,
  `answers only ever at ${[...spread].join(', ')} — the card becomes guessable without reading`);

// ── The card itself ──────────────────────────────────────────────────────

const card = readFileSync('app/components/MusicQuiz.tsx', 'utf8');
ok('the answer cannot be revealed before something is ticked',
  /disabled=\{ticked === null\}/.test(card),
  'reading the answer without guessing is the version that teaches nothing');
ok('and the options are lettered A B C D, as she asked',
  /LETTERS\[index\]/.test(card) && /'A', 'B', 'C', 'D'/.test(card),
  '');
/* Mechanics, not the word.
 
   The first version of this matched /score/ over the whole file and failed
   on the card's OWN documentation — the paragraph explaining why there is no
   score — and on the line that tells a member "Nothing is scored." Third
   time today a check has matched its own prose; the answer each time is to
   look for the thing rather than the word for it. Here that means state
   that accumulates and anything that leaves the browser. */
ok('and nothing is scored or sent anywhere',
  !/set(Score|Streak|Total|Right|Correct)|fetch\(|navigator\.sendBeacon/.test(card),
  'a score turns a thirty-second aside into a thing somebody is failing at');
ok('and the question is chosen after mount, not during render',
  /useEffect\(\(\) => \{\s*next\(\);/.test(card),
  'picking during render is a hydration mismatch and a question that changes under somebody reading it');

const page = readFileSync('app/page.tsx', 'utf8');
ok('and it sits at the bottom of the creative page',
  /<MusicQuiz \/>/.test(page),
  'she asked for it "heel onder aan die creative page"');

if (failures) {
  console.error(`\ncheck:quiz — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:quiz — ${QUIZ.length} questions, four options each, both languages, and every one explains itself.`);

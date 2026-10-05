/**
 * A recommendation names the fact it was read off, and moves when that moves.
 *
 * ── What this is for ─────────────────────────────────────────────────────
 *
 * `docs/FUNCTION_INVENTORY.md` has had Recommend second in the order of work
 * since the first pass. The risk in building it is not that it will be
 * missing; it is that it will be there and say nothing:
 *
 *   - a button that sets a field with no reason, which cannot be disagreed
 *     with and teaches nobody anything about their own work;
 *   - a reason that is a constant sentence, which reads exactly like a
 *     measurement and is a slogan;
 *   - a rule whose answer is the same whatever it is given, which is a
 *     default with a lightbulb next to it.
 *
 * All three look identical on a screen to the real thing. So the rules below
 * EXECUTE the rules in `app/lib/recommend.ts` rather than reading them: every
 * one is called twice with facts that should move the answer, and a rule
 * whose answer does not move fails by name.
 *
 * That is the only way to catch the third shape. A source check can see that
 * a function exists and returns an `Advice`; nothing short of calling it
 * twice can see that it considered its arguments.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { SHAPES } from '../app/lib/videoedit';
import { GRADES } from '../app/lib/videoquality';
import { EASY_MB, gradeAdvice, reads, shapeAdvice, type Advice } from '../app/lib/recommend';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail ? ` — ${detail}` : ''}`);
};

const rule = withoutComments(readFileSync('app/lib/recommend.ts', 'utf8'));
const piece = withoutComments(readFileSync('app/components/Recommend.tsx', 'utf8'));
const room = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const dict = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── Every reason names a fact ──────────────────────────────────────────── */

const upright = { width: 1080, height: 1920 };
const sideways = { width: 1920, height: 1080 };
const boxy = { width: 1080, height: 1080 };
const tall = SHAPES.tall;

/** Each rule, with two sets of facts that ought to move it. */
const RULES: readonly {
  readonly name: string;
  readonly one: Advice<string> | null;
  readonly other: Advice<string> | null;
}[] = [
  {
    name: 'shapeAdvice',
    one: shapeAdvice([{ shot: upright }, { shot: upright }]),
    other: shapeAdvice([{ shot: sideways }, { shot: sideways }]),
  },
  {
    name: 'gradeAdvice',
    /* Eight seconds against three and a half minutes: the short one fits at
       the sharpest rung and the long one does not, which is the decision. */
    one: gradeAdvice(8, tall, 30),
    other: gradeAdvice(200, tall, 30),
  },
];

for (const { name, one, other } of RULES) {
  ok(`${name} answers with a value and a reason`,
    !!one && !!one.value && one.says.length === 2 && !!one.says[1],
    'a value with no reason is a field set for her that she cannot disagree'
    + ' with, and a lottery ticket is not advice');

  ok(`  and ${name}'s reason names at least one fact it was given`,
    !!one && Object.keys(one.facts).length > 0
      && Object.keys(one.facts).every((fact) => one.says[1].includes(`{${fact}}`)),
    'a sentence with no number in it cannot be checked by the person reading'
    + ' it, which is the only thing that separates advice from a slogan'
    + (one ? ` — "${one.says[1]}" against ${JSON.stringify(one.facts)}` : ''));

  ok(`  and ${name} answers differently when the facts differ`,
    !!one && !!other && one.value !== other.value,
    'a rule whose answer does not move is a default with a lightbulb beside'
    + ' it. This is executed, not read, because nothing short of calling it'
    + ' twice can see whether it considered its arguments'
    + (one && other ? ` — both answered "${one.value}"` : ''));

  ok(`  and ${name}'s filled-in sentence has no {holes} left in it`,
    !!one && !/\{[a-z]+\}/.test(reads(one, one.says[1])),
    'a placeholder on the screen is the fact that was promised and not'
    + ' delivered');
}

/* ── A rule with nothing to read off says so ───────────────────────────── */

ok('a rule with nothing to read off gives no advice',
  shapeAdvice([]) === null
  && shapeAdvice([{}, {}]) === null
  && gradeAdvice(0, tall, 30) === null,
  'three unmeasured clips are not an argument for anything. Falling back to'
  + ' the default here and returning it as an Advice is the one failure this'
  + ' whole piece exists to avoid: a default dressed up as a reading');

ok('  and the button goes with it',
  /if \(worked && !advice\) return null;/.test(piece),
  'a "Pick for me" that quietly applies a default is worse than no button,'
  + ' because it looks like something considered the film');

/* ── The answers are actually right ────────────────────────────────────── */

const mixed = shapeAdvice([{ shot: upright }, { shot: upright }, { shot: sideways }]);
ok('the shape it picks is the way most of the clips were shot',
  mixed?.value === 'tall' && mixed.facts.most === 2 && mixed.facts.all === 3,
  `got ${JSON.stringify(mixed?.facts)} for two upright and one wide — the`
  + ' sentence she reads is "{most} of your {all}", so a wrong count is a'
  + ' sentence that is visibly false');

const square = shapeAdvice([{ shot: boxy }, { shot: boxy }, { shot: upright }]);
ok('  and a square clip counts as square rather than as either way up',
  square?.value === 'square',
  'a 1080×1080 clip is not upright, and rounding it to tall would crop'
  + ' nothing and claim something');

const unmeasurable = shapeAdvice([{ shot: { width: 0, height: 0 } }, { shot: upright }]);
ok('  and a clip the browser could not decode is not counted',
  unmeasurable?.facts.all === 1,
  'a zero-by-zero clip has no way up, and counting it as one would put a'
  + ' number in the sentence that nothing measured');

/* ── All three branches of the picture size, because each says something
      different and only one of them was tested in the first draft ───────── */

const sharpest = GRADES[GRADES.length - 1].id;
const smallest = GRADES[0].id;

const short = gradeAdvice(8, tall, 30);
ok('a film that fits at the sharpest rung is told to stay there',
  short?.value === sharpest && Number(short?.facts.mb) <= EASY_MB,
  `an eight-second film got "${short?.value}" at ${short?.facts.mb} MB. 1080p`
  + ' is what every platform wants, and advice that gives it up on a film'
  + ' somebody is going to post points the wrong way');

const middling = gradeAdvice(200, tall, 30);
ok('  and one that does not comes down exactly one rung further than it must',
  middling?.value !== sharpest
  && middling?.value !== smallest
  && Number(middling?.facts.mb) <= EASY_MB,
  `a three-and-a-half-minute film got "${middling?.value}" at`
  + ` ${middling?.facts.mb} MB — the rule takes the SHARPEST rung that fits,`
  + ' so landing on the smallest would mean it stopped at the first one it'
  + ' tried rather than the best one');

ok('  and says what the sharp one would have cost, so she can overrule it',
  !!middling && Number(middling.facts.big) > Number(middling.facts.mb),
  `${middling?.facts.big} MB against ${middling?.facts.mb} MB. The number she`
  + ' is giving up is the number she needs to argue with, and advice that'
  + ' hides it is a decision taken for her');

const huge = gradeAdvice(1200, tall, 30);
ok('  and a film too long for any rung is told that, rather than sold a rung',
  huge?.value === smallest
  && Number(huge?.facts.mb) > EASY_MB
  && huge?.says[0] === 'advise.grade.none',
  `a twenty-minute film got "${huge?.value}" at ${huge?.facts.mb} MB with the`
  + ` "${huge?.says[0]}" sentence. Claiming it uploads easily at ${EASY_MB} MB`
  + ' would be the one thing a reason must never do, which is be false');

/* ── Nothing here spends anything ──────────────────────────────────────── */

ok('a worked-out recommendation asks nothing of a server',
  !/fetch\(/.test(rule) && !/\/api\//.test(rule),
  'these are arithmetic over what is already on the clock. A Recommend that'
  + ' quietly spent a credit would be the worst button in the app');

/* ── And it is in the room, beside the fields it is about ──────────────── */

ok('the cutting room offers it on the shape and on the picture size',
  /mark="shape"/.test(room) && /mark="grade"/.test(room)
  && /advice=\{shapeSays\}/.test(room) && /advice=\{gradeSays\}/.test(room),
  'the fields where the vocabulary is the obstacle — "720p" means nothing to'
  + ' most people — and the two in this room whose answer is arithmetic');

ok('  and it is the same component the other three rooms use',
  /import Recommend from '\.\/Recommend'/.test(room),
  'a thing phrased two ways on two screens reads as two different systems,'
  + ' which is why there is one Recommend and not a second one for the'
  + ' worked-out kind');

ok('  and the clips are measured, so the shape is read and not assumed',
  /readonly shot\?: \{/.test(withoutComments(readFileSync('app/lib/videoedit.ts', 'utf8')))
  && /const seen = await measure\(file\)/.test(room)
  && /shot: \{ width: seen\.width, height: seen\.height \}/.test(room),
  'the whole rule rests on this: before today nothing in the app knew the'
  + ' shape of its own material, so tall was a default and could never have'
  + ' been a reading');

/* ── In both languages, like every other sentence ──────────────────────── */

const keys = [...rule.matchAll(/says: \['([^']+)'/g)].map((one) => one[1]);
const missing = keys.filter((key) => !dict.includes(`"${key}"`));
ok(`all ${keys.length} reasons are in the dictionary`,
  missing.length === 0,
  missing.length
    ? `${missing.join(', ')} — a reason that cannot be read in Afrikaans is a`
      + ' reason half the people here cannot read'
    : '');

if (bad) {
  console.error(`\ncheck:recommend — ${bad} assertion(s) failed.\n`);
  process.exit(1);
}
console.log(
  `\ncheck:recommend — ${RULES.length} rules, each called twice: every one`
  + ' names the facts it read, moves when they move, says nothing when there'
  + ' is nothing to read, and costs nothing.',
);

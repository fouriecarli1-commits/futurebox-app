/**
 * A shot the copilot writes has to be deep enough to make a video from.
 *
 * ── The same complaint, a month apart ────────────────────────────────────
 *
 * Carli, 11 September 2026: *"CoPilot moet net baie meer descriptive wees
 * wanneer video shots geskryf word."*
 *
 * Carli, 9 October 2026: *"Die video studio se ai is baie kort af. Dit moet
 * baie descriptive wees en daardie ai moet weet wat verwag word, om genoeg
 * beskrywing te gee sodat 'n ai 'n sinvolle video kan maak."*
 *
 * The first fix was the instruction getting longer. It did not work, and the
 * reason it could not is the reason this file exists: three things in the
 * code made a long shot impossible or pointless, and none of them was the
 * wording.
 *
 * **The contradiction.** `write_scenes` said *"one shot per line"* while
 * `set_prompt` asked for *"three or four sentences"*. A model resolving that
 * keeps the format rule, because the format rule looks like the one that
 * breaks something.
 *
 * **The parser.** `shotsFrom` split on `\n`, so one line WAS one shot. A
 * paragraph would have become four shots. The format rule was real.
 *
 * **The floor.** The desk refused a shot under twelve CHARACTERS. "A dog
 * runs" is eleven. So everything got through, and nothing ever told anybody
 * that what they had written was not enough.
 *
 * ── What this holds, and the one that matters most ───────────────────────
 *
 * The example. `set_prompt` carries a worked shot, and this runs the desk's
 * own `depthOf` over that exact string and fails if it does not clear
 * `full`. The old instruction's only example was *"as you would tell a
 * camera operator"* — a register, not a shot — and a model shown a register
 * writes one. No amount of asking for detail survives a thin example, and no
 * check on the prose would have caught it.
 *
 * It cannot drive the model itself: that costs money on every run and
 * answers differently each time. What it can do is hold every condition the
 * model's answer depends on.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { shotsFrom } from '../app/lib/storyboard.ts';
import {
  PARTS, SHOT_EXAMPLE, SHOT_FULL_WORDS, SHOT_MIN_WORDS, depthOf, thinSays,
} from '../app/lib/shotdepth.ts';
import { SURFACES } from '../app/lib/surfaces.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA shot has to be deep enough to make a video from\n');

const ops = SURFACES.canvas.ops ?? {};
const prompt = String(ops.set_prompt ?? '');
const scenes = String(ops.write_scenes ?? '');

/* ── 1. The example is a shot, not a register ───────────────────────── */

const example = depthOf(SHOT_EXAMPLE);
ok('the example in the instruction clears the desk\'s own floor',
  example.enough,
  `${example.words} words against a floor of ${SHOT_MIN_WORDS} — the one`
  + ' example a model is shown is the one thing it copies, so an instruction'
  + ' that asks for detail and shows none teaches none');

ok('  and leaves nothing for the engine to invent',
  example.full,
  `${example.words} words, missing ${example.missing.join(', ') || 'nothing'}`
  + ` (wanted ${SHOT_FULL_WORDS}+ and all four named) — the previous example`
  + ' was "as you would tell a camera operator", which is a register rather'
  + ' than a shot, and the shots that came back were registers too');

ok('  and the instruction actually carries it',
  prompt.includes(SHOT_EXAMPLE),
  'the worked shot is not in what the copilot is told, so the example this'
  + ' check measures is not the example the model sees');

/* ── 2. The floor is named, and it is the real one ──────────────────── */

ok('the copilot is told the number the desk refuses below',
  prompt.includes(String(SHOT_MIN_WORDS)),
  `${SHOT_MIN_WORDS} does not appear — "be descriptive" is not something a`
  + ' model can check its own answer against, and a number is');

ok('  and told that the desk refuses, not merely prefers',
  /refus/i.test(prompt),
  'the instruction asks for length without saying the desk will not make a'
  + ' short one, so a model trading length for brevity is not told what that'
  + ' costs');

ok('  and told which four things to name',
  PARTS.every((part) => new RegExp(part === 'setting' ? 'where it is|setting' : part, 'i').test(prompt)),
  `${PARTS.filter((part) => !new RegExp(part === 'setting' ? 'where it is|setting' : part, 'i').test(prompt)).join(', ')}`
  + ' not asked for — and the room says they are missing, so it is asked for'
  + ' something it was never told about');

/* ── 3. The contradiction is gone, and the parser agrees ────────────── */

ok('the shot list is not asked for one shot per line',
  !/one shot per line/i.test(scenes) && !/per line/i.test(scenes),
  'the format rule that caused this is back: a shot squeezed into a line is a'
  + ' clause, and a model keeps the format rule over the length rule');

ok('  and is asked for a blank line between shots',
  /blank line/i.test(scenes),
  'nothing says how the shots are separated, so the model guesses — and the'
  + ' parser splits on blank lines');

/* ── Driven both ways, and hard-wrapped on purpose ───────────────────────
 
   The first version of this built its two paragraphs out of `SHOT_EXAMPLE`
   as one unbroken line each. It passed with the parser reverted to splitting
   on `\n` — because `a\n\nb` split on newlines gives three pieces, the empty
   middle one is filtered, and two shots come out either way. It was green
   while measuring nothing, which is the exact failure this repository keeps
   finding in its own instruments.
 
   A model writing a paragraph wraps it. So the shots below carry newlines
   INSIDE them, which is the only shape that tells the two parsers apart:
   split on blank lines it is two shots, split on every newline it is six. */
const wrapped = SHOT_EXAMPLE.replace(/\. /g, '.\n');
const paragraphs = `${wrapped}\n\n${wrapped}`;
ok('  and two wrapped paragraphs are two shots, not a dozen',
  shotsFrom(paragraphs, 5).length === 2,
  `${shotsFrom(paragraphs, 5).length} shots out of two paragraphs — the`
  + ' parser is splitting inside a shot, which is the fault that made every'
  + ' long shot impossible');

ok('  and the paragraph survives whole',
  depthOf(shotsFrom(paragraphs, 5)[0]?.prompt ?? '').full,
  'the first shot off two paragraphs is no longer a full shot, so the parser'
  + ' is dropping part of it');

const oneLiners = '1. A woman at a window\n2. An empty street\n3. A car pulling away';
ok('  while a numbered list of one-liners is still three shots',
  shotsFrom(oneLiners, 5).length === 3,
  `${shotsFrom(oneLiners, 5).length} — somebody pasting a list from`
  + ' elsewhere, and every board saved before today, is in this shape');

ok('  with its numbering stripped',
  shotsFrom(oneLiners, 5)[0]?.prompt === 'A woman at a window',
  `got "${shotsFrom(oneLiners, 5)[0]?.prompt}" — a leading number reaching the`
  + ' engine is a number it draws');

/* ── 4. The desk refuses by depth, not by characters ────────────────── */

const board = withoutComments(readFileSync('app/components/Storyboard.tsx', 'utf8'));

ok('the desk measures a shot with the shared reading',
  /depthOf\s*\(/.test(board) && /\.enough\b/.test(board),
  '`depthOf` is not used, so the room has its own idea of what is enough and'
  + ' the copilot was told about a different one');

ok('  and the twelve-character floor is gone',
  !/length\s*<\s*12\b/.test(board),
  'the old floor is back: "A dog runs" is eleven characters, so everything'
  + ' clears it and a thin shot goes to the engine with nothing said');

ok('  and says what is thin rather than only that it is',
  /thinSays\s*\(/.test(board),
  'the room refuses without saying how short the shot was or what to add, so'
  + ' somebody is told no and not told what to do about it');

/* And the sentence it says is a sentence, with the number in it. */
const says = thinSays(depthOf('A dog runs'), (_key, fallback) => fallback);
ok('  and the sentence it says names the floor',
  says.includes(String(SHOT_MIN_WORDS)) && says.includes('3'),
  `"${says}" — a refusal with no numbers in it leaves somebody guessing how`
  + ' much more to write');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

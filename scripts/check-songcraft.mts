/**
 * The studio teaches the same thing every time, and quotes nobody.
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * Carli, 19 September 2026, passing on a friend's idea and adding the part
 * that makes it worth building: *"dan leer dit ook mense sommer van liedjie
 * skryf en van musiek."*
 *
 * `data/songcraft.ts` is that teaching, and it is written down rather than
 * asked of a model for the reason in its own header: a model asked what a
 * bridge is for answers well nine times and, the tenth, fluently says
 * something untrue. Teaching that is usually right is a different product
 * from teaching.
 *
 * Written down, it needs the things written-down text needs: both languages
 * everywhere, every part complete, and a place to land for every feeling the
 * room offers. A half-filled entry is a blank space on somebody's screen.
 *
 * ── And the line the examples may not cross ──────────────────────────────
 *
 * Every part carries an example from a song most people have heard. Saying
 * what HAPPENS at that point in a song is an observation. Printing what it
 * SAYS is somebody's copyright, and this app does not print other people's
 * words — the same line `docs` §138 draws around an uploaded song.
 *
 * So no example may carry a quotation mark. It is a blunt rule and it is the
 * right blunt rule: there is no reason to quote anything here, and the
 * moment somebody wants to, that is exactly the moment to stop them.
 */

import { readFileSync } from 'node:fs';
import { CRAFT, ABOUT, aboutFor, craftBrief } from '../app/data/songcraft';
import { MOODS } from '../app/data/songstarts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/* ── Every part, complete, in both languages ──────────────────────────── */

const FIELDS = ['name', 'what', 'does', 'how', 'wrong', 'example'] as const;
const thin: string[] = [];
for (const one of CRAFT) {
  for (const field of FIELDS) {
    const pair = one[field];
    if (!pair.en.trim() || !pair.af.trim()) thin.push(`${one.id}.${field}`);
  }
}
ok('every part of a song is explained, in both languages', thin.length === 0, thin.join(', '));

ok(
  'the six parts are all there',
  CRAFT.length === 6 && ['intro', 'verse', 'prechorus', 'chorus', 'bridge', 'outro']
    .every((id) => CRAFT.some((one) => one.id === id)),
  CRAFT.map((one) => one.id).join(', '),
);

/* ── The examples say what happens, never what it says ────────────────── */

const quoted = CRAFT.filter((one) =>
  /["“”]/.test(one.example.en) || /["“”]/.test(one.example.af));
ok(
  'no example quotes a word of somebody else’s song',
  quoted.length === 0,
  `${quoted.map((one) => one.id).join(', ')} — say what happens at that point, not what it says`,
);

/* ── The second question always has somewhere to land ─────────────────── */

const bare = MOODS.filter((one) => aboutFor(one.id).length < 3);
ok(
  'every feeling has at least three things it could be about',
  bare.length === 0,
  `${bare.map((one) => one.id).join(', ')} — a feeling with an empty row asks a question and offers no way in`,
);
ok(
  '  and every one of them is in both languages',
  ABOUT.every((one) => one.en.trim() && one.af.trim()),
  ABOUT.filter((one) => !one.en.trim() || !one.af.trim()).map((one) => one.id).join(', '),
);
ok(
  '  and belongs to a feeling the room actually offers',
  ABOUT.every((one) => MOODS.some((mood) => mood.id === one.mood)),
  ABOUT.filter((one) => !MOODS.some((mood) => mood.id === one.mood)).map((one) => one.id).join(', '),
);

/* ── The copilot is handed it, and only where it is worth the tokens ──── */

const brief = craftBrief().join('\n');
ok('the copilot is handed every part', CRAFT.every((one) => brief.includes(one.name.en)));
ok(
  '  and told not to quote anybody',
  /never quote the words of a/.test(brief),
  'the rule has to travel with the knowledge, or it is a rule only this file knows',
);

const route = readFileSync('app/api/copilot/route.ts', 'utf8');
ok('the route sends it', /craftBrief\(\)/.test(route));
ok(
  '  on the song screens and not on the others',
  /here === 'make' \|\| here === 'studio' \? SYSTEM_CRAFT : SYSTEM/.test(route),
  'forty lines of song craft on every turn of every room is money spent making an answer worse',
);
/* It used to ride in the per-turn message, where it was the largest stable
   thing in the one part of the request that can never be cached — forty lines
   re-bought on every press. As a system variant it is billed once per burst.
   Asserted from the other side as well: the per-turn builder must not have
   grown its own copy back. */
ok(
  '  as a cached system prompt rather than in the turn',
  /const SYSTEM_CRAFT = \[SYSTEM, '', \.\.\.craftBrief\(\)\]/.test(route)
    && !/craftBrief\(\)/.test(route.slice(route.indexOf('function contextFor'), route.indexOf('const SYSTEM_CRAFT'))),
  'stable text in the per-turn message is bought again on every single press',
);
ok(
  'and it is told what this song is about, in their own words',
  /What it is about, in their words/.test(route) && /body\.feeling/.test(route),
  'without it the advice is about a sad song, which is the advice everybody gets',
);

/* ── The feeling is asked for, not picked off a wall ──────────────────

   Carli, 19 September 2026: *"Die emosie goed voel ek moes als deel wees van
   copilot. Die hele room is baie besig. Ook die begeleiding van elke sessie."*

   The first build put the feeling on the canvas as eight chips and a box, and
   the craft as six more chips below the words. Both were the right knowledge
   in the wrong place: a chip row is not guidance, it is one more thing to
   look at before anybody has asked you a question — on a screen she had
   already called busy.

   So the assertions flipped. What used to be "the room shows it" is now "the
   room does NOT show it, and the copilot can set it". The negative half
   matters as much as the positive one: without it, somebody adds the panel
   back one day and every other assertion here still passes. */

const make = readFileSync('app/components/MakeMusic.tsx', 'utf8');
ok(
  'the room does not ask for the feeling on the canvas',
  !/<SongFeeling|<SongParts/.test(make),
  'the emotion question belongs in the conversation, not as chips above a busy room',
);
ok(
  '  and the copilot can put the answer there instead',
  /set_feeling:/.test(make) && /set_about:/.test(make),
  'taking the chips away without giving the copilot the ops leaves the canvas unfillable',
);
ok(
  '  and an unknown feeling is dropped rather than guessed at',
  /MOODS\.find\(/.test(make),
  'a ninth feeling would narrow the starting points to nothing and look like a broken room',
);
ok(
  '  and the feeling still narrows the fifty starting points',
  /openAt=\{canvas\.feeling \?\? fromPhoto\}/.test(make),
);

const surfaces = readFileSync('app/lib/surfaces.ts', 'utf8');
ok(
  'the copilot opens this room with the question, not with a menu',
  /set_feeling:\s*$|set_feeling:/m.test(surfaces) && /set_about:/.test(surfaces),
  'the room can only be filled from a conversation if the conversation knows the ops exist',
);

ok(
  '  and is told to ask it one question at a time',
  /Do not open with a menu/.test(brief) && /one question at a/.test(brief),
  'a copilot that opens with a list of what it can do has replaced the chips with prose',
);
ok(
  '  and has somewhere for a feeling to land',
  ABOUT.every((one) => brief.includes(one.en)),
  'the places a feeling lands were chips too, and they are only useful if the copilot has them',
);

const page = readFileSync('app/page.tsx', 'utf8');
ok(
  'the feeling travels to the copilot with the rest of the canvas',
  /feeling: canvas\.feeling/.test(page) && /about: canvas\.about/.test(page),
  'a feeling the copilot cannot see is a question asked for nothing',
);

/* ── And it is not quietly turned into a sound ────────────────────────── */

ok(
  'the feeling is never sent to the engine as a style',
  !/style:.*canvas\.feeling/.test(make) && !/feeling.*=> .*setStyle/.test(make),
  'a mood is not a sound, and turning "sad" into "slow and minor" is a musical decision nobody asked for',
);

/* ── One section at a time ────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"It must work verse for verse, and before every
 * new verse are written, ask questions and explain what this part in a song
 * is usually for. It must not generate everything at once."*
 *
 * Three things have to hold together or the room quietly goes back to
 * handing over a finished lyric sheet, and nothing on screen would say so:
 * the copilot has to be TOLD to write one section at a time, it has to have
 * an operation that ADDS one, and that operation has to actually append
 * rather than replace. Two out of three is the failure that looks fine — a
 * model dutifully sending one verse at a time into a handler that overwrites
 * the last one, so the song is always one section long.
 */

/* The brief is wrapped prose, so a phrase that reads as one sentence on the
   page may have a newline through the middle of it. Matched flat, or this
   check passes and fails on where the wrapping happens to fall. */
const flat = brief.replace(/\s+/g, ' ');

ok(
  'the copilot is told to write one section at a time',
  /one section per reply/i.test(flat) && /never more than one section/i.test(flat),
  'without this it hands over a finished lyric sheet, which teaches nobody anything',
);
ok(
  '  and to say what the part is for, and ask, before writing it',
  /what that part of a song is for/i.test(flat) && /ask the one question you need answered/i.test(flat),
  'the craft below it is only teaching if it is said at the moment it is needed',
);
ok(
  '  and never to build the song up with a whole sheet',
  /Never use either to build the song up/i.test(flat),
  'set_words carries the lot, so building with it overwrites what they typed themselves',
);

ok(
  'the room offers an operation that adds one section',
  /add_section:/.test(surfaces) && /ONE section and nothing else/.test(surfaces),
  'an instruction to write a section at a time, with no way to send one, is a rule against working',
);

/* The one that would not show up by reading either file on its own. */
const adder = /add_section: \(value\) => \{[\s\S]*?\n    \},/.exec(make)?.[0] ?? '';
ok(
  '  and the room APPENDS it rather than replacing the words',
  adder !== '' && /was\.lyrics/.test(adder) && !/lyrics: part,?\s*\}\)\);\s*$/.test(adder),
  'a section at a time into a handler that overwrites leaves the song one section long forever',
);
ok(
  '  and drops a blank one instead of announcing it',
  /if \(!part\) return;/.test(adder),
  'an empty answer should not open the words card and claim it wrote something',
);

if (failures) {
  console.error(`\ncheck:songcraft — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:songcraft — the six parts are explained in both languages, every feeling has somewhere'
  + ' to land, no example quotes anybody, and the copilot is handed the lot on the song screens.',
);

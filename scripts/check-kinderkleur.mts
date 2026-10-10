/**
 * The child's room is colourful, and every colour in it can be read.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Sjoe, die kids room page is dood en vervelig,
 * dit moet colourful en exciting wees… dit moet vol kleur en excitement
 * wees, en selfs die uitleg moet anders en uniek wees as die status quo."*
 *
 * ── Why a check about COLOUR, of all things ──────────────────────────────
 *
 * Because the two ways this breaks are both invisible to whoever picked the
 * colours:
 *
 *   · A choice with NO colour of its own falls through to the fallback grey.
 *     In a room whose whole point is colour, one grey bubble among twenty-two
 *     looks deliberate — like that one is disabled. The first draft of
 *     `kidslook.ts` had four sound colours and the room has NINE sounds, so
 *     five of them would have shipped grey. Nobody counted; the list was
 *     written from memory of a grid that showed four.
 *   · A label the same brightness as the bubble under it. Yellow with white
 *     words on it is a bubble with no words on it, and it is unreadable to
 *     exactly the person who cannot tell you why.
 *
 * Both of those render. Neither throws. So they are counted and measured
 * here against the REAL lists of topics and sounds, not against a memory.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { KID_SOUNDS, KID_TOPICS } from '../app/lib/kidsong.ts';
import {
  MASCOT_SAYS, PAINTS, SIZES, SOUND_PAINTS, brightnessOf, inkOn, paintOf,
  sizeAt, spin,
} from '../app/lib/kidslook.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/KidsRoom.tsx', 'utf8'));
const css = readFileSync('app/globals.css', 'utf8');

/* ── 1. Every choice has a colour, and they are all different ─────────── */

ok('every topic has a colour of its own',
  (() => {
    const missing = KID_TOPICS.filter((one) => !PAINTS[one.id]).map((one) => one.id);
    if (missing.length) console.log(`         no colour: ${missing.join(', ')}`);
    return missing.length === 0;
  })(),
  'a choice with no colour falls through to grey, and one grey bubble among'
  + ' twenty-two reads as the broken one');

ok('  and so does every sound',
  (() => {
    const missing = KID_SOUNDS.filter((one) => !SOUND_PAINTS[one.id]).map((one) => one.id);
    if (missing.length) console.log(`         no colour: ${missing.join(', ')}`);
    return missing.length === 0;
  })(),
  'the first draft of this had four and the room has nine — written from a'
  + ' memory of the grid rather than from the list');

ok('  and no two of them are the same colour',
  (() => {
    const all = [...KID_TOPICS.map((one) => PAINTS[one.id]?.from),
      ...KID_SOUNDS.map((one) => SOUND_PAINTS[one.id]?.from)].filter(Boolean);
    return new Set(all).size === all.length;
  })(),
  'two choices in the same colour are two choices a child cannot tell apart,'
  + ' which is the whole job the colour is doing here');

/* ── 2. Every label can be read on the thing it sits on ───────────────── */

ok('the words on every bubble can be read',
  (() => {
    const hard = [...Object.entries(PAINTS), ...Object.entries(SOUND_PAINTS)]
      .filter(([, p]) => Math.abs(brightnessOf(p.from) - brightnessOf(p.ink)) < 0.4)
      .map(([id]) => id);
    if (hard.length) console.log(`         too close: ${hard.join(', ')}`);
    return hard.length === 0;
  })(),
  'yellow with white words on it is a bubble with no words on it, and it is'
  + ' unreadable to exactly the person who cannot say why');

ok('  and the ink is chosen from the colour rather than typed',
  [...Object.values(PAINTS), ...Object.values(SOUND_PAINTS)]
    .every((p) => p.ink === inkOn(p.from)),
  'an ink typed beside a colour is an ink that stays when somebody changes'
  + ' the colour');

ok('  and a choice that does not exist still draws something',
  (() => {
    const fallback = paintOf(PAINTS, 'no-such-topic');
    return Boolean(fallback.from) && Boolean(fallback.ink)
      && paintOf(PAINTS, null).from === fallback.from;
  })(),
  'the sentence at the top is drawn before anything is chosen, so a missing'
  + ' colour there is a crash on the first paint of the room');

/* ── 3. The layout is not the status quo ──────────────────────────────── */

ok('the bubbles come in more than one size',
  new Set(SIZES).size >= 3,
  'her words: "selfs die uitleg moet anders en uniek wees as die status'
  + ' quo". A grid of equal squares is the status quo');

ok('  and the sizes do not line up row to row',
  (() => {
    /* Six to a row on a wide screen, so a run that repeats every 6 would
       stack the same size in a column and read as a grid again. */
    const row = 6;
    const first = [0, 1, 2, 3, 4, 5].map((at) => sizeAt(at));
    const next = [0, 1, 2, 3, 4, 5].map((at) => sizeAt(at + row));
    return first.join() !== next.join();
  })(),
  'a run that repeats every row is a grid wearing circles');

ok('  and the room says the choices as a sentence, not as headings',
  /data-kidssentence/.test(room)
  && /kids\.aSongAbout/.test(room) && /kids\.thatSounds/.test(room)
  && !/kids\.pickTopic/.test(room) && !/kids\.pickSound/.test(room),
  'a heading tells you what a section is for; a sentence tells you what you'
  + ' are about to get, which is the thing a child is deciding');

ok('  and the choices really are drawn as bubbles',
  /data-kidsbubble/.test(room) && /data-kidstopics/.test(room)
  && /data-kidssounds/.test(room) && !/grid-cols-3/.test(room),
  'the grid is what she called dead and boring');

/* ── 4. The room is lit, and so is the footer under it ────────────────── */

ok('the room has a palette of its own',
  /\[data-kidsroom\]/.test(css) && /data-kidsroom/.test(room),
  'near-black with one green in it is right for somebody editing a film at'
  + ' night and wrong for a six-year-old');

ok('  and it reaches the footer the layout renders',
  /body:has\(\[data-kidsroom\]\)/.test(css),
  'the site footer is a SIBLING of the page, so a selector on the room alone'
  + ' ends a sunlit room in a near-black band. That was learned on the Cubed'
  + ' room and is not going to be learned twice');

/* ── 5. What was taken from Google's version, and what was not ────────── */

ok('the wheel and the mascot are there',
  /data-kidswheel/.test(room) && /data-kidsmascot/.test(room)
  && MASCOT_SAYS.length >= 4,
  'she took the question to Google and sent back what it drew: something'
  + ' that talks to a child who has just arrived, and a press for one who'
  + ' cannot decide. Those two are good ideas and they are not mine');

ok('  and the wheel really lands on both choices',
  (() => {
    /* Driven with a known sequence rather than left to Math.random: a wheel
       that reaches for randomness inside itself is a wheel no check can ever
       land on a known answer. */
    const first = spin(KID_TOPICS, KID_SOUNDS, () => 0);
    const last = spin(KID_TOPICS, KID_SOUNDS, () => 0.999999);
    return first.topic === KID_TOPICS[0].id && first.sound === KID_SOUNDS[0].id
      && last.topic === KID_TOPICS[KID_TOPICS.length - 1].id
      && last.sound === KID_SOUNDS[KID_SOUNDS.length - 1].id;
  })(),
  'a wheel that can never reach the last choice is a wheel with a topic'
  + ' nobody is ever offered');

ok('  and every mascot line is written in both languages',
  MASCOT_SAYS.every((one) => one[0].trim() && one[1].trim() && one[0] !== one[1]),
  'a child reading Afrikaans is being talked to in another language');

ok('  and nothing in the room pretends to do something it does not',
  !/Rendered & Saved|Rendered and Saved/i.test(room),
  'Google\'s version had a Render button that says "Video Rendered & Saved!"'
  + ' and renders nothing. A good idea and a button that lies arrive in the'
  + ' same paste');

ok('  and no compliance claim is drawn on the wall as decoration',
  !/COPPA|POPIA/i.test(room),
  'that version had COPPA and POPIA badges on a child\'s wall. A compliance'
  + ' claim is a claim: this app has real legal pages, which are checked, and'
  + ' that is where it belongs');

/* ── 6. Brighter is not looser ────────────────────────────────────────── */

ok('there is still nothing to type in this room',
  !/<input(?![^>]*type="(checkbox|radio|range|color)")/.test(room)
  && !/<textarea/.test(room),
  'a text box is a child typing anything into a prompt that reaches a music'
  + ' model. The colour changed; that rule did not');

console.log(bad === 0
  ? '\n  Twenty-three choices, twenty-three colours, every label readable on the\n'
    + '  one under it — and still nothing in the room to type into.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

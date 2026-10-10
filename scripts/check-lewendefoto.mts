/**
 * A photograph given a little motion.
 *
 * ── What she asked, and why it needed no new engine ──────────────────────
 *
 * Carli, 10 October 2026, reading Google's capability list: *"Ek hou nogal
 * van die funksie Image-to-Video… Ek wonder ook of google se modelle net
 * bietjie motion kan gee aan foto's? Dit kan baie van ons photo editing tools
 * verbeter, en vir al ook vir foto's wat vir bemarking gebruik word en social
 * media."*
 *
 * Veo has taken a start frame since the day it was wired. The difference
 * between "a new scene that happens to begin with her photograph" and "her
 * photograph, moving" is entirely in the PROMPT — so the prompt is the thing
 * that can be wrong here, and a prompt is a string a check can read.
 *
 * ── The three ways this fails, all of them quietly ───────────────────────
 *
 * **It stops being her photograph.** A video model's instinct is to make
 * something happen: a camera push, a cut, somebody walking in — and on a
 * portrait that means the face changes. Nothing throws; the clip is simply of
 * a different person. `HOLD` says the camera is locked and the subject is
 * unchanged, in the same words every time, and it is appended to all of them
 * rather than written into each — because the one that forgets it is the one
 * that comes back wrong.
 *
 * **It does not loop.** A clip that drifts away and stops is a clip. The
 * photograph goes up as the opening frame AND the closing one so the engine
 * has to return to it, which is only possible because of the closing frame
 * added earlier the same day. Sent as a start frame alone it still produces
 * something, so this fails by looking slightly worse rather than by failing.
 *
 * **Two frames on one body.** Each may be three megabytes and the platform
 * refuses past four and a half BEFORE the route runs. The room shrinks and
 * the route counts the total; `check:slotraam` holds the route's half and
 * this holds the room's.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import {
  HOLD, LIVE_SECONDS, MOTIONS, MOTION_DEFAULT, motionById, motionWords,
} from '../app/lib/livingphoto.ts';
import { screen } from '../app/lib/moderation.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/* ── 1. A real variety, and each one a different thing ─────────────────── */

ok(`there is a real variety of motion (${MOTIONS.length})`,
  MOTIONS.length >= 10,
  'one motion is a gimmick; a list is a tool. She asked for a variety in'
  + ' every list of options on 9 October');

ok('  and no two of them ask for the same thing',
  new Set(MOTIONS.map((one) => one.id)).size === MOTIONS.length
  && new Set(MOTIONS.map((one) => one.words)).size === MOTIONS.length,
  'two rows that put the same words in the prompt are one row with two'
  + ' names, and somebody picking between them is picking nothing');

ok('  and each says what it is FOR, not just what it is',
  MOTIONS.every((one) => one.what[1].length > 10),
  '"Drifting clouds" does not tell anybody which of their photographs to use'
  + ' it on, and this list is meant to be one press with no writing');

ok('  and the default is one that suits almost any photograph',
  Boolean(motionById(MOTION_DEFAULT)),
  `${MOTION_DEFAULT} is not in the list, so the room opens on nothing`);

/* ── 2. Every prompt holds the photograph still ────────────────────────── */

for (const one of MOTIONS) {
  const words = motionWords(one.id);
  ok(`  ${one.id} locks the camera and the subject`,
    words.includes(HOLD),
    'a video model told only what MOVES will also move the camera, cut, and'
    + ' change the face — and the clip comes back of a different person with'
    + ' nothing anywhere saying why');

  /* "Nothing else in the scene moves" is the commonest way these say it and
     the first version of this pattern missed it — it looked for `still` or
     `does not move` and five of the twelve say `nothing … moves` instead.
     The check was wrong and the prompts were right, which is worth saying:
     the rule is that each one NAMES what stays put, however it words it. */
  ok(`    and says what must stay still as well as what moves`,
    /\bstill\b|nothing[^.]{0,40}moves?|does not move|do not move|stay exactly/i.test(one.words),
    `"${one.words}" — "subtle" on its own is ignored; naming the things that`
    + ' must not move is what a model actually obeys');
}

ok('the held-still sentence covers the camera, the people and the ending',
  /camera does not move/i.test(HOLD)
  && /same face/i.test(HOLD)
  && /returned to where it started/i.test(HOLD),
  'the camera, so it is a photograph and not a shot; the face, so it is still'
  + ' her picture; the ending, because a loop that does not land back where'
  + ' it began jumps every four seconds');

ok('  and it is written once rather than into each motion',
  MOTIONS.every((one) => !one.words.includes('camera does not move')),
  'thirteen copies of a paragraph is twelve chances for one of them to be'
  + ' missing a line, and the one that is missing it is the one that comes'
  + ' back wrong');

ok('  and an unknown motion still makes a real prompt',
  motionWords('nonsense').includes(HOLD) && motionWords('').length > 100,
  'the credit is taken before the engine is called, so this cannot be the'
  + ' thing that makes a paid press do nothing');

/* ── 3. Every button survives the front door ───────────────────────────── */

for (const one of MOTIONS) {
  const said = screen(motionWords(one.id), 'video');
  ok(`  "${one.says[1]}" is not a button the app would refuse`,
    said === null,
    `${said?.rule ?? ''} — a button this room offers, refused by this app's`
    + ' own front door after somebody pressed it');
}

/* ── 4. The room sends the photograph twice, so it loops ───────────────── */

const room = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));

ok('the photograph goes up as the opening frame AND the closing one',
  /image: frame,/.test(room) && /endImage: frame,/.test(room),
  'sent as a start frame alone the clip drifts away and stops, which still'
  + ' produces something — so this fails by looking slightly worse rather'
  + ' than by failing, and nobody reports it');

ok('  and it is shrunk before it travels, twice over',
  /packOne\(picture, REFERENCE_SIDE, Math\.floor\(BUDGET \/ 2\)\)/.test(room),
  'two 2K frames as base64 are well past what the platform carries, and the'
  + ' engine renders at its own size anyway — half the budget each because'
  + ' both of them go');

ok('  and it asks for the shortest clip there is',
  /seconds: LIVE_SECONDS/.test(room) && LIVE_SECONDS <= 5,
  `${LIVE_SECONDS}s — priced by the second, the motion is meant to be small,`
  + ' and a longer clip gives the engine more room to drift away from the'
  + ' photograph, which is the one way the whole thing fails');

ok('  and in the shape of the post it came from',
  /size\.height > size\.width \? '9:16'/.test(room),
  'a story-shaped post that comes back wide is a post she has to crop, which'
  + ' is the thing this room exists to stop');

ok('  and it is silent, because a photograph has no sound',
  /speak: false,/.test(room),
  'a line spoken over a living photograph is a video, not a photograph');

ok('the clip plays as what it is: looping, muted, by itself',
  /data-postliveout/.test(room) && /\bloop\b/.test(room) && /\bmuted\b/.test(room)
  && /playsInline/.test(room),
  'a play button on a four-second loop is a button nobody presses, and a'
  + ' phone that takes it full screen has lost the point of it');

ok('  and it can be saved and posted from the room it was made in',
  /data-postlivesave/.test(room) && /<ShareRow/.test(room),
  'a thing finished in a room with no way out of that room is a thing'
  + ' somebody has to go looking for');

console.log(bad === 0
  ? '\n  A photograph with a little motion: it loops, it holds still, and every'
    + ' motion is one the front door allows.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * The moment travels to the video desk, not just the song.
 *
 * ── What this guards ─────────────────────────────────────────────────────
 *
 * Carli, 21 September 2026: *"Al die kamers se AI praat nie met mekaar nie.
 * Ek het nou dieselfde gesien by hooks. Ek wou 'n video maak, maar die
 * liedjie hook lê nie daar in video nie en daar is geen prompt in die video
 * desk nie."*
 *
 * "Make a video for it" sent the song's id and the shape. `seconds` was in
 * the callback's own type and the studio dropped it on the floor — so the
 * desk opened with the right song under it, an empty shot box, and no way
 * for anything in that room to know the clip was meant to be about a
 * particular twenty-two seconds.
 *
 * The rule the adverts desk learned the same week: a hand-off is not the
 * fields it CAN carry, it is the fields it does. So this holds the whole
 * set — the shot, the shape, the length and the word to the copilot — and
 * holds the page to sending every one of them.
 *
 * ── And the one the desk would misread ───────────────────────────────────
 *
 * No quotation marks in the shot, ever. The video desk reads a quoted
 * phrase as a line that is SAID: it turns the subtitle on and has the
 * engine speak it. A hook plays the song underneath, so a voice over it is
 * two things fighting.
 *
 * Asked through `spokenLines` — the desk's OWN reader, the one that decides
 * whether there is a line — rather than a quotation-mark rule written here,
 * which could disagree with it and pass while the desk heard a line. The
 * first version of this rule reached for `looksUnquoted`, whose name reads
 * like "has no quotes" and whose job is the opposite: it answers "this
 * mentions speaking and forgot to quote it". It failed a correct shot, which
 * is the right way round to find out.
 */

import { readFileSync } from 'node:fs';
import {
  briefForHook, clockOf, lengthForHook, lookForGenre, shotForHook, videoFromHook,
  type HookCarry,
} from '../app/lib/hookhandover';
import { LENGTHS, spokenLines } from '../app/lib/videoscenes';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const drop: HookCarry = {
  title: 'Rooi Aand',
  genre: 'Amapiano',
  bpm: 112,
  startSeconds: 22,
  seconds: 12,
  kind: 'arrival',
  arrived: 'low',
};

/* ── Everything travels ───────────────────────────────────────────────── */

const wires = videoFromHook(drop);
const ops = wires.map((one) => one.op);
for (const wanted of ['set_prompt', 'set_aspect', 'set_seconds', 'brief']) {
  ok(`the hand-off carries ${wanted}`, ops.includes(wanted), ops.join(', '));
}
ok('  and every one of them goes to the video desk',
  wires.every((one) => one.room === 'canvas'), wires.map((one) => one.room).join(', '));
ok('  and none of them is empty',
  wires.every((one) => one.value.trim().length > 0),
  wires.filter((one) => !one.value.trim()).map((one) => one.op).join(', '));

/* ── The shot says which moment, and what happens at it ───────────────── */

const shot = shotForHook(drop);
ok('the shot says where in the song the cut lands', shot.includes('0:22'), shot.slice(0, 120));
ok('  and what happens there, not just that something does',
  /bass and the kick/.test(shot),
  'a shot that says "something arrives" tells the engine nothing it could draw');
ok('  and what the camera does when it lands', /hold the frame still/.test(shot), shot.slice(-160));
ok('  and that it is upright, because a hook is for a feed held upright',
  /upright/i.test(shot) && wires.find((one) => one.op === 'set_aspect')?.value === '9:16');
ok('  and it is a whole shot rather than one clause', shot.split(/\.\s/).length >= 4,
  `${shot.split(/\.\s/).length} sentences`);

/* The one the desk would misread. */
ok('the shot never quotes anything, so nothing is spoken over the song',
  spokenLines(shot).length === 0 && !/["“”]/.test(shot),
  `a quoted phrase turns the subtitle on and has the engine say it over the track — ${spokenLines(shot).join(' | ')}`);
/* And the same for every written look it can reach for, not only the one
   this file happens to sample. A shot is the genre's paragraph plus two
   sentences of ours, so a quoted line anywhere in that library would come
   out of this hand-off eventually and only on somebody's particular song. */
const quoted = ['Amapiano', 'Gqom', 'Sokkie', 'polka', 'gospel', 'afro / amapiano']
  .map((one) => ({ one, shot: shotForHook({ ...drop, genre: one }) }))
  .filter((each) => spokenLines(each.shot).length > 0 || /["“”]/.test(each.shot));
ok('  for every look it can reach for, not only this one',
  quoted.length === 0, quoted.map((each) => each.one).join(', '));

/* ── The look is the genre's own, and a wrong one is refused ──────────── */

ok('a genre we have written a look for gets that look',
  (lookForGenre('Amapiano') ?? '').length > 40, String(lookForGenre('Amapiano')));
ok('  matched loosely, because a stored genre is not one of our ids',
  lookForGenre('afro / amapiano') !== null, String(lookForGenre('afro / amapiano')));
ok('  and a genre we have not written gets none rather than a wrong one',
  lookForGenre('polka') === null, String(lookForGenre('polka')));
ok('  but the shot is still whole without one',
  shotForHook({ ...drop, genre: 'polka' }).length > 200);

/* ── The length is one the desk will take, and never overruns ─────────── */

for (const seconds of [4, 7, 12, 18, 45]) {
  const picked = lengthForHook(seconds);
  ok(`a ${seconds}-second moment becomes a length the desk offers (${picked}s)`,
    LENGTHS.some((one) => one.seconds === picked) && picked <= Math.max(seconds, LENGTHS[0].seconds),
    `${picked}s for ${seconds}s`);
}

/* ── The clock reads like a clock ─────────────────────────────────────── */

ok('a time is written the way a person reads one',
  clockOf(22) === '0:22' && clockOf(95) === '1:35' && clockOf(0) === '0:00',
  `${clockOf(22)} ${clockOf(95)} ${clockOf(0)}`);

/* ── And the copilot in that room is told ─────────────────────────────── */

const brief = briefForHook(drop);
ok('the copilot in the video desk is told where they came from', /hooks room/i.test(brief));
ok('  and which song, in her own title', brief.includes('Rooi Aand'));
ok('  and that the song is already the sound, so nothing is spoken',
  /nothing to be said or sung/i.test(brief),
  'without this it offers to write a voiceover over her own track');

/* ── The page sends all of it, not the shape alone ────────────────────── */

const page = readFileSync('app/page.tsx', 'utf8');
const hooks = readFileSync('app/components/Hooks.tsx', 'utf8');
ok('the studio sends every wire the hand-off builds',
  /for \(const wire of videoFromHook\(hook\)\)/.test(page),
  'sending a chosen few is how this came to send the shape and nothing else');
ok('  and hands off rather than dispatching, because that room is not open yet',
  /copilotBus\.handoff\(wire\.room, wire\.op, wire\.value\)/.test(page),
  'dispatch reaches a mounted room, and the desk mounts after the move');
ok('  and the song still goes under the desk', /setVideoSong\(trackId\)/.test(page));
/* Read inside the button's own call, not anywhere in the file.
 
   The first version of this looked for `startSeconds: hook.startSeconds`
   in Hooks.tsx and passed with the field deleted from the hand-off —
   because the room's own cut path builds a clip out of exactly the same
   two words, twice, further up. A rule that a file passes for somebody
   else's reason is not a rule. */
const call = /onMakeVideo\(\{[\s\S]{0,900}?\n\s*\}\);/.exec(hooks)?.[0] ?? '';
ok('the hooks room hands over the whole moment, not its length',
  call !== '' && /startSeconds: hook\.startSeconds/.test(call) && /kind: hook\.kind/.test(call),
  call ? `it hands over: ${call.replace(/\s+/g, ' ').slice(0, 140)}` : 'no onMakeVideo call found');
ok('  including what the song is, so a shot can be written from it',
  /genre: selected\.genre/.test(call) && /title: selected\.title/.test(call),
  'without the genre every hook gets the same neutral look');

if (failures) {
  console.error(`\ncheck:hookcarry — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(
  '\ncheck:hookcarry — a moment picked in the hooks room arrives at the video desk as a whole'
  + ' shot with its genre’s look, the shape, a length the desk offers, and a word to the copilot'
  + ' standing in it — and nothing in the shot is quoted, so nothing is spoken over the song.',
);

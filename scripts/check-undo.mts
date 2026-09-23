/**
 * Taking it back, and the two ways a history like this ships looking done.
 *
 * ── Why the booth has never had one ──────────────────────────────────────
 *
 * Carli: *"ek wil 'n ordentlike probooth bou."*
 *
 * The room's doctrine is that almost nothing costs anything — a cut points
 * at the recording rather than replacing it, a move is a number, and all of
 * it is undone by dragging an edge back. True, and the reason the room is
 * cheap to use. It is also not undo, and the room's own prose admits where
 * it runs out: *"The fade is the one exception — it is written into the
 * sound."* Taking the room off a lane does the same and throws the amp away
 * with it; deleting a lane leaves no edge to drag at all.
 *
 * ── The two ways this ships looking finished ─────────────────────────────
 *
 * 1. A change that slips past the history. Undo is not a feature somebody
 *    tries, it is a thing somebody REACHES FOR while flustered, and one
 *    operation that never told the stack anything makes the whole button
 *    untrustworthy — worse than no button, because the button says the work
 *    is recoverable. So the rule below is not "there is a history"; it is
 *    that every place the lanes are replaced either remembers first or is
 *    named here as deliberately free, with a reason.
 *
 * 2. A cap that caps nothing. Almost every step shares all its audio with
 *    the step before — a gain, a move, a mute, a cut. Those cost a few
 *    hundred bytes. A fade and a clean each put a whole new recording in
 *    memory, about sixty-six megabytes for three minutes of stereo. "Keep
 *    twenty steps" bounds nothing, and weighing each step and adding the
 *    weights up is worse: twenty steps sharing one recording would come to
 *    one and a third gigabytes, so the history would throw itself away to
 *    stay under a limit it was never near. Green for an adjacent reason —
 *    it measures something, just not the thing that decides whether the tab
 *    survives. The rules below run the real module and prove it counts each
 *    recording once.
 */

import { readFileSync } from 'node:fs';
import { KEEP_BYTES, KEEP_STEPS, bytesOf, makeHistory, type Holder } from '../app/lib/undo';
import { before, from, upTo } from './order.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const booth = readFileSync('app/components/ProBooth.tsx', 'utf8');
const words = readFileSync('app/lib/i18n.tsx', 'utf8');

/* ── 1. Nothing replaces the lanes without the history hearing about it ── */

/**
 * Every `setLanes(` in the room, with the twenty lines above it.
 *
 * Twenty rather than the whole handler because a handler here can be a
 * hundred lines with three awaits in it, and a `remember` belonging to some
 * other branch of it is not this call's guard. Twenty is enough room for
 * the `if` guards and the `try` that normally sit between them.
 */
const calls: { at: number; above: string; around: string }[] = [];
const lines = booth.split('\n');
for (let n = 0; n < lines.length; n += 1) {
  if (!lines[n].includes('setLanes(')) continue;
  calls.push({
    at: n + 1,
    /* What may count as having remembered: above only. A `remember` BELOW a
       `setLanes` is the fault the third rule is about, not a guard. */
    above: lines.slice(Math.max(0, n - 20), n + 1).join('\n'),
    /* What identifies WHICH call site this is: either side, because the
       thing that names a site is as often the line that opens the function
       below the setter as the one above it. */
    around: lines.slice(Math.max(0, n - 20), n + 10).join('\n'),
  });
}

/**
 * The places that replace the lanes and deliberately do NOT remember.
 *
 * Every one is here because putting it on the stack would make the history
 * worse, not because it was awkward to wire. A line number would rot on the
 * next edit, so each is matched on what the line says.
 */
const FREE: { readonly says: string; readonly why: string }[] = [
  { says: 'history.current.undo(', why: 'the history\'s own hand going back — remembering here would push the state somebody just escaped' },
  { says: 'history.current.redo(', why: 'the history\'s own hand going forward, for the same reason' },
  { says: 'setLanes(back)', why: 'reading the kept session off the device at startup: there is nothing yet to go back TO' },
  { says: 'was.some((lane) => lane.backing)', why: 'seeding the song as the first lane on mount, which makes the session rather than changing one' },
  { says: 'setLanes((was) => [', why: 'a lane ADDED — recorded, uploaded, generated or brought in. Nothing is lost, and the remove button beside it is the way back' },
  { says: 'const change = (id: string, how: Partial<Lane>)', why: 'a name, a level, a pan, a mute, a solo, a start time, the tone stack, the rack or the amp: every one of them a number or a switch the same control puts back, which is the room\'s whole doctrine. Putting each nudge of a fader on the stack would fill the history with twenty of them and push the fade off the end' },
  { says: 'const slide = (moves:', why: 'a drag, which fires once per frame. Twenty entries for one gesture, and the edge goes back by dragging it' },
  { says: 'const interlock = (id: string, other: string)', why: 'locking two lanes together is one string on a lane, taken off by the button that put it on' },
  { says: 'const shuffleLane = (id: string, way: -1 | 1)', why: 'moving a lane up or down changes no sound, and the other arrow moves it back' },
  { says: 'moves.find((one) => one.laneId === lane.id)', why: 'the mixer applying its faders: levels and pans, the same free family as change()' },
];


const free = (near: string): string | null =>
  FREE.find((one) => near.includes(one.says))?.why ?? null;

const loose = calls.filter((call) => !call.above.includes('remember(') && !free(call.around));

ok(`every change to the lanes is remembered or named free — ${calls.length} places`,
  loose.length === 0,
  `${loose.length} at line(s) ${loose.map((one) => one.at).join(', ')}: either call remember('…') before it, `
  + 'or add it to FREE in this file with the reason it must not go on the stack');

ok('  and the funnel every region operation goes through remembers once',
  before(booth, 'remember(what);', 'const kept = pieces.filter('),
  'a fade, a cut, a keep, a repeat and a send all land in commit(); if it does not remember, none of them do');

ok('  and it remembers BEFORE the change, not after',
  !/setLanes\([\s\S]{0,200}?remember\(/.test(booth),
  'the stack holds what to go BACK to, so it must be read while it is still true; '
  + 'remembering afterwards stores the state somebody is trying to escape');

/* The three that cannot be undone by dragging an edge. Each is named rather
   than counted, because "three of them remember" is satisfied by any three. */
for (const [what, near] of [
  ['the fade, which is written into the sound', "undo.fade"],
  ['taking the room off, which replaces the recording', "undo.clean"],
  ['a lane thrown out, which leaves no edge to drag', "undo.lane"],
  ['clearing every lane at once', "undo.all"],
] as const) {
  ok(`  ${what}`, booth.includes(`'${near}'`), `nothing in the room remembers ${near}`);
}

/* ── 2. The buttons, and what they say ──────────────────────────────── */

ok('there is an undo and a redo where the way out already is',
  /data-undo/.test(booth) && /data-redo/.test(booth),
  'a control somebody has to go looking for is one more wrong press while they are already flustered');

ok('  each shut off when there is nothing, rather than pressing to no effect',
  before(booth, 'data-undo', 'disabled={undoWhat === null}')
  && before(booth, 'data-redo', 'disabled={redoWhat === null}'),
  'a button that answers nothing is indistinguishable from one that is broken');

ok('  and each says WHICH thing comes off, not just "undo"',
  /\$\{undoWhat\}/.test(booth) && /\$\{redoWhat\}/.test(booth),
  'a bare arrow leaves somebody guessing which of their last four moves is about to be unwound');

ok('  in Afrikaans as well as English',
  /"undo\.fade": \{ en: "the fade", af: "die in- of uitdoof" \}/.test(words)
  && /"undo\.does": \{ en: "Undo", af: "Herstel" \}/.test(words),
  'the room is Afrikaans and the one control somebody presses in a panic is not');

/* ── 3. The cap, run rather than read ───────────────────────────────── */

const sound = (seconds: number) => ({ length: Math.round(seconds * 48000), numberOfChannels: 2 });
const lane = (audio: { length: number; numberOfChannels: number }): Holder => ({ audio });
const THREE_MIN = sound(180);

ok(`a full-length stereo recording is about ${Math.round(bytesOf(THREE_MIN) / 1024 / 1024)} MB`,
  bytesOf(THREE_MIN) > 50 * 1024 * 1024 && bytesOf(THREE_MIN) < 90 * 1024 * 1024,
  'if this is out, every number below is out with it');

/* THE rule. Twenty steps that share one recording hold one recording. */
{
  const shared = lane(THREE_MIN);
  const history = makeHistory<Holder>();
  for (let step = 0; step < 20; step += 1) history.remember(`step ${step}`, [shared]);
  ok('twenty steps sharing one recording are weighed as one recording',
    history.held() === bytesOf(THREE_MIN),
    `held ${Math.round(history.held() / 1024 / 1024)} MB for ${Math.round(bytesOf(THREE_MIN) / 1024 / 1024)} MB of audio `
    + '— adding each step\'s weight up is the fault this rule exists for: the history evicts itself '
    + 'to stay under a ceiling it was nowhere near');
}

/* And that it does bite when the recordings really are different. */
{
  const history = makeHistory<Holder>();
  for (let step = 0; step < 20; step += 1) history.remember(`step ${step}`, [lane(sound(180))]);
  ok('  and twenty different recordings are cut down to fit',
    history.held() <= KEEP_BYTES,
    `held ${Math.round(history.held() / 1024 / 1024)} MB against a ceiling of ${Math.round(KEEP_BYTES / 1024 / 1024)} MB`);
}

/* The floor: one step is always kept, however heavy, or the button is a lie
   in exactly the case it was built for — a long song and one fade. */
{
  const history = makeHistory<Holder>();
  history.remember('one enormous thing', [lane(sound(3600))]);
  ok('  and the single step somebody is about to undo is never the one dropped',
    history.undoable() === 'one enormous thing',
    'a history that refuses to hold one step is not a history');
}

/* Back, forward, and back again. */
{
  const a = lane(sound(1)); const b = lane(sound(1));
  const history = makeHistory<Holder>();
  history.remember('the fade', [a]);
  const back = history.undo([b]);
  ok('undo hands back what was there, and redo hands back what was undone',
    back?.lanes.length === 1 && back.lanes[0] === a
    && history.redoable() === 'the fade'
    && history.redo([a])?.lanes[0] === b,
    'redo has to be given the CURRENT lanes, which is the half that is easy to get wrong');
}

{
  const history = makeHistory<Holder>();
  history.remember('one', [lane(sound(1))]);
  history.undo([]);
  history.remember('two', [lane(sound(1))]);
  ok('  and a new change throws the way forward away',
    history.redoable() === null,
    'the future on the stack was a future of the state that was just left');
}

ok(`the step count is a working session's worth — ${KEEP_STEPS}`,
  KEEP_STEPS >= 10 && KEEP_STEPS <= 50,
  'under ten cannot get somebody out of a wrong turn taken five minutes ago');

ok(`and the ceiling holds a long song more than once — ${Math.round(KEEP_BYTES / 1024 / 1024)} MB`,
  KEEP_BYTES >= 2 * bytesOf(THREE_MIN) && KEEP_BYTES <= 512 * 1024 * 1024,
  'below two full-length recordings it cannot hold a single undo of a long song, which is what it is for');

/* ── 4. The mix on file is not the mix any more ──────────────────────── */

const stepping = upTo(from(booth, 'const stepBack = useCallback'), 'const stepForward');
ok('an undo marks the bounced mix stale',
  stepping.includes('setStale(true)') && from(booth, 'const stepForward').includes('setStale(true)'),
  'a download still offering the file rendered before the undo is the same lie as one offering it after a fade');

if (failures) {
  console.log(`\ncheck:undo — ${failures} failure(s).`);
  process.exit(1);
}
console.log(
  '\ncheck:undo — nothing the booth does to the lanes escapes the history, the button says which thing '
  + 'comes off, and the memory ceiling counts each recording once rather than once per step.',
);

/**
 * Simple is the copilot and a button. Everything is the whole desk.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Bo in make a song moet daar 'n simple button
 * wees, en 'n everything, die simple moet net 'n copilot wees, en die
 * copilot moet alles skryf en die styl, stemkeuse, en lengte van liedjie.
 * Daarna moet daar net staan make song. Met everything bladsy sluit dit
 * alles in wat nou daar is."*
 *
 * There WAS a Simple, and it was not this. It hid the advanced controls and
 * still asked for three things — a name, the words, and what it should sound
 * like. Three things more than somebody who came here to say "write me a
 * song about my dog" wants to fill in. And it sat four cards down, inside
 * the card it controlled, so a person met the whole desk before they met the
 * choice about how much of it to see.
 *
 * ── The three ways this goes wrong, and two are silent ───────────────────
 *
 * **Simple turns something off.** It must hide controls, never reset them. A
 * length, a key, a trained sound set in Everything still goes to the engine
 * — and the room has to SAY so, because a setting that applies while its
 * control is out of sight is worse than a crowded screen. This app has
 * already hidden four working features once by taking things away.
 *
 * **Simple shows nothing of what the copilot wrote.** A canvas somebody
 * cannot see is a canvas they cannot correct, and they find out what the
 * copilot decided by paying for a song.
 *
 * **The button is not the only other thing.** "Daarna moet daar net staan
 * make song." One more control in Simple and it is not Simple.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));

/* ── 1. The choice is at the top ───────────────────────────────────────── */

ok('the room opens with the choice between the two',
  /data-makemode\b/.test(room),
  'it used to be inside the card it controlled, four cards down');

ok('  and it really is above the desk',
  (() => {
    const mode = room.indexOf('data-makemode');
    const first = room.indexOf('htmlFor="song-name"');
    return mode > 0 && first > 0 && mode < first;
  })(),
  'a choice about how much of the desk to show, met after the desk, is a'
  + ' choice nobody makes');

ok('  and both are named rather than hidden in a dropdown',
  /make\.modeSimple/.test(room) && /make\.modeAll/.test(room),
  'two things, both worth naming');

/* ── 2. Simple is the copilot and the button ───────────────────────────── */

ok('Simple draws its own panel instead of the desk',
  /data-makesimple\b/.test(room) && /\{!advanced && \(/.test(room),
  'the whole point is that the fields are not there');

ok('  and the desk is behind the other one',
  /\{advanced && \(\s*<>/.test(room),
  'Everything includes everything that is there now, which means the desk'
  + ' and the controls that used to be behind a second switch inside it');

ok('  and Simple shows what the copilot has written',
  /data-makesimpleread/.test(room),
  'a canvas somebody cannot see is a canvas they cannot correct, and they'
  + ' find out what the copilot decided by paying for a song');

ok('  and shows it only once there is something to show',
  /\{\(title\.trim\(\) \|\| lyrics\.trim\(\) \|\| canvas\.style\.trim\(\)\) && \(/.test(room),
  'an empty frame under a sentence asking somebody to talk to the copilot'
  + ' reads as the copilot having failed');

/* ── 3. Nothing is switched off ────────────────────────────────────────── */

ok('Simple hides the controls and does not reset them',
  !/setSeconds\(\d+\);?\s*$/m.test(room.slice(room.indexOf('data-makesimple'), room.indexOf('data-makesimple') + 2000))
  && /changedFromDefault/.test(room),
  'a length, a key or a trained sound set in Everything still goes to the'
  + ' engine. Resetting them on a mode change is the room silently undoing'
  + ' her work');

ok('  and says so when anything is away from its default',
  /data-makeinforce/.test(room) && /make\.inForce/.test(room),
  'a setting that applies while its control is out of sight is worse than a'
  + ' crowded screen, and this app has hidden four working features once'
  + ' already by taking things away');

ok('  and that line is only drawn when there IS something',
  /\{!advanced && changedFromDefault\.length > 0 && \(/.test(room),
  '"Still set from Everything:" with nothing after it is a sentence that'
  + ' worries somebody about nothing');

/* ── 4. The one button ─────────────────────────────────────────────────── */

ok('the make button is outside the switch, so Simple has one',
  (() => {
    /* Read the branch by its indentation rather than by the nearest `</>`:
       the desk holds a second `{advanced && (` inside it, so "the last
       fragment close before the button" is satisfied by a button sitting
       deep inside the branch. Found that by moving the button there and
       watching this pass. */
    const lines = room.split('\n');
    const opens = lines.findIndex((line) => line === '        {advanced && (');
    if (opens < 0) return false;
    const shuts = lines.findIndex((line, at) => at > opens && line === '        )}');
    const button = lines.findIndex((line) => line.includes('onClick={() => make()}'));
    return shuts > opens && button > shuts;
  })(),
  '"Daarna moet daar net staan make song" — a button inside the Everything'
  + ' branch leaves Simple with no way to make anything');

ok('  and the choice is remembered between visits',
  /window\.localStorage\.setItem\(MODE_KEY/.test(room),
  'somebody who has gone looking for the controls once should not have to'
  + ' go looking again');

console.log(bad === 0
  ? '\n  Simple is the copilot and a button; Everything is the whole desk.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * The video desk: Simple is the copilot and a button, Everything is the desk.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek wonder met video desk of dit nie ook so kan
 * werk met simpl as net 'n copilot en 'n everything."* Said straight after
 * the same two landed on Make a song, so the shape is settled; what is not
 * settled is that this desk is a harder room to cut in half than that one.
 *
 * ── Why this desk is the harder one ──────────────────────────────────────
 *
 * Make a song hides a name, some words and a style. This desk hides six kinds
 * of video, a genre row, a song window, the shot box, a start frame, a
 * quality row with a thirteen-to-one price spread on it, a caption, a logo
 * switch, a voice switch, a shape row, a length row and a twelve-shot
 * storyboard with a button of its own. Three of those go wrong silently:
 *
 * **The grade.** Premium costs thirteen times Standard. Left on Premium three
 * visits ago and then hidden, the cheap-looking button is not the cheap one.
 *
 * **The shape.** A tall clip made by somebody who believed they were making a
 * wide one is a clip they pay for twice.
 *
 * **The quotation marks.** This is the one the desk teaches, in its own words
 * — "anything in quotation marks is spoken aloud" — and it teaches it inside
 * the shot card, which is exactly what Simple takes away. A line written
 * without quotes comes back drawn at rather than said: the clip looks
 * finished and the thing it was made for is missing. Of all the panels on
 * this desk that one has to survive into Simple.
 *
 * ── And the promise has to be true ───────────────────────────────────────
 *
 * Simple says the copilot writes the shot, the quality, the shape and the
 * length. The copilot can only set what the desk gives it an op for, and it
 * had three of those four: there was no way for it to set the grade. So the
 * sentence would have been a lie in the one place it costs money, and a
 * copilot writing a spoken line onto a desk left on Standard writes something
 * that cannot be said. The op is checked here, in both places it has to
 * exist, because a promise in a sentence is not a feature.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const desk = withoutComments(readFileSync('app/components/VideoCanvas.tsx', 'utf8'));
const surfaces = withoutComments(readFileSync('app/lib/surfaces.ts', 'utf8'));

/* ── 1. The choice is the first thing under the heading ────────────────── */

ok('the desk opens with the choice between the two',
  /data-canvasmode\b/.test(desk),
  'a choice about how much of a page to show, met after the page, is a choice'
  + ' nobody makes');

ok('  and it really is above the desk',
  (() => {
    const mode = desk.indexOf('data-canvasmode');
    const first = desk.indexOf("'canvas.pickWhat'");
    return mode > 0 && first > 0 && mode < first;
  })(),
  'the kinds-of-video row is the first thing on the desk, so the switch has'
  + ' to be above that');

ok('  and both are named rather than hidden in a dropdown',
  /canvas\.modeSimple/.test(desk) && /canvas\.modeAll/.test(desk),
  'two things, both worth naming');

/* ── 2. Simple is the copilot and the button ───────────────────────────── */

ok('Simple draws its own panel instead of the desk',
  /data-canvassimple\b/.test(desk) && /\{!advanced && \(/.test(desk),
  'the whole point is that the eleven controls are not there');

ok('  and the desk is behind the other one',
  /\{advanced && \(\s*<>/.test(desk),
  '"met everything bladsy sluit dit alles in wat nou daar is"');

ok('  and Simple shows what the copilot has written',
  /data-canvassimpleread/.test(desk),
  'a desk somebody cannot see is a desk they cannot correct, and they find'
  + ' out what the copilot decided by paying three minutes and up to sixty'
  + ' credits for it');

ok('  and shows it only once there is something to show',
  /\{prompt\.trim\(\) && \(/.test(desk),
  'an empty frame under a sentence asking somebody to talk to the copilot'
  + ' reads as the copilot having failed');

/* ── 3. The quotation-mark rule survives into Simple ───────────────────── */

ok('the one silent fault is carried into the Simple panel',
  (() => {
    const from = desk.indexOf('data-canvassimple');
    const to = desk.indexOf('\n      {advanced && (', from);
    if (from < 0 || to < 0) return false;
    const panel = desk.slice(from, to);
    return /data-canvassimplesaid/.test(panel) && /canvas\.unquoted/.test(panel);
  })(),
  'the quotation-mark panel lives in the shot card, which is the thing Simple'
  + ' takes away. A line written without quotes comes back drawn at rather'
  + ' than said: the clip looks finished and the thing it was made for is'
  + ' missing');

/* ── 4. Nothing is switched off ────────────────────────────────────────── */

ok('the desk says what is still set behind the switch',
  /data-canvasinforce/.test(desk) && /canvas\.inForce/.test(desk),
  'a setting that applies while its control is out of sight is worse than a'
  + ' crowded screen, and this app has hidden four working features once'
  + ' already by taking things away');

ok('  and that line is only drawn when there IS something',
  /\{!advanced && changedFromDefault\.length > 0 && \(/.test(desk),
  '"Still set from Everything:" with nothing after it is a sentence that'
  + ' worries somebody about nothing');

ok('  and it names the two that cost money when they are wrong',
  (() => {
    const from = desk.indexOf('const changedFromDefault');
    if (from < 0) return false;
    const memo = desk.slice(from, from + 1400);
    return /grade !== 'standard'/.test(memo)
      && /aspect !== '16:9'/.test(memo)
      && /seconds !== 5/.test(memo);
  })(),
  'Premium is thirteen times Standard, and a tall clip made by somebody who'
  + ' believed they were making a wide one is a clip they pay for twice');

/* ── 5. The one button ─────────────────────────────────────────────────── */

ok('the make button is outside the switch, so Simple has one',
  (() => {
    /* Read the branch by its fragment rather than by indentation: the desk's
       own children were never re-indented, so there are a dozen `)}` at the
       branch's own indent and "the first one after the open" lands inside a
       nested conditional. The fragment tags are one each, and the check says
       so rather than assuming it. */
    const lines = desk.split('\n');
    const opens = lines.filter((line) => line === '        <>');
    const shuts = lines.filter((line) => line === '        </>');
    if (opens.length !== 1 || shuts.length !== 1) return false;
    const shut = lines.findIndex((line) => line === '        </>');
    const button = lines.findIndex((line) => line.includes('onClick={make}'));
    return button > shut;
  })(),
  'the button was the last thing inside the shot card, which would leave'
  + ' Simple with no way to make anything');

ok('  and the storyboard, which has a button of its own, is behind Everything',
  (() => {
    const board = desk.indexOf('<Storyboard');
    if (board < 0) return false;
    return /\{advanced && \(\s*<Storyboard/.test(desk);
  })(),
  'a second form with a second button and its own total is the opposite of'
  + ' "net ’n copilot"');

ok('  and the choice is remembered between visits',
  /window\.localStorage\.setItem\(MODE_KEY/.test(desk),
  'somebody who has gone looking for the controls once should not have to go'
  + ' looking again');

/* ── 6. The sentence Simple prints is true ─────────────────────────────── */

ok('the copilot can reach all four things Simple says it writes',
  ['set_prompt', 'set_grade', 'set_aspect', 'set_seconds']
    .every((op) => new RegExp(`${op}: \\(value\\)`).test(desk)),
  'Simple says the copilot writes the shot, the quality, the shape and the'
  + ' length. It can only set what this desk gives it an op for');

ok('  and the quality is described to it, not just accepted',
  /set_grade:/.test(surfaces) && /standard, better or premium/.test(surfaces),
  'an op the model is not told about is an op the model never calls, and a'
  + ' copilot that writes a quoted line onto a desk left on Standard has'
  + ' written something that cannot be said');

console.log(bad === 0
  ? '\n  The video desk: Simple is the copilot and a button, and the promise it\n'
    + '  prints is one the copilot can actually keep.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

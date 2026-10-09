/**
 * A reference becomes a style, and no name goes with it.
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 9 October 2026: *"'n mens kan vir gemini vra dat jy 'n liedjie soek
 * wat baie klink soos michael jackson se liedjie beat it, en dit kry dit
 * regtig reg om dit 'n moontlikheid te maak."* And then the sentence that
 * made it buildable: *"google is ook nie bereid om copy write wette te
 * oortree nie, dit kry dit net mooi reg om die 80's se styl in baie nader
 * aan daardie formaat te genereer."*
 *
 * ── Why the door is held open by a check and not by care ─────────────────
 *
 * `moderation.ts` refuses two things that look alike and are not. Naming an
 * artist to describe a SOUND is a request for an era and a format, which is
 * nobody's property. Naming a person to get their VOICE is impersonation,
 * and the file's own header calls it the single largest legal exposure this
 * app has.
 *
 * This feature puts a door beside the first. The flag that opens it,
 * `sayItInstead`, is set on exactly one refusal — and nothing stops a later
 * hand setting it on the other except an assertion that counts them. That is
 * the first thing below and the reason this file exists.
 *
 * ── And the guard that is not a prompt ───────────────────────────────────
 *
 * The system prompt asks for no names. A prompt is a request. `clean()` is
 * the rule: the returned style is matched against every name that went in,
 * on whole words, and a style still carrying one is thrown away rather than
 * sent. It is driven here on the exact case it was written for — "Beat It"
 * must not strip the word "beat", which is a drum.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { CREDITS } from '../app/lib/credits.ts';
import { clean } from '../app/lib/server/styleword.ts';
import { screen } from '../app/lib/moderation.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

console.log('\nA reference becomes a style, and no name goes with it\n');

/* ── 1. Exactly one refusal has a door ───────────────────────────────── */

/* Her own words, in her own case. Every one of these was ALLOWED until 9
   October: `NAME_SHAPE` required a capital letter, and nobody capitalises on
   a phone. Written in lower case on purpose. */
for (const asked of [
  'klink soos michael jackson',
  'make me a song in the style of michael jackson',
  "make it in michael jackson's style",
  'in beyonce se styl',
]) {
  const said = screen(asked, 'song');
  ok(`"${asked}" is refused, and offers another way`,
    Boolean(said) && said?.sayItInstead === true,
    said
      ? 'it is refused and offers nothing, so the translation cannot be'
        + ' reached from where somebody actually meets the wall'
      : 'it is not refused at all — the larger problem, and true of every one'
        + ' of these in lower case until the name list was matched without'
        + ' capitals');
}

/* And the rule that must never grow a door. These possessive forms were
   allowed in every case until 9 October, capitalised or not: both cues put
   the name AFTER the words, and this is how people write it. */
for (const asked of [
  "sing it in michael jackson's voice",
  "in Michael Jackson's voice",
  'gesing in brenda fassie se stem',
  'a song sung by Michael Jackson',
]) {
  const said = screen(asked, 'song');
  ok(`  "${asked}" is refused with no door at all`,
    Boolean(said) && !said?.sayItInstead,
    said
      ? 'the voice refusal carries `sayItInstead`, so the largest exposure'
        + ' this app has just grew a door — a voice identifies a person, and'
        + ' no translation makes that request something else'
      : 'it is not refused, which is worse than anything else in this file');
}

/* Ordinary sentences are not swept up by either. A guard that refuses good
   work is one somebody turns off. */
for (const fine of [
  'a warm acoustic song about the sea',
  "the queen's speech on a sunny day",
  'early-80s funk-rock with gated drums and a four-on-the-floor beat',
]) {
  ok(`  and "${fine}" is left alone`,
    screen(fine, 'song') === null,
    'an innocent sentence is refused, which is how a screen stops being'
    + ' trusted');
}

/* Counted off the source as well, because a second door added in a year
   would pass every case above while opening something none of them names.
   The fourth argument to `refuse` is the only way to set the flag. */
const rules = withoutComments(readFileSync('app/lib/moderation.ts', 'utf8'));
const doors = (rules.match(/\n\s*true,\n\s*\);/g) ?? []).length;
ok('  and only one refusal in the whole file has a door',
  doors === 1,
  `${doors} refusal(s) pass a fourth argument to \`refuse\` — every one is a`
  + ' rule with a way around it, and this feature justifies exactly one');

/* ── 2. The guard, on the case it was written for ────────────────────── */

ok('a style still carrying a name is thrown away',
  !clean('a song that sounds like Michael Jackson, 138 bpm', ['Michael Jackson']),
  'the name survived into the style line, which is the exact request refused'
  + ' at the front door arriving through the back one');

ok('  and "Beat It" does not strip the word "beat"',
  clean('early-80s funk-rock, hard syncopated bass, a four-on-the-floor beat', ['Beat It']),
  'a clean style line was thrown away because it contains a drum — matching'
  + ' on substrings rather than whole words makes the guard useless by'
  + ' rejecting everything good');

ok('  while the whole name as a phrase is still caught',
  !clean('clipped percussive vocal, a hard beat it drives on', ['Beat It']),
  'the phrase went through because only single words are matched — which'
  + ' leaves the exact name this feature is named for reaching the engine');

ok('  and a short word in a name cannot veto a style',
  clean('gated reverb on a tight snare, clean single-coil guitar', ['The Who']),
  '"The" and "Who" are three letters; matching on them refuses every style'
  + ' line in English');

ok('  and a name in a different case is still caught',
  !clean('bright 80s pop in the manner of PRINCE, 120 bpm', ['Prince']),
  'case folding is missing, so a capitalised name walks through');

ok('  and nothing dropped means nothing to check',
  clean('138 bpm funk-rock with gated drums', []),
  'an empty list refuses everything, so a prompt that named nobody cannot be'
  + ' translated either');

/* ── 3. The route spends, refunds, and screens both ways ─────────────── */

const route = withoutComments(readFileSync('app/api/styleword/route.ts', 'utf8'));

ok('the route charges for the call',
  /charge\(request, CREDITS\.styleword/.test(route),
  'it reaches Anthropic for free, which is how a bill grows with no feature'
  + ' to explain it');

ok('  and gives it back whenever nothing usable comes out',
  (route.match(/paid\.refund\(\)/g) ?? []).length >= 4,
  `${(route.match(/paid\.refund\(\)/g) ?? []).length} refund(s) — a refusal, a`
  + ' mangled answer, a style the guard throws away and a fault are four ways'
  + ' to pay for nothing');

ok('  and runs the guard before it answers',
  /if \(!clean\(parsed\.style, parsed\.dropped\)\)/.test(route),
  'the model\'s own word is taken for it — and the system prompt asking for'
  + ' no names is a request, not a rule');

ok('  and screens what comes back as well as what went in',
  (route.match(/screen\(/g) ?? []).length >= 2,
  'the translation skips the front door everything else goes through, which'
  + ' makes this route the way round it');

ok('  and passes a refusal that is not this one straight back',
  /refused && !refused\.sayItInstead/.test(route),
  'it translates a request it should have refused — a named official or a'
  + ' voice is not made safe by being described instead of named');

/* ── 4. The room offers it where the wall is ─────────────────────────── */

const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
const call = withoutComments(readFileSync('app/lib/engines.ts', 'utf8'));

ok('the refusal carries its flag all the way to the room',
  /class Refused/.test(call) && /sayItInstead/.test(call),
  'the music call throws a plain `Error`, which carries a sentence and'
  + ' nothing else — so the room cannot tell this refusal from any other and'
  + ' the translation can never be offered');

ok('  and the room only offers it when the refusal says so',
  /error instanceof Refused && error\.sayItInstead/.test(room),
  'the offer is drawn on any failure, which means it appears after a voice'
  + ' refusal too — the one rule that must never have a way round it');

ok('  and the offer is where the refusal is read',
  /data-sayitinstead/.test(room) && /\{canSayIt &&/.test(room),
  'there is no button, so the route exists and nobody can reach it');

ok('  and it says what it costs before it is pressed',
  /CREDITS\.styleword\}/.test(room),
  'a button that spends without saying so is the one thing this app does not'
  + ' do — every control that costs says what it costs before it runs');

ok('  and it puts the answer back in the style field',
  /setCanvas\(\(was\) => \(\{ \.\.\.was, style: said\.style/.test(room),
  'the translation is shown and not applied, so somebody has to retype it —'
  + ' which is the hand translation the refusal already asked for');

ok('  and says what was swapped rather than correcting quietly',
  /said\.says/.test(room),
  'the style changes under them with no explanation, and the next thing they'
  + ' do is edit a sentence they did not write and were not told about');

/* ── 5. The price is the one in the table ────────────────────────────── */

ok('the style translation costs less than the advert writer',
  CREDITS.styleword > 0 && CREDITS.styleword < CREDITS.adLines,
  `${CREDITS.styleword} against ${CREDITS.adLines} — this is a step on the way`
  + ' to buying a song rather than a product somebody buys, and pricing the'
  + ' doorway like the room is how the sale is lost at the door');

ok('  and sits in the band the other small calls do',
  CREDITS.styleword <= CREDITS.repaint,
  `${CREDITS.styleword} against a picture at ${CREDITS.repaint} — a number of`
  + ' its own is a number nobody can check');

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

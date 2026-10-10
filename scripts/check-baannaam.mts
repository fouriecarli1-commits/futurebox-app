/**
 * Every lane in the Pro Booth can be named, and says where it changes.
 *
 * ── Three things she asked for, and one of them already existed ──────────
 *
 * Carli, 10 October 2026, three messages about this room:
 *
 *   *"Op elke track van die probooth moet daar 'n manier wees om die track 'n
 *   naam te gee. Vir 'n professional moet hulle weet watter instrument is
 *   waar."*
 *
 *   *"sal dit 'n goeie funksie wees as die booth na die klank baan luister, en
 *   die natuurlike oorgange identifiseer. Daar kan dalk ook 'n button wees
 *   links by s m, wat dan 'n helder blou driehoekie is, dan as mens op dit
 *   click spring die driehoekies aan die onderste lyn van die klank baan op by
 *   elke natuurlike oorgange."*
 *
 *   *"iemand op 'n spesifieke track kan click en dan is daar 'n dropdownmenu
 *   wat die opsie gee vir download midi, download wav."*
 *
 * ── The naming one is the interesting failure ────────────────────────────
 *
 * It already worked. There was an `<input value={lane.name}>` in the lane
 * strip, with a 40-character cap and an `aria-label`, and it had been there
 * for weeks. She used the room, wanted to name a track, and asked for the
 * feature.
 *
 * So she was right and the code was also right, which means the screen was
 * wrong. The field was `bg-transparent` with no border, no placeholder and no
 * visible label, sitting at the top of the strip in bold — which is exactly
 * what a heading looks like. Nothing on the screen said it could be typed in.
 *
 * That is worth a check of its own, because "it exists" is the answer that
 * loses this argument. What is held here is that it LOOKS like a field: a
 * border, a label somebody can read, and a placeholder naming instruments —
 * which is the line doing the real work, since "Bass, Lead vocal, Kick" says
 * both "this is a field" and "this is what goes in it" at once.
 *
 * ── And the marks are a reading, not a state ────────────────────────────
 *
 * Her colour, which is the detail worth keeping: sky blue, not this room's
 * green. Green in here means "this is on" — a solo, a tone stack that is
 * doing something. The marks are not a setting of the lane, they are what the
 * booth heard in it, and the region marker above them is already blue for the
 * same reason.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/ProBooth.tsx', 'utf8'));
const line = withoutComments(readFileSync('app/components/BoothTimeline.tsx', 'utf8'));
const lane = withoutComments(readFileSync('app/lib/session.ts', 'utf8'));

/* ── 1. The name is a field, not a heading ────────────────────────────── */

ok('a lane’s name can be typed in',
  /value=\{lane\.name\}/.test(room) && /onChange=\{\(event\) => onChange\(\{ name:/.test(room),
  'a professional with eleven lanes open has to know which instrument is'
  + ' where');

ok('  and it looks like a field rather than like a heading',
  (() => {
    const at = room.indexOf('data-lanenamefield');
    if (at < 0) return false;
    const field = room.slice(Math.max(0, at - 400), at + 600);
    /* A border and a background, so there is a box. `bg-transparent` is what
       it was and is the whole fault. */
    return /border-zinc-700/.test(field) && !/bg-transparent/.test(field);
  })(),
  'it already worked and she asked for it anyway, because a borderless'
  + ' transparent input in bold at the top of a card is a heading');

ok('  and something on the screen says what it is',
  (() => {
    const at = room.indexOf('data-lanenamefield');
    if (at < 0) return false;
    const around = room.slice(Math.max(0, at - 600), at + 600);
    /* A real label element, not an aria-label: the fault was that the only
       name for this field was one a screen reader could reach. */
    return /<label htmlFor=\{`lane-name-\$\{lane\.id\}`\}/.test(around)
      && /pro\.laneName/.test(around);
  })(),
  'an aria-label is not a label — it is for a screen reader, and the person'
  + ' who could not find this field was looking at the screen');

ok('  and the placeholder names instruments',
  /pro\.laneNameHint/.test(room) && /Bass, Lead vocal, Kick/.test(room),
  '"Bass, Lead vocal, Kick" says both "this is a field" and "this is what'
  + ' goes in it", which is the whole of what she asked for');

/* ── 2. The blue triangle, and where it went ──────────────────────────── */

ok('there is a button that marks where a lane changes',
  /data-lanemarks=/.test(line) && /onMarks\(lane\.id\)/.test(line),
  'her words: "’n button … wat dan ’n helder blou driehoekie is"');

ok('  and it is in the lane’s own gutter, in the row of the clip it marks',
  (() => {
    /* Not beside M and S, and that is a trade rather than a slip. Three
       44-pixel buttons do not fit a 96-pixel gutter, shrinking two of them
       puts a mute below the floor on a control pressed mid-take, and widening
       the gutter spends a choice she has already made — shown reorder arrows
       in this gutter against a 294-pixel timeline on a phone, she kept the
       timeline, and `check:laneorder` is the record of it.

       So what is held here is what is actually true: the button is in the same
       grid cell as the lane's name, which is the same row as its clip. The
       alternative she can have is written beside the button. */
    const marks = line.indexOf('data-lanemarks');
    const gutterName = line.indexOf('data-lanename=');
    const row = line.indexOf('data-lanerow');
    return marks > 0 && gutterName > 0 && row > 0 && marks > gutterName && marks < row;
  })(),
  'a button that makes marks appear on a clip has to be in that clip\u2019s row,'
  + ' or it is a control somewhere else that changes something over here');

ok('  and it is a full 44, with nothing shrunk to make room',
  (() => {
    const from = line.indexOf('data-lanename=');
    const to = line.indexOf('data-lanerow', from);
    if (from < 0 || to < 0) return false;
    const widths = [...line.slice(from, to)
      .matchAll(/className="(?:absolute right-0 top-0 )?flex h-11 w-(\d+) items-center justify-center"/g)]
      .map((one) => Number(one[1]) * 4);
    return widths.length === 3 && widths.every((one) => one >= 44);
  })(),
  '44 is this app\u2019s floor everywhere, and a 32-pixel mute is a mute somebody'
  + ' misses mid-take and a take they have to do again');

ok('  and the gutter is still the width she chose',
  /const GUTTER = 96;/.test(line),
  'widening it to fit a third button spends the 294-pixel timeline she kept'
  + ' when she was shown both');

/* ── 3. The marks are a reading of the audio, on the lane’s own clock ── */

ok('the marks are measured from the audio and kept on the lane',
  /readonly marks\?: readonly number\[\]/.test(lane)
  && /transitionsIn\(source\.getChannelData\(0\), source\.sampleRate\)/.test(room),
  'a mark that came from anywhere but the audio is a guess drawn as a'
  + ' measurement');

ok('  and measured once rather than on every press',
  /if \(lane\.marks\) \{/.test(room) && /marksOn: !lane\.marksOn/.test(room),
  'a few hundred FFTs to answer a question already answered makes the second'
  + ' press slower than the first for nothing');

ok('  and "asked and found nothing" is not the same as "never asked"',
  /change\(id, \{ marks, marksOn: true \}\)/.test(room),
  'a drone has no transitions and that is an answer; leaving the field absent'
  + ' would make the room offer to measure it again forever');

ok('  and a mark outside the cut is not drawn',
  /second <= window\.from \|\| second >= window\.to/.test(line),
  'a transition at forty seconds in a lane trimmed to the first ten is a real'
  + ' change in audio that is not on the screen, and drawing it at the edge'
  + ' puts a mark where the music does not change');

ok('  and a mark inside a repeated piece is drawn once per repeat',
  /Array\.from\(\{ length: times \}/.test(line) && /\(\(into \+ n\) \/ times\)/.test(line),
  'a four-bar part that goes round four times changes four times, and that is'
  + ' where the change is heard');

ok('  and the marks never take a press',
  (() => {
    const at = line.indexOf('data-lanemark=');
    const around = line.slice(Math.max(0, at - 300), at + 300);
    return at > 0 && /pointer-events-none/.test(around);
  })(),
  'a row of small shapes along the bottom edge of the clip would steal every'
  + ' press aimed at the grip underneath them');

/* ── 4. Taking a lane away ────────────────────────────────────────────── */

ok('a lane can be taken away as sound or as notes',
  /data-savewav/.test(room) && /data-savemidi/.test(room) && /data-lanesave\b/.test(room),
  'her words: "n dropdownmenu wat die opsie gee vir download midi, download'
  + ' wav"');

ok('  and the WAV is the same piece the mixdown uses',
  /encodeWav\(piece, 'stereo'\)/.test(room) && /pieceOf\(lane, ctx\)/.test(room),
  'a file built from anything but `pieceOf` is a file that can disagree with'
  + ' the song about what this lane is');

ok('  and the menu says the level and the pan do not travel with it',
  /pro\.saveWavNote/.test(room),
  'somebody taking a sound to another project wants the sound, not this'
  + ' song’s opinion of it — and finding that out by ear in another program'
  + ' is finding it out too late');

ok('  and a lane built from notes carries them, so its MIDI is exact',
  /readonly notes\?: readonly HumNote\[\]/.test(lane) && /\n          notes,\n/.test(room),
  're-transcribing our own synthesised audio to recover notes we already had'
  + ' is lossy and absurd');

console.log(bad === 0
  ? '\n  Every lane can be named and looks like it can, says where it changes in\n'
    + '  her blue triangles, and can be taken away as sound or as notes.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

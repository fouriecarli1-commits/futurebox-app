/**
 * Generate a sound: her name for it, in both rooms, and it cannot hand over
 * a silent file.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 10 October 2026: *"Ek dink ook video editor, en video desk kan stem
 * generations hê, noem dit eerder, generate a sound, asook 'n podcast text tot
 * speech. Dit is tipies iets wat 'n mens daar ook sou kon gebruik."*
 *
 * Three things in one sentence: a sound generator on the video editor, the
 * same on the video desk, and her name for it. "Generate a sound" is a better
 * name than the one this app would have reached for — somebody standing at a
 * video timeline does not want a *voice*, they want a sound to put on a clip,
 * and whether a voice made it is our business.
 *
 * ── The podcast half is the same engine, and that is said rather than built ─
 *
 * She named a podcast text-to-speech alongside it. It is the same route, the
 * same model and the same price per character — the only difference is how
 * much text goes in. Two controls side by side would have to explain a
 * difference that does not exist, and would be two places to keep one fact.
 * So it is one panel whose cost moves with the length, and the panel says so.
 *
 * ── What can go wrong here, and two of the three are silent ──────────────
 *
 * **The language.** `/api/voice/speak` has always said "the caller says which
 * model it wants", and `Presenter.tsx` never said — so an Afrikaans script was
 * read by the model chosen for English for as long as that room existed. It is
 * the exact fault worth not making twice, and it is inaudible to anybody who
 * does not speak the language.
 *
 * **An empty body with a 200 on it.** It has happened. A zero-byte blob laid
 * under a film is a silent clip somebody finds when they play the film back,
 * after the credits are spent.
 *
 * **Where the sound went.** A reading that silently became the bed under the
 * film is a change nobody asked for and cannot see.
 *
 * ── And the one about the attribute, which is the subtle one ─────────────
 *
 * `Card` takes a fixed set of props and forwards none of the rest, so a
 * `data-` attribute handed to it is dropped. TypeScript does not say so,
 * because JSX does not type-check attribute names with a dash in them. It
 * compiles, it reads correctly in the source, and it is not in the page — so a
 * check reading the file would call it present while a probe would find
 * nothing. That is the worst shape a fault can take here and it is held below.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { readCost } from '../app/lib/credits.ts';
import { MOST_CHARACTERS, FEWEST_CHARACTERS } from '../app/components/MakeSound.tsx';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const panel = withoutComments(readFileSync('app/components/MakeSound.tsx', 'utf8'));
const editor = withoutComments(readFileSync('app/components/VideoEditor.tsx', 'utf8'));
const desk = withoutComments(readFileSync('app/components/VideoCanvas.tsx', 'utf8'));
const card = withoutComments(readFileSync('app/components/Card.tsx', 'utf8'));

/* ── 1. Her name, in both rooms ───────────────────────────────────────── */

ok('the panel is called what she called it',
  /'Generate a sound'/.test(panel) && /makesound\.title/.test(panel),
  'her name, not "voice generation": somebody at a video timeline wants a'
  + ' sound to put on a clip');

ok('  and it is in the video editor',
  /<MakeSound\b/.test(editor),
  '"video editor, en video desk" — both, and one of them is not both');

ok('  and on the video desk',
  /<MakeSound\b/.test(desk),
  'the desk is the room where a clip comes back silent, so a read laid over'
  + ' it is how this app says anything in Afrikaans at all');

ok('  and it is one panel rather than two in each room',
  (editor.match(/<MakeSound\b/g) ?? []).length === 1
  && (desk.match(/<MakeSound\b/g) ?? []).length === 1,
  'the podcast half is the same route at the same price — two controls would'
  + ' have to explain a difference that does not exist');

ok('  and the screen says the podcast read is the same thing',
  /makesound\.what/.test(panel) && /podcast script/.test(panel),
  'she asked for two things and got one panel, so the panel has to say that'
  + ' it is the other one too');

/* ── 2. The name reaches the page, not just the source ────────────────── */

ok('the panel’s name is on an element that keeps it',
  (() => {
    /* `Card` is a function component with a fixed prop list. Anything else
       handed to it is dropped, silently, and JSX does not type-check a
       dashed attribute name — so this must be on a plain element. */
    const forwards = /\.\.\.rest|\.\.\.props/.test(card);
    /* Inside the opening tag only: `[^>]*` cannot cross the `>`. A
       `[\s\S]*?` version of this was red on correct code, because the words
       box below the card is `data-makesoundwords` and "anything at all,
       then data-makesound" reaches it. */
    const onCard = /<Card[^>]*data-makesound/.test(panel);
    const onPlain = /<div data-makesound>/.test(panel);
    return onPlain && !onCard && !forwards;
  })(),
  'a `data-` attribute handed to `Card` compiles, reads right in the source'
  + ' and is not in the page — so a file-reading check would call it present'
  + ' while a probe found nothing');

/* ── 3. The language, which is the fault worth not making twice ───────── */

ok('the app’s own language goes with the script',
  /language: lang/.test(panel),
  '`/api/voice/speak` picks the model from the language the caller states, and'
  + ' a caller that does not state one gets the model chosen for English —'
  + ' which is how an Afrikaans line is read by something that has never seen'
  + ' one, inaudibly to anybody who does not speak it');

/* ── 4. It cannot hand a silent file to a timeline ────────────────────── */

ok('an empty answer is refused rather than passed on',
  /blob\.size === 0/.test(panel) && /makesound\.empty/.test(panel),
  'a zero-byte blob laid under a film is a silent clip somebody finds when'
  + ' they play it back, after the credits are spent');

ok('  and the failure says nothing was charged',
  /Nothing was charged/.test(panel),
  'the route refuses on length before it asks for anything, so somebody'
  + ' pressing again is not pressing again for money');

ok('  and a refusal for want of a plan reaches the upgrade door',
  /needsPlan/.test(panel) && /onUpgrade\?\.\(\)/.test(panel),
  'a dead end where the room knows the way out');

/* ── 5. Money on the button, and a ceiling under the box ──────────────── */

ok('the price is on the button and moves with the length',
  /readCost\(length\)/.test(panel) && /\$\{costs\}/.test(panel),
  'the difference between an advert line and an episode is the price, and it'
  + ' is the only thing somebody needs to know before the press');

ok('  and the price really does move',
  readCost(20) < readCost(3000),
  'a cost that is the same for a line and a script is not a cost');

ok('  and there is a ceiling on one press',
  /slice\(0, MOST_CHARACTERS\)/.test(panel) && MOST_CHARACTERS > 0,
  `a box with no ceiling next to a Make button is how somebody pastes a`
  + ` chapter and spends a plan — ceiling is ${MOST_CHARACTERS}`);

ok('  and nothing below a floor is sent',
  /length < FEWEST_CHARACTERS/.test(panel) && FEWEST_CHARACTERS >= 2,
  'a one-character press is a typo that costs the minimum charge');

/* ── 6. Not switched on is said, not discovered ───────────────────────── */

ok('a room with no voice engine says so instead of offering the button',
  /!voices\.configured/.test(panel) && /data-makesoundoff/.test(panel),
  'a button for a thing that is not connected is worse than no button, and'
  + ' this room says the rest of the timeline still works');

/* ── 7. Where the sound went, said out loud ───────────────────────────── */

ok('the editor marks a made bed as made rather than carried in',
  (() => {
    const at = editor.indexOf('<MakeSound');
    const around = editor.slice(at, at + 900);
    return /underCame: 'made' as const/.test(around);
  })(),
  'the rights panel asks whoever brought a bed in to vouch for it, and asking'
  + ' somebody to vouch for a reading this app made for them thirty seconds'
  + ' ago is a question people learn to tick without reading');

ok('  and the panel says where the sound landed',
  /makesound\.landed/.test(panel),
  'a reading that silently became the bed under the film is a change nobody'
  + ' asked for and cannot see');

ok('  and the desk says only one thing goes under a clip',
  /canvas\.voiceUnder/.test(desk) && /data-canvasvoice\b/.test(desk),
  '`stitch` lays ONE audio track under a film; a desk that quietly threw away'
  + ' whichever of the two was set first would be worse than one with a'
  + ' stated limit');

ok('  and it can be taken off again',
  /data-canvasvoiceoff/.test(desk) && /setVoice\(null\)/.test(desk),
  'a sound that cannot be removed is a sound on every clip from now on');

ok('  and the made sound is what is heard when both are set',
  /const audio = voice \?\? \(cut \? await readAudio/.test(desk),
  'the thing somebody pressed a button for thirty seconds ago beats a bed'
  + ' that was set earlier and may have been forgotten');

ok('  and a made sound starts at its own beginning',
  /audioFrom: voice \? 0 : cut\?\.from/.test(desk),
  'the offset belongs to the song window; a read starts where it starts, and'
  + ' starting it 40 seconds in is a clip with silence on it');

/* ── 8. It does not grow a second consent gate ────────────────────────── */

ok('the panel does not clone a voice',
  !/VOICE_CONSENT/.test(panel) && !/MediaRecorder/.test(panel)
  && !/\/api\/voice\/clone/.test(panel),
  'a voice identifies a person and a clone made without them is'
  + ' impersonation. The consent gate lives in one room and a second one'
  + ' beside a video timeline would be a second one to keep right');

ok('  and it lets go of the audio it made',
  (panel.match(/URL\.revokeObjectURL/g) ?? []).length >= 2,
  'every press leaks a url for as long as the tab is open, and this room is'
  + ' one somebody sits in for an hour');

console.log(bad === 0
  ? '\n  Generate a sound is on both timelines, under her name, at a price that\n'
    + '  moves with the script — and it cannot hand over a silent file.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

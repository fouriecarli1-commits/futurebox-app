/**
 * Every AI box can be talked into, and Story mode has its own AI.
 *
 * The owner, 14 October 2026: *"Story mode binne my profile, moet ook 'n ai hê en
 * ek sal verkies dat al ons ai's ook 'n listening tool het, sodat mense ook
 * dit met praat in invoer."*
 *
 * Held here so a box added later, or one rewritten, does not quietly lose its
 * microphone: the list below is the boxes an AI reads, and each must draw
 * `SpeakButton` and put what was heard into its own value through `withSaid`.
 * And the joining itself is tested, because "Sunset.make it evening" is what
 * a box looks like when it is not.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { finalWords, withSaid } from '../app/lib/speak.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};
const code = (path: string): string => withoutComments(readFileSync(path, 'utf8'));

/* ── 1. The boxes an AI reads ─────────────────────────────────────────── */
const BOXES: readonly (readonly [string, string])[] = [
  ['the copilot', 'app/components/Copilot.tsx'],
  ['the photo editor’s ask', 'app/components/PostStudio.tsx'],
  ['the video desk', 'app/components/VideoCanvas.tsx'],
  ['a song’s words and sound', 'app/components/MakeMusic.tsx'],
  ['a spoken clip', 'app/components/MakeSound.tsx'],
  ['album art', 'app/components/ArtMaker.tsx'],
  ['the help desk', 'app/components/HelpDesk.tsx'],
  ['the presenter', 'app/components/Presenter.tsx'],
  ['a storyboard shot', 'app/components/Storyboard.tsx'],
  ['a verse', 'app/components/VerseWriter.tsx'],
  ['the mix question', 'app/components/BoothAsk.tsx'],
  ['an advert', 'app/components/Campaign.tsx'],
  ['a story', 'app/components/StoryRoom.tsx'],
];
for (const [what, path] of BOXES) {
  const src = code(path);
  ok(`${what} can be said, not only typed`,
    /<SpeakButton\b/.test(src) && /onHeard=\{\(said\) =>[^}]*withSaid\(/.test(src),
    `${path} has no SpeakButton putting words in through withSaid`);
}

/* ── 2. The button is free and honest ─────────────────────────────────── */
const button = code('app/components/SpeakButton.tsx');
const speak = code('app/lib/speak.ts');
ok('the listening is the browser’s, so it costs nothing',
  /webkitSpeechRecognition/.test(speak) && !/\/api\/transcribe/.test(button + speak),
  'a sentence said into a box should not cost credits');
ok('  and the button is not drawn where the browser cannot listen',
  /if \(!can\) return null/.test(button));
ok('  and it says so when the microphone is blocked',
  /not-allowed/.test(button));

/* ── 3. What was said joins what was typed ────────────────────────────── */
ok('said into an empty box, it starts with a capital', withSaid('', 'make it evening') === 'Make it evening');
ok('after a sentence, a new one starts with a capital', withSaid('Sunset.', 'make it evening') === 'Sunset. Make it evening');
ok('after words, it carries on the sentence', withSaid('a red car', 'on a beach') === 'a red car on a beach');
ok('after a line break, no extra space', withSaid('Page one\n\n', 'page two') === 'Page one\n\npage two');
ok('nothing said changes nothing', withSaid('kept', '   ') === 'kept');
ok('only finished words are taken', finalWords({
  resultIndex: 0,
  results: [
    Object.assign([{ transcript: 'half' }], { isFinal: false }),
    Object.assign([{ transcript: 'whole words' }], { isFinal: true }),
  ],
}) === 'whole words');

/* ── 4. Story mode has its own AI ─────────────────────────────────────── */
const story = code('app/components/StoryRoom.tsx');
const route = code('app/api/story/route.ts');
ok('Story mode has a story helper', /data-storyhelper/.test(story) && /fetch\('\/api\/story'/.test(story));
ok('  and it writes into the box, with the old story kept one step back',
  /setStory\(said\.pages\.join/.test(story) && /data-storymine/.test(story));
ok('  and its route is braked, screened and warns the model off Dutch',
  /tooMany\('story'/.test(route) && /screen\(/.test(route) && /AFRIKAANS_RULE/.test(route));
ok('  and it answers in pages the room already understands',
  /pages: z/.test(route) && /STORY_MAX_PAGES/.test(route));

console.log(bad === 0 ? '\nAll good.\n' : `\n${bad} wrong.\n`);
process.exit(bad === 0 ? 0 : 1);

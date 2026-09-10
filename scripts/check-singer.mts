/**
 * Who sings is asked for in words, or it is not asked for at all.
 *
 * ── What was found ───────────────────────────────────────────────────────
 *
 * Carli, 10 September 2026: "wanneer ek 'n liedjie generate is daar bars wat
 * sê ek moet 'n stem kies, as ek daar 'n man of 'n vrou stem kies tel hy dit
 * nie op nie, want hy generate net wat hy wil."
 *
 * The bars were wired. `voice.words` reached `styleText`, `styleText` reached
 * `body.style`, and `buildRequest` turned it into `positive_styles`. Nothing
 * was disconnected. It was thrown away by POSITION, twice:
 *
 *   1. The picker appended its words AFTER whatever the person had written,
 *      and `toStyles` keeps the first twelve. A long style dropped the singer
 *      before the request left the server.
 *   2. Worse and far more common: the first chunk got the full list and every
 *      chunk after it got `leading.slice(0, 6)`. On a style with six words of
 *      its own, the singer was asked for in the intro and in no other part of
 *      the song. A song is mostly "chunks after the first".
 *
 * So the model was told once, late, and then reminded of everything except
 * the one thing she had chosen. "Hy generate net wat hy wil" is an accurate
 * description of that request.
 *
 * ── What she decided ─────────────────────────────────────────────────────
 *
 * "As iets fisies nie werk nie moet jy dit weg vat. Ek dink dit is beter om
 * stemkeuses deur Copilot te prompt en Co pilot moet daai suggestion ook
 * maak."
 *
 * So the control is gone and the ask moved to the copilot, where it becomes
 * the person's own words at the front of their own style line. Two halves,
 * and this holds both: the control must stay gone, and the copilot must
 * SUGGEST — accepting a request nobody knows to make is the same silence in
 * a politer form.
 *
 * The position fault is fixed rather than moved: `reminder()` brings a singer
 * direction forward into the short list when the first six do not name one.
 * Without that the copilot's suggestion lands in exactly the same hole.
 */
import { readFileSync } from 'node:fs';
import { buildRequest } from '../app/lib/server/musicplan';
import { SINGERS } from '../app/data/sound';

const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

// ── The control is gone, and stays gone ──────────────────────────────────

const make = code(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
ok('the song screen has no voice picker',
  !/VOICES\.map|setVoice\(/.test(make),
  'the bars are back, and they still cannot be honoured');
ok('and nothing on it reads a chosen voice',
  !/\bvoice\.id\b|\bvoice\.words\b/.test(make),
  'a control was removed and a read of it left behind');

const studio = code(readFileSync('app/data/studio.ts', 'utf8'));
ok('and the second voice list nobody imported is gone too',
  !/VOCAL_CHOICES/.test(studio),
  'eight labels exported to nowhere — the same promise, one step further from being kept');

/* Instrumental is the one thing on that screen that IS a switch:
   `force_instrumental` is a real parameter, so it survives as a real control
   and must not be swept out with the descriptions. */
ok('but "no singing" survives, because that one is a real parameter',
  /instrumental: singItYourself/.test(make),
  'force_instrumental is the one voice-shaped thing the API actually takes');

// ── The copilot asks, and offers ─────────────────────────────────────────

const copilot = readFileSync('app/api/copilot/route.ts', 'utf8');
ok('the copilot is told who sings is part of the style',
  /Who sings is part of the style/.test(copilot),
  'it will treat the singer as a setting it cannot reach');
ok('and to put the singer first, where the engine weights it',
  /Put the singer FIRST/.test(copilot),
  'last in the list is how this broke the first time');
ok('and it carries the phrasings rather than inventing them',
  /\$\{SINGERS\.map/.test(copilot) && SINGERS.length >= 4,
  'the words that worked were thrown away with the buttons');
ok('and it OFFERS one when the style does not name a singer',
  /suggest one and set it/.test(copilot),
  'accepting an ask nobody knows to make is the same silence, more politely');
ok('and the absence is stated outright rather than left to be noticed',
  /namesASinger\(body\.style/.test(copilot),
  'an inference that must spot an absence is an inference that sometimes will not');
ok('and it never promises the engine will obey',
  /usually follows and sometimes does not/.test(copilot),
  'a direction sold as a switch is how this became seven reports');

// ── The direction survives past the intro ────────────────────────────────

const wordy = ['afrikaanse boeremusiek', 'konsertina', 'live drums', 'warm mix',
  'acoustic guitar', 'slow waltz', 'warm female vocal'];
const req = buildRequest({
  style: wordy.join(', '),
  sections: [
    { name: 'Verse', lines: ['een lyn'], seconds: 20 },
    { name: 'Chorus', lines: ['nog een'], seconds: 20 },
    { name: 'Outro', lines: [], seconds: 10 },
  ],
});
const chunks = (req.composition_plan as { chunks: { positive_styles: string[] }[] }).chunks;
const singerIn = (list: string[]): boolean => list.some((one) => /female|male|vocal/i.test(one));

ok('a singer written seventh still reaches the opening chunk',
  singerIn(chunks[0].positive_styles),
  'twelve are kept, so seven should survive');
ok('and every chunk after it, which is most of the song',
  chunks.slice(1).every((chunk) => singerIn(chunk.positive_styles)),
  'this is the fault she reported: asked for in the intro, forgotten by the chorus');
ok('without the reminder growing past six',
  chunks.slice(1).every((chunk) => chunk.positive_styles.length <= 6),
  'the short list is short for a reason — it stops competing with the first chunk');

/* A style that says nothing about a singer must not have one invented for it
   by the bring-forward rule. It only rescues a direction the person wrote. */
const quiet = buildRequest({
  style: 'amapiano, log drum, shaker, 112 bpm, warm pads, night drive, sparse',
  sections: [
    { name: 'Verse', lines: ['een lyn'], seconds: 20 },
    { name: 'Chorus', lines: ['nog een'], seconds: 20 },
  ],
});
const quietChunks = (quiet.composition_plan as { chunks: { positive_styles: string[] }[] }).chunks;
ok('and a style that names no singer has none put in its mouth',
  quietChunks.slice(1).every((chunk) => !singerIn(chunk.positive_styles)),
  'the rule rescues what was written, it does not write');

if (failures) {
  console.error(`\ncheck:singer — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:singer — no control promises a voice, the copilot asks for one in words, and it survives the whole song.');

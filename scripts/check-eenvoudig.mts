/**
 * Make a song is one box around the copilot, with everything in it.
 *
 * ── What she asked ───────────────────────────────────────────────────────
 *
 * Carli, 15 October 2026, beside a screenshot of ElevenLabs' music box:
 * *"Ek dink ons moet in make a song, die simple en everything wegvat en net
 * so box rondom copilot bou wat alles in het, selfs 'n button wat uit pop om
 * die weirdness te verstel. Daar kan dan ook bo in daai raam wees 'n easy en
 * extensive, waar easy dan vinnig woorde prompt, en extensive die liedjie
 * meer intensioneel vers vir vers prompt, en guide rondom waaroor 'n sekere
 * gedeelte in 'n liedjie gaan. Daar kan 'n plus wees wat uit pop en keuses
 * gee … en by daardie plus kan daar ook 'n opsie wees om 'n liedjie op te
 * laai om vanaf dit te begin. Dan onder daardie boks kom die woorde uit, en
 * onder die woorde moet die finale clear wees 'make the song'."*
 *
 * This replaces the check that held Simple and Everything (10 October), and
 * keeps its one lasting rule: a setting must never be in force out of sight.
 * The old room kept it with a sentence under the switch; the box keeps it by
 * having every button along its foot say what it is set to.
 */

import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));
const picker = withoutComments(readFileSync('app/components/StartPicker.tsx', 'utf8'));
const page = withoutComments(readFileSync('app/page.tsx', 'utf8'));
const at = (needle: string): number => room.indexOf(needle);

/* ── 1. Simple and Everything are gone ─────────────────────────────────── */

ok('there is no Simple or Everything any more',
  !/data-makemode\b/.test(room) && !/make\.modeSimple/.test(room) && !/\badvanced\b/.test(room),
  '"die simple en everything wegvat"');

/* ── 2. One box, around the copilot ────────────────────────────────────── */

ok('the room has one song box',
  (room.match(/data-makebox\b/g) ?? []).length === 1);
ok('  and the copilot is drawn inside it, always',
  at('data-makecopilot') > at('data-makebox') && /\{copilot \?\?/.test(room)
  && /copilot=\{copilotPane\}/.test(page) && /\|\| studioTab === 'make'/.test(page),
  'the page must hand the copilot in every time, not only on one mode');

/* ── 3. Easy and Extensive along the top ───────────────────────────────── */

ok('Easy and Extensive are at the top of the box',
  at('data-makeway') > at('data-makebox') && at('data-makeway') < at('data-makecopilot')
  && /make\.easy/.test(room) && /make\.extensive/.test(room));
ok('  Extensive is the verse-by-verse writer, which says what each part is for',
  /way === 'easy' \?[\s\S]{0,600}<VerseWriter/.test(room));
ok('  and the choice is remembered between visits',
  /window\.localStorage\.setItem\(WAY_KEY/.test(room));

/* ── 4. Every control is a small button that pops out ──────────────────── */

for (const [tool, what] of [
  ['length', 'how long'],
  ['feel', 'the weirdness and light-to-heavy sliders'],
  ['voice', 'which language it is sung in'],
  ['sound', 'a sound of your own'],
  ['more', 'tempo and key'],
] as const) {
  ok(`the box has a button for ${what}`, new RegExp(`\\['${tool}', `).test(room));
}
ok('  the weirdness is one of them', /pop === 'feel'[\s\S]{0,3000}id="make-weirdness"/.test(room),
  '"selfs \'n button wat uit pop om die weirdness te verstel"');
ok('  and each button says what it is set to, so nothing is in force out of sight',
  /weight !== 50 \|\| weirdness !== 15 \?/.test(room) && /bpm !== 112 \|\| songKey !== 'A Minor' \?/.test(room)
  && /useOwnSound\s*\?/.test(room),
  'a setting that applies while its control is out of sight is worse than a crowded screen');
ok('  and the price is on the box before anything is pressed', /data-makecost/.test(room));

/* ── 5. The plus ───────────────────────────────────────────────────────── */

ok('a plus in the box pops out somewhere to start', /data-makeplus/.test(room) && /<StartPicker/.test(room));
ok('  a list you can search, with a row of chips like theirs',
  /data-pickersearch/.test(picker) && /MOODS\.map/.test(picker) && /GENRE_CATEGORIES/.test(picker));
ok('  feelings to start from and sounds to add',
  /SONG_STARTS/.test(picker) && /GENRE_SAMPLES/.test(picker));
ok('  and a way to start from a song of your own',
  /data-pickerbring/.test(picker) && /upload=\{[\s\S]{0,200}<StyleFrom/.test(room),
  '"\'n opsie om \'n liedjie op te laai om vanaf dit te begin"');

/* ── 6. Under the box the words, under the words the button ────────────── */

ok('the words come out under the box',
  at('data-makewords') > at('data-maketools') && at('placeholder={t(\'make.wordsPlaceholder\')}') > at('data-makewords'));
ok('  and the one button is under the words',
  at('onClick={() => make()}') > at('data-makewords'),
  '"onder die woorde moet die finale clear wees make the song"');

/* ── 7. The newest song above the box ──────────────────────────────────
   Carli, 15 October 2026, a phone screenshot: the song and its three buttons
   on one line, and the buttons pushed the name out and ran off the screen. */
ok('the newest song\u2019s buttons sit on their own row, and wrap',
  /data-top-mini-actions className="flex flex-wrap/.test(room)
  && at('data-top-mini-actions') > at('{activeTrack.title}'),
  'on one line with the song they squeeze the name to nothing on a phone');

const dictionary = readFileSync('app/lib/i18n.tsx', 'utf8');
ok('  and it says "Make the song"', /"make\.go": \{ en: "Make the song"/.test(dictionary));

console.log(bad === 0
  ? '\n  Make a song is one box around the copilot, the words under it, and the button under those.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

/**
 * A song is never untitled.
 *
 * The owner, 12 October 2026: *"By make a song moet jy altyd seker maak in simple
 * wanneer mens met copilot prompt dat 'n liedjie nooit untitled is nie,
 * copilot moet altyd 'n titel uit dink vir 'n song."*
 *
 * Three layers (see `app/lib/songtitle.ts`), and this file holds each one:
 * the copilot is told, the route makes sure, and the room never writes the
 * word. The function cases are the ones a model actually produces — a reply
 * that forgets, a reply that "names" the song Untitled, a reply with a real
 * title that must be left alone.
 *
 * Proved by mutation: with `ensureTitled` returning its input unchanged the
 * first group fails; with the route's rule line removed the source group
 * fails; with `'Untitled'` put back in MakeMusic the last one fails.
 */
import { readFileSync } from 'node:fs';
import { withoutComments } from './prose.mts';
import { ensureTitled, isPlaceholderTitle, titleFromWords, TITLE_WORDS } from '../app/lib/songtitle.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const act = (kind: string, value = ''): { kind: string; op: string; value: string; room: string } =>
  ({ kind, op: '', value, room: '' });
const titleIn = (list: readonly { kind: string; value: string }[]): string | undefined =>
  list.find((one) => one.kind === 'set_title')?.value;

/* ── 1. The guarantee ─────────────────────────────────────────────────── */

const sheet = '[Verse 1]\nDie son kom op oor Bloemfontein, en ek is nog hier\nwaiting for the bus\n\n[Chorus]\nhome again';

{
  const out = ensureTitled([act('set_lyrics', sheet), act('generate')], '');
  ok('a reply that writes lyrics and forgets the title gets one',
    titleIn(out) === 'Die son kom op oor', JSON.stringify(out.map((one) => one.kind)) + ' ' + String(titleIn(out)));
  ok('  read off the first real line, not the [Verse 1] marker', !/verse/i.test(titleIn(out) ?? 'verse'));
  ok(`  and cut to ${TITLE_WORDS} words`, (titleIn(out) ?? '').split(' ').length === TITLE_WORDS);
  ok('  put in front, so generate still goes last', out[0].kind === 'set_title' && out[out.length - 1].kind === 'generate');
}
{
  const out = ensureTitled([act('set_title', 'Untitled'), act('set_lyrics', sheet)], '');
  ok('"Untitled" sent as a title does not count as naming it', titleIn(out) === 'Die son kom op oor', String(titleIn(out)));
  ok('  and the placeholder is not passed through as a second set_title',
    out.filter((one) => one.kind === 'set_title').length === 1);
}
{
  const out = ensureTitled([act('set_title', 'Bloemfontein Bus'), act('set_lyrics', sheet)], '');
  ok('a real title from the model is left alone', titleIn(out) === 'Bloemfontein Bus');
}
{
  const out = ensureTitled([act('set_lyrics', sheet)], 'Already named');
  ok('a canvas that already has a title is not renamed', titleIn(out) === undefined);
}
{
  const out = ensureTitled([act('set_style', 'kwaito, warm, 2000s'), act('generate')], '');
  ok('a style with no lyrics names the song after the style', titleIn(out) === 'Kwaito song', String(titleIn(out)));
}
{
  const out = ensureTitled([act('none')], '');
  ok('a reply that writes nothing is not given a title out of thin air', titleIn(out) === undefined);
}
{
  const out = ensureTitled([act('set_title', 'Naamloos'), act('generate')], 'Untitled');
  ok('with nothing to read a name off, no placeholder survives either', titleIn(out) === undefined);
}

/* ── 2. The words ─────────────────────────────────────────────────────── */

for (const one of ['Untitled', 'untitled.', '"New song"', 'My song', 'Naamloos', 'sonder titel', '', '   ']) {
  ok(`"${one}" is not a title`, isPlaceholderTitle(one));
}
for (const one of ['Bloemfontein Bus', 'Untitled Love', 'Song for Anri', 'Liedjie vir ma']) {
  ok(`"${one}" is a title`, !isPlaceholderTitle(one));
}
ok('the first line is read past the scaffolding', titleFromWords('(Chorus)\nVerse:\n\n  "Hold on, hold on!"  \nmore') === 'Hold on, hold on',
  titleFromWords('(Chorus)\nVerse:\n\n  "Hold on, hold on!"  \nmore'));
ok('  and with no words at all, nothing — so the room can say it in the reader’s language',
  titleFromWords('', '') === '' && titleFromWords('[Verse]\n\n', '') === '');

/* ── 3. The source ────────────────────────────────────────────────────── */

const route = withoutComments(readFileSync('app/api/copilot/route.ts', 'utf8'));
const room = withoutComments(readFileSync('app/components/MakeMusic.tsx', 'utf8'));

ok('the copilot is told a song is never untitled', /A song is never untitled\./.test(route));
ok('  and told to send set_title in the same reply it writes words in', /send set_title in the same reply/.test(route));
ok('  and the route makes sure, after the ordering rules', /ensureTitled\(planActions\(/.test(route) && /body\.title/.test(route));
ok('the song room never writes "Untitled" into a track', !/['"`]Untitled['"`]/.test(room));
ok('  and reads a name off the words before falling back', /titleFromWords\(lyrics, canvas\.style\)/.test(room));
ok('  with a last resort said through t()', /t\('make\.noName'/.test(room));

if (bad > 0) {
  console.error(`\ncheck:titled — ${bad} thing(s) wrong: a song could reach the shelf as "Untitled".`);
  process.exit(1);
}
console.log('\ncheck:titled — the copilot names every song it writes, the route makes sure, and the room never says Untitled.');

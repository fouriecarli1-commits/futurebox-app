/**
 * The footage surface: what fal.ai's acceptable-use policy asks of a
 * prompt that changes a member's own film, held in place before the three
 * footage buttons are wired.
 *
 * fal.ai's policy binds our members through us (`docs/FAL-TERME.md`), and
 * four things in it are not in the song rules: harassment of a person,
 * hate short of "less than human", gratuitous gore, and election or health
 * misinformation. They are read on this surface only, because a lyric may
 * be about any of them. And like video, the surface refuses rather than
 * goes ahead when the classifier cannot be reached.
 */
import { readFileSync } from 'node:fs';
import { screen } from '../app/lib/moderation.ts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : '✗  '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) bad += 1;
};

const types = readFileSync('app/lib/moderation.ts', 'utf8');
const safety = readFileSync('app/lib/server/safety.ts', 'utf8');
const FOUR = ['harassment', 'hate', 'gore', 'misinformation'] as const;

ok('footage is a surface of its own',
  /\|\s*'footage'/.test(types),
  'a refusal filed under `video` for a clip somebody filmed is evidence of the wrong thing');

ok('  and it refuses when the classifier cannot be asked, like video',
  /const STRICT[^;]*'footage'/.test(safety),
  'fal.ai screens what reaches it, but our own check is the one that says no first;'
  + ' a footage request waved through on the word list alone is the gap this closes');

for (const rule of FOUR) {
  ok(`the rule "${rule}" is declared`,
    new RegExp(`\\|\\s*'${rule}'`).test(types),
    'a row in the log filed under a rule nobody declared is a row nobody can explain');
}

const classifier = /const CLASSIFIER = `([\s\S]*?)`;/.exec(safety)?.[1] ?? '';
const footageBlock = classifier.split(/surface is "footage"/)[1] ?? '';
ok('the classifier is told the four, and told they are for footage only',
  FOUR.every((rule) => new RegExp(`^\\s+${rule}\\s`, 'm').test(footageBlock))
  && /On every other surface they are allowed/.test(classifier),
  'asked everywhere, they would refuse a song about a bully or a war,'
  + ' and art is about those things');

ok('the footage surface carries video\'s fixed rules',
  screen('make President Ramaphosa announce a new tax', 'footage')?.rule === 'likeness'
  && screen('breaking news footage of the crash', 'footage')?.rule === 'fabricated-news'
  && screen('a nude scene', 'footage')?.rule === 'explicit',
  'a public figure made to say what they never said, a staged news event and'
  + ' explicit material are as wrong in a member\'s own clip as in a generated one');

console.log(bad === 0
  ? '\ncheck:footage — the footage surface refuses what fal.ai\'s policy refuses, reads four more things than a song does, and does not go ahead unchecked.'
  : `\ncheck:footage — ${bad} failing.`);
process.exit(bad === 0 ? 0 : 1);

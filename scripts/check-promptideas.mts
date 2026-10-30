/**
 * The round "new ideas" button under a prompt (`lib/promptideas.ts`,
 * `IdeaChips`). The owner, 30 October 2026: *"Dan reload hy nuwe voorstelle
 * totdat hulle een sien waarvan hulle hou."* So every pool is much bigger
 * than what is shown, every idea is in both languages, a press never shows
 * one that was just on screen, and nothing comes back until the whole pool
 * has been seen.
 */
import { readFileSync } from 'node:fs';
import { CHARACTER_IDEAS, HOSTS_IDEAS, ideasAt, MAKE_IDEAS, MIX_IDEAS, SHOT_CHANGE_IDEAS, SHOT_START_IDEAS, SHAPE_IDEAS, type PromptIdea } from '../app/lib/promptideas.ts';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
};

const pools: [string, readonly PromptIdea[]][] = [
  ...Object.entries(MAKE_IDEAS),
  ['character', CHARACTER_IDEAS], ['mix', MIX_IDEAS], ['hosts', HOSTS_IDEAS],
  ['shot change', SHOT_CHANGE_IDEAS], ['new shot', SHOT_START_IDEAS], ['shape', SHAPE_IDEAS],
];
const SHOWN = 3;
for (const [name, pool] of pools) {
  ok(`${name}: at least three presses' worth of ideas`, pool.length >= SHOWN * 3, String(pool.length));
  ok(`  every one in English and Afrikaans, and no two alike`,
    pool.every(([en, af]) => en.trim().length > 4 && af.trim().length > 4 && en !== af) && new Set(pool.map((one) => one[0])).size === pool.length);
  let fresh = true;
  const seen = new Set<string>();
  const presses = Math.ceil(pool.length / SHOWN);
  for (let round = 0; round < presses; round += 1) {
    const now = ideasAt(pool, SHOWN, round);
    const before = round ? ideasAt(pool, SHOWN, round - 1) : [];
    if (now.length !== SHOWN || now.some((one) => before.includes(one))) fresh = false;
    for (const one of now) seen.add(one[0]);
  }
  ok('  a press never shows one that was just on screen', fresh);
  ok('  and every idea is seen before the round starts again', seen.size === pool.length, `${seen.size} of ${pool.length}`);
  ok('  the first sight is the pool\'s own first ideas', ideasAt(pool, SHOWN, 0).every((one, at) => one === pool[at]));
}

const chips = withoutComments(readFileSync('app/components/IdeaChips.tsx', 'utf8'));
ok('the round button is a 44-point circle with a name a screen reader says', /data-idearefresh/.test(chips) && /h-11 w-11[^"]*rounded-full/.test(chips) && /aria-label=\{t\('ideas\.more'/.test(chips));
const make = withoutComments(readFileSync('app/components/MakeStudio.tsx', 'utf8'));
ok('Make a picture deals its ideas from the pools', /<IdeaChips[^>]*pool=\{MAKE_IDEAS\[kind\]\}/.test(make));
for (const [file, pool] of [['CharacterBench', 'CHARACTER_IDEAS'], ['BoothAsk', 'MIX_IDEAS'], ['TwoHosts', 'HOSTS_IDEAS'], ['VideoEditor', 'SHOT_CHANGE_IDEAS'], ['PostStudio', 'SHAPE_IDEAS']]) {
  const code = withoutComments(readFileSync(`app/components/${file}.tsx`, 'utf8'));
  ok(`  and so does ${file}`, new RegExp(`<IdeaChips[\\s\\S]{0,200}${pool}`).test(code));
}

if (bad) {
  console.error(`\ncheck:promptideas — ${bad} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:promptideas — new ideas on every press, none repeated until all are seen.');

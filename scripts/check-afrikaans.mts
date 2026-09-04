/**
 * Every key the code asks for has an Afrikaans line.
 *
 * `t('some.key', 'English fallback')` is a good pattern: it means a missing
 * translation shows something readable rather than a raw key. It is also
 * silent, which is why eighty of them accumulated — including every word of
 * the advert desk, the room most likely to be used in Afrikaans.
 *
 * An Afrikaans reader hitting an English fallback has no way to report it and
 * no reason to think it is a bug rather than a choice. So this fails the build
 * instead.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DICT = 'app/lib/i18n.tsx';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(path)) out.push(path);
  }
  return out;
}

const dict = readFileSync(DICT, 'utf8');
const known = new Set([...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)].map((m) => m[1]));

/**
 * Entries that have an English line and no Afrikaans one.
 *
 * Sliced from one entry's opening to the next rather than matched with
 * `\{([^}]*)\}`. The first version used that, and it stops at the first
 * closing brace — which inside `"Of the {seconds} seconds you sang…"` is the
 * one belonging to a placeholder. It reported a fully translated line as
 * missing, which is the sort of false alarm that gets a check switched off.
 */
const starts = [...dict.matchAll(/^\s*"([^"]+)":\s*\{/gm)];
const halfDone = starts
  .filter((match, i) => {
    const from = match.index ?? 0;
    const to = i + 1 < starts.length ? (starts[i + 1].index ?? dict.length) : dict.length;
    const body = dict.slice(from, to);
    return /\ben:/.test(body) && !/\baf:/.test(body);
  })
  .map((match) => match[1]);

const missing = new Map<string, string>();
for (const file of walk('app')) {
  if (file.endsWith('i18n.tsx')) continue;
  const raw = readFileSync(file, 'utf8');
  /* Comments stripped first.

     A file that *explains* this pattern contains it: `apierror.ts` describes
     the `data.message ?? t('some.fallback', …)` shape it exists to replace,
     and the check reported `some.fallback` as an untranslated key. A check
     that fails on prose about itself is a check somebody switches off, and
     `check-security.mts` already strips comments before scanning for the same
     reason. */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Both quotings, because a key built in a template literal is still a key.
  for (const m of [...src.matchAll(/\bt\(\s*'([^']+)'/g), ...src.matchAll(/\bt\(\s*`([^`$]+)`/g)]) {
    if (!known.has(m[1]) && !missing.has(m[1])) missing.set(m[1], file);
  }
}

if (missing.size === 0 && halfDone.length === 0) {
  console.log(
    `check:afrikaans — ${known.size} keys, every one the code asks for has both languages.`,
  );
  process.exit(0);
}

if (missing.size) {
  console.error(`\n${missing.size} key(s) used in code with no entry in ${DICT}:\n`);
  for (const [key, file] of missing) console.error(`  ${key}\n    ${file}`);
}
if (halfDone.length) {
  console.error(`\n${halfDone.length} entr(ies) with English and no Afrikaans:\n`);
  for (const key of halfDone) console.error(`  ${key}`);
}
console.error(
  '\nAdd them to the dictionary. An English fallback is silent: the reader cannot' +
    '\ntell a missing translation from a deliberate one, so nobody ever reports it.\n',
);
process.exit(1);

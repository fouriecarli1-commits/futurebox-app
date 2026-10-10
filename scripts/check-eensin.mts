/**
 * One key, one sentence.
 *
 * ── How this was found ───────────────────────────────────────────────────
 *
 * Writing the "Generate a sound" panel I gave it keys under `sound.` — and
 * `sound.title` already existed, meaning *"A sound of your own"*, the heading
 * of the sound trainer. The panel would have printed the trainer's heading
 * over a video timeline and the trainer's "training failed" when a read went
 * wrong, and **`check:afrikaans` could not see it**: both keys existed, both
 * had both languages, and both were spelt correctly.
 *
 * The fallback in the code is what makes it visible. A key is written twice:
 *
 *     t('pro.mute', 'M')        // the letter on the face of the button
 *     t('pro.mute', 'Mute')     // the aria-label on a different screen
 *
 * One of those is what the dictionary holds and the other is a sentence
 * nobody has ever seen. Reading either file tells you what the author meant;
 * only the dictionary says what is drawn. That is the fault: **the code lies
 * about the screen.**
 *
 * ── What this holds, and why not the stronger thing ──────────────────────
 *
 * The strongest check would be "every fallback equals the dictionary's
 * English". Measured: 2,766 agree and 91 do not, and most of those 91 are
 * harmless — an ellipsis, a capital, a fallback written in Afrikaans in a
 * screen that only ships Afrikaans. An allowlist of eighty entries with no
 * reason beside them is a shrug, not a check, and this repo has thrown that
 * shape of check out before.
 *
 * So this holds the sharp half, which is decidable and was five entries long
 * when it was written: **no key may be given two different fallbacks.** Two
 * different sentences for one key means two authors meant two things by it,
 * and at most one of them is on the screen.
 *
 * ── The five it found, all of them real ──────────────────────────────────
 *
 *   `pro.mute`, `pro.solo` — the timeline's mute and solo buttons announced
 *   themselves to a screen reader as "M" and "S", because the aria-label read
 *   the key whose value is the letter drawn on the button.
 *
 *   `live.posted` — the live room's done label said "In the room" where its
 *   author wrote "Posted".
 *
 *   `pic.unreadable` — one branch of a ternary meant "That picture could not
 *   be read." and the dictionary names the formats that work, so the shorter
 *   sentence was never once on anybody's screen.
 *
 *   `pro.lane` — "Lane" and "lane", which is the mild one, and it named a
 *   downloaded file after the lowercase one.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

const DICTIONARY = 'app/lib/i18n.tsx';

function walk(dir: string, out: string[] = []): string[] {
  for (const one of readdirSync(dir)) {
    const at = `${dir}/${one}`;
    if (statSync(at).isDirectory()) walk(at, out);
    else if (at.endsWith('.tsx') || at.endsWith('.ts')) out.push(at);
  }
  return out;
}

/** What a single-quoted TypeScript string literal actually says. */
const unquote = (text: string): string => text
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  .replace(/\\'/g, "'")
  .replace(/\\"/g, '"')
  .replace(/\\\\/g, '\\');

/**
 * Every `t('key', 'fallback')` in the app, by key, with where it was written.
 *
 * Comments stripped first. A header explaining a key, or an older sentence
 * quoted in a note about why it changed, is prose about the code and not the
 * code — and a scan that cannot tell those apart is the fault this family of
 * checks exists to find. It has been made in this repo seven times.
 */
function saidFor(): Map<string, Map<string, Set<string>>> {
  const said = new Map<string, Map<string, Set<string>>>();
  for (const file of walk('app')) {
    if (file === DICTIONARY) continue;
    const code = withoutComments(readFileSync(file, 'utf8'));
    for (const call of code.matchAll(/\bt\(\s*'([a-zA-Z0-9_.:-]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g)) {
      const key = call[1];
      const text = unquote(call[2]).trim();
      if (!said.has(key)) said.set(key, new Map());
      const per = said.get(key)!;
      if (!per.has(text)) per.set(text, new Set());
      per.get(text)!.add(file);
    }
  }
  return said;
}

const said = saidFor();

/* ── 1. The scan found the keys at all ────────────────────────────────── */

ok(`every key the app asks for with a fallback was read (${said.size} keys)`,
  said.size > 1500,
  'a regex that matched nothing would pass every assertion below it, and'
  + ' that is the way a check like this dies quietly');

/* ── 2. No key means two things ───────────────────────────────────────── */

ok('no key is given two different sentences',
  (() => {
    const clashes = [...said.entries()].filter(([, per]) => per.size > 1);
    for (const [key, per] of clashes) {
      console.log(`         ${key}`);
      for (const [text, files] of per) {
        console.log(`           "${text.slice(0, 70)}"  ← ${[...files].join(', ')}`);
      }
    }
    return clashes.length === 0;
  })(),
  'two sentences for one key means two authors meant two things by it, and at'
  + ' most one of them is on the screen — which neither of them can see by'
  + ' reading their own file');

/* ── 3. And the five it found stay fixed, by name ─────────────────────── */

const dict = readFileSync(DICTIONARY, 'utf8');
const english = (key: string): string | null => {
  const row = dict.match(new RegExp(`^\\s{2}"${key.replace(/\./g, '\\.')}":\\s*\\{\\s*en:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'm'));
  return row ? unquote(row[1]) : null;
};

ok('the mute and solo buttons announce themselves as words',
  (() => {
    const line = withoutComments(readFileSync('app/components/BoothTimeline.tsx', 'utf8'));
    return /aria-label=\{t\('pro\.muteName'/.test(line)
      && /aria-label=\{t\('pro\.soloName'/.test(line)
      && english('pro.muteName') === 'Mute'
      && english('pro.soloName') === 'Solo';
  })(),
  'they read the key whose value is the single letter drawn on the button, so'
  + ' a screen reader said "M button" and "S button"');

ok('  and the letters on them are still letters',
  english('pro.mute') === 'M' && english('pro.solo') === 'S',
  'fixing the label by lengthening the key the button DRAWS would put the'
  + ' word Mute inside a 32-pixel badge');

ok('  and the live room says Posted where it means posted',
  english('live.wasPosted') === 'Posted' && english('live.posted') === 'In the room',
  'one key was doing both and the dictionary could only hold one of them');

/* ── 4. The check can tell prose from code ────────────────────────────── */

ok('a fallback written only in a comment is not counted',
  (() => {
    /* Driven rather than reasoned about. If this were read without stripping
       comments, the sentence below would register as a second fallback for
       `pro.mute` and assertion 2 would be red for a note explaining itself. */
    const pretend = withoutComments(
      "/* It used to say t('pro.mute', 'Silence this one'). */\nconst x = t('pro.mute', 'M');\n",
    );
    const found = [...pretend.matchAll(/\bt\(\s*'([a-zA-Z0-9_.:-]+)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*[,)]/g)];
    return found.length === 1 && unquote(found[0][2]) === 'M';
  })(),
  'a header explaining why a key changed has the old sentence in it, and a'
  + ' scan that counts prose as code turns every explanation into a failure');

console.log(bad === 0
  ? '\n  Every key means one thing, so what a file says is on the screen is what\n'
    + '  is on the screen.'
  : `\n  ${bad} not right.`);
process.exit(bad === 0 ? 0 : 1);

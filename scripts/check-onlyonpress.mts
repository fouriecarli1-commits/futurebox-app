/**
 * Nothing reaches the device except from a press.
 *
 *   npm run check:onlyonpress
 *
 * ── Where this came from ─────────────────────────────────────────────────
 *
 * Carli, 7 October 2026: *"Die photo editor save ook fotos op 'n mens se foon
 * sonder dat mens die export gedruk het."*
 *
 * It could not be reproduced then and it cannot be reproduced now: the photo
 * room has exactly one `a.download`, behind the paid export, and a sweep on
 * 9 October of every write-to-device in the app — nineteen of them — found
 * all nineteen behind a press. Two suspicions of mine died on inspection:
 * `VoiceScreen` looked like it saved whenever audio arrived, and `onAudio`
 * turns out to be fired by two `onClick` handlers and nothing else.
 *
 * So the report is not explained by the code, and the likely answers are
 * outside it — the pictures she is seeing may be the ORIGINALS she picked,
 * which were already in her gallery, or a long-press on an image, which
 * every browser offers on every page.
 *
 * ── Why a rule anyway ────────────────────────────────────────────────────
 *
 * Because "I could not reproduce it" is not a property anybody can keep. The
 * thing she described — a file arriving on her phone without her asking — has
 * one shape in code, and it is worth making impossible rather than
 * improbable: a write that runs because something ARRIVED instead of because
 * somebody PRESSED.
 *
 * That is a write inside a `useEffect`, or at module scope. Both are
 * unambiguous: an effect runs on render, on mount, on a dependency changing —
 * never because a person decided. A download there is a file on her phone she
 * did not ask for, and it would look exactly like what she reported.
 *
 * Deliberately NOT a rule that every write is lexically inside an `onClick`.
 * Several are in a named handler the button calls, which is better code, and
 * a rule that forbade it would push the writes INTO the JSX to satisfy it —
 * a check that makes the code worse to stay green.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** The ways a file can be put on somebody's device from this app. */
const WRITES = /downloadBlob\(|\.download\s*=|showSaveFilePicker\(|msSaveBlob\(/;

const files = [...walk('app/components'), ...walk('app/lib')]
  .filter((one) => !one.endsWith('app/lib/library.ts'));

/**
 * The body of every `useEffect` in a file, found by matching brackets.
 *
 * Counted rather than regexed to a closing brace: an effect that contains an
 * object literal or a nested arrow — and most do — ends at a `}` that a lazy
 * pattern finds first, which would read the effect as three lines long and
 * miss everything in it. That is the silent-pass shape, so the brackets are
 * actually balanced here.
 */
function effects(text: string): string[] {
  const out: string[] = [];
  const open = /useEffect\(\s*\(\s*\)\s*=>\s*\{/g;
  let hit: RegExpExecArray | null = open.exec(text);
  while (hit) {
    let depth = 1;
    let at = hit.index + hit[0].length;
    while (at < text.length && depth > 0) {
      const ch = text[at];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      at += 1;
    }
    out.push(text.slice(hit.index, at));
    hit = open.exec(text);
  }
  return out;
}

const sneaky: string[] = [];
let writing = 0;
for (const file of files) {
  const text = withoutComments(readFileSync(file, 'utf8'));
  if (!WRITES.test(text)) continue;
  writing += 1;
  for (const body of effects(text)) {
    if (WRITES.test(body)) sneaky.push(file.replace('app/', ''));
  }
}

ok('there are rooms that write to the device at all', writing >= 10,
  `${writing} — if this is near nought the pattern above stopped matching and`
  + ' everything below is measuring nothing');

ok('no file is written to the device from inside an effect',
  sneaky.length === 0,
  `${[...new Set(sneaky)].join(', ')} — an effect runs on render, on mount and`
  + ' on a dependency changing, never because a person decided. A download'
  + ' there is the thing she reported: a file on her phone she did not ask for');

/* And the bracket counter really does read a whole effect, including one
   with a nested arrow and an object in it — which is every real effect in
   this app, and the shape that would make the rule above silently empty. */
const sample = `useEffect(() => {
  const go = async () => {
    const thing = { a: 1, b: { c: 2 } };
    if (thing.a) downloadBlob(blob, 'x.wav');
  };
  void go();
}, [dep]);`;
ok('and the reader takes in a whole effect, nesting and all',
  effects(sample).length === 1 && WRITES.test(effects(sample)[0]),
  'a pattern that stops at the first closing brace reads three lines of a'
  + ' thirty-line effect and reports the other twenty-seven as clean');

/* The photo room is the one she named, so it is asserted by name as well as
   by the sweep: one way out, and it is the paid one. */
const photo = withoutComments(readFileSync('app/components/PostStudio.tsx', 'utf8'));
const ways = (photo.match(/\.download\s*=|downloadBlob\(/g) ?? []).length;
ok('the photo room has exactly one way to put a file on a phone',
  ways === 1, `${ways} — every extra one is another thing to keep behind the charge`);

ok('  and it is behind the paid picture',
  /const take = async[\s\S]{0,400}await paidPicture\(\)[\s\S]{0,400}\.download\s*=/.test(photo),
  'the export charge and the file have to be the same press, or one of them'
  + ' happens without the other');

console.log(bad === 0
  ? '\ncheck:onlyonpress — every file that reaches a device comes from a press, and the photo room has one way out.'
  : `\ncheck:onlyonpress — ${bad} wrong.`);
process.exit(bad === 0 ? 0 : 1);

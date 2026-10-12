/**
 * No Afrikaans typed into the English screen.
 *
 * Carli, 12 October 2026: *"Kyk asb ook die foute wat antigravity gemaak het,
 * deur afrikaans in 'n engelse engine te sit. Toets elke kamer se taal, daar
 * is afrikaans in die engelse window by cubed class."*
 *
 * She was right: "Winsverdeling", "Klasfooi", "Katalogus van Masterclasses",
 * "Ooreenkoms vir Gassprekers" and "VIP Masterclass · 3 Klasse" were typed
 * straight into JSX, so an English reader of the Cubed room got five
 * Afrikaans labels and an Afrikaans reader got the same five plus English
 * everywhere else. The dictionary (`t()`) is the one place a word may live in
 * two languages; a word in the markup is in one language for everybody.
 *
 * ── What is read ─────────────────────────────────────────────────────────
 *
 * Every component and page, with comments stripped: the text between tags
 * (`>Winsverdeling<`), and the attributes a reader sees or hears — `title`,
 * `placeholder`, `aria-label`, `alt`. A `t()` fallback is English by
 * contract and is not read; the Afrikaans for it is in the dictionary, which
 * `check:afrikaans` reads.
 *
 * ── What counts as Afrikaans ─────────────────────────────────────────────
 *
 * A word nobody writes in English ("asseblief", "winsverdeling", "ateljee")
 * flags on its own. The small words — "die", "van", "en", "met", "word" —
 * are English words too, so two DIFFERENT ones in the same piece of text are
 * needed before it flags — and the ones that are ordinary English ("is",
 * "in", "by", "was", "want", "min", "begin") are on neither list: "Katalogus van Masterclasses" has one strong word
 * and is caught by that; "Blaai deur alle goedgekeurde sessies" has "deur"
 * and "alle" and is caught by the pair.
 *
 * ── The screens that are Afrikaans on purpose ────────────────────────────
 *
 * `ALLOWED` names them, each with the reason. A file on it is still read,
 * and the list is checked against the files, so a screen that stops being
 * Afrikaans comes off it rather than hiding behind it.
 *
 * Proved by mutation: `>Winsverdeling<` put back in `CubedRoom.tsx` fails it;
 * so does `title="Tot die mag 3"`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { withoutComments } from './prose.mts';

let bad = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  if (!passed) bad += 1;
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${detail && !passed ? ` — ${detail}` : ''}`);
};

/** Words that are Afrikaans and not English. One is enough. */
const STRONG = /\b(asseblief|asb|hierdie|daardie|ateljee|liedjie|liedjies|kamer|kamers|katalogus|winsverdeling|verdeling|ooreenkoms|beskikbaar|gassprekers|gasspreker|gaste|klasfooi|meesterklas|meesterklasse|klasse|reeks|reekse|blaai|goedgekeurde|sessies|eksklusief|exklusief|toelaag|krediete|kies|maak|skep|verander|stoor|verwyder|wysig|sluit|teken|volgende|terug|aanbied|aangebied|gere[eë]l|verfilming|redigering|bediening|gehoor|voorwaardes|openbaar|gesprek|verdien|joune|myne|hulle|julle|onse|sê|môre|gister|vandag|vanaand|nuwe|eie|elke|alle|altyd|nooit|weer|hier|daar|waar|hoekom|wanneer|sodat|omdat|maar|nou|ook|nog|baie|meer|minder|groot|klein|mooi|lekker|verkeerd|goed|sleg|tydsduur|totale)\b/giu;
/** Words that are also English. Two different ones in one text, then. */
const WEAK = /\b(die|en|van|vir|met|jou|jy|ons|wat|aan|deur|oor|dit|het|nie|se|sy|om|te|na|uit|tot)\b/giu;

/**
 * Screens that are Afrikaans on purpose, with the reason. Read all the same:
 * the list is checked against the files below.
 */
const ALLOWED: Readonly<Record<string, string>> = {
  'app/oops/page.tsx': 'the page that reads the last crash: both languages side by side, because the language system may be the thing that broke',
  'app/components/Blankscreen.tsx': 'the blank-screen catch: both languages on one line, for the same reason',
};

const ROOT = process.cwd();
const files: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) { walk(path); continue; }
    if (/\.tsx$/.test(entry) && !/\.probe\.tsx$/.test(entry) && !/^probe-/.test(entry)) files.push(path);
  }
};
walk(join(ROOT, 'app/components'));
walk(join(ROOT, 'app'));
const seen = [...new Set(files)]
  .map((one) => one.slice(ROOT.length + 1).replace(/\\/g, '/'))
  .filter((one) => /^app\/components\/.*\.tsx$|^app\/page\.tsx$|^app\/[^/]+\/page\.tsx$/.test(one))
  .filter((one) => !/^app\/probe-/.test(one) && !/probe|check$/.test(one.split('/')[1] ?? ''))
  .sort();

/** The text a reader meets in one file: between tags, and in the spoken attributes. */
function readerText(source: string): { text: string; where: string }[] {
  const out: { text: string; where: string }[] = [];
  for (const m of source.matchAll(/>\s*([^<>{}]*[A-Za-zÀ-ɏ][^<>{}]*?)\s*</g)) {
    /* `a > b ? x : y` and `Math.min(...)` between the `>` and `<` of two
       comparisons are code, not text a reader meets. Prose carries none of
       these. */
    if (/[;=?]|&&|\|\||Math\.|const |\bnull\b/.test(m[1])) continue;
    out.push({ text: m[1], where: 'text' });
  }
  for (const m of source.matchAll(/\b(title|placeholder|aria-label|alt)=["']([^"']+)["']/g)) {
    out.push({ text: m[2], where: m[1] });
  }
  return out;
}

/** Why a piece of text reads as Afrikaans, or nothing. */
function afrikaansIn(text: string): string {
  const strong = [...new Set([...text.matchAll(STRONG)].map((m) => m[1].toLowerCase()))];
  if (strong.length > 0) return strong.join(', ');
  const weak = [...new Set([...text.matchAll(WEAK)].map((m) => m[1].toLowerCase()))];
  if (weak.length >= 2) return weak.join(' + ');
  return '';
}

const findings: string[] = [];
const allowedHit = new Set<string>();
for (const file of seen) {
  const source = withoutComments(readFileSync(join(ROOT, file), 'utf8'));
  for (const piece of readerText(source)) {
    const why = afrikaansIn(piece.text);
    if (!why) continue;
    if (ALLOWED[file]) { allowedHit.add(file); continue; }
    findings.push(`${file}: ${piece.where} "${piece.text.replace(/\s+/g, ' ').trim().slice(0, 70)}" (${why})`);
  }
}

ok(`every screen is read (${seen.length} files)`, seen.length > 100 && seen.includes('app/components/CubedRoom.tsx') && seen.includes('app/page.tsx'));
ok('no Afrikaans is typed into the markup of a room', findings.length === 0, `\n      ${findings.join('\n      ')}`);
for (const file of Object.keys(ALLOWED)) {
  ok(`  ${file} is still Afrikaans on purpose (${ALLOWED[file]})`, allowedHit.has(file) || !seen.includes(file),
    'nothing Afrikaans found in it any more — take it off ALLOWED');
}

/* The room she named, by name, so the fix cannot be undone quietly. */
const cubed = withoutComments(readFileSync('app/components/CubedRoom.tsx', 'utf8'));
ok('the Cubed room says every word through the dictionary',
  !/>\s*(Winsverdeling|Klasfooi|Katalogus|Ooreenkoms|Exklusief)/.test(cubed) && !/lang === 'af' \? '/.test(cubed),
  '"daar is afrikaans in die engelse window by cubed class"');

if (bad > 0) {
  console.error(`\ncheck:taalvas — ${bad} thing(s) wrong: an English reader is being handed Afrikaans.`);
  process.exit(1);
}
console.log(`\ncheck:taalvas — ${seen.length} screens read; every word a reader meets comes through the dictionary.`);

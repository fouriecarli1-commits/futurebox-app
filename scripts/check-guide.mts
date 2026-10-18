/**
 * The guide names every room, prices nothing by hand, and can be reached.
 *
 *   npm run check:guide
 *
 * ── Whose idea ───────────────────────────────────────────────────────────
 *
 * The owner, 12 October 2026: *"Ek wonder of ons ook nie 'n tweede pop out
 * website moet maak waarin al die terms en funksies van ons website in
 * verduidelik word nie."* Built as a page of this site, `/guide`, so it reads
 * the rooms and the prices from the same lists the app does.
 *
 * ── What is held ─────────────────────────────────────────────────────────
 *
 * A guide that drifts is worse than none: somebody reads a price here,
 * presses the button, and is charged another. So every room in `SURFACES`
 * has a section and a paragraph in both languages; every number on the page
 * is `CREDITS.something` or `readCost(...)`, never a digit before the word
 * credits; the glossary has a definition in both languages for every word;
 * and three screens link to it, which is what `check:bereikbaar` means by a
 * way in.
 */

import { readFileSync } from 'node:fs';
import { SURFACES } from '../app/lib/surfaces.ts';
import { withoutComments } from './prose.mts';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const guide = withoutComments(readFileSync('app/components/Guide.tsx', 'utf8'));
const words = readFileSync('app/lib/i18n.tsx', 'utf8');
const row = (key: string): boolean =>
  new RegExp(`"${key.replace(/\./g, '\\.')}":\\s*\\{\\s*en:\\s*"[^"]{2,}",\\s*af:\\s*"[^"]{2,}"`).test(words);

/* ── Every room ──────────────────────────────────────────────────────── */
const ids = Object.keys(SURFACES);
const listed = [...guide.matchAll(/\{ id: '([a-z_]+)', rail: '([a-z.]+)'/g)].map((m) => ({ id: m[1], rail: m[2] }));
const missing = ids.filter((id) => !listed.some((one) => one.id === id));
ok(`every room in SURFACES is on the guide (${ids.length} rooms)`, missing.length === 0, missing.join(', '));
const extra = listed.filter((one) => !ids.includes(one.id)).map((one) => one.id);
ok('  and the guide names no room the app has not got', extra.length === 0, extra.join(', '));
const noRow = ids.filter((id) => !row(`guide.room.${id}`));
ok('  and each has a paragraph in both languages', noRow.length === 0, noRow.join(', '));
const noName = listed.filter((one) => !row(one.rail)).map((one) => one.rail);
ok('  under the name the rail uses', noName.length === 0, noName.join(', '));

/* ── No price typed by hand ──────────────────────────────────────────── */
const typed = [...guide.matchAll(/\b\d+\s*(?:credits|krediete)\b/gi)].map((m) => m[0]);
ok('no number is typed before the word credits', typed.length === 0, typed.join(', '));
const priced = [...guide.matchAll(/\{ key: '[^']+', en: '[^']*', credits: ([^}]+?) \}/g)].map((m) => m[1].trim());
const notFromTable = priced.filter((one) => !/^CREDITS\.[a-zA-Z]+$|^readCost\(\d+\)$/.test(one));
ok(`  and every price on the page is read off the table (${priced.length} prices)`,
  priced.length >= 20 && notFromTable.length === 0, notFromTable.join(', '));
const priceKeys = [...guide.matchAll(/key: '(guide\.p\.[a-zA-Z]+)'/g)].map((m) => m[1]);
const priceNoRow = priceKeys.filter((key) => !row(key));
ok('  and every priced thing is named in both languages', priceNoRow.length === 0, priceNoRow.join(', '));

/* ── The words ───────────────────────────────────────────────────────── */
const wordList = /const WORDS = \[([\s\S]*?)\] as const;/.exec(guide)?.[1] ?? '';
const glossary = [...wordList.matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1]);
const wordNoRow = glossary.filter((w) => !row(`guide.word.${w}`) || !row(`guide.def.${w}`));
ok(`the glossary defines every word in both languages (${glossary.length} words)`,
  glossary.length >= 10 && wordNoRow.length === 0, wordNoRow.join(', '));

/* ── A way in ────────────────────────────────────────────────────────── */
for (const [file, why] of [
  ['app/help/page.tsx', 'the help page is where somebody looking for an explanation lands'],
  ['app/components/SiteFooter.tsx', 'the footer is on every page'],
  ['app/components/Account.tsx', 'the account sheet is where a member looks for what things cost'],
]) {
  ok(`${file.replace(/^app\/(components\/)?/, '')} links to the guide`,
    /href="\/guide"/.test(withoutComments(readFileSync(file, 'utf8'))), why);
}

if (failures) {
  console.error(`\ncheck:guide — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log('\ncheck:guide — every room is on it, every price is read off the table, and three screens lead to it.');

/**
 * Every platform's format line exists in both languages.
 *
 * ── What was found, 10 September 2026 ────────────────────────────────────
 *
 * `PLATFORMS` in `app/data/social.ts` has ten entries. The `social.format.*`
 * family in `i18n.tsx` had six keys. So Facebook, Vimeo, Apple Music and
 * SoundCloud printed their raw English `bestFormat` — "16:9, any length",
 * "Released track", "The track itself" — to somebody reading the app in
 * Afrikaans.
 *
 * **Nothing threw and nothing looked wrong.** `t(key, fallback)` returns the
 * fallback when a key is missing, which is exactly the right behaviour: a
 * missing translation should degrade to English rather than to a blank or a
 * raw key. It is also precisely why four gaps sat there unnoticed, and why
 * `audit/afrikaans.mjs` was passing at 24 untranslated lines against a
 * ceiling of 24 — one more and the build would have gone red for a reason
 * nobody had written down.
 *
 * ── Why this is a source check and not a probe ───────────────────────────
 *
 * The probe found it, and the probe can only find what is on a screen it
 * happens to visit. This counts the two lists against each other, so an
 * eleventh platform fails the moment it is added rather than the next time
 * somebody walks the right room in the right language.
 */
import { readFileSync } from 'node:fs';
import { PLATFORMS } from '../app/data/social';

let failures = 0;
const ok = (label: string, good: boolean, detail = ''): void => {
  console.log(`${good ? '  ok  ' : '  FAIL'} ${label}${detail && !good ? ` — ${detail}` : ''}`);
  if (!good) failures += 1;
};

/** Product names that stay themselves in every language. */
const BRANDS = ['Reels', 'Shorts', 'TikTok', 'Live'];

const i18n = readFileSync('app/lib/i18n.tsx', 'utf8');
const keyed = new Set(
  [...i18n.matchAll(/"social\.format\.([a-z0-9]+)":/g)].map((one) => one[1]),
);

const missing = PLATFORMS.filter((one) => !keyed.has(one.id));
ok(`every platform's format line is translated — ${PLATFORMS.length}`,
  missing.length === 0,
  `${missing.map((one) => `${one.id} ("${one.bestFormat}")`).join(', ')} — t() falls back to English, so this is silent`);

const orphans = [...keyed].filter((id) => !PLATFORMS.some((one) => one.id === id));
ok('and no translation is left behind for a platform that is gone',
  orphans.length === 0,
  `${orphans.join(', ')}`);

/* Both halves of each key, and not the English copied across. A key present
   with an empty or identical `af` is a key that passes the count above and
   still shows English on the screen. */
const thin: string[] = [];
const copied: string[] = [];
for (const one of PLATFORMS) {
  const line = i18n.match(new RegExp(`"social\\.format\\.${one.id}": \\{ en: "([^"]*)", af: "([^"]*)" \\}`));
  if (!line) continue;
  if (!line[2].trim()) thin.push(one.id);
  /* Some are legitimately identical, and the first version of this check
     called one of them a fault: Instagram's "9:16 Reels, 15–30s" is the same
     in Afrikaans because Reels is Instagram's product name, not a word.
     Neither is Shorts. So the product names come out before asking whether
     anything translatable is left — a rule that flags a correct translation
     is a rule somebody learns to ignore. */
  else if (line[1] === line[2] && /[a-z]{4,}/.test(BRANDS.reduce((rest, name) => rest.replaceAll(name, ''), line[1]))) copied.push(one.id);
}
ok('and the Afrikaans half is filled in', thin.length === 0, thin.join(', '));
ok('  and is not the English copied across where there were words to translate',
  copied.length === 0, copied.join(', '));

if (failures) {
  console.error(`\ncheck:socialformats — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:socialformats — all ${PLATFORMS.length} platforms say their format in both languages.`);

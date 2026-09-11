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
import { DESTINATIONS, PLATFORMS } from '../app/data/social';

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

/* ── The places that are not an account ─────────────────────────────────
 *
 * Carli, 11 September 2026: "Ek wil ook vra dat ons die web ook 'n opsie
 * moet maak waar advertensies gepost gaan word. Dit moet ook daar wees om te
 * kan tick."
 *
 * A website is ticked in the same row as the platforms and is not one. It
 * has no handle, nothing to connect and nothing the posting queue can
 * schedule to, so it lives in `DESTINATIONS` rather than in `PLATFORMS` —
 * which six other screens read and none of which could do anything sensible
 * with it.
 *
 * Two rules, and the second is the one with teeth. Both lists are ticked
 * into the same `going` array of ids in Campaign.tsx, so an id in both
 * lists would draw two buttons that switch each other on and send the same
 * place to the writer twice. Nothing would throw; it would just be wrong on
 * screen, which is the shape of fault this file exists for.
 */
const destKeys = new Set(
  [...i18n.matchAll(/"dest\.format\.([a-z0-9]+)":/g)].map((one) => one[1]),
);

const destMissing = DESTINATIONS.filter((one) => !destKeys.has(one.id));
ok(`every destination's format line is translated — ${DESTINATIONS.length}`,
  destMissing.length === 0,
  `${destMissing.map((one) => `${one.id} ("${one.bestFormat}")`).join(', ')} — t() falls back to English, so this is silent`);

const destOrphans = [...destKeys].filter((id) => !DESTINATIONS.some((one) => one.id === id));
ok('  and no line is left behind for a destination that is gone',
  destOrphans.length === 0, destOrphans.join(', '));

const destThin: string[] = [];
const destCopied: string[] = [];
for (const one of DESTINATIONS) {
  const line = i18n.match(new RegExp(`"dest\\.format\\.${one.id}": \\{ en: "([^"]*)", af: "([^"]*)" \\}`));
  if (!line) continue;
  if (!line[2].trim()) destThin.push(one.id);
  else if (line[1] === line[2] && /[a-z]{4,}/.test(BRANDS.reduce((rest, name) => rest.replaceAll(name, ''), line[1]))) destCopied.push(one.id);
}
ok('  and its Afrikaans half is filled in', destThin.length === 0, destThin.join(', '));
ok('  and is not the English copied across', destCopied.length === 0, destCopied.join(', '));

/* Each destination also names itself in both languages — `en`/`af` on the
   entry itself, because the button's title is not translated through i18n
   the way a platform's brand name never needs to be. */
const unnamed = DESTINATIONS.filter((one) => !one.en.trim() || !one.af.trim() || one.en === one.af);
ok('  and says its own name in both languages',
  unnamed.length === 0, unnamed.map((one) => one.id).join(', '));

const clash = DESTINATIONS.filter((one) => PLATFORMS.some((other) => other.id === one.id));
ok('and no destination shares an id with a platform',
  clash.length === 0,
  `${clash.map((one) => one.id).join(', ')} — both lists tick into one array of ids, so the two buttons would switch each other off`);

/* And it is actually offered. A list nobody renders is a list that passes
   every rule above while the tick box she asked for does not exist. */
const campaign = readFileSync('app/components/Campaign.tsx', 'utf8');
ok('  and Campaign.tsx draws them beside the platforms',
  /DESTINATIONS\.map\(/.test(campaign) && /DESTINATIONS\.filter\(/.test(campaign),
  'DESTINATIONS is imported but never ticked or sent');

/* Sent to the writer, not only drawn. The `fit` line is what makes the copy
   come out the right length; a destination ticked but left out of it is a
   tick box that changes nothing. */
ok('  and sends what it needs to the writer',
  /fit: \[\.\.\.chosen, \.\.\.places\]/.test(campaign),
  'the fit line is built from the platforms alone');

/* A website takes no hashtags, and `maxHashtags: 0` reaching a template that
   assumes a number prints "at most 0 hashtags" — which reads as an
   instruction to a model rather than as none. */
ok('  and says none rather than zero where none are wanted',
  !DESTINATIONS.some((one) => one.maxHashtags === 0) || /no hashtags/.test(campaign),
  'a destination takes no hashtags and the fit line would say "at most 0"');

if (failures) {
  console.error(`\ncheck:socialformats — ${failures} failure(s).\n`);
  process.exit(1);
}
console.log(`\ncheck:socialformats — ${PLATFORMS.length} platforms and ${DESTINATIONS.length} other destination(s) say their format in both languages.`);

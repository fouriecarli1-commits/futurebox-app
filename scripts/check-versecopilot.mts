/**
 * Extensive writes the song part by part, with a copilot for each part.
 *
 * The owner, 21 October 2026: *"By make a song se extensive gedeelte is daar
 * nie 'n copilot om die verse by verse te skryf nie."* What was there was a
 * "Suggest lines" button that pasted the same fixed lines into every song.
 * Read for: the canned lines are gone, each part asks the real songwriter
 * route with what that part is for and what the writer wants, the options
 * can be used or added under, "More ideas" does not repeat, and the route
 * reads and screens the new fields.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok  ' : 'NOT '} ${what}${passed || !detail ? '' : ` — ${detail}`}`);
  if (!passed) failures += 1;
};
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const writer = read('app/components/VerseWriter.tsx');
ok('the fixed lines pasted into every song are gone',
  !/Shadows stretching down this empty street/.test(writer) && !/Die son sak stadig oor die horison/.test(writer));
ok('each part asks the songwriter route, for that part',
  /fetch\('\/api\/songwriter', \{\s*method: 'POST'/.test(writer) && /mode: 'continue',\s*section:/.test(writer));
ok('  with what the part is for and what the writer wants from it',
  /purpose: isAf \? section\.guideAf : section\.guideEn/.test(writer) && /ask: asks\[section\.id\]/.test(writer));
ok('  and the whole song so far, so it fits around it', /\blyrics,\n/.test(writer) && /\babout,\n/.test(writer));
ok('there is a box to say what the part should do, with a listen button',
  /data-verseask=/.test(writer) && /SpeakButton\s*\n?\s*onHeard=\{\(said\) => setAsks/.test(writer));
ok('an option can replace the part or go under it', /data-verseuse="replace"/.test(writer) && /data-verseuse="add"/.test(writer));
ok('"More ideas" sends what was already shown', /seen: shownBefore/.test(writer) && /data-versemore=/.test(writer));
ok('without a model the part says so instead of offering a button that does nothing', /copilotReady === false/.test(writer));

ok('a sung line holding "koor" or "slot" is a lyric, not a heading',
  /const heading = \/\^\\\[/.test(writer) && /if \(!heading && line\)/.test(writer));

const route = read('app/api/songwriter/route.ts');
ok('the route reads the part\'s purpose and the writer\'s ask',
  /body\.purpose\?\.trim\(\)/.test(route) && /body\.ask\?\.trim\(\)/.test(route));
ok('  and screens what the writer typed before it leaves', /screen\(\[body\.title, body\.style, body\.lyrics, body\.about, body\.ask\]/.test(route));

if (failures) {
  console.error(`\ncheck:versecopilot — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:versecopilot — every part of the song has its own copilot.');

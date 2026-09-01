// Does the play button make a sound? Measured, not asserted.
//
//   PROBE=1 npm run build && npx next start -p 3111 &
//   node .probe/style-audible.mjs
//
// Every style is rendered through an OfflineAudioContext in a real browser and
// the samples are inspected. The previous version of this feature had a play
// button that produced silence, and nothing in the codebase would have caught
// it — a test that only checks the button exists would have passed then too.

import { chromium } from 'playwright';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:3111/sketchcheck', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#result[data-done="yes"]', { timeout: 60_000 });
const rows = JSON.parse(await page.locator('#result').innerText());

say(rows.length >= 16, `only ${rows.length} styles rendered`);

for (const row of rows) {
  // Silence is the bug this replaces. A peak near zero is a play button that
  // does nothing, which is what shipped before.
  say(row.peak > 0.05, `"${row.name}" renders near-silent: peak ${row.peak.toFixed(4)}`);
  // And loud enough to hear without reaching for the volume.
  say(row.rms > 0.01, `"${row.name}" is too quiet to hear: rms ${row.rms.toFixed(4)}`);
  // Not so loud it clips, which is its own kind of broken.
  say(row.peak <= 1.0, `"${row.name}" clips: peak ${row.peak.toFixed(3)}`);
  // A groove, not one hit at the start and then nothing.
  say(
    row.silentFor < 2.0,
    `"${row.name}" goes quiet for ${row.silentFor.toFixed(1)}s — that is a stab, not a groove`,
  );
}

// And they have to differ from each other, which was the other half of the old
// bug: seventeen names, three sounds.
//
// This compared loudness alone, and loudness alone stopped working when the
// shelf grew: it is one number in a narrow range, so past a certain count two
// grooves collide by arithmetic rather than by sounding alike. The fingerprint
// is what the sketch actually is — the energy in three bands, how often it
// hits, and how loud it is. Two styles matching on all of that are the same
// groove wearing two names, which is the thing worth failing over.
const print = (one) =>
  `${one.bands.join('/')}·${one.onsets}·${Math.round(one.rms * 400)}·${Math.round(one.peak * 40)}`;
const prints = rows.map(print);
const distinct = new Set(prints).size;
say(
  distinct >= rows.length * 0.75,
  `only ${distinct} distinct sounds across ${rows.length} styles`,
);

// Name the twins rather than only counting them, so a failure says what to fix.
const seen = new Map();
for (const one of rows) {
  const key = print(one);
  if (!seen.has(key)) seen.set(key, []);
  seen.get(key).push(one.name);
}
for (const [, names] of seen) {
  say(names.length <= 2, `these sound identical: ${names.join(', ')}`);
}

await browser.close();
const quietest = rows.reduce((a, b) => (a.rms < b.rms ? a : b));
console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — all ${rows.length} styles render audible sound (quietest: ${quietest.name}, rms ${quietest.rms.toFixed(3)})`,
);
process.exit(problems.length ? 1 : 0);

// The style shelf: does every genre get its own sound, and is that sound real?
//
//   node .probe/style-sketch.mjs
//
// The bug this replaces: seventeen genres shared three mp3s on somebody else's
// CDN, and when the host stopped answering the failure was swallowed into a
// silent catch. So both halves are checked — that the sketches genuinely
// differ, and that nothing here depends on a network at all.

import { GENRE_SAMPLES, GENRE_CATEGORIES } from '../app/data/genres.ts';
import { readKey } from '../app/lib/preview.ts';

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };

// ── Nothing points at anybody else's server any more ───────────────────
const source = await (await import('node:fs/promises')).readFile(
  new URL('../app/data/genres.ts', import.meta.url),
  'utf8',
);
say(!/audioUrl:\s*'/.test(source), 'a sample still carries an audioUrl');
say(!/mixkit|https?:\/\/assets/.test(source.replace(/^ \*.*$/gm, '')), 'a sample still points at an external host');

// ── Every genre has what the sketcher needs to sound like itself ───────
for (const one of GENRE_SAMPLES) {
  const bpm = Number(/\d+/.exec(one.bpm)?.[0]);
  say(Number.isFinite(bpm) && bpm >= 50 && bpm <= 220, `${one.name} has an unusable tempo: ${one.bpm}`);
  // Asserted through the parser rather than against a pattern: "Drop D" is a
  // guitar tuning and still has to land on a real note, and a regex that
  // accepts it by accident proves nothing.
  const root = readKey(one.key);
  say(root.hz > 40 && root.hz < 120, `${one.name} has an unusable key: ${one.key}`);
  say(
    GENRE_CATEGORIES.includes(one.category),
    `${one.name} is in "${one.category}", which is not a category on the shelf`,
  );
  say(one.promptSnippet.length > 30, `${one.name} has no words to hand to the style field`);
}

// ── And the sketches actually differ ───────────────────────────────────
//
// The old failure was seventeen names sharing three sounds. The sketch is a
// function of tempo, key and category, so the test is that those three do not
// collapse: if two genres produce the same triple they will sound identical,
// which is the thing being prevented.
const fingerprints = GENRE_SAMPLES.map(
  (one) => `${/\d+/.exec(one.bpm)?.[0]}|${one.key.trim().toLowerCase()}|${one.category}`,
);
const distinct = new Set(fingerprints).size;

// The one entry that is a tuning rather than a key still has to sound like
// something: "Drop D" is a real line on the shelf.
const dropD = GENRE_SAMPLES.find((one) => /drop/i.test(one.key));
if (dropD) {
  const root = readKey(dropD.key);
  say(Math.abs(root.hz - 61.74) < 1, `"${dropD.key}" did not land on a D: ${root.hz.toFixed(2)}Hz`);
}
say(
  distinct >= GENRE_SAMPLES.length * 0.75,
  `${distinct} distinct sounds across ${GENRE_SAMPLES.length} genres — too many would sound the same`,
);

// Every category on the shelf has to have a kit, or it falls back and stops
// being itself.
const preview = await (await import('node:fs/promises')).readFile(
  new URL('../app/lib/preview.ts', import.meta.url),
  'utf8',
);
for (const category of GENRE_CATEGORIES) {
  if (category === 'All') continue;
  say(preview.includes(`'${category}'`), `no kit for "${category}" — it would fall back to the default`);
}

// ── The failure has to be visible ──────────────────────────────────────
const finder = await (await import('node:fs/promises')).readFile(
  new URL('../app/components/StyleFinder.tsx', import.meta.url),
  'utf8',
);
// Comments stripped first: this file now *describes* the old bug, and a grep
// that cannot tell a warning from the thing it warns about is a grep that
// fails on its own documentation.
const code = finder.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
say(!/catch\(\(\) => setPlaying\(null\)\)/.test(code), 'the silent catch is back');
say(/setNoSound/.test(finder), 'there is no way for the screen to say it could not play');
say(
  /style\.sketchNote/.test(finder),
  'the screen does not say the sound is a sketch rather than a recording of the genre',
);

console.log(
  problems.length
    ? `FAIL\n  ${problems.join('\n  ')}`
    : `PASS — ${GENRE_SAMPLES.length} genres, ${distinct} distinct sketches, no network and no silent failure`,
);
process.exit(problems.length ? 1 : 0);

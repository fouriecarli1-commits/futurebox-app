// Two rooms about speaking, and a set of directions that had gone stale.
//
//   node .probe/rooms.mjs
//
// The report was "Voice should actually become Podcast". Both rooms existed;
// what did not exist was any way to tell them apart from the rail. Voice sat in
// the middle of the song-making run, labelled "Script my voice", so somebody
// looking for podcasting opened it and found a screen that plainly did
// something — which is worse than an empty one, because it does not look like
// the wrong room.
//
// And the Booth getting its own rung made the Voice screen's directions wrong:
// it was still telling people to go to Make a song and press a button on a
// track row.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
const bare = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const page = bare(await read('../app/page.tsx'));
const rungs = [...page.matchAll(/\{ id: '([a-z_]+)', label: t\('rail\./g)].map((m) => m[1]);

// ── The two speaking rooms stand together ──────────────────────────────
say(rungs.includes('voice_studio') && rungs.includes('podcast'), 'one of the two speaking rooms is off the rail');
say(
  Math.abs(rungs.indexOf('voice_studio') - rungs.indexOf('podcast')) === 1,
  `Voice and Podcast are ${Math.abs(rungs.indexOf('voice_studio') - rungs.indexOf('podcast'))} rungs apart, so nothing suggests they are related`,
);
say(
  rungs.indexOf('voice_studio') > rungs.indexOf('booth'),
  'Voice still sits inside the song-making run, where it reads as a step in making a song',
);

// ── The Voice screen says where it is not ──────────────────────────────
const screen = await read('../app/components/VoiceScreen.tsx');
const code = bare(screen);
say(/onGoToBooth/.test(code), 'the voice screen cannot send anybody to the booth');
say(/onGoToPodcast/.test(code), 'the voice screen never mentions where podcasting is');
say(!/onGoToMake/.test(code), 'it still points at the make screen, which is no longer where singing on a track starts');
say(/voice\.showNote/.test(code), 'there is no explanation of what Podcast is for');

// And the page hands it both, pointed at the right tabs.
say(/onGoToBooth=\{\(\) => setStudioTab\('booth'\)\}/.test(page), 'the booth link goes somewhere other than the booth');
say(/onGoToPodcast=\{\(\) => setStudioTab\('podcast'\)\}/.test(page), 'the podcast link goes somewhere other than the podcast');

// ── The stale directions are gone ──────────────────────────────────────
const i18n = await read('../app/lib/i18n.tsx');
const sing = /"voice\.singNote": \{\s*\n?\s*en: "([^"]+)"/.exec(i18n) ?? /"voice\.singNote": \{ en: "([^"]+)"/.exec(i18n);
say(Boolean(sing), 'the singing directions string is gone entirely');
say(sing && /Booth/i.test(sing[1]), 'the directions do not name the Booth, which is where singing on a track now starts');
say(
  sing && !/Make a song/i.test(sing[1]),
  'the directions still send somebody to another screen to press a button on a song row',
);
const show = /"voice\.showNote": \{\s*\n?\s*en: "([^"]+)"/.exec(i18n);
say(Boolean(show), 'there is no string saying what Podcast is');
say(show && /feed/i.test(show[1]), 'the explanation of Podcast never mentions the feed, which is what makes it a podcast');
say(show && /two voices|each other/i.test(show[1]), 'it does not mention the two-voice conversation, which is the new part');

// ── The rung no longer competes ────────────────────────────────────────
const rail = /"rail\.voice": \{ en: "([^"]+)", af: "([^"]+)" \}/.exec(i18n);
say(Boolean(rail), 'the voice rung lost its label');
say(rail && !/script/i.test(rail[1]), 'the rung is still named after what you do with the voice rather than the voice');
say(rail && rail[2] && rail[2] !== rail[1], 'the rung has no Afrikaans of its own');

// ── Both languages, everywhere this touched ────────────────────────────
for (const key of ['voice.screen', 'voice.screenSub', 'voice.sing', 'voice.singNote', 'voice.show', 'voice.showNote', 'rail.voice', 'rail.voice.hint']) {
  const at = i18n.indexOf(`"${key}":`);
  say(at !== -1, `${key} is missing from the dictionary`);
  if (at === -1) continue;
  const body = i18n.slice(at, i18n.indexOf('\n  "', at + 1));
  say(/en: "/.test(body), `${key} has no English`);
  say(/af: "/.test(body), `${key} has no Afrikaans`);
}

// ── One key, defined once ──────────────────────────────────────────────
// This has now caught two collisions in one sitting: a screen quietly took a
// key another screen already owned, and the second definition silently won.
const keys = [...i18n.matchAll(/^  "([^"]+)":/gm)].map((m) => m[1]);
const twice = keys.filter((key, at) => keys.indexOf(key) !== at);
say(twice.length === 0, `defined twice, so the later one silently wins: ${[...new Set(twice)].join(', ')}`);

if (problems.length) {
  console.error(`rooms: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('rooms: the two speaking rooms stand together, each says what the other is for, and the directions point where the booth actually is');

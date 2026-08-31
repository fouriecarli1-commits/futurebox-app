// The Booth had no door.
//
//   node .probe/booth.mjs
//
// Every part of the booth was built and working — words in time, two waveforms
// on one clock, punching in, lanes and faders, and splitting the song so the
// generated voice can be lifted out. The report was that the booth is missing,
// and it was right in the only way that matters: there was no rung on the rail,
// and the one way in was a small button on a song row inside the make screen,
// which you only saw once you already had a song.
//
// So this checks the door, not the room — and the one thing that could quietly
// break by having two doors, which is the two of them filing a take under
// different names.

const problems = [];
const say = (ok, what) => { if (!ok) problems.push(what); };
const read = async (path) =>
  (await import('node:fs/promises')).readFile(new URL(path, import.meta.url), 'utf8');
// A grep over source matches the comment warning against the thing as readily
// as the thing. Twice now that has produced a false pass, so comments go first.
const bare = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// ── There is a rung, and it renders the booth ──────────────────────────
const page = bare(await read('../app/page.tsx'));
say(/id: 'booth'/.test(page), 'the rail has no booth rung');
say(/'rail\.booth'/.test(page), 'the booth rung has no label');
say(/studioTab === 'booth'/.test(page), 'nothing renders when the booth rung is pressed');
say(/<Booth\b/.test(page), 'the booth rung does not mount the Booth');
say(/import Booth from '\.\/components\/Booth'/.test(page), 'Booth is never imported');
say(
  /useState<[^>]*'booth'[^>]*>\('make'\)/.test(page),
  "'booth' is not one of the tabs the studio can be on, so the rung sets a state nothing matches",
);
// The rung sits where the work happens: after arranging, before the video.
const rungs = [...page.matchAll(/\{ id: '([a-z_]+)', label: t\('rail\./g)].map((m) => m[1]);
say(rungs.indexOf('booth') > rungs.indexOf('make'), 'the booth comes before there is a song to sing on');
say(
  rungs.indexOf('booth') < rungs.indexOf('video'),
  'the booth comes after the video, which is not the order the work happens in',
);

// ── The screen opens the real booth, and does not reimplement it ───────
const screen = await read('../app/components/Booth.tsx');
const code = bare(screen);
say(/import VocalBooth from '\.\/VocalBooth'/.test(code), 'the screen does not open the real booth');
say(/<VocalBooth\b/.test(code), 'VocalBooth is imported but never mounted');
say(!/MediaRecorder|getUserMedia|OfflineAudioContext/.test(code), 'the screen has started recording on its own — a second booth is the failure being fixed');
say(/onSplit=/.test(code), 'splitting the song is not carried through, so lifting the AI voice out is lost');
say(/startTake=/.test(code), 'a take that was already recorded is not handed back, so it cannot be opened up again');

// ── Somebody with no songs is told why, and where to go ────────────────
say(/tracks\.length === 0/.test(code), 'there is no empty state, so a new account sees a blank room');
say(/onGoToMake/.test(code), 'the empty state does not offer a way to make a song');
const i18n = await read('../app/lib/i18n.tsx');
const none = /"booth\.room\.none": \{\s*en: "([^"]+)"/.exec(i18n);
say(Boolean(none), 'there is no string explaining that there is nothing to sing on yet');
say(none && /backing/i.test(none[1]), 'the empty state never mentions asking for a backing track, which is the useful part');

// ── What it is, before anything is pressed ─────────────────────────────
for (const part of ['sing', 'see', 'punch', 'split', 'lanes']) {
  say(new RegExp(`"booth\\.room\\.${part}"`).test(i18n), `the screen never says it can ${part}`);
  say(new RegExp(`'booth\\.room\\.${part}'`).test(code), `booth.room.${part} is written but never shown`);
}

// ── Both languages, for every string this screen added ─────────────────
const added = [...i18n.matchAll(/"(booth\.room\.[a-zA-Z.]+|rail\.booth(?:\.hint)?)": \{([\s\S]*?)\},?\n/g)];
say(added.length >= 14, `only ${added.length} of the booth's strings are in the dictionary`);
for (const [, key, body] of added) {
  say(/en: "/.test(body), `${key} has no English`);
  say(/af: "/.test(body), `${key} has no Afrikaans`);
}

// ── One key, defined once ──────────────────────────────────────────────
const keys = [...i18n.matchAll(/^  "([^"]+)":/gm)].map((m) => m[1]);
const twice = keys.filter((key, at) => keys.indexOf(key) !== at);
say(twice.length === 0, `defined twice, so the second one silently wins: ${[...new Set(twice)].join(', ')}`);

// ── Two doors, one filing cabinet ──────────────────────────────────────
// The take is kept beside the mix so a song can be opened up and changed long
// after it was posted. If the two screens disagree about where it goes, a song
// kept from one door cannot be reopened from the other, and the symptom is a
// button that says the recording is missing when it is right there.
const keep = await read('../app/lib/takekeep.ts');
say(/export async function keepMix/.test(keep), 'there is no shared way to keep a mix');
say(/export const takeId/.test(keep), 'where the take is filed is not decided in one place');
const make = bare(await read('../app/components/MakeMusic.tsx'));
for (const [name, source] of [['the make screen', make], ['the booth screen', code]]) {
  say(/keepMix\(/.test(source), `${name} keeps a mix its own way`);
  say(!/`\$\{[a-zA-Z.]+\}:take`/.test(source), `${name} still builds the take id by hand`);
}
say(/takeId\(/.test(make) && /takeId\(/.test(code), 'one of the screens does not use takeId to find the take');

// ── The mix has to carry what is in it ─────────────────────────────────
// A song that quietly has a generated voice under a recorded one while the
// credits say otherwise is the single thing this must not do.
say(/Your voice \(recorded\)/.test(keep), 'a recorded voice is not named in the credits');
say(/doubled \? \['AI voice, kept under yours'\]/.test(keep), 'a kept AI voice is not declared');
say(/stems: undefined/.test(keep), 'the new song claims stems that were never separated for it');

if (problems.length) {
  console.error(`booth: ${problems.length} problem(s)`);
  for (const one of problems) console.error(`  · ${one}`);
  process.exit(1);
}
console.log('booth: the rail has a door, both doors file the take in the same place, and the room is not rebuilt');

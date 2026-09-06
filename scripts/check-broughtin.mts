/**
 * A song you brought in from a file reaches the camera, and claims nothing.
 *
 * ── What she asked for ───────────────────────────────────────────────────
 *
 * "Dit sal baie cool wees as iemand ook hulle eie liedjies kon oplaai om daai
 *  presies funksie te vervul."
 *
 * The function is the selfie camera: the phone films you, the song plays out
 * loud, the words scroll over the viewfinder and never reach the file. It is
 * a button on a card in the channel — so a song with no card in the channel
 * has no path to it. Uploads live beside the channel on purpose and the room
 * read `loadTracks()` only, so for the one case she named — a recording you
 * already have — there was no card and therefore no camera.
 *
 * ── And the half that is not about her ───────────────────────────────────
 *
 * Uploads are still not *in* the channel, and three of the card's controls
 * would be false if they were:
 *
 *   Post to Live      puts it in the public room under her recording name.
 *                     On a file that may be anybody's, that is a claim of
 *                     authorship the app makes on her behalf. This is the
 *                     one worth a check of its own: it is invisible in the
 *                     UI, it is the kind of thing a tidy-up would "simplify"
 *                     back in, and the damage lands on somebody who is not
 *                     in the room to object.
 *   Cover art         bills a generation and files artwork on the account
 *                     for a song the account did not make.
 *   Open in studio    regenerates from a composition plan that a brought-in
 *                     song has never had.
 *
 * So this file asserts both directions. Reachable, and narrow.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

const channel = readFileSync(join(ROOT, 'app/components/Channel.tsx'), 'utf8');

/* ── Reachable ─────────────────────────────────────────────────────────── */

ok(
  'the channel reads the songs somebody brought in',
  /loadUploads\(\)/.test(channel),
  'Channel.tsx never calls loadUploads, so a brought-in song has no card here',
);

ok(
  'and they go into the same list the grid draws',
  /setTracks\(\[\s*\.\.\.loadTracks\(\),\s*\.\.\.loadUploads\(\)\s*\]\)/.test(channel),
  'they are read but not merged into `tracks`',
);

ok(
  'a file can be brought in from this room',
  /addUpload\(/.test(channel) && /type="file"/.test(channel) && /accept="audio\/\*"/.test(channel),
  'no way to add one from the room the cards are in',
);

/*
 * The camera button must not be gated on where the song came from. It was
 * gated on having words once, which is what hid it from her: the camera has
 * nothing to do with words.
 */
const cameraButton = channel.slice(
  channel.indexOf("chan.filmIt") - 3000,
  channel.indexOf("chan.filmIt") + 500,
);
/*
 * Matched on what opens the button, not on "no source test within N
 * characters of the label". The first version of this assertion did the
 * latter, the button's onClick body is longer than the window was, and it
 * passed with the fault injected — the same way check:probes first passed a
 * file that merely *named* the thing it was supposed to wait for.
 *
 * `{(` is a bare group: the button draws for every song. Any condition put
 * in front of it changes those two characters, whatever the condition is,
 * so this catches a gate on the source and a gate on anything else too —
 * including the words gate that hid the camera from her in the first place.
 */
const opensButton = channel.indexOf('{(\n                  <button');
ok(
  'the camera button draws for every song, gated on nothing',
  opensButton !== -1 && channel.indexOf('chan.filmIt', opensButton) !== -1,
  'something now stands in front of the words/selfie button',
);
ok(
  'and it sets the words screen for any song',
  /setLyricsFor\(\{ track, lines: timedFor\(track\) \}\)/.test(cameraButton),
  'the button no longer opens the words screen',
);

/* ── Narrow ────────────────────────────────────────────────────────────── */

/**
 * Each of these must appear guarded. Matched as "the guard is immediately in
 * front of it", not merely "the guard exists somewhere in the file", because
 * a guard on a different control is not a guard on this one.
 */
const mustBeGuarded: ReadonlyArray<{ what: string; near: RegExp }> = [
  {
    what: 'a brought-in song cannot be posted to the live room',
    near: /\{track\.source !== 'upload' && <PostToLive track=\{track\} \/>\}/,
  },
  {
    what: 'and cannot be given cover art on the account',
    near: /track\.source !== 'upload' && \([\s\S]{0,600}make\.cover/,
  },
  {
    what: 'and cannot be opened in the studio to be regenerated',
    near: /onEdit && track\.source !== 'upload' &&/,
  },
];

for (const one of mustBeGuarded) {
  ok(one.what, one.near.test(channel), 'the guard is missing or no longer next to the control');
}

ok(
  'and the card says it was brought in rather than made here',
  /track\.source === 'upload' &&[\s\S]{0,600}chan\.broughtIn/.test(channel),
  'nothing on the card distinguishes it, so the grid takes credit for it',
);

/*
 * The words themselves. A screen that only exists in English is a screen she
 * cannot use, and every string added here is new.
 */
const dict = readFileSync(join(ROOT, 'app/lib/i18n.tsx'), 'utf8');
for (const key of [
  'chan.broughtIn',
  'chan.bringIn',
  'chan.bringingIn',
  'chan.bringInWhy',
  'chan.dropBrought',
  'chan.songTooBig',
  'chan.songUnreadable',
]) {
  const line = dict.split('\n').find((one) => one.includes(`"${key}"`)) ?? '';
  ok(`${key} is there in both languages`, /af: "[^"]+"/.test(line), 'missing, or English only');
}

if (failures > 0) {
  console.log(`\ncheck:broughtin — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:broughtin — a brought-in song reaches the camera, and claims nothing.');

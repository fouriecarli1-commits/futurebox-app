/**
 * A refresh does not restart the song.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Die een liedjie wat ek in die live room gepost
 * het is hakkerig."* — of a GENERATED song, which matters: that is a few
 * megabytes of mp3, not the thirty-one a three-minute Booth WAV is. So it was
 * never bandwidth, and ruling bandwidth out is what made it findable.
 *
 * The live room refreshes on an interval. Every refresh rebuilds the post
 * list with `.map()`, which makes new objects out of identical data. The
 * player's effect was keyed on that object, so it re-ran every few seconds:
 * its cleanup paused the audio, and `start` set `src` to the same URL again —
 * which still makes the browser throw the buffer away and begin from zero.
 *
 * The song restarted every refresh interval, for ever, and it sounded exactly
 * like stuttering.
 *
 * ── Why the check is written against the SHAPE ───────────────────────────
 *
 * This is a fault of identity, not of behaviour anything can observe without
 * a live room, a real post and a refresh cycle. What can be held is the two
 * things that prevent it, and they are both one line:
 *
 *   - the effect depends on which post and where its file is, never on the
 *     post object;
 *   - `start` returns early when the element is already playing that URL.
 *
 * Either alone would fix it. Both are required here so that a later refactor
 * of one cannot quietly bring it back through the other — which is precisely
 * how it arrived, since the effect was correct when the room did not refresh.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const screen = readFileSync('app/components/RoomScreen.tsx', 'utf8');
const room = readFileSync('app/components/LiveChannel.tsx', 'utf8');

/* The thing that makes this necessary, held so the reasoning above stays
   true: if the room ever stops handing down fresh objects, these guards are
   still right, but a reader deserves to find out here rather than by
   archaeology. */
ok(
  'the live room really does hand down a fresh list',
  /posts=\{room\.posts\.map\(/.test(room),
  'if this changed, the note in RoomScreen about why is now history',
);
ok('and it really does refresh on a timer', /setInterval\(\(\) => void ask\(\)/.test(room));

ok(
  'the player is keyed on which post, not on the post object',
  /\}, \[playingId, playingSrc, start\]\);/.test(screen),
  'an effect keyed on the object re-runs on every refresh and pauses the song',
);
ok(
  'and it takes those from the post rather than holding a copy',
  /const playingId = post\?\.id;/.test(screen) && /const playingSrc = post\?\.audio \?\? null;/.test(screen),
);
ok(
  'setting the same source twice is refused',
  /if \(element\.src === one\.audio && !element\.paused\) return;/.test(screen),
  'assigning src, even the same src, throws the buffer away and starts over',
);

/* And the thing that made it worse rather than caused it. A player that
   starts on the first few kilobytes stalls on any dip; one that fetches
   ahead does not. */
ok('the player fetches ahead rather than starting on a trickle',
  /element\.preload = 'auto';/.test(screen));
ok('  and says so when it has run dry', /addEventListener\('waiting'/.test(screen));

if (failures) {
  console.error(
    '\ncheck:keepplaying — the live room refreshes on a timer and rebuilds its post list\n' +
      'each time. A player keyed on the post object restarts the song every refresh, which\n' +
      'is heard as stuttering and is not a bandwidth problem.\n',
  );
  process.exit(1);
}
console.log('\ncheck:keepplaying — a refresh leaves the song playing.');

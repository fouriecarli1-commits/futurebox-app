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
 * ── And the half of it the first fix got wrong ───────────────────────────
 *
 * Carli, the same day, after that shipped: *"Al die liedjies binne live room
 * is hakkerig."* All of them, not one — so the fix had changed nothing.
 *
 * The effect had been keyed on the post's id AND on its audio url, on the
 * reasonable-sounding ground that a file moving is a real reason to reload.
 * The url is a SIGNED url: `/api/live` mints it with `createSignedUrl` on
 * every request, and the signature carries the moment it was issued. The same
 * file on the same row therefore arrives under a different url every few
 * seconds, for ever.
 *
 * So the dependency added out of care was the one that never stopped
 * changing, and the early return inside `start` never fired, because by the
 * time it ran the url genuinely had changed. The careful half defeated the
 * whole fix, and the first version of THIS FILE asserted that dependency by
 * name — a check written to hold a fix in place, holding the bug in place.
 *
 * ── Why the check is written against the SHAPE ───────────────────────────
 *
 * This is a fault of identity, not of behaviour anything can observe without
 * a live room, a real post and a refresh cycle. What can be held is what
 * prevents it:
 *
 *   - the effect depends on WHICH post and on nothing else — not the object,
 *     and not the url;
 *   - the url is read at the moment it is needed, through a ref, so the
 *     player still gets the freshest one without following it;
 *   - `start` returns early when the element is already playing that url;
 *   - an expired link is recovered deliberately, on the media error, which
 *     is the one honest job the url dependency used to do by accident.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const screen = readFileSync('app/components/RoomScreen.tsx', 'utf8');
const room = readFileSync('app/components/LiveChannel.tsx', 'utf8');

/* The signing, which is the whole reason the url cannot be depended on. Held
   here so that a route which one day returns a stable url makes this check
   say so, rather than leaving the note above as archaeology. */
const live = readFileSync('app/api/live/route.ts', 'utf8');
ok(
  'the room really does hand out a freshly signed url every request',
  /createSignedUrl\(/.test(live),
  'if these became stable urls, the dependency above would be safe again',
);

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
  'the player is keyed on which post, and on nothing else',
  /\}, \[playingId, start\]\);/.test(screen),
  'an effect keyed on the object, or on the url, re-runs on every refresh and pauses the song',
);
ok(
  '  and the id is taken from the post rather than held as a copy',
  /const playingId = post\?\.id;/.test(screen),
);
ok(
  '  and the signed url is nowhere in its dependencies',
  !/\[[^\]]*playingSrc[^\]]*\]/.test(screen) && !/\[[^\]]*post\?\.audio[^\]]*\]/.test(screen),
  'createSignedUrl mints a new url per request, so following it re-runs the effect for ever',
);
ok(
  '  so it reads the url through the freshest list instead',
  /const latest = useRef\(playable\);/.test(screen) &&
    /latest\.current\.find\(\(each\) => each\.id === playingId\)/.test(screen),
);
ok(
  'the one ahead is warmed by which post is next, not by the array',
  /\}, \[nextId\]\);/.test(screen),
  'depending on the array restarts the next song`s download on every refresh',
);
ok(
  'an expired link is recovered on purpose rather than by accident',
  /addEventListener\('error'/.test(screen) && /fresh\.audio === element\.src\) return;/.test(screen),
  'the url dependency used to hand over a fresh signature as a side effect',
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

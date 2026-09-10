/**
 * A view counts once somebody has listened, and not before.
 *
 *   "Sit ook count by onder om te wys hoeveel keer dit geview is. Let wel,
 *    'n view tel eers wanneer 65% van die liedjie geluister is."
 *
 * ── What was there before ────────────────────────────────────────────────
 *
 * `signal('play', …)` fired the instant `play()` resolved, in all three rooms
 * that play a song. In the live room the songs play themselves as you scroll,
 * so the number counted *scrolling past*: a song nobody stayed for and a song
 * everybody stayed for scored the same, and the Spotlight chart was built on
 * it.
 *
 * ── The rule, and the cheat it has to survive ────────────────────────────
 *
 * The obvious reading is `currentTime / duration >= 0.65`, and it is one drag
 * of the scrubber: land the playhead near the end and the song has been
 * "listened to" in half a second. So `advance` credits time that actually
 * went past and ignores jumps, and this file drives it through the four
 * shapes that matter — a straight listen, a scrub to the end, a pause, and a
 * stream of unknown length.
 *
 * The maths is a pure function for this reason: none of these can be asked of
 * a browser cheaply, and all four are one line each here.
 *
 *   npm run check:played
 */
import { readFileSync } from 'node:fs';
import { advance, ENOUGH, START, type Listened } from '../app/lib/played';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** Play a song from `from` to `to`, a quarter-second at a time, as a browser does. */
function listen(state: Listened, from: number, to: number, duration: number): Listened {
  let now = state;
  for (let at = from; at <= to + 1e-9; at += 0.25) now = advance(now, at, duration);
  return now;
}

const SONG = 180;

/* ── A straight listen ─────────────────────────────────────────────────── */
ok('the rule is 65%', ENOUGH === 0.65, String(ENOUGH));
ok('half a song is not a view', !listen(START, 0, SONG * 0.5, SONG).counted);
ok('and 64% is not either', !listen(START, 0, SONG * 0.64, SONG).counted);
ok('but 66% is', listen(START, 0, SONG * 0.66, SONG).counted);

/* ── The cheat ─────────────────────────────────────────────────────────── */
const dragged = advance(advance(START, 1, SONG), SONG - 1, SONG);
ok('dragging the scrubber to the end is not a view', !dragged.counted,
  `heard ${dragged.heard.toFixed(1)}s of ${SONG}`);
ok('and it credits only what really played', dragged.heard < 2, dragged.heard.toFixed(2));

/* Ten drags is still not a listen. Somebody who worked out the rule and
   scrubbed the whole song in pieces would be listening to it. */
let scrubbing = START;
for (let n = 0; n < 10; n += 1) scrubbing = advance(scrubbing, (SONG / 10) * n, SONG);
ok('and neither is ten of them', !scrubbing.counted, scrubbing.heard.toFixed(2));

/* ── A pause ───────────────────────────────────────────────────────────── */
/* The playhead does not move while paused, so no time is credited and none is
   lost: coming back and finishing the song is still a view. */
let paused = listen(START, 0, SONG * 0.4, SONG);
for (let n = 0; n < 200; n += 1) paused = advance(paused, SONG * 0.4, SONG);
ok('pausing costs nothing', !paused.counted && paused.heard > SONG * 0.39);
ok('and finishing after a pause still counts', listen(paused, SONG * 0.4, SONG * 0.7, SONG).counted);

/* ── A rewind ──────────────────────────────────────────────────────────── */
/* Hearing the same eight bars twice is hearing them twice. What must not
   happen is the backwards jump itself being credited as listening. */
const rewound = listen(listen(START, 0, 60, SONG), 30, 90, SONG);
/* Sixty seconds, then sixty more. Not ninety — the thirty seconds heard twice
   were heard twice — and not a hundred and fifty, which is what crediting the
   size of the backwards jump would give. That second number is the one this
   assertion is really for. */
ok('a rewind credits both listens and not the jump',
  rewound.heard > 119.9 && rewound.heard < 120.1, rewound.heard.toFixed(2));

/* ── A stream ──────────────────────────────────────────────────────────── */
/* A song of unknown length has no percentage. Not counted, rather than
   counted as soon as any of it plays — which is what a `duration` of
   Infinity would do to a `>=` written the careless way round. */
ok('a stream is never a view', !listen(START, 0, 600, Infinity).counted);
ok('and neither is a file whose length has not arrived', !listen(START, 0, 600, 0).counted);
ok('nor one whose length is not a number', !listen(START, 0, 600, Number.NaN).counted);

/* ── And the rooms actually use it ─────────────────────────────────────── */
/* Three rooms play a song. A rule that one of them keeps is not a rule, and
   this is exactly the shape of thing that gets reintroduced by somebody
   adding a fourth room and copying the nearest example. */
for (const room of ['RoomScreen', 'SongScreen', 'Channel']) {
  const source = readFileSync(`app/components/${room}.tsx`, 'utf8');
  ok(`${room} waits for the listen`, /countWhenPlayed\(/.test(source));
  ok(`${room} does not count at play()`, !/signal\(\s*'play'/.test(source));
}

/* ── And the room shows it ─────────────────────────────────────────────── */
const route = readFileSync('app/api/live/route.ts', 'utf8');
ok('the room counts plays on the song, not the post', /\.eq\('kind', 'play'\)/.test(route) && /in\('ref', songs\)/.test(route));
const channel = readFileSync('app/components/LiveChannel.tsx', 'utf8');
/* `{post.plays ?? '–'}`, not `{post.plays}`.

   This assertion was written against the second and went red the day the
   first shipped — because `/api/live` learned to answer null for a count it
   could not read, and the row learned to draw a dash for it. The app got more
   honest and the check called it a regression.

   So it asks for the honest form now. A count that could not be read must not
   render as a nought: an empty room and a broken query look identical at
   zero, and that fault class has been found seven times in this codebase.
   `check:couldnotask` is the rule; this is the one screen where it is
   visible. */
const DASHED = (field: string) =>
  new RegExp(`\\{post\\.${field}\\s*\\?\\?\\s*'[–-]'\\}`);
ok('and the row shows the number', DASHED('plays').test(channel),
  'the plays are not drawn at all');
ok('and a count that could not be read is a dash, not a nought',
  DASHED('plays').test(channel) && !/\{post\.plays \?\? 0\}/.test(channel),
  'a broken read and an unplayed song must not look the same');
/* Hearts are people and plays are times. Showing one of them twice under two
   icons is the kind of number that ends up in a pitch deck. */
ok('beside the hearts, not instead of them', DASHED('hearts').test(channel));

console.log(
  failures
    ? `\ncheck:played — ${failures} assertion(s) failed.`
    : '\ncheck:played — a view is 65% listened to, a scrub is not a listen, and all three rooms agree.',
);
process.exit(failures ? 1 : 0);

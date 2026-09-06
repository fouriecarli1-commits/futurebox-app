/**
 * What ends up on a selfie take.
 *
 * ── The thing she asked for ──────────────────────────────────────────────
 *
 * "al wat opgeneem word is die selfie video, en die liedjie saam met wat jy
 *  sing, maar nie die woorde nie."
 *
 * Three things, and the screen was recording two of them: it handed the
 * recorder the stream `getUserMedia` returns, so the song only reached the
 * file as room sound through the microphone — and with headphones in, not at
 * all. The take came back as a voice over silence.
 *
 * ── The two ways to get it wrong ─────────────────────────────────────────
 *
 * The first is the microphone twice. The camera stream carries its own audio
 * track, and the mixed stream carries that same microphone again after the
 * graph. Put both on the file and every word she sings is on it twice, a few
 * milliseconds apart. It is one `filter` away at all times and it is silent
 * until somebody plays the take back, so it is asserted here rather than
 * trusted.
 *
 * The second is a muted song that outlives the take. In headphone mode the
 * shared `<audio>` element is muted so the graph is the only sound in the
 * room. If a path out of recording forgets to unmute it, every song she
 * plays afterwards plays silently, in a room she never made a recording in.
 * So every exit is checked, not just the stop button.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tracksFor } from '../app/lib/singmix.ts';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let failures = 0;
function ok(what: string, passed: boolean, detail = ''): void {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}

/* ── The rule itself ───────────────────────────────────────────────────── */

const fake = (kind: string, id: string) => ({ kind, id }) as unknown as MediaStreamTrack;
const named = (list: readonly MediaStreamTrack[]) =>
  list.map((one) => (one as unknown as { id: string }).id).join(',');

const camera = [fake('video', 'cam'), fake('audio', 'mic-raw')];
const mixed = [fake('audio', 'mic+song')];
const made = tracksFor(camera, mixed);

ok('the picture comes from the camera', named(made).includes('cam'));
ok('the sound comes from the graph', named(made).includes('mic+song'));
ok(
  'and the microphone is not on the file a second time',
  !named(made).includes('mic-raw'),
  `got ${named(made)} — every word she sings would be on the take twice`,
);
ok('nothing else rides along', made.length === 2, `got ${made.length} tracks: ${named(made)}`);

/* A camera with no microphone at all — a webcam with the mic denied. The
   picture must still make it onto the file. */
ok(
  'a camera with no microphone still gives a picture',
  named(tracksFor([fake('video', 'cam')], mixed)) === 'cam,mic+song',
);

/* And a graph that produced nothing must not silently drop the picture. */
ok(
  'and a graph that produced no sound still gives one',
  named(tracksFor([fake('video', 'cam')], [])) === 'cam',
);

/* ── How the screen uses it ────────────────────────────────────────────── */

const screen = readFileSync(join(ROOT, 'app/components/FollowWords.tsx'), 'utf8');

ok(
  'the song is only mixed in when she says she is on headphones',
  /ears === 'phones' && songFile/.test(screen),
  'the mix is built without asking, so an out-loud take gets the song twice',
);

ok(
  'and the shared song is muted while it is, so there is one sound in the room',
  /built\.withSong && audio\) audio\.muted = true/.test(screen),
  'the element keeps playing under the clean copy',
);

/*
 * Every way out of a recording. `endMix` covers the stop button and is called
 * from it; `stopCamera` unmutes directly because it also runs on unmount, when
 * the whole screen is going away. Both must put the sound back.
 */
ok(
  'stopping the take gives the song back to the room',
  /const stopRecording = \(\): void => \{[\s\S]{0,200}endMix\(\)/.test(screen),
  'the shared element stays muted after a take',
);
ok(
  'and so does switching the camera off, which is also what closing does',
  /const stopCamera = React\.useCallback\(\(\): void => \{[\s\S]{0,400}audio\.muted = false/.test(screen),
  'closing the screen mid-take leaves every song afterwards silent',
);

ok(
  'the record button waits until the question is answered',
  /disabled=\{ears === null\}/.test(screen),
  'a take can be started before anybody knows what will be on it',
);

ok(
  'and the answer is remembered, so it is asked once',
  /localStorage\.setItem\(EARS_KEY/.test(screen) && /localStorage\.getItem\(EARS_KEY\)/.test(screen),
  'she is asked before every take',
);

/* ── Both languages ────────────────────────────────────────────────────── */

const dict = readFileSync(join(ROOT, 'app/lib/i18n.tsx'), 'utf8');
for (const key of [
  'sing.onPhones',
  'sing.onSpeaker',
  'sing.phones',
  'sing.aloudShort',
  'sing.switchEars',
  'sing.whichEars',
  'sing.phonesNote',
]) {
  const line = dict.split('\n').find((one) => one.includes(`"${key}"`)) ?? '';
  ok(`${key} is there in both languages`, /af: "[^"]+"/.test(line), 'missing, or English only');
}

if (failures > 0) {
  console.log(`\ncheck:singmix — ${failures} assertion(s) failed.`);
  process.exit(1);
}
console.log('\ncheck:singmix — the take holds the picture, the song and her voice, each once.');

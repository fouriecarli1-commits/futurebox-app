/**
 * A take records upright, and in something the world can play.
 *
 * ── Three faults in one flow ─────────────────────────────────────────────
 *
 * Carli, 14 September 2026: *"Die film myself terwyl mens 'n liedjie luister
 * neem in wide screen in plaas van in 'n long screen vir tick tok… Die
 * afgelaaide video kan nie die klank speel nie, dit sê audio codec not
 * supported."*
 *
 * ── The codec one, which is the serious one ──────────────────────────────
 *
 * The recorder asked for `video/mp4` with no codecs named.
 * `isTypeSupported('video/mp4')` answers yes, and the browser then picks
 * what goes inside — and an MP4 containing **Opus** audio is a perfectly
 * legal MP4 that Android's own player cannot play. It opens the file, finds
 * the audio track, and says exactly what she read.
 *
 * Measured rather than reasoned: in a Chromium here,
 * `isTypeSupported('video/mp4')` is true while every specific mp4 codec
 * string is false. So the one thing the old list tested is the one thing
 * that says nothing about what comes out of the recorder.
 *
 * H.264 baseline with AAC-LC has to be asked for by name, and asked for
 * FIRST, because that is the pair a phone gallery plays, a desktop player
 * plays, and TikTok accepts — which is the entire point of the feature.
 *
 * ── The shape one ────────────────────────────────────────────────────────
 *
 * The camera was asked for 1080 by 1920, and `ideal` is a preference: a
 * camera that cannot give exactly those pixels is free to hand back its
 * native landscape frame, and phone sensors are landscape. The size was
 * asked for and the shape was not. `aspectRatio` asks for the shape on its
 * own, which a camera can satisfy by cropping.
 *
 * ── What this cannot check ───────────────────────────────────────────────
 *
 * Whether her camera honours the constraint. If it does not, the certain fix
 * is drawing the frames into a 1080×1920 canvas and recording that, which is
 * a bigger build and a cost on the phone. Written down so a green check here
 * is not mistaken for a portrait video on her device.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

const source = readFileSync('app/components/FollowWords.tsx', 'utf8');

/* ── Upright ──────────────────────────────────────────────────────────── */
ok('the camera is asked for an upright shape, not only a size',
  /aspectRatio: \{ ideal: 9 \/ 16 \}/.test(source),
  'width and height are a preference a landscape sensor may ignore');

/* ── Playable ─────────────────────────────────────────────────────────── */
/**
 * Read the recorder's OWN list, not every `video/…` string in the file.
 *
 * The first version of this matched the whole source, and the prose above the
 * recorder mentions `'video/mp4'` three times while explaining why asking for
 * it is the fault. So the check read the explanation of the bug as the bug and
 * failed on a file that was already fixed. A probe that scans a wider area
 * than the thing it is measuring reports on whatever else lives there.
 */
const list = source.match(/MediaRecorder\.isTypeSupported\(one\)/)
  ? source.slice(
      source.lastIndexOf('const type = ['),
      source.indexOf('.find((one) => MediaRecorder.isTypeSupported(one))'),
    )
  : '';
const wanted = [...list.matchAll(/'(video\/[^']+)'/g)].map((one) => one[1]);
const first = wanted[0] ?? '';
ok('the first format asked for names its codecs',
  /codecs=/.test(first),
  `asked for "${first}" — a container with no codecs lets the browser choose, and it can choose Opus in an MP4`);
ok('  and they are the pair a phone and TikTok both take',
  /avc1\.42E01E,mp4a\.40\.2/.test(first),
  `H.264 baseline with AAC-LC has to be asked for by name; got "${first}"`);
ok('  with the bare container kept below them, not above',
  wanted.indexOf('video/mp4') > wanted.indexOf('video/mp4;codecs=avc1.42E01E,mp4a.40.2'),
  'isTypeSupported answers yes to the bare form and says nothing about the contents');
ok('  and WebM last, because most players outside a browser refuse it',
  wanted.filter((one) => one.startsWith('video/webm')).every(
    (one) => wanted.indexOf(one) > wanted.lastIndexOf('video/mp4'),
  ));

/* ── And honest when it can only give the one that may not open ───────── */
ok('a WebM take says so before it is filmed, rather than after',
  /sing\.webmOnly/.test(source),
  'three minutes of filming is a bad time to find out the file will not open');

if (failures) {
  console.error(
    '\ncheck:takefile — asking for `video/mp4` with no codecs lets the browser put Opus in it,\n' +
      'which is a legal MP4 that a phone cannot play. Name the codecs, H.264 + AAC first.\n',
  );
  process.exit(1);
}
console.log('\ncheck:takefile — a take is asked for upright, and in a file other players can open.');

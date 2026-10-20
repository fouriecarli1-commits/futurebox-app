/**
 * The ceiling on a chosen picture measures pixels, and the reader is right.
 *
 * ── The fault ────────────────────────────────────────────────────────────
 *
 * `imagefile.ts` has said since the day it was written that its ceiling exists
 * because "decoding a hundred-megapixel image in a phone browser is how a tab
 * runs out of memory and dies, taking the unsaved page with it" — and the
 * ceiling it enforced was `file.size > 12MB`.
 *
 * Those are not the same measurement and JPEG is why. A 200-megapixel photo
 * off a modern phone is ten or twelve megabytes on disk; opened, it is
 * 200,000,000 × 4 bytes, which is eight hundred megabytes in one allocation.
 * It passes a bytes ceiling and kills the tab. There is no catch for that —
 * the process is killed, so nothing throws and no error boundary draws.
 *
 * ── Why this check reads real files ──────────────────────────────────────
 *
 * Because the guard is only as good as the reader behind it, and a header
 * parser is the kind of code that is confidently wrong. A JPEG's dimensions
 * are not at a fixed offset: they are in a start-of-frame marker somewhere
 * after however much EXIF, colour profile and embedded thumbnail the camera
 * wrote, so the parser has to walk the markers — and a walker that mistakes
 * DHT or a restart marker for a frame reads two arbitrary bytes as a size.
 *
 * So the files below are built here, byte by byte, with dimensions chosen to
 * be unmistakable (no square, no round numbers shared between width and
 * height), and the parser is asked what it sees. A PNG, a bare JPEG, a JPEG
 * with a long EXIF block in front of the frame, and the three WebP shapes.
 */

import { measure, MAX_PIXELS } from '../app/lib/imagefile';

let failures = 0;
const ok = (what: string, passed: boolean, detail = ''): void => {
  console.log(`  ${passed ? 'ok ' : 'NOT'}  ${what}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
};

/** Node has Blob; `measure` takes one and never touches the DOM. */
const blobOf = (bytes: Buffer): Blob => new Blob([new Uint8Array(bytes)]);

function png(width: number, height: number): Buffer {
  const out = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(out, 0);
  out.writeUInt32BE(13, 8);
  out.write('IHDR', 12);
  out.writeUInt32BE(width, 16);
  out.writeUInt32BE(height, 20);
  return out;
}

/** A JPEG with `padding` bytes of APP1 in front of the frame, as a camera writes. */
function jpeg(width: number, height: number, padding = 0): Buffer {
  const parts: Buffer[] = [Buffer.from([0xff, 0xd8])];
  if (padding > 0) {
    const app1 = Buffer.alloc(4 + padding);
    app1.writeUInt8(0xff, 0);
    app1.writeUInt8(0xe1, 1);
    app1.writeUInt16BE(2 + padding, 2);
    parts.push(app1);
  }
  const sof = Buffer.alloc(11);
  sof.writeUInt8(0xff, 0);
  sof.writeUInt8(0xc0, 1);
  sof.writeUInt16BE(9, 2);
  sof.writeUInt8(8, 4);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat(parts.concat([sof]));
}

/**
 * A phone's portrait photo: a landscape frame with an EXIF note saying turn
 * it a quarter (orientation 6), little- or big-endian as cameras differ.
 */
function turnedJpeg(width: number, height: number, orientation: number, little: boolean): Buffer {
  const tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write(little ? 'II' : 'MM', 0, 'latin1');
  const u16 = (v: number, at: number): void => { if (little) tiff.writeUInt16LE(v, at); else tiff.writeUInt16BE(v, at); };
  const u32 = (v: number, at: number): void => { if (little) tiff.writeUInt32LE(v, at); else tiff.writeUInt32BE(v, at); };
  u16(42, 2);
  u32(8, 4);
  u16(1, 8);
  u16(0x0112, 10);
  u16(3, 12);
  u32(1, 14);
  u16(orientation, 18);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt8(0xff, 0);
  app1.writeUInt8(0xe1, 1);
  app1.writeUInt16BE(2 + body.length, 2);
  const bare = jpeg(width, height);
  return Buffer.concat([bare.subarray(0, 2), app1, body, bare.subarray(2)]);
}

function webpLossy(width: number, height: number): Buffer {
  const out = Buffer.alloc(32);
  out.write('RIFF', 0);
  out.write('WEBP', 8);
  out.write('VP8 ', 12);
  out.writeUInt16LE(width & 0x3fff, 26);
  out.writeUInt16LE(height & 0x3fff, 28);
  return out;
}

function webpExtended(width: number, height: number): Buffer {
  const out = Buffer.alloc(32);
  out.write('RIFF', 0);
  out.write('WEBP', 8);
  out.write('VP8X', 12);
  out.writeUIntLE(width - 1, 24, 3);
  out.writeUIntLE(height - 1, 27, 3);
  return out;
}

const cases: { name: string; bytes: Buffer; width: number; height: number }[] = [
  { name: 'a PNG', bytes: png(4032, 3024), width: 4032, height: 3024 },
  { name: 'a bare JPEG', bytes: jpeg(1234, 567), width: 1234, height: 567 },
  /* The one that matters: a real camera writes EXIF and often a thumbnail
     before the frame, so a parser reading a fixed offset reads the EXIF. */
  { name: 'a JPEG behind 40KB of EXIF', bytes: jpeg(8160, 6144, 40_000), width: 8160, height: 6144 },
  /* The owner, 20 October 2026: a selfie came out squashed everywhere it
     was shown. The frame says 4000×3000 and the note says turn it; shown,
     it is 3000×4000, and that is the size the picture is resized to. */
  { name: 'a portrait phone photo (EXIF turned, little-endian)', bytes: turnedJpeg(4000, 3000, 6, true), width: 3000, height: 4000 },
  { name: 'a portrait phone photo (EXIF turned, big-endian)', bytes: turnedJpeg(4000, 3000, 8, false), width: 3000, height: 4000 },
  { name: 'an upright phone photo (EXIF 1)', bytes: turnedJpeg(4000, 3000, 1, true), width: 4000, height: 3000 },
  { name: 'a lossy WebP', bytes: webpLossy(1920, 1081), width: 1920, height: 1081 },
  { name: 'an extended WebP', bytes: webpExtended(3000, 2001), width: 3000, height: 2001 },
];

for (const one of cases) {
  const seen = await measure(blobOf(one.bytes));
  ok(
    `${one.name} is measured at ${one.width}×${one.height}`,
    seen?.width === one.width && seen?.height === one.height,
    seen ? `${seen.width}×${seen.height}` : 'nothing read',
  );
}

/* Unknown is answered as unknown rather than as a number. A parser that
   guesses when it cannot tell is worse than one that says so: the caller's
   rule is "go ahead when unknown", and a wrong number would either refuse a
   fine photo or wave through the one this exists to stop. */
ok('an unreadable head is null, not a guess',
  (await measure(blobOf(Buffer.from('not a picture at all, just words')))) === null);

/* The ceiling itself. Ordinary camera modes must pass or this check has
   turned the fix into a different fault. */
const mp = (n: number): number => n * 1_000_000;
ok('a 12MP phone photo is allowed', mp(12) <= MAX_PIXELS);
ok('a 50MP phone photo is allowed', mp(50) <= MAX_PIXELS);
ok('a 108MP camera mode is refused', mp(108) > MAX_PIXELS);
ok('a 200MP camera mode is refused', mp(200) > MAX_PIXELS);

if (failures) {
  console.error(
    '\ncheck:pixelguard — the picture ceiling must measure pixels, and the header reader\n' +
      'behind it must read real files correctly. A wrong reader is a ceiling that either\n' +
      'refuses ordinary photos or lets through the one that kills the tab.\n',
  );
  process.exit(1);
}
console.log(`\ncheck:pixelguard — ${cases.length} real file headers read correctly, and the ceiling is in pixels.`);
